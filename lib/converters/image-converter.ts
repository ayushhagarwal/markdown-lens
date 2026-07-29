import type { LocalConverter } from "@/lib/converters/types";
import {
  assertFileAllowed,
  baseResult,
  escapeMarkdownText,
  markdownHeading,
  matchesFile,
  titleFromFile,
} from "@/lib/converters/helpers";

export const imageConverter: LocalConverter = {
  id: "image",
  label: "Image with optional OCR",
  extensions: ["png", "jpg", "jpeg", "webp", "bmp"],
  mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/bmp"],
  canConvert(file, hints) {
    return matchesFile(file, this.extensions, this.mimeTypes, hints);
  },
  async convert(file, options, context) {
    assertFileAllowed(file, context);
    const dimensions = await imageDimensions(file);
    const title = titleFromFile(file);
    let extractedText = "";
    if (options.ocr) {
      context.onProgress({ stage: "ocr", message: `Loading local English OCR for “${file.name}”…` });
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        langPath: "/tessdata",
        logger(message) {
          if (message.status === "recognizing text") {
            context.onProgress({
              stage: "ocr",
              current: Math.round((message.progress ?? 0) * 100),
              total: 100,
              message: `Recognizing text locally… ${Math.round((message.progress ?? 0) * 100)}%`,
            });
          }
        },
      });
      try {
        const result = await worker.recognize(file);
        extractedText = result.data.text.trim();
      } finally {
        await worker.terminate();
      }
    }
    const imageName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const safeTitle = escapeMarkdownText(title);
    const metadata = [`- Dimensions: ${dimensions.width} × ${dimensions.height}`, `- Type: ${file.type || "image"}`, `- Size: ${formatBytes(file.size)}`].join("\n");
    const markdown = [
      markdownHeading(1, title),
      `![${safeTitle}](assets/${imageName})`,
      "## Image details",
      metadata,
      extractedText ? `## Extracted text\n\n${extractedText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    return baseResult(file, {
      converterId: this.id,
      detectedFormat: file.type || "image",
      title,
      markdown: `${markdown}\n`,
      assets: [{ name: imageName, mimeType: file.type, blob: file, altText: title, sourceLocation: file.name }],
      warnings: options.ocr && !extractedText ? ["OCR did not find readable English text in this image."] : [],
      statistics: { width: dimensions.width, height: dimensions.height },
      usedOcr: Boolean(options.ocr),
    });
  },
};

function imageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      reject(new Error("This image could not be decoded."));
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
