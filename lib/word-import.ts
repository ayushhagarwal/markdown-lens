import {
  convertWordHtmlToMarkdown,
  NoExtractableWordTextError,
} from "@/lib/word-to-markdown";

export const WORD_SIZE_LIMIT_BYTES = 100 * 1024 * 1024;

export type WordImportProgress = {
  stage: "reading" | "converting" | "finishing";
};

export class WordImportError extends Error {
  code: "too-large" | "legacy-doc" | "invalid" | "no-text" | "unknown";

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
) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "doc") {
    throw new WordImportError(
      "legacy-doc",
      "Legacy .doc files are not supported yet. Save the document as .docx and try again.",
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
    const arrayBuffer = await file.arrayBuffer();
    let imageCount = 0;

    onProgress({ stage: "converting" });
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: WORD_STYLE_MAP,
        includeDefaultStyleMap: true,
        convertImage: mammoth.images.imgElement(async (image) => {
          imageCount += 1;
          return {
            src: `markdown-lens-omitted-image-${imageCount}`,
            alt: `embedded image ${imageCount} (${image.contentType})`,
          } as { src: string };
        }),
      },
    );

    onProgress({ stage: "finishing" });
    const markdown = convertWordHtmlToMarkdown({
      html: result.value,
      title,
      dependencies: { TurndownService, gfm },
      imageCount,
    });

    await yieldToBrowser();

    return {
      markdown,
      title,
      imageCount,
      warnings: result.messages.map((message) => message.message),
    };
  } catch (error) {
    if (error instanceof WordImportError) throw error;
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

function resolveDefaultModule<TDefault, TNamespace>(defaultExport: TDefault, namespace: TNamespace) {
  return defaultExport ?? namespace;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}
