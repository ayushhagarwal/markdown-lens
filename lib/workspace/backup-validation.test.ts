import { describe, expect, test, vi } from "vitest";
import {
  MAX_WORKSPACE_BACKUP_DOCUMENTS,
  MAX_WORKSPACE_BACKUP_FILE_BYTES,
  parseWorkspaceBackupFile,
  validateWorkspaceBackup,
} from "@/lib/workspace/backup-validation";
import { createDocumentRecord } from "@/lib/workspace/types";

describe("workspace backup validation", () => {
  test("rejects an oversized file before reading its text", async () => {
    const text = vi.fn(async () => "{}");
    await expect(
      parseWorkspaceBackupFile({
        size: MAX_WORKSPACE_BACKUP_FILE_BYTES + 1,
        text,
      }),
    ).rejects.toThrow("too large");
    expect(text).not.toHaveBeenCalled();
  });

  test("accepts a fully linked backup and reports decoded asset bytes", () => {
    const document = {
      ...createDocumentRecord({ title: "Valid", markdown: "restored" }),
      assetIds: ["asset-valid"],
    };
    const result = validateWorkspaceBackup({
      format: "markdown-lens-workspace",
      version: 1,
      exportedAt: new Date().toISOString(),
      documents: [document],
      assets: [
        {
          id: "asset-valid",
          documentId: document.id,
          name: "hello.txt",
          mimeType: "text/plain",
          dataUrl: "data:text/plain;base64,aGVsbG8=",
        },
      ],
    });
    expect(result.decodedAssetBytes).toBe(5);
    expect(result.backup.documents[0].assetIds).toEqual(["asset-valid"]);
  });

  test("rejects unknown fields and malformed Base64", () => {
    const document = {
      ...createDocumentRecord({ title: "Invalid", markdown: "not restored" }),
      assetIds: ["asset-invalid"],
    };
    expect(() =>
      validateWorkspaceBackup({
        format: "markdown-lens-workspace",
        version: 1,
        exportedAt: new Date().toISOString(),
        documents: [{ ...document, unexpected: true }],
        assets: [],
      }),
    ).toThrow("unexpected");
    expect(() =>
      validateWorkspaceBackup({
        format: "markdown-lens-workspace",
        version: 1,
        exportedAt: new Date().toISOString(),
        documents: [document],
        assets: [
          {
            id: "asset-invalid",
            documentId: document.id,
            name: "invalid.txt",
            mimeType: "text/plain",
            dataUrl: "data:text/plain;base64,not-valid!",
          },
        ],
      }),
    ).toThrow("Base64");
  });

  test("enforces the document-count budget", () => {
    const documents = Array.from(
      { length: MAX_WORKSPACE_BACKUP_DOCUMENTS + 1 },
      (_, index) => ({
        ...createDocumentRecord({ title: `Document ${index}`, markdown: "" }),
        id: `document-${index}`,
      }),
    );
    expect(() =>
      validateWorkspaceBackup({
        format: "markdown-lens-workspace",
        version: 1,
        exportedAt: new Date().toISOString(),
        documents,
        assets: [],
      }),
    ).toThrow(`at most ${MAX_WORKSPACE_BACKUP_DOCUMENTS.toLocaleString()}`);
  });
});
