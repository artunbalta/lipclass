# EduBear Backend — Blueprint: Document Upload → OCR → MCQ Generation

> A detailed walkthrough of the exact code path a document takes from the moment it hits the API until MCQs are returned to the client.

---

## Overview

The full pipeline involves four sequential phases, each exposed as its own endpoint:

```
[Client]
   │
   ├─ POST /upload-document    → Ingests, validates, embeds, stores
   ├─ POST /convert-pdf-to-markdown  → OCR for scanned PDFs (optional / separate)
   ├─ POST /summarize          → Compresses raw text into a structured summary
   └─ POST /generate-mcq       → Runs 3-stage parallel MCQ generation pipeline
```

---

## Phase 0 — Request Security (Every Endpoint)

Before any business logic runs, every request passes through two layers.

### 0.1 JWT Authentication (`auth.py` → `get_current_user`)

```
HTTP Request (Bearer token in Authorization header)
    │
    └─► auth_service.verify_token(token)
            │  Decodes Supabase JWT using SUPABASE_JWT_SECRET
            │  Extracts: user_id, role, course_ids, is_active
            └─► Returns TokenData
```

- If the token is missing, expired, or invalid → `401 Unauthorized`.
- The `TokenData` object is injected into every endpoint handler via FastAPI `Depends(get_current_user)`.

### 0.2 Infrastructure Security Middleware (`infrastructure_security.py`)

Every request also passes through `SecurityMonitor.analyze_and_respond()`:

- Checks IP reputation and rate-limit counters.
- Scores the request for threat signals (path traversal, suspicious headers, payload size anomalies).
- Logs a `SecurityEvent` to the Supabase `security_events` table.
- Adds security headers (`X-Frame-Options`, `Content-Security-Policy`, etc.) to every response.
- Blocks the request if a threshold is breached and logs to `security_threats`.

---

## Phase 1 — Document Upload (`POST /upload-document`)

**File:** `main.py` → `upload_document()` + `document_processor.py` → `DocumentProcessor`

### 1.1 Request Shape

```json
{
  "file":          "<multipart PDF/TXT/DOCX binary>",
  "user_id":       "uuid-of-user",
  "course_id":     "course-slug-or-id",
  "document_name": "Optional display name",
  "chunk_size":    1000,
  "chunk_overlap": 200
}
```

### 1.2 Access Control

```
validate_user_access(user_id, current_user)
    └─► Confirms request.user_id == JWT user_id  (no impersonation)

validate_course_access(course_id, current_user)
    └─► Confirms course_id ∈ current_user.course_ids
```

Both raise `403 Forbidden` on failure.

### 1.3 Input Sanitisation (`input_validation.py`)

```
InputSanitizer.sanitize_id(user_id)
InputSanitizer.sanitize_id(course_id)
InputSanitizer.sanitize_text(document_name, max_length=200)
```

`sanitize_id` strips everything except alphanumerics, hyphens and underscores.  
`sanitize_text` runs HTML-entity escaping (`bleach`) and checks against a list of XSS and SQL injection regex patterns. Raises `400` on failure.

### 1.4 File Validation (`input_validation.py` → `validate_file_upload`)

```
file_content = await file.read()   # Full bytes in memory

validate_file_upload(file_content, filename)
    ├─ Size check:    len(file_content) <= 50 MB
    ├─ MIME sniffing: python-magic reads first bytes
    │       Allowed: application/pdf, text/plain, text/x-tex,
    │                application/msword, .docx
    ├─ Filename sanitisation: strips path components, null bytes, dangerous chars
    ├─ Dangerous pattern scan: looks for <script>, javascript:, PHP tags etc.
    └─ SHA-256 hash computed → returned as file_hash
```

Returns `{ safe_filename, file_hash }` or raises `400`.

### 1.5 Secure Storage (`data_protection.py`)

