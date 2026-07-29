import type { ConversionLimits, LocalConverter } from "@/lib/converters/types";
import { ConverterError } from "@/lib/converters/error";
import {
  assertFileAllowed,
  assertGeneratedMarkdown,
  baseResult,
  escapeMarkdownText,
  markdownHeading,
  matchesFile,
  titleFromFile,
} from "@/lib/converters/helpers";

const MAX_IMAGE_HEADER_BYTES = 64 * 1024;

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
    if (file.size > context.limits.maxAssetBytes) {
      throw new ConverterError("resource-limit", "This image is too large to decode safely.");
    }
    const dimensions = await imageDimensions(file, context.limits);
    const title = titleFromFile(file);
    let extractedText = "";
    if (options.ocr) {
      context.onProgress({ stage: "ocr", message: `Loading local English OCR for “${file.name}”…` });
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        workerPath: "/tesseract/worker.min.js",
        corePath: "/tesseract/core",
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
        if (extractedText.length > context.limits.maxGeneratedMarkdownChars) {
          throw new ConverterError("resource-limit", "OCR produced too much text to open safely.");
        }
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
    assertGeneratedMarkdown(markdown, context, "image conversion");
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

async function imageDimensions(file: File, limits: ConversionLimits) {
  const header = new Uint8Array(
    await file.slice(0, MAX_IMAGE_HEADER_BYTES).arrayBuffer(),
  );
  const declared = parseImageHeader(header);
  assertImageBudget(declared, limits);
  const decoded = await new Promise<{ width: number; height: number }>((resolve, reject) => {
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
  assertImageBudget({ ...decoded, animated: false }, limits);
  return decoded;
}

export function parseImageHeader(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.byteLength >= 24 &&
    bytes[0] === 0x89 &&
    text(bytes, 1, 3) === "PNG" &&
    bytes[12] === 0x49 &&
    bytes[13] === 0x48 &&
    bytes[14] === 0x44 &&
    bytes[15] === 0x52
  ) {
    let animated = false;
    for (let offset = 8; offset + 12 <= bytes.byteLength; ) {
      const length = view.getUint32(offset, false);
      const type = text(bytes, offset + 4, 4);
      if (type === "acTL") animated = true;
      if (type === "IDAT" || length > bytes.byteLength - offset - 12) break;
      offset += 12 + length;
    }
    return {
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
      animated,
    };
  }

  if (bytes.byteLength >= 26 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.byteLength) {
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (offset + 2 > bytes.byteLength) break;
      const length = view.getUint16(offset, false);
      if (length < 2 || offset + length > bytes.byteLength) break;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        ) &&
        length >= 7
      ) {
        return {
          width: view.getUint16(offset + 5, false),
          height: view.getUint16(offset + 3, false),
          animated: false,
        };
      }
      offset += length;
    }
  }

  if (bytes.byteLength >= 30 && text(bytes, 0, 4) === "RIFF" && text(bytes, 8, 4) === "WEBP") {
    const chunkType = text(bytes, 12, 4);
    if (chunkType === "VP8X" && bytes.byteLength >= 30) {
      return {
        width: readUint24(bytes, 24) + 1,
        height: readUint24(bytes, 27) + 1,
        animated: Boolean(bytes[20] & 0x02),
      };
    }
    if (chunkType === "VP8 " && bytes.byteLength >= 30 && text(bytes, 23, 3) === "\u009d\u0001*") {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
        animated: false,
      };
    }
    if (chunkType === "VP8L" && bytes.byteLength >= 25 && bytes[20] === 0x2f) {
      return {
        width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
        height: 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10),
        animated: false,
      };
    }
  }

  if (bytes.byteLength >= 26 && text(bytes, 0, 2) === "BM") {
    return {
      width: Math.abs(view.getInt32(18, true)),
      height: Math.abs(view.getInt32(22, true)),
      animated: false,
    };
  }

  throw new ConverterError("invalid", "This image has an unsupported or malformed header.");
}

export function assertImageBudget(
  dimensions: { width: number; height: number; animated: boolean },
  limits: ConversionLimits,
) {
  const pixels = dimensions.width * dimensions.height;
  if (
    dimensions.animated ||
    !Number.isSafeInteger(pixels) ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > limits.maxImageDimension ||
    dimensions.height > limits.maxImageDimension ||
    pixels > limits.maxImagePixels
  ) {
    throw new ConverterError(
      "resource-limit",
      "This image exceeds the safe width, height, pixel, or frame limit.",
    );
  }
}

function text(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUint24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
