import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  Footer,
  PageNumber,
} from 'docx';
import { saveAs } from 'file-saver';

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: text || '', ...opts })],
  });
}

function H(text, level = 2) {
  const heading = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
  return new Paragraph({
    heading,
    children: [new TextRun({ text, bold: true })],
  });
}

function blockFromMultiline(text) {
  // Honors blank lines and bullet/dash-prefixed lines, otherwise renders each
  // non-empty line as its own paragraph for readable layout in Word.
  if (!text) return [];
  const lines = String(text).split('\n');
  const paras = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      paras.push(new Paragraph({ children: [new TextRun('')] }));
      continue;
    }
    if (/^\s*[•\-\*]\s+/.test(line)) {
      paras.push(
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 60 },
          children: [
            new TextRun({ text: line.replace(/^\s*[•\-\*]\s+/, '') }),
          ],
        }),
      );
    } else {
      paras.push(P(line));
    }
  }
  return paras;
}

/**
 * Export a lesson's overview (description + objectives + your role) as .docx.
 *
 * @param {Object} args
 * @param {Object} args.lesson    { id, title, description, objectives, studentInstructions }
 * @param {Object} [args.profile] Used in the footer (rank + lastName).
 */
export async function exportLessonOverviewDocx({ lesson, profile } = {}) {
  if (!lesson) throw new Error('No lesson to export.');
  const safeLesson = `${lesson.id || 'lesson'}`.replace(
    /[^A-Za-z0-9_-]+/g,
    '_',
  );
  const safeName = `${profile?.lastName || 'student'}`.replace(
    /[^A-Za-z0-9_-]+/g,
    '_',
  );
  const fileName = `A731_Overview_${safeLesson}_${safeName}.docx`;

  const sections = [
    H(lesson.title || lesson.id || 'Scenario overview', 1),
  ];

  if (lesson.description) {
    sections.push(H('Scenario context', 2));
    sections.push(...blockFromMultiline(lesson.description));
  }

  if (lesson.objectives) {
    sections.push(H('Learning objectives', 2));
    sections.push(...blockFromMultiline(lesson.objectives));
  }

  if (lesson.studentInstructions) {
    sections.push(H('Your role', 2));
    sections.push(...blockFromMultiline(lesson.studentInstructions));
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
                    text:
                      `${profile?.rank || ''} ${profile?.lastName || ''}`.trim() ||
                      'Scenario overview',
                    size: 18,
                    color: '888888',
                  }),
                  new TextRun({ text: ' · Page ', size: 18, color: '888888' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '888888',
                  }),
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