```
secure_storage.store_document(user_id, course_id, filename, content)
    ├─ Generates a doc_id (UUID)
    ├─ Encrypts file_content with Fernet symmetric encryption
    ├─ Writes encrypted blob to  secure_storage/<user_id>/<doc_id>
    └─ Returns doc_id

integrity_manager.create_audit_trail(user_id, action="DOCUMENT_UPLOAD", ...)
    └─ HMAC-signed audit record written to disk
```

The encrypted copy is for compliance/retrieval. The plaintext bytes continue to the next step.

### 1.6 Text Extraction (`document_processor.py` → `extract_text_from_file`)

```
if filename ends with .pdf:
    _extract_text_from_pdf(file_content)
        └─ PyPDF2.PdfReader iterates pages
           Each page: page.extract_text()
           Prepends "--- Page N ---" headers
           Raises ValueError if 0 chars extracted  ← triggers OCR fallback in client

elif .txt / .md / .py / .js / .html / .css:
    file_content.decode('utf-8', errors='ignore')

else:
    attempt utf-8 decode, raise ValueError on failure
```

> **Note on scanned PDFs:** PyPDF2 can only extract embedded text. If the result is empty (e.g. a photographed/scanned PDF), the client should call `/convert-pdf-to-markdown` first and pass the resulting text to `/upload-document` as a `.txt` file.

### 1.7 Text Chunking (`document_processor.py` → `split_text_with_langchain`)

```
RecursiveCharacterTextSplitter(
    chunk_size    = 1000,   # characters (configurable per request)
    chunk_overlap = 200,    # characters of context carry-over
    separators    = ["\n\n", "\n", ". ", "! ", "? ", "; ", ", ", " ", ""]
)

chunks = splitter.split_text(raw_text)
chunks = [c for c in chunks if len(c.strip()) > 50]   # drop micro-chunks
```

A 10-page lecture PDF typically produces 40–80 chunks.

### 1.8 Embedding + Storage (`document_processor.py` → `store_document_chunks`)

For every chunk:

```
openai_client.embeddings.create(
    model  = "text-embedding-3-small",   # 1536-dim vector
    input  = chunk_text,
    encoding_format = "float"
)
→ embedding: List[float]   (1536 values)
```

Chunks are batched in groups of 20 and upserted to Supabase:

```sql
INSERT INTO document_embeddings (
    content,        -- raw chunk text
    embedding,      -- 1536-dim float array
    metadata,       -- JSON: document_id, chunk_index, total_chunks,
                    --        document_name, filename, user_id, course_id, created_at
    namespace,      -- "{user_id}_{course_id}"  (for future namespace filtering)
    user_id,
    course_id
)
```

### 1.9 Compliance Logging

```
log_compliance_data_processing(
    user_id, data_type="document_upload",
    processing_purpose="educational_content_processing",
    legal_basis="legitimate_interest",
    regulation="FERPA",
    retention_period_days=2555   # 7 years
)
→ INSERT INTO compliance_logs (Supabase)
```

### 1.10 Response

```json
{
  "success": true,
  "document_id": "<uuid>",
  "chunks_created": 62,
  "processing_time": 14.3,
  "message": "Successfully processed lecture_w3.pdf with 62 chunks",
  "security_info": {
    "file_hash": "a3f9...",
    "sanitized_filename": "lecture_w3.pdf",
    "validation_passed": true,
    "encrypted_storage": true,
    "doc_id": "<uuid>",
    "audit_id": "<uuid>"
  }
}
```

---

## Phase 2 — OCR for Scanned PDFs (`POST /convert-pdf-to-markdown`)

**File:** `main.py` → `convert_pdf_to_markdown()` + `mistral_ocr_service.py` → `MistralOCRService`

> This phase is **only needed** for scanned / image-based PDFs where PyPDF2 returns no text. The output feeds back into Phase 1 (as a `.txt` upload) or directly into Phase 3 (summarization).

### 2.1 Request Shape

```json
{
  "pdfUrl":  "https://storage.example.com/files/lecture.pdf",
  "fileName": "lecture.pdf"
}
```

