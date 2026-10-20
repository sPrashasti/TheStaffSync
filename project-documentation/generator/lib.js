// Shared building blocks for the StaffSync documents, laid out like the reference templates:
// phase line, title, a Date / Team ID / Project Name / Maximum Marks table, then content.
const fs = require('fs');
const path = require('path');
const {
  AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, WidthType, LevelFormat, PageOrientation, Footer, PageNumber,
} = require('docx');

const FONT = 'Calibri';
const PREPARED = '17 October 2026';
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER, insideHorizontal: BORDER, insideVertical: BORDER };

// Inline **bold** support so table cells and paragraphs can emphasise a phrase.
const runs = (text, opts = {}) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    const bold = part.startsWith('**') && part.endsWith('**');
    return new TextRun({ text: bold ? part.slice(2, -2) : part, bold: bold || opts.bold, italics: opts.italics, size: opts.size, color: opts.color, font: FONT });
  });
};

const p = (text, opts = {}) => new Paragraph({ children: runs(text, opts), spacing: { after: opts.after ?? 120 }, alignment: opts.align });
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT, bold: true, size: 30 })], spacing: { before: 240, after: 120 } });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT, bold: true, size: 26 })], spacing: { before: 240, after: 100 } });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT, bold: true, size: 23 })], spacing: { before: 180, after: 80 } });
const bullets = (items) => items.map((t) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: runs(t), spacing: { after: 60 } }));
const numbered = (items) => items.map((t) => new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: runs(t), spacing: { after: 60 } }));
const note = (text) => new Paragraph({
  children: runs(text, { italics: true, size: 20, color: '444444' }),
  spacing: { before: 60, after: 160 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'B89A70', space: 8 } },
  indent: { left: 200 },
});

const cell = (text, { header = false, width, shade } = {}) => new TableCell({
  width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  shading: header ? { type: ShadingType.CLEAR, color: 'auto', fill: 'D9E2F3' } : shade ? { type: ShadingType.CLEAR, color: 'auto', fill: shade } : undefined,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  children: String(text ?? '').split('\n').map((line) => new Paragraph({ children: runs(line, { bold: header, size: 20 }), spacing: { after: 40 } })),
});

// headers: array of strings; rows: array of arrays; widths: percentages (optional)
const table = (headers, rows, widths) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: BORDERS,
  rows: [
    new TableRow({ tableHeader: true, children: headers.map((hd, i) => cell(hd, { header: true, width: widths?.[i] })) }),
    ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { width: widths?.[i] })) })),
  ],
});

const spacer = () => new Paragraph({ children: [], spacing: { after: 120 } });

// Header block shared by every reference document.
const header = ({ phase, title, marks }) => [
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: phase, font: FONT, bold: true, size: 28 })], spacing: { after: 60 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: title, font: FONT, bold: true, size: 26 })], spacing: { after: 200 } }),
  new Table({
    width: { size: 70, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    borders: BORDERS,
    rows: [['Date', PREPARED], ['Team ID', ''], ['Project Name', 'StaffSync — Human Resource Management System'], ['Maximum Marks', marks]].map(
      ([k, v]) => new TableRow({ children: [cell(k, { width: 35, shade: 'F2F2F2' }), cell(v, { width: 65 })] })
    ),
  }),
  spacer(),
];

// Embeds a PNG at a given display width (in pixels at 96 dpi), keeping its aspect ratio.
const image = (file, displayWidth = 620, caption) => {
  const data = fs.readFileSync(file);
  const w = data.readUInt32BE(16);
  const h = data.readUInt32BE(20);
  const width = Math.min(displayWidth, 640);
  const out = [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data, transformation: { width, height: Math.round((h / w) * width) } })], spacing: { after: 60 } })];
  if (caption) out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: caption, italics: true, size: 18, font: FONT, color: '555555' })], spacing: { after: 200 } }));
  return out;
};

const save = async (outPath, children, { landscape = false } = {}) => {
  const doc = new Document({
    creator: 'StaffSync project documentation',
    title: path.basename(outPath, '.docx'),
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    numbering: {
      config: [
        { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
        { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: landscape ? { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 } : { width: 11906, height: 16838 },
          margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
        },
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
          new TextRun({ text: 'StaffSync — ', size: 16, font: FONT, color: '777777' }),
          new TextRun({ text: path.basename(outPath, '.docx'), size: 16, font: FONT, color: '777777' }),
          new TextRun({ text: ' — page ', size: 16, font: FONT, color: '777777' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: '777777' }),
        ] })] }),
      },
      children,
    }],
  });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (fs.existsSync(outPath) && !process.env.ALLOW_REBUILD) throw new Error(`Refusing to overwrite ${outPath}`);
  fs.writeFileSync(outPath, await Packer.toBuffer(doc));
  return outPath;
};

module.exports = { p, h1, h2, h3, bullets, numbered, note, table, spacer, header, image, save, PREPARED };
