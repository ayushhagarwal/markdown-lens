import { beforeEach, describe, expect, test } from "vitest";
import {
  addPendingImports,
  consumePendingExample,
  consumePendingImports,
  stagePendingExample,
  stagePendingImports,
} from "@/lib/pending-import";

function file(name: string) {
  return new File(["hello"], name, { type: "text/plain" });
}

describe("pending imports", () => {
  beforeEach(() => {
    consumePendingImports();
    consumePendingExample();
  });

  test("stages a fresh selection and then clears it on consume", () => {
    stagePendingImports([file("a.pdf")]);
    stagePendingImports([file("b.docx")]);
    expect(consumePendingImports().map((item) => item.name)).toEqual(["b.docx"]);
    expect(consumePendingImports()).toEqual([]);
  });

  test("stages one example document and clears it on consume", () => {
    stagePendingExample({ title: "Headings", markdown: "# Heading 1" });
    stagePendingExample({ title: "Emphasis", markdown: "**Bold text**" });
    expect(consumePendingExample()).toEqual({ title: "Emphasis", markdown: "**Bold text**" });
    expect(consumePendingExample()).toBeNull();
  });

  test("appends files that arrive before the editor is ready", () => {
    stagePendingImports([file("a.pdf")]);
    addPendingImports([file("b.docx")]);
    expect(consumePendingImports().map((item) => item.name)).toEqual(["a.pdf", "b.docx"]);
  });
});
