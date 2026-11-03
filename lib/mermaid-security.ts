const REMOVED_SVG_TAGS = new Set([
  "img",
  "image",
  "use",
  "foreignobject",
  "feimage",
  "script",
  "iframe",
  "object",
  "embed",
  "link",
]);

const FRONT_MATTER = /^([^\S\n\r]*)-{3}\s*[\n\r]([\s\S]*?)[\n\r]\1-{3}\s*[\n\r]+/;
const DIRECTIVE_SOURCE = String.raw`%{2}{\s*(?:(\w+)\s*:|(\w+))\s*(?:(\w+)|((?:(?!}%{2}).|\r?\n)*))?\s*(?:}%{2})?`;
const URL_REFERENCE = /url\s*\(/i;

const RESOURCE_TAGS = new Set([
  "img",
  "image",
  "use",
  "foreignobject",
  "feimage",
  "object",
  "embed",
  "iframe",
  "link",
  "script",
]);

/**
 * Removes remote image targets and url() references from diagram source before
 * mermaid.render mounts a temporary SVG on document.body.
 */
export function stripMermaidRemoteResources(code: string) {
  const withoutUrlFunctions = removeUrlReferences(code);
  const withoutMarkup = removeResourceElements(withoutUrlFunctions);
  const withoutImages = removeRemoteMarkdownImages(withoutMarkup);
  return removeRemoteUrls(withoutImages);
}

export function assertMermaidDiagramSafe(code: string) {
  if (
    frontMatterHasUnsafeSetting(code) ||
    directivesHaveUnsafeSetting(code) ||
    fontStyleHasUrl(code)
  ) {
    throw new Error("Mermaid theme or font settings cannot load remote URLs.");
  }
}

export function sanitizeMermaidSvg(svg: string) {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = parsed.documentElement;
  if (!root || root.localName.toLowerCase() !== "svg" || parsed.querySelector("parsererror")) {
    throw new Error("Mermaid returned an unreadable diagram.");
  }

  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    if (element !== root && !element.isConnected) continue;
    const tag = element.localName.toLowerCase();
    if (REMOVED_SVG_TAGS.has(tag)) {
      element.remove();
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || name === "src" || name === "srcdoc") {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (containsUrlReference(attribute.value)) {
        if (name === "style") {
          const next = removeUrlReferences(attribute.value);
          if (!next.trim() || containsUrlReference(next)) element.removeAttribute(attribute.name);
          else element.setAttribute(attribute.name, next);
        } else {
          element.removeAttribute(attribute.name);
        }
        continue;
      }
      if ((name === "href" || name.endsWith(":href")) && isUnsafeResourceLink(attribute.value)) {
        element.removeAttribute(attribute.name);
      }
    }
    if (tag === "style") {
      const next = removeUrlReferences(element.textContent ?? "");
      element.textContent = containsUrlReference(next) ? "" : next;
    }
  }

  const stillUnsafe = [root, ...Array.from(root.querySelectorAll("*"))].some((element) =>
    REMOVED_SVG_TAGS.has(element.localName.toLowerCase()),
  );
  if (stillUnsafe) throw new Error("Mermaid diagram included unsafe markup.");
  return new XMLSerializer().serializeToString(root);
}

function frontMatterHasUnsafeSetting(code: string) {
  const body = code.match(FRONT_MATTER)?.[2];
  if (!body) return false;
  const lines = body.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const keyMatch = /^(\s*)([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(lines[index] ?? "");
    if (!keyMatch || !isRestrictedSetting(keyMatch[2] ?? "")) continue;
    const rawValue = (keyMatch[3] ?? "").trim();
    if (rawValue === "|" || rawValue === "|-" || rawValue === ">" || rawValue === ">-") {
      const block: string[] = [];
      const minimumIndent = (keyMatch[1] ?? "").length + 1;
      let next = index + 1;
      while (next < lines.length) {
        const line = lines[next] ?? "";
        if (line.trim() === "") {
          block.push("");
          next += 1;
          continue;
        }
        const indent = line.match(/^\s*/)?.[0].length ?? 0;
        if (indent < minimumIndent) break;
        block.push(line);
        next += 1;
      }
      if (containsUrlReference(block.join("\n"))) return true;
      continue;
    }
    if (rawValue && containsUrlReference(unquoteYaml(rawValue))) return true;
  }
  return false;
}

function directivesHaveUnsafeSetting(code: string) {
  for (const match of code.matchAll(new RegExp(DIRECTIVE_SOURCE, "gi"))) {
    const type = match[1] || match[2] || "";
    if (!/^(?:init|initialize)$/i.test(type)) continue;
    const raw = (match[4] ?? match[3] ?? "").trim();
    if (!raw) continue;
    const parsed = parseDirectiveJson(raw);
    if (parsed) {
      if (objectHasUnsafeSetting(parsed)) return true;
      continue;
    }
    if (rawDirectiveHasUnsafeSetting(raw)) return true;
  }
  return false;
}

function fontStyleHasUrl(code: string) {
  return code.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    if (!/^(?:style|classDef|linkStyle)\b/i.test(trimmed)) return false;
    return /font/i.test(trimmed) && containsUrlReference(trimmed);
  });
}

