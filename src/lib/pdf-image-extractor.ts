// Polyfill for Node.js environment
if (typeof Promise.withResolvers === 'undefined') {
    // @ts-ignore
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

if (typeof global.DOMMatrix === 'undefined') {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix {
        constructor() { }
    };
}
if (typeof global.ImageData === 'undefined') {
    // @ts-ignore
    global.ImageData = class ImageData {
        constructor() { }
    };
}
if (typeof global.Path2D === 'undefined') {
    // @ts-ignore
    global.Path2D = class Path2D {
        constructor() { }
    };
}

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { PNG } from 'pngjs';

// Define types for PDF.js image objects
interface ImageObject {
    data: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
    kind?: number; // ImageKind
}

export interface ExtractedImage {
    pageIndex: number; // 0-based
    imageIndex: number; // Index on the page
    data: Buffer;
    mimeType: string;
    width: number;
    height: number;
}

// PDF.js ImageKind enum values (approximate)
const ImageKind = {
    GRAYSCALE_1BPP: 1,
    RGB_24BPP: 2,
    RGBA_32BPP: 3,
};

/**
 * Extract images from a PDF buffer using PDF.js
 */
export async function extractImagesFromPdf(pdfBuffer: Buffer): Promise<ExtractedImage[]> {
    // Load PDF document
    // We use Uint8Array because pdfjs-dist expects standard array buffer view
    const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        verbosity: 0,
        // Standard font data is needed for text rendering, usually safe to omit for image extraction 
        // but good to have if any ops depend on it.
        standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/',
    });

    const doc = await loadingTask.promise;
    const extractedImages: ExtractedImage[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        try {
            const page = await doc.getPage(pageNum);
            const ops = await page.getOperatorList();
            const { fnArray, argsArray } = ops;

            // OPS codes for image painting
            const OPS = pdfjsLib.OPS;

            let imgIndexOnPage = 0;

            for (let i = 0; i < fnArray.length; i++) {
                const fn = fnArray[i];

                // standard paintImageXObject (85) and paintInlineImageXObject (82)
                // We explicitly check against OPS constants if available, or raw numbers if needed. 
                // OPS.paintImageXObject is reliably 85 in recent versions.

                if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
                    const arg = argsArray[i][0]; // Name string (e.g. "Img1") or inline dict

                    try {
                        let img: any;
                        if (fn === OPS.paintImageXObject) {
                            // Retrieve image from page resources
                            img = await page.objs.get(arg); // This returns the decoded image data object
                        } else {
                            img = arg; // Inline dictionary
                        }

                        // Verify we have valid image data
                        if (img && img.data && img.width > 0 && img.height > 0) {
                            // Filter out tiny images (likely icons or artifacts)
                            if (img.width < 50 || img.height < 50) continue;

                            const buffer = convertToPng(img);
                            if (buffer) {
                                extractedImages.push({
                                    pageIndex: pageNum - 1,
                                    imageIndex: imgIndexOnPage,
                                    data: buffer,
                                    mimeType: 'image/png',
                                    width: img.width,
                                    height: img.height,
                                });
                            }
                        }
                    } catch (e) {
                        console.warn(`[PDF Extract] Failed to extract image ${imgIndexOnPage} on page ${pageNum}`, e);
                    }
                    imgIndexOnPage++;
                }
            }
        } catch (err) {
            console.warn(`[PDF Extract] Error processing page ${pageNum}`, err);
        }
    }

    return extractedImages;
}

/**
 * Convert raw PDF image data (RGB/RGBA/Gray) to PNG buffer using pngjs
 */
function convertToPng(img: ImageObject): Buffer | null {
    const { width, height, data, kind } = img;

    // Create a new PNG instance
    const png = new PNG({ width, height });

    // PDF.js returns data in different formats based on 'kind'
    // We need to normalize to RGBA for PNG

    try {
        if (kind === ImageKind.RGBA_32BPP) {
            // Already RGBA (4 bytes per pixel)
            if (data.length === width * height * 4) {
                for (let i = 0; i < data.length; i++) {
                    png.data[i] = data[i];
                }
            } else {
                return null;
            }
        } else if (kind === ImageKind.RGB_24BPP) {
            // RGB (3 bytes per pixel) -> RGBA
            if (data.length === width * height * 3) {
                let j = 0;
                for (let i = 0; i < width * height * 4; i += 4) {
                    png.data[i] = data[j];     // R
                    png.data[i + 1] = data[j + 1]; // G
                    png.data[i + 2] = data[j + 2]; // B
                    png.data[i + 3] = 255;     // Alpha full
                    j += 3;
                }
            } else {
                return null;
            }
        } else if (kind === ImageKind.GRAYSCALE_1BPP) {
            // Grayscale usually (1 byte per pixel if decoded by PDF.js) 
            // Note: PDF.js usually expands 1BPP to 8BPP (1 byte per pixel) in 'data'
            if (data.length === width * height) {
                for (let i = 0; i < width * height; i++) {
                    const val = data[i];
                    const idx = i * 4;
                    png.data[idx] = val; // R
                    png.data[idx + 1] = val; // G
                    png.data[idx + 2] = val; // B
                    png.data[idx + 3] = 255; // Alpha
                }
            } else {
                return null;
            }
        } else {
            // Unsupported kind or masks
            return null;
        }

        // Write to buffer synchronously
        return PNG.sync.write(png);
    } catch (err) {
        console.error('[PDF Extract] PNG conversion failed', err);
        return null;
    }
}
