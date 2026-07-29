import LZString from "lz-string";

const PREFIX = "#v1:";
const URI_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
const URI_VALUES = new Map([...URI_ALPHABET].map((character, index) => [character, index]));
export const SHARE_FRAGMENT_LIMIT = 32_000;
export const SHARE_MARKDOWN_LIMIT = 200_000;
export const SHARE_DECODE_WORK_LIMIT = 1_000_000;

export type ShareFragmentPreview = {
  fragment: string;
  compressedCharacters: number;
};

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
  const preview = inspectShareFragment(hash);
  if (preview === null) return null;
  return decompressSharePayloadBounded(preview.fragment.slice(PREFIX.length));
}

export function inspectShareFragment(hash: string): ShareFragmentPreview | null {
  if (!hash.startsWith(PREFIX)) {
    if (/^#v[^:]*:/.test(hash)) throw new Error("This Markdown Lens share-link version is not supported.");
    return null;
  }
  if (hash.length > SHARE_FRAGMENT_LIMIT) throw new Error("This share link is too large to open safely.");
  const payload = hash.slice(PREFIX.length);
  if (payload.length === 0 || !/^[A-Za-z0-9+\-$]+$/.test(payload)) {
    throw new Error("This Markdown Lens share link is malformed.");
  }
  return { fragment: hash, compressedCharacters: payload.length };
}

export function decompressSharePayloadBounded(payload: string) {
  const state = {
    value: valueAt(payload, 0),
    position: 32,
    index: 1,
    work: 0,
  };
  const dictionary: string[] = ["", "", ""];
  let enlargeIn = 4;
  let dictionarySize = 4;
  let bitWidth = 3;
  const current = readBits(payload, state, 2);
  let character: string;

  if (current === 0) character = String.fromCharCode(readBits(payload, state, 8));
  else if (current === 1) character = String.fromCharCode(readBits(payload, state, 16));
  else if (current === 2) return "";
  else throw malformedShare();

  dictionary[3] = character;
  let previous = character;
  const output = [character];
  let outputLength = character.length;

  while (true) {
    if (state.index > payload.length || state.work > SHARE_DECODE_WORK_LIMIT) {
      throw malformedShare();
    }
    let code = readBits(payload, state, bitWidth);
    if (code === 0) {
      dictionary[dictionarySize] = String.fromCharCode(readBits(payload, state, 8));
      code = dictionarySize;
      dictionarySize += 1;
      enlargeIn -= 1;
    } else if (code === 1) {
      dictionary[dictionarySize] = String.fromCharCode(readBits(payload, state, 16));
      code = dictionarySize;
      dictionarySize += 1;
      enlargeIn -= 1;
    } else if (code === 2) {
      return output.join("");
    }

    if (enlargeIn === 0) {
      enlargeIn = 2 ** bitWidth;
      bitWidth += 1;
    }

    const entry =
      dictionary[code] ?? (code === dictionarySize ? previous + previous.charAt(0) : null);
    if (entry === null) throw malformedShare();
    outputLength += entry.length;
    if (outputLength > SHARE_MARKDOWN_LIMIT) {
      throw new Error("This shared document is too large to open safely.");
    }
    output.push(entry);
    dictionary[dictionarySize] = previous + entry.charAt(0);
    dictionarySize += 1;
    enlargeIn -= 1;
    previous = entry;

    if (enlargeIn === 0) {
      enlargeIn = 2 ** bitWidth;
      bitWidth += 1;
    }
  }
}

function readBits(
  payload: string,
  state: { value: number; position: number; index: number; work: number },
  bitCount: number,
) {
  let bits = 0;
  for (let power = 1, maximum = 2 ** bitCount; power !== maximum; power *= 2) {
    const bit = state.value & state.position;
    state.position >>= 1;
    if (state.position === 0) {
      state.position = 32;
      state.value = valueAt(payload, state.index);
      state.index += 1;
    }
    if (bit > 0) bits |= power;
    state.work += 1;
    if (state.work > SHARE_DECODE_WORK_LIMIT) throw malformedShare();
  }
  return bits;
}

function valueAt(payload: string, index: number) {
  const value = URI_VALUES.get(payload[index]);
  if (value === undefined) throw malformedShare();
  return value;
}

function malformedShare() {
  return new Error("This Markdown Lens share link is malformed.");
}