function parseDirectiveJson(raw: string) {
  for (const candidate of [raw, raw.replace(/'/g, '"')]) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      continue;
    }
  }
  return null;
}

function objectHasUnsafeSetting(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (typeof nested === "string" && isRestrictedSetting(key) && containsUrlReference(nested)) return true;
    if (objectHasUnsafeSetting(nested)) return true;
  }
  return false;
}

function rawDirectiveHasUnsafeSetting(raw: string) {
  const pattern =
    /["']?(themeCSS|altFontFamily|[A-Za-z0-9_-]*font[A-Za-z0-9_-]*)["']?\s*:\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^,}\n]+)/gi;
  for (const match of raw.matchAll(pattern)) {
    if (containsUrlReference(match[2] ?? "")) return true;
  }
  return false;
}

function isRestrictedSetting(key: string) {
  const normalized = key.toLowerCase().replace(/[_-]/g, "");
  return normalized === "themecss" || normalized.includes("font");
}

function unquoteYaml(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function containsUrlReference(value: string) {
  return URL_REFERENCE.test(decodeCss(value));
}

function removeUrlReferences(value: string) {
  const decoded = decodeCss(value);
  let result = "";
  let last = 0;
  for (const match of decoded.matchAll(/url\s*\(/gi)) {
    const index = match.index ?? 0;
    result += decoded.slice(last, index);
    const end = endOfCssFunction(decoded, index + match[0].length);
    result += "none";
    last = end;
  }
  result += decoded.slice(last);
  return containsUrlReference(result) ? "" : result;
}

function endOfCssFunction(value: string, start: number) {
  let quote: string | null = null;
  let depth = 1;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === "\\" && index + 1 < value.length) {
        index += 1;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return value.length;
}

function decodeCss(value: string) {
  const withoutComments = value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, decimal: string) => safeCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lpar;/gi, "(")
    .replace(/&amp;/gi, "&");
  return withoutComments
    .replace(/\\([0-9a-fA-F]{1,6})[ \t\n\f\r]?/g, (_, hex: string) => safeCodePoint(Number.parseInt(hex, 16)))
    .replace(/\\(.)/g, "$1");
}

function safeCodePoint(codePoint: number) {
  if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return "";
  return String.fromCodePoint(codePoint);
}

function removeResourceElements(code: string) {
  let result = "";
  let index = 0;
  while (index < code.length) {
    const tag = code[index] === "<" ? readTag(code, index) : null;
    if (!tag) {
      result += code[index] ?? "";
      index += 1;
      continue;
    }
    const name = tag.name.toLowerCase();
    if (!RESOURCE_TAGS.has(name)) {
      result += code.slice(index, tag.end);
      index = tag.end;
      continue;
    }
    if (name === "foreignobject" && !tag.closing && !tag.selfClosing) {
      index = skipUntilClosingTag(code, tag.end, name);
      continue;
    }
    index = tag.end;
  }
  return result;
}

function readTag(code: string, start: number) {
  if (code[start] !== "<") return null;
  let index = start + 1;
  const closing = code[index] === "/";
  if (closing) index += 1;
  while (index < code.length && isAsciiWhitespace(code[index] ?? "")) index += 1;
  const nameStart = index;
  while (index < code.length && /[A-Za-z0-9:]/.test(code[index] ?? "")) index += 1;
  if (index === nameStart) return null;
  const name = code.slice(nameStart, index);
  let quote: string | null = null;
  let selfClosing = false;
  for (; index < code.length; index += 1) {
    const character = code[index] ?? "";
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "/" && code[index + 1] === ">") {
      selfClosing = true;
      continue;
    }
    if (character === ">") {
      return { name, end: index + 1, selfClosing, closing };
    }
  }
  return null;
}

