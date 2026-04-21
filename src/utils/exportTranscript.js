/**
 * Export a transcript as a .doc file (HTML-based Word format).
 *
 * @param {Object} data
 * @param {Array}  data.messages
 * @param {string} data.studentName
 * @param {string} data.studentRank
 * @param {string} data.agentName
 */
export function exportTranscript(data) {
  if (!data?.messages || data.messages.length === 0) return;

  const rows = data.messages
    .map(
      (m) =>
        `<div class='m'><strong>${
          m.role === 'user'
            ? `${data.studentRank} ${data.studentName}`
            : data.agentName
        }</strong> <span class='meta'>[${new Date(
          m.timestamp,
        ).toLocaleTimeString()}]</span><br/>${m.text}</div>`,
    )
    .join('');

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;line-height:1.6}.m{margin-bottom:12px}.meta{font-size:.8em;color:#666}</style></head>
<body><h1>A731 Simulation Transcript</h1>
<p><strong>Student:</strong> ${data.studentRank} ${data.studentName}</p>
<p><strong>Interlocutor:</strong> ${data.agentName}</p><hr/>
${rows}
</body></html>`;

  const a = document.createElement('a');
  a.href =
    'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
  a.download = `A731_${data.studentName.replace(/\s+/g, '_')}.doc`;
  a.click();
}
