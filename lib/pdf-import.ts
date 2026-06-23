import {
  convertPdfPagesToMarkdown,
  type PdfPageInput,
  type PdfTextSpan,
} from "@/lib/pdf-to-markdown";

export const PDF_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;

export type PdfImportProgress = {
  currentPage: number;
  totalPages: number;
};

export class PdfImportError extends Error {
  code: "too-large" | "password" | "invalid" | "no-text" | "unknown";

  constructor(code: PdfImportError["code"], message: string) {
    super(message);
    this.name = "PdfImportError";
    this.code = code;
  }
}

export async function importPdfAsMarkdown(
  file: File,
  onProgress: (progress: PdfImportProgress) => void,
) {
  if (file.size > PDF_SIZE_LIMIT_BYTES) {
    throw new PdfImportError("too-large", "PDF files must be 100 MB or smaller.");
  }

  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: bytes });

    try {
      const document = await loadingTask.promise;
      const metadata = await document.getMetadata().catch(() => null);
      const metadataTitle =
        metadata?.info && "Title" in metadata.info && typeof metadata.info.Title === "string"
          ? metadata.info.Title
          : "";
      const usefulMetadataTitle = /^(?:untitled|document)$/i.test(metadataTitle.trim())
        ? ""
        : metadataTitle.trim();
      const title = usefulMetadataTitle || file.name.replace(/\.pdf$/i, "") || "Imported PDF";
      const pages: PdfPageInput[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        onProgress({ currentPage: pageNumber, totalPages: document.numPages });
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const [textContent, annotations] = await Promise.all([
          page.getTextContent(),
          page.getAnnotations({ intent: "display" }),
        ]);

        const spans: PdfTextSpan[] = textContent.items.flatMap((item) => {
          if (!("str" in item) || item.str.trim().length === 0) return [];
          const fontSize = Math.hypot(item.transform[2], item.transform[3]);
          return [
            {
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height,
              fontSize: fontSize || item.height || 12,
              fontName: `${item.fontName} ${textContent.styles[item.fontName]?.fontFamily ?? ""}`,
            },
          ];
        });
        const links = annotations.flatMap((annotation) => {
          if ("url" in annotation && typeof annotation.url === "string") {
            return [annotation.url];
          }
          return [];
        });

        pages.push({
          pageNumber,
          width: viewport.width,
          height: viewport.height,
          spans,
          links,
        });

        page.cleanup();
        await yieldToBrowser();
      }

      try {
        return {
          markdown: convertPdfPagesToMarkdown({ title, pages }),
          title,
          pageCount: pages.length,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "NoExtractablePdfTextError") {
          throw new PdfImportError(
            "no-text",
            "This PDF has no extractable text. Scanned PDFs need OCR, which is not supported yet.",
          );
        }
        throw error;
      }
    } finally {
      await loadingTask.destroy().catch(() => undefined);
    }
  } catch (error) {
    if (error instanceof PdfImportError) throw error;
    if (error instanceof Error && /password/i.test(`${error.name} ${error.message}`)) {
      throw new PdfImportError(
        "password",
        "This PDF is password-protected. Remove the password and try again.",
      );
    }
    if (
      error instanceof Error &&
      /invalid|malformed|format/i.test(`${error.name} ${error.message}`)
    ) {
      throw new PdfImportError(
        "invalid",
        "This PDF could not be read. It may be invalid or corrupt.",
      );
    }
    throw new PdfImportError("unknown", "Could not convert this PDF. Please try another file.");
  }
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}
