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

/** File extensions we can pull text out of, mapped to their parser. */
const SUPPORTED_EXTENSIONS = {
  '.docx': 'docx',
  '.pdf': 'pdf',
  '.txt': 'text',
  '.md': 'text',
};

export const SUPPORTED_EXTENSION_LIST = Object.keys(SUPPORTED_EXTENSIONS);

/**
 * Decide which parser a filename routes to, based on its extension.
 *
 * Students upload straight from Word / a browser download folder, so the
 * name can carry mixed case, trailing spaces, or dots in the stem
 * ("Smith.Ethics.Paper.DOCX"). Only the final extension decides.
 *
 * @param {string} name  The file name.
 * @returns {'docx'|'pdf'|'text'|null}  null when the type isn't supported.
 */
export function detectFileKind(name) {
  const lower = String(name || '').trim().toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot === -1) return null;
  return SUPPORTED_EXTENSIONS[lower.slice(dot)] || null;
}

export async function extractTextFromFile(file) {
  const kind = detectFileKind(file?.name);
  if (kind === 'docx') return extractDocx(file);
  if (kind === 'pdf') return extractPdf(file);
  if (kind === 'text') return (await file.text()).trim();
  throw new Error('Unsupported file type. Please upload a .docx, .pdf, or .txt file.');
}

async function extractDocx(file) {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return (result.value || '').trim();
}

/**
 * Concatenate the text of every page in an already-loaded PDF document.
 * Pages are separated by a blank line so paragraph structure survives into
 * the graded transcript.
 *
 * Takes the pdfjs document rather than the file so the page-walking logic
 * stays testable without spinning up the PDF worker.
 *
 * @param {{ numPages: number, getPage: (n: number) => Promise<Object> }} doc
 * @returns {Promise<string>}
 */
export async function extractPdfDocumentText(doc) {
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += (content.items || []).map((it) => it.str).join(' ') + '\n\n';
  }
  return text.trim();
}

async function extractPdf(file) {
  const pdfjsLib = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  return extractPdfDocumentText(doc);
}