function skipUntilClosingTag(code: string, start: number, tagName: string) {
  let depth = 1;
  let index = start;
  while (index < code.length && depth > 0) {
    const tag = code[index] === "<" ? readTag(code, index) : null;
    if (!tag) {
      index += 1;
      continue;
    }
    if (tag.name.toLowerCase() === tagName && !tag.selfClosing) depth += tag.closing ? -1 : 1;
    index = tag.end;
  }
  return index;
}

function removeRemoteMarkdownImages(code: string) {
  let result = "";
  let index = 0;
  while (index < code.length) {
    const image = code.startsWith("![", index) ? readMarkdownImage(code, index) : null;
    if (!image) {
      result += code[index] ?? "";
      index += 1;
      continue;
    }
    if (isRemoteImageUrl(image.destination)) {
      result += image.alt;
      index = image.end;
      continue;
    }
    result += code.slice(index, image.end);
    index = image.end;
  }
  return result;
}

function readMarkdownImage(code: string, start: number) {
  if (!code.startsWith("![", start)) return null;
  const altEnd = code.indexOf("]", start + 2);
  if (altEnd < 0 || code[altEnd + 1] !== "(") return null;
  let index = altEnd + 2;
  while (index < code.length && isAsciiWhitespace(code[index] ?? "")) index += 1;
  const angled = code[index] === "<";
  if (angled) index += 1;
  const destinationStart = index;
  if (angled) {
    while (index < code.length && code[index] !== ">") index += 1;
    if (code[index] !== ">") return null;
  } else {
    while (index < code.length && code[index] !== ")" && code[index] !== "\n") index += 1;
    if (code[index] !== ")") return null;
  }
  const destination = code.slice(destinationStart, index).trim();
  if (angled) {
    index += 1;
    while (index < code.length && isAsciiWhitespace(code[index] ?? "")) index += 1;
    if (code[index] !== ")") return null;
  }
  return { alt: code.slice(start + 2, altEnd), destination, end: index + 1 };
}

function removeRemoteUrls(code: string) {
  let result = "";
  let index = 0;
  while (index < code.length) {
    const schemeEnd = matchRemoteScheme(code, index);
    if (schemeEnd < 0) {
      result += code[index] ?? "";
      index += 1;
      continue;
    }
    index = readUrlRemainder(code, schemeEnd);
    result += "#";
  }
  return result;
}

function matchRemoteScheme(code: string, index: number) {
  const https = matchLoosePrefix(code, index, "https://");
  if (https >= 0) return https;
  const http = matchLoosePrefix(code, index, "http://");
  if (http >= 0) return http;
  if (code[index] === "/" && code[index + 1] === "/") {
    const next = code[index + 2] ?? "";
    if (/[a-z0-9]/i.test(next)) return index + 2;
  }
  return -1;
}

function matchLoosePrefix(code: string, index: number, prefix: string) {
  let cursor = index;
  for (const expected of prefix) {
    while (cursor < code.length && isAsciiWhitespace(code[cursor] ?? "")) cursor += 1;
    if ((code[cursor] ?? "").toLowerCase() !== expected) return -1;
    cursor += 1;
  }
  return cursor;
}

function readUrlRemainder(code: string, start: number) {
  let index = start;
  while (index < code.length) {
    const character = code[index] ?? "";
    if (isAsciiWhitespace(character)) {
      let look = index + 1;
      while (look < code.length && isAsciiWhitespace(code[look] ?? "")) look += 1;
      const next = code[look] ?? "";
      if (!isUrlCharacter(next)) break;
      index = look;
      continue;
    }
    if (!isUrlCharacter(character)) break;
    index += 1;
  }
  return index;
}

function isUrlCharacter(character: string) {
  return /[a-z0-9\-._~:/?#@!$&*+,;=%]/i.test(character);
}

function isRemoteImageUrl(value: string) {
  const normalized = value.replace(/[\u0009\u000A\u000B\u000C\u000D\u0020]+/g, "").toLowerCase();
  return (
    normalized.startsWith("https:") ||
    normalized.startsWith("http:") ||
    normalized.startsWith("//") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  );
}

function isAsciiWhitespace(character: string) {
  return character === " " || character === "\n" || character === "\r" || character === "\t" || character === "\f" || character === "\v";
}

function isUnsafeResourceLink(value: string) {
  const normalized = value.replace(/[\u0009\u000A\u000B\u000C\u000D\u0020]+/g, "").toLowerCase();
  return (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("data:")
  );
}
