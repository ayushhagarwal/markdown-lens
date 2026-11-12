/** [format, extensions, workflow, important limitation, converter path] */
export const supportedFormats = [
  ["Markdown / text", "MD, MARKDOWN, TXT", "Open directly", "Source content is retained.", "/editor"],
  ["PDF", "PDF", "Text and layout inference", "Scans require local OCR; complex layout needs review.", "/pdf-to-markdown"],
  ["Word", "DOCX", "Structured conversion", "Images become local assets; legacy DOC is unsupported.", "/word-to-markdown"],
  ["PowerPoint", "PPTX", "Slide-by-slide conversion", "Animations and exact object placement are omitted.", "/pptx-to-markdown"],
  ["Excel", "XLSX", "Visible sheets to tables", "Macros, charts, and legacy XLS are unsupported.", "/excel-to-markdown"],
  ["HTML", "HTML, HTM", "Reading-order conversion", "Styling and interactive behavior are flattened.", "/html-to-markdown"],
  ["EPUB", "EPUB", "Chapter conversion", "DRM-protected and fixed-layout books are unsupported or flattened.", "/epub-to-markdown"],
  ["CSV / TSV", "CSV, TSV", "Tables from delimited text", "Merged cells and spreadsheet formatting are not represented.", "/csv-to-markdown"],
  ["JSON", "JSON", "Pretty-printed fenced text", "Invalid JSON is rejected; nested data is not tabulated.", "/json-to-markdown"],
  ["XML", "XML", "Validated fenced text", "Invalid XML is rejected; remote DTDs are not fetched.", "/xml-to-markdown"],
  ["Images", "PNG, JPG, WEBP, BMP", "Asset import + optional English OCR", "OCR does not interpret charts or diagrams.", "/image-to-markdown"],
  ["Archives", "ZIP", "Bounded supported-entry import", "100 entries, one nesting level, 128 MB expanded limit.", "/zip-to-markdown"],
] as const;
