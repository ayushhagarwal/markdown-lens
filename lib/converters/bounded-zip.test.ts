import { File as NodeFile } from "node:buffer";
import { strToU8, zipSync } from "fflate";
import { describe, expect, test } from "vitest";
import {
  extractBoundedZip,
  inspectZipCentralDirectory,
} from "@/lib/converters/bounded-zip";
import { DEFAULT_CONVERSION_LIMITS } from "@/lib/converters/types";

const context = {
  signal: new AbortController().signal,
  onProgress: () => undefined,
  limits: DEFAULT_CONVERSION_LIMITS,
};

describe("bounded ZIP extraction", () => {
  test("extracts a valid archive within declared and actual limits", async () => {
    const bytes = zipSync({ "notes.txt": strToU8("bounded archive") });
    const file = new NodeFile([bytes], "notes.zip", {
      type: "application/zip",
    }) as unknown as File;
    const result = await extractBoundedZip(file, context);
    expect(new TextDecoder().decode(result.entries["notes.txt"])).toBe("bounded archive");
    expect(result.expandedBytes).toBe(15);
  });

  test("rejects excessive declared expansion before extraction", () => {
    const bytes = zipSync({ "bomb.txt": strToU8("A".repeat(10_000)) }, { level: 9 });
    expect(() =>
      inspectZipCentralDirectory(bytes, {
        ...DEFAULT_CONVERSION_LIMITS,
        maxArchiveEntryBytes: 1_000,
        maxExpandedBytes: 1_000,
      }),
    ).toThrow("per-entry expansion limit");
  });

  test("enforces actual produced bytes when central-directory sizes are forged", async () => {
    const bytes = zipSync({ "forged.txt": strToU8("B".repeat(2_000)) }, { level: 9 }).slice();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const centralOffset = findSignature(bytes, 0x02014b50);
    view.setUint32(centralOffset + 24, 1, true);
    const file = new NodeFile([bytes], "forged.zip", {
      type: "application/zip",
    }) as unknown as File;

    await expect(
      extractBoundedZip(file, {
        ...context,
        limits: {
          ...DEFAULT_CONVERSION_LIMITS,
          maxArchiveEntryBytes: 100,
          maxExpandedBytes: 100,
        },
      }),
    ).rejects.toThrow("exceeded the safe expansion limit");
  });
});

function findSignature(bytes: Uint8Array, signature: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset <= bytes.byteLength - 4; offset += 1) {
    if (view.getUint32(offset, true) === signature) return offset;
  }
  throw new Error("ZIP signature not found.");
}
