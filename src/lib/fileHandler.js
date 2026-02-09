/**
 * Unified Multimedia Input Gatekeeper — routing for paste, drag-and-drop, and file picker.
 *
 * All images are passed directly to the model as attachments.
 * Vision is handled by LM Studio's vision-capable models (Qwen3-VL-4B, 8B, etc).
 * PDFs are rendered to page images client-side, then attached for the vision model to OCR.
 * Text/code files are read and prepended as context.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href;

/**
 * Render a single PDF page to a PNG Blob at the given scale.
 * @param {Object} page - pdf.js page object
 * @param {number} scale - render scale (2 = 2x resolution for better OCR)
 * @returns {Promise<Blob>}
 */
async function renderPageToBlob(page, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Convert a PDF file into an array of image Files (one per page).
 * @param {File} file - PDF file
 * @returns {Promise<File[]>} Array of PNG image files, one per page
 */
async function pdfToImages(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const blob = await renderPageToBlob(page);
    if (blob) {
      const name = `${file.name.replace(/\.pdf$/i, '')}_page${i}.png`;
      images.push(new File([blob], name, { type: 'image/png' }));
    }
  }

  return images;
}

/**
 * Read a text/code file as string (e.g. .txt, .py).
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Route a single file: images are attached directly (LM Studio vision models handle them).
 * PDFs are rendered to page images and attached for the vision model to OCR.
 * Text/code files are read and prepended as context.
 * @param {File} file
 * @param {Object} options
 * @param {string} options.modelId - Current effective model id (kept for API compat)
 * @returns {Promise<{ prepend: string } | { imageFile: File } | { imageFiles: File[] } | null>}
 */
export async function routeFile(file, { modelId } = {}) {
  const name = file.name || "";
  const type = file.type || "";
  const lower = name.toLowerCase();

  // Image — always attach directly; the vision model handles it
  if (
    type.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".bmp", ".svg"].some((e) => lower.endsWith(e))
  ) {
    return { imageFile: file };
  }

  // PDF — render each page to an image, attach all for vision model OCR
  if (type === "application/pdf" || lower.endsWith(".pdf")) {
    const pageImages = await pdfToImages(file);
    if (pageImages.length === 0) {
      return { prepend: `[File: ${name} — Could not render PDF pages.]\n\n` };
    }
    // Return all page images for attachment
    return { imageFiles: pageImages, prepend: `[PDF: ${name} — ${pageImages.length} page(s) attached as images for OCR]\n\n` };
  }

  // Text / code files — read and prepend as context
  if (
    type === "text/plain" ||
    type.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".py") ||
    lower.endsWith(".js") ||
    lower.endsWith(".ts") ||
    lower.endsWith(".json") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".xml") ||
    lower.endsWith(".yaml") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".toml") ||
    lower.endsWith(".cfg") ||
    lower.endsWith(".ini") ||
    lower.endsWith(".sh") ||
    lower.endsWith(".bat") ||
    lower.endsWith(".html") ||
    lower.endsWith(".css")
  ) {
    const text = await readTextFile(file);
    const prepend = `[File: ${name}]\n${text}\n\n`;
    return { prepend };
  }

  return null;
}

/**
 * Process multiple files and aggregate prepend text; collect image files for vision model.
 * @param {FileList | File[]} files
 * @param {Object} options - { modelId }
 * @returns {Promise<{ prepend: string, imageFiles: File[] }>}
 */
export async function routeFiles(files, { modelId } = {}) {
  const list = Array.from(files || []);
  let prepend = "";
  const imageFiles = [];
  for (const file of list) {
    try {
      const result = await routeFile(file, { modelId });
      if (!result) continue;
      if (result.prepend) prepend += result.prepend;
      if (result.imageFile) imageFiles.push(result.imageFile);
      if (result.imageFiles) imageFiles.push(...result.imageFiles);
    } catch (e) {
      console.warn("fileHandler routeFile error:", e);
      prepend += `[File: ${file.name} — error: ${e.message}]\n\n`;
    }
  }
  return { prepend, imageFiles };
}
