const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  xlsx: "XLSX",
  html: "HTML",
  htm: "HTML",
  csv: "CSV",
  tsv: "TSV",
  json: "JSON",
  xml: "XML",
  epub: "EPUB",
  zip: "ZIP",
  md: "MD",
  markdown: "MD",
  txt: "TXT",
  "plain-text": "TXT",
  png: "PNG",
  jpg: "JPEG",
  jpeg: "JPEG",
  webp: "WEBP",
  bmp: "BMP",
  image: "IMG",
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/jpg": "JPEG",
  "image/webp": "WEBP",
  "image/bmp": "BMP",
};

export function documentFormatLabel(source?: { name?: string; detectedFormat?: string }) {
  const detected = source?.detectedFormat?.toLowerCase();
  if (detected && FORMAT_LABELS[detected]) return FORMAT_LABELS[detected];
  if (detected?.startsWith("image/")) return "IMG";
  const extension = source?.name?.split(".").pop()?.toLowerCase();
  if (extension && extension !== source?.name?.toLowerCase() && FORMAT_LABELS[extension]) return FORMAT_LABELS[extension];
  return "MD";
}

export function conversionWarningLabel(count: number) {
  return `${count.toLocaleString()} warning${count === 1 ? "" : "s"}, review before you export`;
}
