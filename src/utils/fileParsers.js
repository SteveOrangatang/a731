/**
 * Browser-side file parsing helpers.
 * Supports .docx (via mammoth) and .pdf (via pdfjs-dist).
 */

import mammoth from 'mammoth/mammoth.browser';

// PDF.js requires a worker. We use the pre-bundled worker from pdfjs-dist.
let pdfjsLibPromise = null;
async function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = (async () => {
      const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
      const worker = await import(
        'pdfjs-dist/build/pdf.worker.min.mjs?url'
      );
      pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjsLib;
    })();
  }
  return pdfjsLibPromise;
}

export async function extractTextFromFile(file) {
  const lower = (file.name || '').toLowerCase();
  if (lower.endsWith('.docx')) return extractDocx(file);
  if (lower.endsWith('.pdf'))  return extractPdf(file);
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return file.text();
  throw new Error('Unsupported file type. Please upload a .docx, .pdf, or .txt file.');
}

async function extractDocx(file) {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value || '').trim();
}

async function extractPdf(file) {
  const pdfjsLib = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(' ') + '\n\n';
  }
  return text.trim();
}
