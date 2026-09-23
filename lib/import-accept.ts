export const WORKSPACE_IMPORT_ACCEPT =
  ".md,.markdown,.txt,.pdf,.docx,.pptx,.xlsx,.html,.htm,.csv,.tsv,.json,.xml,.epub,.zip,.png,.jpg,.jpeg,.webp,.bmp";

export type LandingImportTarget = {
  accept: string;
  fileLabel: string;
  rejectMessage: string;
};

const landingImports = {
  "/": {
    accept: WORKSPACE_IMPORT_ACCEPT,
    fileLabel: "Choose a file to convert",
    rejectMessage: "Drop a supported document. PDF, Word, PowerPoint, Excel, HTML, EPUB, data, images, and ZIP files can be converted here.",
  },
  "/pdf-to-markdown": {
    accept: ".pdf",
    fileLabel: "Choose a PDF to convert",
    rejectMessage: "Drop a .pdf file to convert it on this page.",
  },
  "/word-to-markdown": {
    accept: ".docx",
    fileLabel: "Choose a Word document to convert",
    rejectMessage: "Drop a .docx file to convert it on this page.",
  },
  "/pptx-to-markdown": {
    accept: ".pptx",
    fileLabel: "Choose a PowerPoint file to convert",
    rejectMessage: "Drop a .pptx file to convert it on this page.",
  },
  "/excel-to-markdown": {
    accept: ".xlsx",
    fileLabel: "Choose an Excel workbook to convert",
    rejectMessage: "Drop a .xlsx file to convert it on this page.",
  },
  "/html-to-markdown": {
    accept: ".html,.htm",
    fileLabel: "Choose an HTML file to convert",
    rejectMessage: "Drop an .html or .htm file to convert it on this page.",
  },
  "/csv-to-markdown": {
    accept: ".csv,.tsv",
    fileLabel: "Choose a CSV or TSV file to convert",
    rejectMessage: "Drop a .csv or .tsv file to convert it on this page.",
  },
  "/json-to-markdown": {
    accept: ".json",
    fileLabel: "Choose a JSON file to convert",
    rejectMessage: "Drop a .json file to convert it on this page.",
  },
  "/xml-to-markdown": {
    accept: ".xml",
    fileLabel: "Choose an XML file to convert",
    rejectMessage: "Drop an .xml file to convert it on this page.",
  },
  "/epub-to-markdown": {
    accept: ".epub",
    fileLabel: "Choose an EPUB file to convert",
    rejectMessage: "Drop an .epub file to convert it on this page.",
  },
  "/image-to-markdown": {
    accept: ".png,.jpg,.jpeg,.webp,.bmp",
    fileLabel: "Choose an image to convert",
    rejectMessage: "Drop a PNG, JPEG, WebP, or BMP image to convert it on this page.",
  },
  "/zip-to-markdown": {
    accept: ".zip",
    fileLabel: "Choose a ZIP archive to convert",
    rejectMessage: "Drop a .zip file to convert it on this page.",
  },
} as const satisfies Record<string, LandingImportTarget>;

export function landingImportFor(path: string): LandingImportTarget {
  if (path in landingImports) return landingImports[path as keyof typeof landingImports];
  return landingImports["/"];
}

export function fileMatchesAccept(file: { name: string; type?: string }, accept: string) {
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type?.toLowerCase() ?? "";
  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type.length > 0 && type === token;
  });
}