The PDF must be publicly accessible via URL. The service does **not** accept raw binary — the client must first upload the file to storage (e.g. Supabase Storage) and pass the signed URL here.

### 2.2 URL Validation

```
requests.head(pdf_url, timeout=10, allow_redirects=True)
    ├─ status_code must be 200
    └─ content-type checked (soft warning only — some servers omit it)
```

### 2.3 Mistral OCR Processing

```
client.ocr.process(
    model    = "mistral-ocr-latest",
    document = { "type": "document_url", "document_url": pdf_url },
    include_image_base64 = True
)
→ ocr_response.pages   (list of page objects)
```

Each page object from Mistral contains:
- `page.markdown` — the OCR'd text formatted as Markdown (preserves headings, tables, lists)
- `page.images`   — list of embedded image objects with base64 data and bounding box coordinates

### 2.4 Text Extraction (`_extract_combined_text`)

```
for page_idx, page in enumerate(pages, 1):
    if len(pages) > 1:
        append "--- Page N ---"
    append page.markdown

→ combined_text: str   (full Markdown document)
```

### 2.5 Image Extraction (`_extract_images_with_positions`)

```
for each page → for each image:
    ExtractedImage(
        id          = image_id or "img_pageN_M",
        pageNumber  = N,
        imageIndex  = global_index,
        base64      = image_base64_data,
        mimeType    = "image/jpeg" | "image/png" | ...,
        bbox        = ImageBBox(top_left_x, top_left_y, bottom_right_x, bottom_right_y),
        description = "Image M from page N"
    )
```

MIME type is inferred from the image ID extension or the `data:` URI prefix; defaults to `image/jpeg`.

### 2.6 Response

```json
{
  "text":      "# Lecture 3 — Thermodynamics\n\n## 1. Introduction\n...",
  "images":    [ { "id": "img_1", "pageNumber": 1, "base64": "...", "bbox": {...} } ],
  "pageCount": 12,
  "fileName":  "lecture.txt"
}
```

The `text` field is what the client passes to `/summarize` or back to `/upload-document`.

---

## Phase 3 — Summarisation (`POST /summarize`)

**File:** `main.py` → `summarize_document()` + `summarization_service.py` → `SummarizationService`

> The summary is the key bridge. MCQ generation does **not** operate on raw chunk text — it operates on a compressed, structured summary. This is what shapes question quality.

### 3.1 Request Shape

```json
{
  "text":         "<raw extracted or OCR'd text>",
  "course_id":    "course-slug",
  "summary_type": "comprehensive",
  "language":     "EN"
}
```

`summary_type` options: `comprehensive` | `key_points` | `executive` | `study_guide`

### 3.2 Extractive Preprocessing (`extractive_preprocessor.py`)

```
optimize_for_summarization(text, max_input_tokens=6000)
    └─ ExtractivePreprocessor scores sentences by:
           • TF-IDF term frequency
           • Sentence position (first/last sentences weighted higher)
           • Keyword density
       Selects highest-scoring sentences until token budget is filled
       Preserves sentence order to maintain coherence
```

This keeps the input within GPT's context window while retaining the most informative content.

### 3.3 Summary Generation (GPT-4o-mini)

```
prompt = base_instruction (language-specific) + summary_prompt[summary_type] + optimized_text

openai_client.chat.completions.create(
    model       = "gpt-4o-mini-2024-07-18",
    messages    = [{ "role": "user", "content": prompt }],
    temperature = CHAT_TEMPERATURE,
    max_tokens  = MAX_TOKENS
)
```

The `comprehensive` prompt instructs the model to produce structured Markdown with:
- Section headings
- Key definitions
- Formulas in LaTeX (`$...$` for inline, `$$...$$` for display)
- Numbered concept lists

### 3.4 Completion Check

```
_is_summary_complete(summary)
    ├─ Must end with . ! ? : ;
    ├─ Last sentence must be >= 10 chars
    └─ Must not end with connector words (and, or, but, however, ...)

if not complete:
    Second GPT call: "The following summary is incomplete. Complete it: ..."
```

