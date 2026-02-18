/**
 * OCR Service — Mistral OCR for scanned PDFs
 *
 * Converts scanned/image-based PDFs to markdown text using
 * Mistral's OCR API (mistral-ocr-latest).
 */

export interface ExtractedOCRImage {
  id: string;
  pageNumber: number;
  imageIndex: number;
  base64: string;
  mimeType: string;
  bbox?: {
    topLeftX: number;
    topLeftY: number;
    bottomRightX: number;
    bottomRightY: number;
  };
  description: string;
}

export interface OCRResult {
  text: string;
  images: ExtractedOCRImage[];
  pageCount: number;
  fileName: string;
}

/**
 * Check if Mistral OCR is configured
 */
export function isOCRConfigured(): boolean {
  return !!process.env.MISTRAL_API_KEY;
}

/**
 * Convert a PDF URL to markdown text using Mistral OCR
 */
export async function convertPdfToMarkdown(
  pdfUrl: string,
  fileName: string
): Promise<OCRResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('MISTRAL_API_KEY is not configured');
  }

  // Validate URL is accessible
  const headResponse = await fetch(pdfUrl, {
    method: 'HEAD',
    redirect: 'follow',
  });
  if (!headResponse.ok) {
    throw new Error(`PDF URL is not accessible: ${headResponse.status}`);
  }

  // Call Mistral OCR API
  const response = await fetch('https://api.mistral.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        document_url: pdfUrl,
      },
      include_image_base64: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral OCR error (${response.status}): ${errorText}`);
  }

  const ocrResponse = await response.json();
  const pages = ocrResponse.pages || [];

  // Extract combined text
  const text = extractCombinedText(pages);

  // Extract images
  const images = extractImagesWithPositions(pages);

  return {
    text,
    images,
    pageCount: pages.length,
    fileName: fileName.replace(/\.pdf$/i, '.txt'),
  };
}

/**
 * Combine page markdown into a single document with page markers
 */
function extractCombinedText(
  pages: Array<{ markdown: string }>
): string {
  const parts: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    if (pages.length > 1) {
      parts.push(`--- Page ${i + 1} ---`);
    }
    parts.push(pages[i].markdown || '');
  }

  return parts.join('\n\n');
}

/**
 * Extract images with position data from OCR pages
 */
function extractImagesWithPositions(
  pages: Array<{ images?: Array<{ id?: string; image_base64?: string; top_left_x?: number; top_left_y?: number; bottom_right_x?: number; bottom_right_y?: number }> }>
): ExtractedOCRImage[] {
  const images: ExtractedOCRImage[] = [];
  let globalIndex = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageImages = pages[pageIdx].images || [];

    for (const img of pageImages) {
      const imageId = img.id || `img_page${pageIdx + 1}_${globalIndex}`;

      // Infer MIME type from image ID or default to JPEG
      let mimeType = 'image/jpeg';
      if (imageId.endsWith('.png')) mimeType = 'image/png';
      else if (imageId.endsWith('.webp')) mimeType = 'image/webp';

      // Extract base64 data (strip data URI prefix if present)
      let base64 = img.image_base64 || '';
      if (base64.startsWith('data:')) {
        const commaIdx = base64.indexOf(',');
        if (commaIdx > 0) {
          const prefix = base64.slice(0, commaIdx);
          if (prefix.includes('image/png')) mimeType = 'image/png';
          else if (prefix.includes('image/webp')) mimeType = 'image/webp';
          base64 = base64.slice(commaIdx + 1);
        }
      }

      images.push({
        id: imageId,
        pageNumber: pageIdx + 1,
        imageIndex: globalIndex,
        base64,
        mimeType,
        bbox:
          img.top_left_x != null
            ? {
                topLeftX: img.top_left_x,
                topLeftY: img.top_left_y!,
                bottomRightX: img.bottom_right_x!,
                bottomRightY: img.bottom_right_y!,
              }
            : undefined,
        description: `Image ${globalIndex + 1} from page ${pageIdx + 1}`,
      });

      globalIndex++;
    }
  }

  return images;
}
