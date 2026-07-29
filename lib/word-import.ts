import {
  convertWordHtmlToMarkdown,
  NoExtractableWordTextError,
} from "@/lib/word-to-markdown";
import { zipSync } from "fflate";
import { extractBoundedZip } from "@/lib/converters/bounded-zip";
import {
  DEFAULT_CONVERSION_LIMITS,
  type ConversionLimits,
} from "@/lib/converters/types";
import { ConverterError } from "@/lib/converters/error";

export const WORD_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;

export type WordImportProgress = {
  stage: "reading" | "converting" | "finishing";
};

export class WordImportError extends Error {
  code: "too-large" | "legacy-doc" | "invalid" | "no-text" | "resource-limit" | "unknown";

  constructor(code: WordImportError["code"], message: string) {
    super(message);
    this.name = "WordImportError";
    this.code = code;
  }
}

type MammothModule = typeof import("mammoth");
type TurndownModule = typeof import("turndown");

const WORD_STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => p:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
  "p[style-name='Heading 4'] => h5:fresh",
  "p[style-name='Heading 5'] => h6:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "r[style-name='Code'] => code",
  "p[style-name='Code'] => pre:fresh",
  "p[style-name='Source Code'] => pre:fresh",
  "p[style-name='Preformatted Text'] => pre:fresh",
  "strike => del",
  "comment-reference => sup",
];

export async function importWordAsMarkdown(
  file: File,
  onProgress: (progress: WordImportProgress) => void,
  limits: ConversionLimits = DEFAULT_CONVERSION_LIMITS,
  signal: AbortSignal = new AbortController().signal,
) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "doc") {
    throw new WordImportError(
      "legacy-doc",
      "Legacy .doc files are not converted in-browser. Open the document in Word or Google Docs, save/export it as .docx, then upload it again.",
    );
  }

  if (file.size > WORD_SIZE_LIMIT_BYTES) {
    throw new WordImportError("too-large", "Word files must be 100 MB or smaller.");
  }

  try {
    onProgress({ stage: "reading" });
    const [{ default: mammothDefault, ...mammothNamespace }, turndownModule, { gfm }] =
      await Promise.all([
        import("mammoth"),
        import("turndown"),
        import("turndown-plugin-gfm"),
      ]);
    const mammoth = resolveDefaultModule(mammothDefault, mammothNamespace) as MammothModule;
    const TurndownService = resolveDefaultModule(
      turndownModule.default,
      turndownModule,
    ) as TurndownModule;
    const title = file.name.replace(/\.docx$/i, "") || "Imported Word Document";
    const { entries } = await extractBoundedZip(
      file,
      {
        signal,
        onProgress: () => undefined,
        limits,
      },
      (entry) =>
        !entry.directory &&
        (entry.name === "[Content_Types].xml" ||
          entry.name.startsWith("_rels/") ||
          entry.name.startsWith("word/")),
    );
    const packageBytes = zipSync(entries, { level: 0 });
    const arrayBuffer = packageBytes.slice().buffer;
    let imageCount = 0;
    let totalImageBytes = 0;
    const assets: Array<{
      name: string;
      mimeType: string;
      blob: Blob;
      altText: string;
      sourceLocation: string;
    }> = [];

    onProgress({ stage: "converting" });
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: WORD_STYLE_MAP,
        includeDefaultStyleMap: true,
        convertImage: mammoth.images.imgElement(async (image) => {
          imageCount += 1;
          if (imageCount > limits.maxAssets) {
            throw new WordImportError(
              "resource-limit",
              "This Word document contains too many embedded images.",
            );
          }
          const extension = extensionForImageType(image.contentType);
          const name = `embedded-image-${imageCount}.${extension}`;
          const imageBuffer = await image.readAsArrayBuffer();
          if (imageBuffer.byteLength > limits.maxAssetBytes) {
            throw new WordImportError(
              "resource-limit",
              "This Word document contains an embedded image that is too large.",
            );
          }
          totalImageBytes += imageBuffer.byteLength;
          if (totalImageBytes > limits.maxTotalAssetBytes) {
            throw new WordImportError(
              "resource-limit",
              "This Word document contains too much embedded image data.",
            );
          }
          assets.push({
            name,
            mimeType: image.contentType,
            blob: new Blob([imageBuffer], { type: image.contentType }),
            altText: `Embedded image ${imageCount}`,
            sourceLocation: `word/${name}`,
          });
          return {
            src: `assets/${name}`,
            alt: `embedded image ${imageCount} (${image.contentType})`,
          } as { src: string };
        }),
      },
    );

    onProgress({ stage: "finishing" });
    if (result.value.length > limits.maxGeneratedHtmlChars) {
      throw new WordImportError(
        "resource-limit",
        "This Word document expands to too much HTML to convert safely.",
      );
    }
    const markdown = convertWordHtmlToMarkdown({
      html: result.value,
      title,
      dependencies: { TurndownService, gfm },
      imageCount,
    });
    if (markdown.length > limits.maxGeneratedMarkdownChars) {
      throw new WordImportError(
        "resource-limit",
        "This Word document would generate more Markdown than can be opened safely.",
      );
    }

    await yieldToBrowser();

    return {
      markdown,
      title,
      imageCount,
      assets,
      warnings: result.messages.map((message) => message.message),
    };
  } catch (error) {
    if (error instanceof WordImportError) throw error;
    if (error instanceof ConverterError && error.code === "archive-limit") {
      throw new WordImportError("resource-limit", error.message);
    }
    if (error instanceof NoExtractableWordTextError) {
      throw new WordImportError(
        "no-text",
        "This Word document has no extractable text to convert.",
      );
    }
    if (
      error instanceof Error &&
      /zip|end of central directory|invalid|corrupt|package/i.test(error.message)
    ) {
      throw new WordImportError(
        "invalid",
        "This Word document could not be read. It may be invalid or corrupt.",
      );
    }
    throw new WordImportError(
      "unknown",
      "Could not convert this Word document. Please try another .docx file.",
    );
  }
}

function extensionForImageType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/svg+xml") return "svg";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function resolveDefaultModule<TDefault, TNamespace>(defaultExport: TDefault, namespace: TNamespace) {
  return defaultExport ?? namespace;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}