### 3.5 LaTeX Formatting (`chat_service.fix_latex_formatting`)

Runs regex normalisation to ensure all math expressions use proper `$...$` delimiters — critical for the frontend renderer and PDF generator.

### 3.6 Response

```json
{
  "main_summary":   "# Thermodynamics\n\n## First Law\nEnergy is conserved...\n\n$$\\Delta U = Q - W$$\n...",
  "summary_type":   "comprehensive",
  "word_count":     843,
  "processing_time": 6.2
}
```

---

## Phase 4 — MCQ Generation (`POST /generate-mcq`)

**File:** `main.py` → `generate_mcq_questions()` + `parallel_mcq_generator.py` → `ParallelMCQGenerator`

This is a **three-stage parallel pipeline** designed for speed and quality.

### 4.1 Request Shape

```json
{
  "document_summary": "<output of /summarize>",
  "num_questions":    15,
  "difficulty":       "medium",
  "question_type":    "mixed",
  "topic":            "First Law of Thermodynamics",
  "language":         "EN"
}
```

`difficulty`: `easy` | `medium` | `hard`  
`question_type`: `theoretical` | `mathematical` | `mixed`

### 4.2 Pre-pipeline: Math Content Detection

```
_detect_mathematical_content(document_summary)
    Scans for:
      • LaTeX expressions:    $...$  $$...$$
      • Greek letters:        α β γ Σ ∫ ...
      • Math symbols:         ∀ ∃ ∈ ∞ ∑ ∏ ∂ ...
      • Math keywords:        theorem, lemma, integral, derivative, matrix ...
      • Equation patterns:    x = y+z, f(x), dy/dx ...

math_score >= threshold  →  is_mathematical = True
```

### 4.3 Question Type Distribution

```
_calculate_question_type_distribution(num_questions=15, question_type="mixed")

"theoretical":  75% theoretical + 25% mathematical
"mathematical": 25% theoretical + 75% mathematical
"mixed":        50% theoretical + 50% mathematical

→ shuffled list, e.g.: ["theoretical", "mathematical", "theoretical", ...]
```

---

### Stage 1 — Parallel Generation (GPT-4o-mini)

```
num_blocks = ceil(15 / 5) = 3  blocks  (max 5 questions per block)
blocks_config = [5, 5, 5]

asyncio.gather(
    _generate_single_block_async(block_id=1, num_questions=5, ...),
    _generate_single_block_async(block_id=2, num_questions=5, ...),
    _generate_single_block_async(block_id=3, num_questions=5, ...)
)
← Up to 6 blocks run concurrently (asyncio.Semaphore(6))
```

Each block call:

```
client.chat.completions.create(
    model    = OPENAI_MCQ_MODEL,    # gpt-4o-mini-2024-07-18
    messages = [
        { "role": "system", "content": "Expert educator. Respond with valid JSON array." },
        { "role": "user",   "content": base_instruction
                                     + question_type_instruction
                                     + main_prompt
                                     + format_instruction
                                     + "Document Summary:\n" + document_summary }
    ],
    temperature = CHAT_TEMPERATURE,
    max_tokens  = MAX_TOKENS
)
```

The prompt encodes per-block instructions: how many theoretical vs. mathematical questions, difficulty guidance, and strict JSON output format.

**JSON output format per question:**
```json
{
  "question":       "What does the First Law of Thermodynamics state?",
  "options":        { "A": "...", "B": "...", "C": "...", "D": "..." },
  "correct_answer": "B",
  "explanation":    "The First Law states that...",
  "difficulty":     "medium",
  "topic":          "First Law of Thermodynamics"
}
```

After parsing, `fix_latex_formatting()` is applied to `question`, `explanation`, and all `options`.

**Fallback:** If `asyncio.gather` raises, the pipeline falls back to sequential block processing.

Stage 1 output: `raw_mcqs` — typically `num_questions * ~1.1` questions (slight overgeneration is intentional).

---

### Stage 2 — Duplicate Detection (GPT-4.1-nano)

