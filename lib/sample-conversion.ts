import { convertPdfPagesToMarkdown, type PdfTextSpan } from "@/lib/pdf-to-markdown";

const SAMPLE_PAGE = {
  title: "Sample handbook",
  lines: [
    { text: "Sample handbook", x: 72, y: 720, fontSize: 22 },
    { text: "Overview", x: 72, y: 688, fontSize: 12 },
    { text: "Keep decisions documented.", x: 72, y: 668, fontSize: 12 },
  ],
};

function span(text: string, x: number, y: number, fontSize: number): PdfTextSpan {
  return {
    text,
    x,
    y,
    width: Math.max(text.length * fontSize * 0.5, 1),
    height: fontSize,
    fontSize,
    fontName: "Helvetica",
  };
}

export const sampleHandbookLines = SAMPLE_PAGE.lines.map((line) => line.text);

/** Markdown the PDF converter writes for the bundled sample handbook page. */
export const sampleHandbookMarkdown = convertPdfPagesToMarkdown({
  title: SAMPLE_PAGE.title,
  pages: [
    {
      pageNumber: 1,
      width: 612,
      height: 792,
      spans: SAMPLE_PAGE.lines.map((line) => span(line.text, line.x, line.y, line.fontSize)),
    },
  ],
});
