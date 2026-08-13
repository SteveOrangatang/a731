import { describe, it, expect, vi, beforeEach } from 'vitest';

// mammoth is a browser bundle; the tests only care that extractTextFromFile
// hands it the file's bytes and trims what comes back.
const extractRawText = vi.fn();
vi.mock('mammoth/mammoth.browser', () => ({
  default: { extractRawText: (...args) => extractRawText(...args) },
}));

const { detectFileKind, extractPdfDocumentText, extractTextFromFile, SUPPORTED_EXTENSION_LIST } =
  await import('../fileParsers.js');

/** Minimal stand-in for a browser File. */
function fakeFile(name, contents = '') {
  return {
    name,
    async text() {
      return contents;
    },
    async arrayBuffer() {
      return new TextEncoder().encode(contents).buffer;
    },
  };
}

/** Minimal stand-in for a pdfjs PDFDocumentProxy. */
function fakePdf(pages) {
  return {
    numPages: pages.length,
    async getPage(n) {
      return {
        async getTextContent() {
          return { items: pages[n - 1].map((str) => ({ str })) };
        },
      };
    },
  };
}

describe('detectFileKind', () => {
  it('routes each supported extension', () => {
    expect(detectFileKind('paper.docx')).toBe('docx');
    expect(detectFileKind('paper.pdf')).toBe('pdf');
    expect(detectFileKind('paper.txt')).toBe('text');
    expect(detectFileKind('notes.md')).toBe('text');
  });

  it('ignores extension case', () => {
    expect(detectFileKind('PAPER.DOCX')).toBe('docx');
    expect(detectFileKind('Paper.Pdf')).toBe('pdf');
  });

  it('uses only the final extension', () => {
    expect(detectFileKind('Smith.Ethics.Paper.docx')).toBe('docx');
    expect(detectFileKind('archive.docx.pdf')).toBe('pdf');
  });

  it('tolerates whitespace around the name', () => {
    expect(detectFileKind('  paper.docx  ')).toBe('docx');
  });

  it('rejects unsupported types', () => {
    expect(detectFileKind('paper.doc')).toBeNull();
    expect(detectFileKind('paper.pages')).toBeNull();
    expect(detectFileKind('scan.png')).toBeNull();
  });

  it('rejects names with no extension', () => {
    expect(detectFileKind('paper')).toBeNull();
    expect(detectFileKind('')).toBeNull();
    expect(detectFileKind(null)).toBeNull();
    expect(detectFileKind(undefined)).toBeNull();
  });

  it('does not treat a dotfile stem as an extension match', () => {
    expect(detectFileKind('.docx')).toBe('docx');
    expect(detectFileKind('.gitignore')).toBeNull();
  });

  it('agrees with the exported extension list', () => {
    expect(SUPPORTED_EXTENSION_LIST).toEqual(['.docx', '.pdf', '.txt', '.md']);
    for (const ext of SUPPORTED_EXTENSION_LIST) {
      expect(detectFileKind(`paper${ext}`)).not.toBeNull();
    }
  });
});

describe('extractPdfDocumentText', () => {
  it('joins the text items on a page with spaces', async () => {
    const text = await extractPdfDocumentText(fakePdf([['Ethical', 'decision', 'making']]));
    expect(text).toBe('Ethical decision making');
  });

  it('separates pages with a blank line', async () => {
    const text = await extractPdfDocumentText(fakePdf([['page one'], ['page two']]));
    expect(text).toBe('page one\n\npage two');
  });

  it('trims the trailing page separator', async () => {
    const text = await extractPdfDocumentText(fakePdf([['only page']]));
    expect(text).toBe('only page');
    expect(text.endsWith('\n')).toBe(false);
  });

  it('reads every page in order', async () => {
    const doc = fakePdf([['a'], ['b'], ['c']]);
    const spy = vi.spyOn(doc, 'getPage');
    await extractPdfDocumentText(doc);
    expect(spy.mock.calls.map(([n]) => n)).toEqual([1, 2, 3]);
  });

  it('handles a page with no text items', async () => {
    expect(await extractPdfDocumentText(fakePdf([['intro'], [], ['outro']]))).toBe(
      'intro\n\n\n\noutro',
    );
  });

  it('returns an empty string for a document with no pages', async () => {
    expect(await extractPdfDocumentText(fakePdf([]))).toBe('');
  });
});

describe('extractTextFromFile', () => {
  beforeEach(() => {
    extractRawText.mockReset();
  });

  it('reads a .txt file directly and trims it', async () => {
    const text = await extractTextFromFile(fakeFile('paper.txt', '\n  my paper  \n'));
    expect(text).toBe('my paper');
  });

  it('reads a .md file directly', async () => {
    expect(await extractTextFromFile(fakeFile('notes.md', '# Notes'))).toBe('# Notes');
  });

  it('routes .docx through mammoth and trims the result', async () => {
    extractRawText.mockResolvedValue({ value: '  extracted docx text \n' });
    const file = fakeFile('paper.docx', 'PK-zip-bytes');

    const text = await extractTextFromFile(file);

    expect(text).toBe('extracted docx text');
    expect(extractRawText).toHaveBeenCalledTimes(1);
    const [{ arrayBuffer }] = extractRawText.mock.calls[0];
    expect(new TextDecoder().decode(arrayBuffer)).toBe('PK-zip-bytes');
  });

  it('returns an empty string when mammoth finds no text', async () => {
    extractRawText.mockResolvedValue({ value: '' });
    expect(await extractTextFromFile(fakeFile('empty.docx'))).toBe('');

    extractRawText.mockResolvedValue({});
    expect(await extractTextFromFile(fakeFile('empty.docx'))).toBe('');
  });

  it('propagates a mammoth failure so the UI can surface it', async () => {
    extractRawText.mockRejectedValue(new Error('not a valid zip file'));
    await expect(extractTextFromFile(fakeFile('corrupt.docx'))).rejects.toThrow(
      'not a valid zip file',
    );
  });

  it('rejects an unsupported extension with a user-facing message', async () => {
    await expect(extractTextFromFile(fakeFile('paper.doc'))).rejects.toThrow(
      /Unsupported file type/,
    );
  });

  it('rejects a file with no name', async () => {
    await expect(extractTextFromFile({})).rejects.toThrow(/Unsupported file type/);
    await expect(extractTextFromFile(null)).rejects.toThrow(/Unsupported file type/);
  });
});
