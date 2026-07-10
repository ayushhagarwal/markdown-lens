import type { LocalConverter } from "@/lib/converters/types";
import { ConverterError } from "@/lib/converters/error";
import { assertFileAllowed, baseResult, matchesFile } from "@/lib/converters/helpers";

export const pdfConverter: LocalConverter = {
  id: "pdf",
  label: "PDF document",
  extensions: ["pdf"],
  mimeTypes: ["application/pdf"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    const { importPdfAsMarkdown, PdfImportError } = await import("@/lib/pdf-import");
    try {
      const result = await importPdfAsMarkdown(file, ({ currentPage, totalPages }) => {
        context.onProgress({
          stage: "pages",
          current: currentPage,
          total: totalPages,
          message: `Converting page ${currentPage} of ${totalPages}…`,
        });
      });
      return baseResult(file, {
        converterId: this.id,
        detectedFormat: "pdf",
        title: result.title,
        markdown: result.markdown,
        warnings: ["PDF layout is inferred; visually complex tables and multi-column pages should be reviewed."],
        statistics: { pages: result.pageCount },
      });
    } catch (error) {
      if (error instanceof PdfImportError && error.code === "no-text") {
        throw new ConverterError("ocr-required", error.message, true);
      }
      throw error;
    }
  },
};

export const wordConverter: LocalConverter = {
  id: "word",
  label: "Word document",
  extensions: ["docx"],
  mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, _options, context) {
    assertFileAllowed(file, context);
    const { importWordAsMarkdown } = await import("@/lib/word-import");
    const result = await importWordAsMarkdown(file, ({ stage }) => {
      context.onProgress({ stage, message: `${stage[0].toUpperCase()}${stage.slice(1)} “${file.name}”…` });
    });
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: "docx",
      title: result.title,
      markdown: result.markdown,
      assets: result.assets,
      warnings: [
        ...result.warnings,
        ...(result.imageCount ? [`${result.imageCount} embedded image${result.imageCount === 1 ? " was" : "s were"} extracted as local document assets.`] : []),
      ],
      statistics: { images: result.imageCount },
    });
  },
};

export const legacyOfficeConverter: LocalConverter = {
  id: "legacy-office",
  label: "Legacy Office document",
  extensions: ["doc", "ppt", "xls"],
  mimeTypes: ["application/msword", "application/vnd.ms-powerpoint", "application/vnd.ms-excel"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file) {
    throw new ConverterError(
      "unsupported",
      `“${file.name}” uses a legacy binary Office format. Save or export it as DOCX, PPTX, or XLSX, then open it again.`,
    );
  },
};

export const documentConverters = [pdfConverter, wordConverter, legacyOfficeConverter];
