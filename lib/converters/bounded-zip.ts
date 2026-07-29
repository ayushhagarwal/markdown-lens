import { Unzip, UnzipInflate, type UnzipFile } from "fflate";
import { ConverterError, throwIfAborted } from "@/lib/converters/error";
import type { ConversionContext, ConversionLimits } from "@/lib/converters/types";

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const MAX_ZIP_COMMENT_BYTES = 65_535;
const INPUT_CHUNK_BYTES = 64 * 1024;

export type ZipEntryMetadata = {
  name: string;
  compressedBytes: number;
  expandedBytes: number;
  compression: number;
  directory: boolean;
};

export async function extractBoundedZip(
  file: File,
  context: ConversionContext,
  shouldExtract: (entry: ZipEntryMetadata) => boolean = (entry) => !entry.directory,
) {
  throwIfAborted(context.signal);
  if (file.size > context.limits.maxFileBytes) {
    throw new ConverterError("too-large", "This archive exceeds the local file limit.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const metadata = inspectZipCentralDirectory(bytes, context.limits, shouldExtract);
  const selectedNames = new Set(
    metadata.filter((entry) => shouldExtract(entry) && !entry.directory).map((entry) => entry.name),
  );
  const entries = await inflateSelectedEntries(bytes, selectedNames, context);
  if (entries.size !== selectedNames.size) {
    throw new ConverterError(
      "invalid",
      "This archive has inconsistent file headers and could not be read safely.",
    );
  }
  return {
    entries: Object.fromEntries(entries),
    metadata,
    expandedBytes: [...entries.values()].reduce((total, entry) => total + entry.byteLength, 0),
  };
}

export function inspectZipCentralDirectory(
  bytes: Uint8Array,
  limits: ConversionLimits,
  shouldExtract: (entry: ZipEntryMetadata) => boolean = (entry) => !entry.directory,
) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.byteLength - MAX_ZIP_COMMENT_BYTES - 22);
  let endOffset = -1;
  for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw invalidArchive();

  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDisk = view.getUint16(endOffset + 6, true);
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const totalEntries = view.getUint16(endOffset + 10, true);
  const centralBytes = view.getUint32(endOffset + 12, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const commentBytes = view.getUint16(endOffset + 20, true);
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== totalEntries ||
    totalEntries === 0xffff ||
    centralBytes === 0xffffffff ||
    centralOffset === 0xffffffff ||
    endOffset + 22 + commentBytes > bytes.byteLength ||
    centralOffset + centralBytes > endOffset
  ) {
    throw invalidArchive();
  }
  if (totalEntries > limits.maxArchiveEntries) {
    throw new ConverterError(
      "archive-limit",
      `This archive has more than ${limits.maxArchiveEntries} entries.`,
    );
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const entries: ZipEntryMetadata[] = [];
  const names = new Set<string>();
  let selectedExpandedBytes = 0;
  let offset = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > endOffset || view.getUint32(offset, true) !== CENTRAL_DIRECTORY_ENTRY) {
      throw invalidArchive();
    }
    const flags = view.getUint16(offset + 8, true);
    const compression = view.getUint16(offset + 10, true);
    const compressedBytes = view.getUint32(offset + 20, true);
    const expandedBytes = view.getUint32(offset + 24, true);
    const nameBytes = view.getUint16(offset + 28, true);
    const extraBytes = view.getUint16(offset + 30, true);
    const entryCommentBytes = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nextOffset = offset + 46 + nameBytes + extraBytes + entryCommentBytes;
    if (
      flags & 1 ||
      compressedBytes === 0xffffffff ||
      expandedBytes === 0xffffffff ||
      localHeaderOffset === 0xffffffff ||
      nextOffset > endOffset ||
      localHeaderOffset + 30 > bytes.byteLength ||
      (compression !== 0 && compression !== 8)
    ) {
      throw invalidArchive();
    }
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameBytes));
    if (!name || names.has(name)) throw invalidArchive();
    names.add(name);
    const entry = {
      name,
      compressedBytes,
      expandedBytes,
      compression,
      directory: name.endsWith("/"),
    };
    entries.push(entry);

    if (shouldExtract(entry) && !entry.directory) {
      if (expandedBytes > limits.maxArchiveEntryBytes) {
        throw new ConverterError(
          "archive-limit",
          `Archive entry “${name}” exceeds the per-entry expansion limit.`,
        );
      }
      const ratio =
        expandedBytes === 0
          ? 0
          : compressedBytes === 0
            ? Number.POSITIVE_INFINITY
            : expandedBytes / compressedBytes;
      if (ratio > limits.maxCompressionRatio) {
        throw new ConverterError(
          "archive-limit",
          `Archive entry “${name}” has an unsafe compression ratio.`,
        );
      }
      selectedExpandedBytes += expandedBytes;
      if (selectedExpandedBytes > limits.maxExpandedBytes) {
        throw new ConverterError(
          "archive-limit",
          "This archive expands beyond the safe local processing limit.",
        );
      }
    }
    offset = nextOffset;
  }
  if (offset !== centralOffset + centralBytes) throw invalidArchive();
  return entries;
}

function inflateSelectedEntries(
  bytes: Uint8Array,
  selectedNames: Set<string>,
  context: ConversionContext,
) {
  return new Promise<Map<string, Uint8Array>>((resolve, reject) => {
    const entries = new Map<string, Uint8Array>();
    const activeFiles = new Set<UnzipFile>();
    let activeCount = 0;
    let actualExpandedBytes = 0;
    let inputFinished = false;
    let settled = false;

    const terminate = () => {
      for (const file of activeFiles) file.terminate?.();
      activeFiles.clear();
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      terminate();
      reject(
        error instanceof ConverterError
          ? error
          : new ConverterError("invalid", "This archive is invalid or could not be expanded safely."),
      );
    };
    const finishIfReady = () => {
      if (!settled && inputFinished && activeCount === 0) {
        settled = true;
        resolve(entries);
      }
    };

    const unzip = new Unzip((file) => {
      if (!selectedNames.has(file.name)) return;
      activeCount += 1;
      activeFiles.add(file);
      const chunks: Uint8Array[] = [];
      let entryBytes = 0;
      file.ondata = (error, data, final) => {
        if (error) {
          fail(error);
          return;
        }
        entryBytes += data.byteLength;
        actualExpandedBytes += data.byteLength;
        if (
          entryBytes > context.limits.maxArchiveEntryBytes ||
          actualExpandedBytes > context.limits.maxExpandedBytes
        ) {
          fail(
            new ConverterError(
              "archive-limit",
              "This archive exceeded the safe expansion limit while it was being read.",
            ),
          );
          return;
        }
        if (data.byteLength > 0) chunks.push(data.slice());
        if (final && !settled) {
          entries.set(file.name, concatenate(chunks, entryBytes));
          activeFiles.delete(file);
          activeCount -= 1;
          finishIfReady();
        }
      };
      try {
        file.start();
      } catch (error) {
        fail(error);
      }
    });
    unzip.register(UnzipInflate);

    try {
      for (let offset = 0; offset < bytes.byteLength; offset += INPUT_CHUNK_BYTES) {
        throwIfAborted(context.signal);
        const end = Math.min(bytes.byteLength, offset + INPUT_CHUNK_BYTES);
        unzip.push(bytes.subarray(offset, end), end === bytes.byteLength);
        if (settled) return;
      }
      inputFinished = true;
      finishIfReady();
    } catch (error) {
      fail(error);
    }
  });
}

function concatenate(chunks: Uint8Array[], size: number) {
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function invalidArchive() {
  return new ConverterError("invalid", "This archive has an invalid central directory.");
}