```
if len(raw_mcqs) <= target_count:
    skip  # nothing to deduplicate

_stage2_duplicate_detection(mcqs=raw_mcqs, target_count=15, api_key=...)
```

All questions are serialised into a single prompt:

```
"You are an expert at detecting duplicate questions.
 Analyze these N questions. Questions are duplicates if they:
   - Test the same specific concept or knowledge point
   - Have similar correct answers testing identical understanding
   - Would have the same/very similar explanations
   - Ask about the same topic with different wording

 Identify the BEST 15 questions. Keep the highest-quality version.

 Respond with JSON:
 { 'keep_indices': [0, 1, 3, ...], 'reasoning': '...' }"
```

```
client.chat.completions.create(
    model       = OPENAI_DUPLICATE_CHECK_MODEL,  # gpt-4.1-nano
    temperature = 0.1,   ← very low for deterministic deduplication
    max_tokens  = 2000
)
```

The model returns `keep_indices` — the indices of the 15 best, non-duplicate questions. The rest are discarded.

**Fallback:** If parsing fails, returns `raw_mcqs[:target_count]`.

Stage 2 output: `deduplicated_mcqs` — exactly `target_count` questions (or fewer if generation underperformed).

---

### Stage 3 — Quality Enhancement (Gemini-2.5-flash, concurrent)

```
if len(deduplicated_mcqs) < target_count:
    missing = target_count - len(deduplicated_mcqs)
    replacement_mcqs = await _generate_replacement_questions_async(
        document_summary, existing_mcqs, num_replacements=missing, ...
    )
    ← Gemini generates gap-filling questions, explicitly told to avoid
       questions similar to existing ones

gemini_quality_checker.check_mcqs_in_chunks_async(
    mcqs             = deduplicated_mcqs,
    document_summary = ...,
    difficulty       = ...,
    language         = ...,
    chunk_size       = 5    ← 5 MCQs checked per Gemini call, all chunks concurrently
)
```

`GeminiQualityChecker` (`gemini_quality_checker.py`) evaluates each chunk:
- Is the question clearly worded?
- Is the correct answer unambiguously correct?
- Are the distractors plausible (not trivially wrong)?
- Does the explanation accurately explain the correct answer?
- Is difficulty calibrated correctly?

Gemini can **rewrite** trivial or ambiguous questions in place. It returns the same JSON structure with improved content.

**If Gemini key is missing:** Stage 3 is skipped entirely; Stage 2 output is returned as-is.

Stage 3 output: `final_mcqs` — up to `target_count` high-quality questions.

---

### 4.4 Response Formatting

```python
# Convert options dict → ordered list
options_list = [options["A"], options["B"], options["C"], options["D"]]

# Convert correct_answer letter → index
letter_to_index = {"A": 0, "B": 1, "C": 2, "D": 3}
correct_index = letter_to_index[correct_answer.upper()]

MCQQuestion(
    question       = "...",
    options        = ["...", "...", "...", "..."],
    correct_answer = 1,         ← 0-based index
    explanation    = "...",
    topic          = "..."
)
```

### 4.5 Response

```json
{
  "questions": [
    {
      "question":       "Which equation represents the First Law of Thermodynamics?",
      "options":        ["$Q = W$", "$\\Delta U = Q - W$", "$S = k \\ln W$", "$PV = nRT$"],
      "correct_answer": 1,
      "explanation":    "The First Law states that the change in internal energy equals heat added minus work done by the system: $\\Delta U = Q - W$.",
      "topic":          "First Law of Thermodynamics"
    },
    ...
  ],
  "total_questions": 15
}
```

---

## End-to-End Data Flow Summary

