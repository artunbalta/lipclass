/**
 * Client-side Quiz Generation Orchestrator
 *
 * Chains the full pipeline: upload → extract → OCR → summarize → generate MCQs → save
 * Reports progress at each stage via callback.
 */

import type { MCQQuestion, QuizGenerationProgress, CreateQuizFormData } from '@/types';

export interface QuizGenerationOptions extends CreateQuizFormData {
  teacherId: string;
  file?: File;
  onProgress?: (progress: QuizGenerationProgress) => void;
}

export interface QuizGenerationResult {
  quizId: string;
  questions: MCQQuestion[];
  summary: string;
}

function report(
  onProgress: ((p: QuizGenerationProgress) => void) | undefined,
  stage: QuizGenerationProgress['stage'],
  progress: number,
  message?: string
) {
  onProgress?.({ stage, progress, message });
}

export async function generateQuiz(
  options: QuizGenerationOptions
): Promise<QuizGenerationResult> {
  const { teacherId, file, onProgress, ...formData } = options;

  let extractedText = '';
  let uploadedFilePath: string | undefined;
  let uploadedFileName: string | undefined;

  try {
    // ── Step 1: Get document text ─────────────────────────────────────────

    if (formData.sourceType === 'text' && formData.sourceText) {
      // Direct text input
      extractedText = formData.sourceText;
      report(onProgress, 'extracting', 10, 'Metin hazırlanıyor...');
    } else if (formData.sourceType === 'document' && formData.documentId) {
      // Existing document — fetch its embedded text from RAG context
      report(onProgress, 'extracting', 5, 'Döküman içeriği getiriliyor...');
      // We need the raw text, not vector search. Use the document's existing chunks.
      // For now, we'll summarize the document topic directly.
      extractedText = `Document ID: ${formData.documentId} - Topic: ${formData.topic}`;
      report(onProgress, 'extracting', 10);
    } else if (formData.sourceType === 'upload' && file) {
      // Upload new file
      report(onProgress, 'uploading', 2, 'Dosya yükleniyor...');

      const uploadForm = new FormData();
      uploadForm.append('file', file);
      uploadForm.append('teacherId', teacherId);

      const uploadRes = await fetch('/api/quiz-upload', {
        method: 'POST',
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      uploadedFilePath = uploadData.storagePath;
      uploadedFileName = uploadData.fileName;

      report(onProgress, 'extracting', 8, 'Metin çıkarılıyor...');

      if (uploadData.extractedText) {
        extractedText = uploadData.extractedText;
      } else if (uploadData.needsOcr) {
        // OCR needed
        report(onProgress, 'ocr', 10, 'OCR işleniyor (taranmış PDF)...');

        const ocrRes = await fetch('/api/convert-pdf-to-markdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath: uploadData.storagePath,
            fileName: uploadData.fileName,
          }),
        });

        if (!ocrRes.ok) {
          const err = await ocrRes.json();
          throw new Error(err.error || 'OCR failed');
        }

        const ocrData = await ocrRes.json();
        extractedText = ocrData.text;
        report(onProgress, 'ocr', 20, `OCR tamamlandı (${ocrData.pageCount} sayfa)`);
      } else {
        throw new Error('Dosyadan metin çıkarılamadı');
      }
    } else {
      throw new Error('Geçerli bir kaynak belirtilmedi');
    }

    // Strip page markers for summarization
    const cleanText = extractedText.replace(/\[\[PAGE_\d+\]\]/g, '').trim();

    if (cleanText.length < 50) {
      throw new Error('Metin çok kısa. En az 50 karakter gerekli.');
    }

    // ── Step 2: Summarize ─────────────────────────────────────────────────

    report(onProgress, 'summarizing', 25, 'Döküman özetleniyor...');

    const sumRes = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        summaryType: 'comprehensive',
        language: formData.language,
      }),
    });

    if (!sumRes.ok) {
      const err = await sumRes.json();
      throw new Error(err.error || 'Summarization failed');
    }

    const sumData = await sumRes.json();
    const summary = sumData.summary;

    report(onProgress, 'summarizing', 35, `Özet hazır (${sumData.wordCount} kelime)`);

    // ── Step 3: Generate MCQs ─────────────────────────────────────────────

    report(onProgress, 'generating', 40, 'Sorular oluşturuluyor...');

    const mcqRes = await fetch('/api/generate-mcq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentSummary: summary,
        numQuestions: formData.numQuestions,
        difficulty: formData.difficulty,
        questionType: formData.questionType,
        topic: formData.topic,
        language: formData.language,
      }),
    });

    if (!mcqRes.ok) {
      const err = await mcqRes.json();
      throw new Error(err.error || 'MCQ generation failed');
    }

    const mcqData = await mcqRes.json();
    const questions: MCQQuestion[] = mcqData.questions;

    report(onProgress, 'generating', 85, `${questions.length} soru oluşturuldu`);

    // ── Step 4: Save quiz to DB ───────────────────────────────────────────

    report(onProgress, 'saving', 90, 'Quiz kaydediliyor...');

    const saveRes = await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId,
        title: formData.title,
        subject: formData.subject,
        grade: formData.grade,
        topic: formData.topic,
        difficulty: formData.difficulty,
        questionType: formData.questionType,
        language: formData.language,
        numQuestions: formData.numQuestions,
        sourceType: formData.sourceType,
        documentId: formData.documentId,
        sourceText: formData.sourceType === 'text' ? formData.sourceText : undefined,
        uploadedFilePath,
        uploadedFileName,
        summary,
        questionsData: questions,
        status: 'ready',
      }),
    });

    if (!saveRes.ok) {
      const err = await saveRes.json();
      throw new Error(err.error || 'Save failed');
    }

    const saveData = await saveRes.json();

    report(onProgress, 'completed', 100, 'Quiz hazır!');

    return {
      quizId: saveData.quiz.id,
      questions,
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Quiz generation failed';
    report(onProgress, 'failed', 0, message);
    throw error;
  }
}
