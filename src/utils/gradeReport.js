import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Build and download a graded report as a .docx file.
 *
 * @param {Object} params
 * @param {Object} params.grade        Output of generateGrade()
 * @param {Object} params.studentMeta  { rank, lastName, email, lessonTitle }
 * @param {Array}  [params.conversations]  Preferred: [{ agentName, messages }]
 *                                         renders each persona's chat under
 *                                         its own heading.
 * @param {Array}  [params.messages]   Legacy fallback: flat message list.
 *                                     Used only if conversations is absent.
 * @param {string} params.paperText    Student's paper
 */
export async function downloadGradeReport({
  grade,
  studentMeta,
  conversations,
  messages,
  paperText,
}) {
  const doc = buildGradeReport({
    grade,
    studentMeta,
    conversations,
    messages,
    paperText,
  });
  const blob = await Packer.toBlob(doc);
  const safeName = (studentMeta.lastName || 'student').replace(/\s+/g, '_');
  const safeLesson = (studentMeta.lessonTitle || 'lesson').replace(/\s+/g, '_');
  saveAs(blob, `A731_Grade_${safeName}_${safeLesson}.docx`);
}

function headingPara(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, bold: true })],
    spacing: { before: 280, after: 140 },
  });
}

function plainPara(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text: text || '', ...opts })],
    spacing: { after: 120 },
  });
}

function buildGradeReport({ grade, studentMeta, conversations, messages, paperText }) {
  const criteria = Array.isArray(grade?.criteria) ? grade.criteria : [];
  const totalScore = grade?.totalScore ?? criteria.reduce(
    (s, c) => s + (Number(c.score) || 0), 0,
  );
  const maxTotal = grade?.maxTotal ?? criteria.reduce(
    (s, c) => s + (Number(c.maxScore) || 0), 0,
  );

  const children = [];

  // Title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'A731 Leadership Simulation — Graded Report',
      bold: true,
      size: 32,
    })],
    spacing: { after: 200 },
  }));

  // Student meta block
  children.push(plainPara(
    `Student: ${studentMeta.rank || ''} ${studentMeta.lastName || ''} (${studentMeta.email || ''})`,
    { bold: true },
  ));
  children.push(plainPara(`Lesson: ${studentMeta.lessonTitle || ''}`));
  children.push(plainPara(`Generated: ${new Date().toLocaleString()}`));
  children.push(plainPara(`Total Score: ${totalScore} / ${maxTotal}`, { bold: true }));

  // Summary section
  children.push(headingPara('Conversation Summary'));
  children.push(plainPara(grade?.summary || '(none)'));

  // Comparison section
  children.push(headingPara('Paper vs. Conversation Comparison'));
  children.push(plainPara(grade?.comparison || '(none)'));

  // Rubric table
  children.push(headingPara('Rubric Scores'));
  children.push(buildRubricTable(criteria));

  // Overall comments
  children.push(headingPara('Overall Evaluation'));
  children.push(plainPara(grade?.overallComments || '(none)'));

  // Student paper
  children.push(headingPara("Student's Submitted Paper"));
  (paperText || '(no paper submitted)').split('\n').forEach((line) => {
    children.push(plainPara(line));
  });

  // Conversation transcript — grouped by persona when conversations is given
  children.push(headingPara('Conversation Transcript'));
  const studentLabel = `${studentMeta.rank || ''} ${studentMeta.lastName || 'Student'}`.trim();

  if (Array.isArray(conversations) && conversations.length > 0) {
    conversations.forEach((conv) => {
      children.push(headingPara(
        `Conversation with ${conv.agentName || 'Persona'}`,
        HeadingLevel.HEADING_2,
      ));
      const convMsgs = (conv.messages || []).filter(
        (m) => m.id !== 'opening' || m.text,
      );
      if (convMsgs.length === 0) {
        children.push(plainPara('(no messages)', { italics: true }));
        return;
      }
      convMsgs.forEach((m) => {
        const who = m.role === 'user' ? studentLabel : (conv.agentName || 'Persona');
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${who}: `, bold: true }),
            new TextRun({ text: m.text || '' }),
          ],
          spacing: { after: 100 },
        }));
      });
    });
  } else {
    // Legacy flat-list fallback: heuristically render the SubmissionsTab
    // dividers as section headings.
    (messages || []).forEach((m) => {
      const text = m.text || '';
      const dividerMatch = text.match(/^\s*---\s*Conversation\s*\d+:\s*(.+?)\s*---\s*$/);
      if (dividerMatch) {
        children.push(headingPara(
          `Conversation with ${dividerMatch[1]}`,
          HeadingLevel.HEADING_2,
        ));
        return;
      }
      const who = m.role === 'user' ? studentLabel : 'Persona';
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${who}: `, bold: true }),
          new TextRun({ text }),
        ],
        spacing: { after: 100 },
      }));
    });
  }

  return new Document({
    sections: [{ children }],
  });
}

function buildRubricTable(criteria) {
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell('Criterion', true, 28),
      cell('Description', true, 36),
      cell('Score', true, 10),
      cell('Rationale', true, 26),
    ],
  });
  const rows = criteria.map((c) =>
    new TableRow({
      children: [
        cell(c.name || '', true, 28),
        cell(c.description || '', false, 36),
        cell(`${c.score ?? 0} / ${c.maxScore ?? '?'}`, false, 10),
        cell(c.rationale || '', false, 26),
      ],
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows],
  });
}

function cell(text, bold = false, pct = 25) {
  return new TableCell({
    width: { size: pct, type: WidthType.PERCENTAGE },
    borders: defaultBorders(),
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || '', bold })],
      }),
    ],
  });
}

function defaultBorders() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
  return { top: b, bottom: b, left: b, right: b };
}