```
[Client uploads PDF]
        │
        ▼
POST /upload-document
  ├── Auth (JWT validation)
  ├── Security middleware
  ├── Access control (user_id, course_id)
  ├── Input sanitisation
  ├── File validation (MIME, size, dangerous patterns, SHA-256)
  ├── Encrypted storage + audit trail
  ├── PyPDF2 text extraction
  │       └── Empty? → client calls /convert-pdf-to-markdown first
  ├── LangChain chunking (1000 chars, 200 overlap)
  ├── OpenAI embeddings (text-embedding-3-small, 1536-dim)
  ├── Supabase batch insert (document_embeddings, batches of 20)
  └── FERPA compliance log
        │
        ▼
[Client has raw text]
        │
        ├── Scanned PDF path ──────────────────────────────────┐
        │                                                       │
        │   POST /convert-pdf-to-markdown                      │
        │     ├── Mistral OCR (mistral-ocr-latest)             │
        │     ├── Page-by-page Markdown reconstruction         │
        │     └── Image extraction with bounding boxes         │
        │                      │                               │
        └───────────────────── ▼ ──────────────────────────────┘
                        [Markdown text]
                               │
                               ▼
                POST /summarize
                  ├── Extractive preprocessing (TF-IDF, positional scoring)
                  ├── GPT-4o-mini (structured Markdown + LaTeX summary)
                  ├── Completion check + optional second pass
                  └── LaTeX normalisation
                               │
                               ▼
                POST /generate-mcq
                  ├── Math content detection
                  ├── Question type distribution calculation
                  │
                  ├── Stage 1: Parallel GPT-4o-mini blocks
                  │     └── N blocks × 5 questions, up to 6 concurrent
                  │
                  ├── Stage 2: GPT-4.1-nano duplicate detection
                  │     └── Selects best K unique questions
                  │
                  └── Stage 3: Gemini-2.5-flash quality enhancement
                        ├── Gap-fill if count < target
                        └── Concurrent chunk-level quality rewriting
                               │
                               ▼
                     [MCQResponse — ready for client]
```

---

## Key Configuration Values (`config.py`)

| Setting | Value | Notes |
|---|---|---|
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | 1536-dim, used in upload |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini-2024-07-18` | Used for summarisation |
| `OPENAI_MCQ_MODEL` | `gpt-4o-mini-2024-07-18` | Stage 1 MCQ generation |
| `OPENAI_DUPLICATE_CHECK_MODEL` | `gpt-4.1-nano` | Stage 2 deduplication |
| Gemini model | `gemini-2.5-flash` | Stage 3 quality check |
| OCR model | `mistral-ocr-latest` | Scanned PDF extraction |
| `chunk_size` | 1000 chars | Configurable per request |
| `chunk_overlap` | 200 chars | Configurable per request |
| `max_questions_per_block` | 5 | MCQ blocks hard limit |
| `Semaphore` | 6 | Max concurrent OpenAI requests |
| `MAX_FILE_SIZE` | 50 MB | Hard limit on upload |
| `SIMILARITY_THRESHOLD` | 0.48 | pgvector cosine threshold (chat) |
| `TOP_K_MATCHES` | 10 | Vector search result count (chat) |

---

## Important Design Notes

1. **OCR is a separate, optional endpoint.** The upload endpoint only runs PyPDF2. If that returns empty text, the client is responsible for calling `/convert-pdf-to-markdown` and re-submitting the extracted text.

2. **Summarisation is a prerequisite for MCQ generation.** The `/generate-mcq` endpoint takes a `document_summary`, not raw text. The client orchestrates the summarise → generate-mcq call sequence.

3. **All data is user/course scoped.** The Supabase `document_embeddings` table stores `user_id`, `course_id`, and a `namespace` (`"{user_id}_{course_id}"`). Every read filters by both fields. No student can access another student's documents.

4. **API keys are never stored in the backend env.** All third-party API keys (OpenAI, Gemini, Mistral) are fetched at request time from a Supabase Edge Function (`api_client.get_api_keys()`). Only `SUPABASE_URL` and `SUPABASE_KEY` are required in the server environment.

5. **LaTeX is a first-class concern throughout.** `fix_latex_formatting()` is applied at every stage where AI generates text — summaries, MCQ questions, options, and explanations — to ensure consistent rendering in the frontend and PDF generator.
