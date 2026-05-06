import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ShadingType,
  Footer,
  PageNumber,
} from 'docx';
import { saveAs } from 'file-saver';

const PATH_FILL = {
  optimal: 'D1FAE5',
  acceptable: 'DBEAFE',
  suboptimal: 'FEF3C7',
  catastrophic: 'FEE2E2',
};

const PERFORMANCE_FILL = {
  Strong: 'D1FAE5',
  Adequate: 'DBEAFE',
  Weak: 'FEF3C7',
  Skipped: 'E5E7EB',
};

function pathKey(label) {
  if (!label) return 'suboptimal';
  const lower = label.toLowerCase();
  if (lower.startsWith('optimal')) return 'optimal';
  if (lower.startsWith('acceptable')) return 'acceptable';
  if (lower.startsWith('catastrophic')) return 'catastrophic';
  return 'suboptimal';
}

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: text || '', ...opts })],
  });
}

function H(text, level) {
  const heading =
    level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
  return new Paragraph({
    heading,
    children: [new TextRun({ text, bold: true })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text })],
  });
}

function pathVerdictBlock(analysis) {
  const fill = PATH_FILL[pathKey(analysis.pathLabel)] || 'E5E7EB';
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill, type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 240, right: 240 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Outcome path: ', bold: true, size: 24 }),
                  new TextRun({ text: analysis.pathLabel || 'Unknown', bold: true, size: 28 }),
                  ...(typeof analysis.pathConfidence === 'number'
                    ? [
                        new TextRun({
                          text: `   (confidence ${(analysis.pathConfidence * 100).toFixed(0)}%)`,
                          size: 20,
                          color: '555555',
                        }),
                      ]
                    : []),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function personaCell(text, opts = {}) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
  return new TableCell({
    borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
    width: { size: opts.width || 4680, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: text || '', size: 20, bold: opts.bold })] })],
  });
}

function personaTable(interactions) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        personaCell('Persona', { width: 2400, fill: 'E5E7EB', bold: true }),
        personaCell('Performance', { width: 1600, fill: 'E5E7EB', bold: true }),
        personaCell('Observations', { width: 5360, fill: 'E5E7EB', bold: true }),
      ],
    }),
    ...interactions.map((p) => {
      const perfFill = PERFORMANCE_FILL[p.performance] || 'F3F4F6';
      const archetype = p.archetype ? ` · ${p.archetype}` : '';
      const role = p.role ? ` (${p.role})` : '';
      return new TableRow({
        children: [
          personaCell(`${p.agentName || ''}${role}${archetype}`, { width: 2400 }),
          personaCell(p.performance || '—', { width: 1600, fill: perfFill, bold: true }),
          personaCell(p.observations || '', { width: 5360 }),
        ],
      });
    }),
  ];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2400, 1600, 5360],
    rows,
  });
}

/**
 * Export a generated analysis as a .docx file.
 *
 * @param {Object} args
 * @param {Object} args.analysis     The result from generateAnalysis().
 * @param {Object} args.lesson       The lesson record.
 * @param {Object} args.profile      Student profile { rank, lastName, email }.
 * @param {Date}   [args.generatedAt] Defaults to now.
 */
export async function exportAnalysisDocx({ analysis, lesson, profile, generatedAt } = {}) {
  if (!analysis) throw new Error('No analysis to export.');

  const stamp = generatedAt ? new Date(generatedAt) : new Date();
  const safeName = `${profile?.lastName || 'student'}`.replace(/[^A-Za-z0-9_-]+/g, '_');
  const safeLesson = `${lesson?.id || 'lesson'}`.replace(/[^A-Za-z0-9_-]+/g, '_');
  const fileName = `A731_Analysis_${safeLesson}_${safeName}_${stamp
    .toISOString()
    .slice(0, 10)}.docx`;

  const sections = [
    H('A731 Scenario Analysis', 1),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Student: ', bold: true }),
        new TextRun({ text: `${profile?.rank || ''} ${profile?.lastName || ''}`.trim() || '—' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Scenario: ', bold: true }),
        new TextRun({ text: lesson?.title || lesson?.id || '—' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Generated: ', bold: true }),
        new TextRun({ text: stamp.toLocaleString() }),
      ],
    }),
    pathVerdictBlock(analysis),
    new Paragraph({ children: [new TextRun('')] }),
  ];

  if (analysis.summary) {
    sections.push(H('Summary', 2));
    sections.push(P(analysis.summary));
  }

  if (analysis.outcomeNarrative) {
    sections.push(H('Real-world outcome', 2));
    sections.push(P(analysis.outcomeNarrative));
  }

  if (Array.isArray(analysis.personaInteractions) && analysis.personaInteractions.length > 0) {
    sections.push(H('Per-persona feedback', 2));
    sections.push(personaTable(analysis.personaInteractions));
    sections.push(new Paragraph({ children: [new TextRun('')] }));
  }

  if (Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) {
    sections.push(H('Recommendations', 2));
    for (const r of analysis.recommendations) {
      sections.push(bullet(r));
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 32, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'A731 Simulator · ',
                    size: 18,
                    color: '888888',
                  }),
                  new TextRun({
                    text: `${profile?.rank || ''} ${profile?.lastName || ''}`.trim() || 'Analysis',
                    size: 18,
                    color: '888888',
                  }),
                  new TextRun({ text: ' · Page ', size: 18, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
  return fileName;
}
