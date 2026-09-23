import { describe, expect, test } from "vitest";
import { documentListEmptyState } from "@/lib/document-list";

describe("document list empty state", () => {
  test("offers a fresh workspace when nothing is saved and search is empty", () => {
    expect(documentListEmptyState(false, "")).toBe("none");
    expect(documentListEmptyState(false, "   ")).toBe("none");
  });

  test("keeps search and trash messages distinct", () => {
    expect(documentListEmptyState(false, "roadmap")).toBe("search");
    expect(documentListEmptyState(true, "")).toBe("trash");
    expect(documentListEmptyState(true, "roadmap")).toBe("trash");
  });
});
