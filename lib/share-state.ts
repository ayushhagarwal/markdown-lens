import LZString from "lz-string";

const PREFIX = "#v1:";
export const SHARE_FRAGMENT_LIMIT = 60_000;
export const SHARE_MARKDOWN_LIMIT = 200_000;

export function createShareFragment(markdown: string) {
  if (markdown.length > SHARE_MARKDOWN_LIMIT) {
    throw new Error("This document is too large to share safely in a browser link.");
  }
  const payload = LZString.compressToEncodedURIComponent(markdown);
  const fragment = `${PREFIX}${payload}`;
  if (fragment.length > SHARE_FRAGMENT_LIMIT) {
    throw new Error("This document is too large for a reliable browser share link.");
  }
  return fragment;
}

export function readShareFragment(hash: string) {
  if (!hash.startsWith(PREFIX)) {
    if (/^#v[^:]*:/.test(hash)) throw new Error("This Markdown Lens share-link version is not supported.");
    return null;
  }
  if (hash.length > SHARE_FRAGMENT_LIMIT) throw new Error("This share link is too large to open safely.");
  const markdown = LZString.decompressFromEncodedURIComponent(hash.slice(PREFIX.length));
  if (markdown === null) throw new Error("This Markdown Lens share link is malformed.");
  if (markdown.length > SHARE_MARKDOWN_LIMIT) throw new Error("This shared document is too large to open safely.");
  return markdown;
}
