import { describe, expect, test } from "vitest";
import {
  buildSideBySideRows,
  buildUnifiedRows,
  collapseUnchanged,
  diffLines,
  diffStats,
  diffWords,
  formatUnifiedPatch,
  splitLines,
  type DiffHunk,
} from "@/lib/text-diff";

const changed = (hunks: DiffHunk[]) => hunks.filter((hunk) => hunk.type !== "equal" && !hunk.ignored);

describe("splitLines", () => {
  test("normalises line endings and tracks the final newline", () => {
    expect(splitLines("")).toEqual({ lines: [], endsWithNewline: true });
    expect(splitLines("a\r\nb\rc\n")).toEqual({ lines: ["a", "b", "c"], endsWithNewline: true });
    expect(splitLines("a\nb")).toEqual({ lines: ["a", "b"], endsWithNewline: false });
    expect(splitLines("\n")).toEqual({ lines: [""], endsWithNewline: true });
  });
});

describe("diffLines", () => {
  test("handles empty inputs", () => {
    expect(diffLines("", "")).toEqual([]);
    expect(diffLines("", "a\nb\n")).toEqual([{ type: "insert", oldStart: 1, newStart: 1, oldLines: [], newLines: ["a", "b"] }]);
    expect(diffLines("a\nb\n", "")).toEqual([{ type: "delete", oldStart: 1, newStart: 1, oldLines: ["a", "b"], newLines: [] }]);
  });

  test("reports identical inputs as a single equal hunk", () => {
    const hunks = diffLines("one\ntwo\n", "one\ntwo\n");
    expect(hunks).toEqual([{ type: "equal", oldStart: 1, newStart: 1, oldLines: ["one", "two"], newLines: ["one", "two"] }]);
    expect(diffStats(hunks)).toEqual({ additions: 0, deletions: 0, changed: 0, blocks: 0 });
  });

  test("finds a pure insert and a pure delete with line numbers on both sides", () => {
    expect(diffLines("a\nb\nc\n", "a\nb\nnew\nc\n")).toEqual([
      { type: "equal", oldStart: 1, newStart: 1, oldLines: ["a", "b"], newLines: ["a", "b"] },
      { type: "insert", oldStart: 3, newStart: 3, oldLines: [], newLines: ["new"] },
      { type: "equal", oldStart: 3, newStart: 4, oldLines: ["c"], newLines: ["c"] },
    ]);
    expect(diffLines("a\nb\nc\n", "a\nc\n")).toEqual([
      { type: "equal", oldStart: 1, newStart: 1, oldLines: ["a"], newLines: ["a"] },
      { type: "delete", oldStart: 2, newStart: 2, oldLines: ["b"], newLines: [] },
      { type: "equal", oldStart: 3, newStart: 2, oldLines: ["c"], newLines: ["c"] },
    ]);
  });

  test("groups a modification as delete then insert and counts stats", () => {
    const hunks = diffLines("# Title\nThe quick brown fox\nend\n", "# Title\nThe quick red fox\nextra\nend\n");
    expect(changed(hunks).map((hunk) => hunk.type)).toEqual(["delete", "insert"]);
    expect(diffStats(hunks)).toEqual({ additions: 2, deletions: 1, changed: 1, blocks: 1 });
  });

  test("finds a minimal edit script", () => {
    const before = ["a", "b", "c", "a", "b", "b", "a", ""].join("\n");
    const after = ["c", "b", "a", "b", "a", "c", ""].join("\n");
    const stats = diffStats(diffLines(before, after));
    // Myers' classic example has an edit distance of 5.
    expect(stats.additions + stats.deletions).toBe(5);
  });

  test("treats CRLF and LF as the same text", () => {
    expect(changed(diffLines("a\r\nb\r\n", "a\nb\n"))).toEqual([]);
  });

  test("reports a missing trailing newline as a change on the last line", () => {
    const hunks = diffLines("a\nb", "a\nb\n");
    expect(changed(hunks)).toEqual([
      { type: "delete", oldStart: 2, newStart: 2, oldLines: ["b"], newLines: [], oldNoNewlineAtEnd: true },
      { type: "insert", oldStart: 2, newStart: 2, oldLines: [], newLines: ["b"] },
    ]);
    expect(changed(diffLines("a\nb", "a\nb\n", { ignoreTrailingWhitespace: true }))).toEqual([]);
  });

  test("can ignore trailing whitespace", () => {
    expect(changed(diffLines("a  \nb\t\n", "a\nb\n"))).toHaveLength(2);
    const hunks = diffLines("a  \nb\t\n", "a\nb\n", { ignoreTrailingWhitespace: true });
    expect(changed(hunks)).toEqual([]);
    expect(hunks[0].oldLines).toEqual(["a  ", "b\t"]);
    expect(hunks[0].newLines).toEqual(["a", "b"]);
    expect(changed(diffLines("a b\n", "ab\n", { ignoreTrailingWhitespace: true }))).toHaveLength(2);
  });

  test("can ignore blank-line-only changes", () => {
    const before = "# Title\n\nBody\nEnd\n";
    const after = "# Title\nBody\n\n\nEnd\n";
    expect(diffStats(diffLines(before, after)).blocks).toBe(2);
    const hunks = diffLines(before, after, { ignoreBlankLines: true });
    expect(diffStats(hunks)).toEqual({ additions: 0, deletions: 0, changed: 0, blocks: 0 });
    expect(hunks.filter((hunk) => hunk.ignored)).toHaveLength(2);
    expect(diffStats(diffLines("a\n\n", "b\n", { ignoreBlankLines: true }))).toEqual({ additions: 1, deletions: 2, changed: 1, blocks: 1 });
  });

  test("falls back to a coarse result when the work budget runs out", () => {
    const before = Array.from({ length: 300 }, (_, index) => `old ${index}`).join("\n");
    const after = Array.from({ length: 300 }, (_, index) => (index % 2 ? `old ${index}` : `new ${index}`)).join("\n");
    const coarse = diffLines(before, after, { maxCost: 10 });
    expect(diffStats(coarse)).toEqual({ additions: 299, deletions: 299, changed: 299, blocks: 1 });
    expect(diffStats(diffLines(before, after)).deletions).toBe(150);
  });
});

describe("diffWords", () => {
  test("highlights only the changed words", () => {
    expect(diffWords("The quick brown fox", "The quick red fox")).toEqual({
      before: [{ text: "The quick ", changed: false }, { text: "brown", changed: true }, { text: " fox", changed: false }],
      after: [{ text: "The quick ", changed: false }, { text: "red", changed: true }, { text: " fox", changed: false }],
    });
  });

  test("bridges whitespace between adjacent changes", () => {
    expect(diffWords("keep one two keep", "keep three four keep")?.after).toEqual([
      { text: "keep ", changed: false },
      { text: "three four", changed: true },
      { text: " keep", changed: false },
    ]);
  });

  test("skips lines that are too dissimilar", () => {
    expect(diffWords("Completely different sentence here", "Nothing alike at all")).toBeNull();
    expect(diffWords("text", "")).toBeNull();
  });
});

describe("row builders", () => {
  const hunks = diffLines("a\nThe quick brown fox\nc\n", "a\nThe quick red fox\nadded\nc\n");

  test("pairs modified lines side by side with intra-line segments", () => {
    const rows = buildSideBySideRows(hunks);
    expect(rows.map((row) => row.type)).toEqual(["equal", "modify", "insert", "equal"]);
    expect(rows[1].left).toMatchObject({ lineNumber: 2, text: "The quick brown fox" });
    expect(rows[1].right?.segments?.find((segment) => segment.changed)?.text).toBe("red");
    expect(rows[2]).toEqual({ kind: "row", type: "insert", left: null, right: { lineNumber: 3, text: "added" } });
    expect(rows[3]).toMatchObject({ left: { lineNumber: 3 }, right: { lineNumber: 4 } });
  });

  test("lists deletions before insertions in unified rows", () => {
    const rows = buildUnifiedRows(hunks);
    expect(rows.map((row) => [row.type, row.oldLineNumber, row.newLineNumber])).toEqual([
      ["equal", 1, 1],
      ["delete", 2, null],
      ["insert", null, 2],
      ["insert", null, 3],
      ["equal", 3, 4],
    ]);
    expect(rows[1].segments?.find((segment) => segment.changed)?.text).toBe("brown");
    expect(rows[3].segments).toBeUndefined();
  });

  test("renders ignored blank-line changes as context", () => {
    const rows = buildSideBySideRows(diffLines("a\n\nb\n", "a\nb\n", { ignoreBlankLines: true }));
    expect(rows.map((row) => row.type)).toEqual(["equal", "equal", "equal"]);
    expect(rows[1]).toMatchObject({ left: { lineNumber: 2, text: "" }, right: null });
  });

  test("flags the line without a final newline", () => {
    const rows = buildUnifiedRows(diffLines("a\nb", "a\nb\n"));
    expect(rows[1]).toMatchObject({ type: "delete", text: "b", noNewlineAtEnd: true });
    expect(rows[2].noNewlineAtEnd).toBeUndefined();
  });
});

describe("collapseUnchanged", () => {
  const lines = (count: number, prefix = "line") => Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`);

  test("folds long unchanged runs and keeps context around changes", () => {
    const before = lines(30).join("\n");
    const afterLines = lines(30);
    afterLines[14] = "changed";
    const rows = buildUnifiedRows(diffLines(before, afterLines.join("\n")));
    const collapsed = collapseUnchanged(rows, 3);
    const markers = collapsed.filter((item) => item.kind === "collapsed");
    expect(markers.map((marker) => marker.count)).toEqual([11, 12]);
    expect(collapsed).toHaveLength(3 + 2 + 3 + 2);
    expect(markers[0]).toMatchObject({ id: "collapsed-0" });
    expect(markers.flatMap((marker) => (marker.kind === "collapsed" ? marker.rows : [])).length + collapsed.length - markers.length).toBe(rows.length);
  });

  test("leaves short runs alone and folds identical text into one marker", () => {
    const rows = buildUnifiedRows(diffLines("a\nb\nc\nd\n", "a\nb\nC\nd\n"));
    expect(collapseUnchanged(rows, 3).every((item) => item.kind === "row")).toBe(true);
    const identical = collapseUnchanged(buildSideBySideRows(diffLines(lines(10).join("\n"), lines(10).join("\n"))));
    expect(identical).toEqual([expect.objectContaining({ kind: "collapsed", count: 10 })]);
    expect(collapseUnchanged(rows, 0).filter((item) => item.kind === "collapsed").map((item) => item.count)).toEqual([2]);
  });
});

describe("formatUnifiedPatch", () => {
  test("produces a standard unified diff", () => {
    const before = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"].join("\n") + "\n";
    const after = ["one", "TWO", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"].join("\n") + "\n";
    expect(formatUnifiedPatch(before, after, { fromLabel: "a/notes.md", toLabel: "b/notes.md" })).toBe(
      [
        "--- a/notes.md",
        "+++ b/notes.md",
        "@@ -1,5 +1,5 @@",
        " one",
        "-two",
        "+TWO",
        " three",
        " four",
        " five",
        "@@ -8,3 +8,4 @@",
        " eight",
        " nine",
        " ten",
        "+eleven",
        "",
      ].join("\n"),
    );
  });

  test("marks a missing final newline and handles empty sides", () => {
    expect(formatUnifiedPatch("a\nb", "a\nc\n", { fromLabel: "old", toLabel: "new" })).toBe(
      ["--- old", "+++ new", "@@ -1,2 +1,2 @@", " a", "-b", "\\ No newline at end of file", "+c", ""].join("\n"),
    );
    expect(formatUnifiedPatch("", "x\n", { fromLabel: "old", toLabel: "new" })).toBe(["--- old", "+++ new", "@@ -0,0 +1 @@", "+x", ""].join("\n"));
    expect(formatUnifiedPatch("same\n", "same\n", { fromLabel: "old", toLabel: "new" })).toBe("");
  });
});

describe("performance", () => {
  test("diffs two 10,000-line texts with scattered edits quickly", () => {
    const before = Array.from({ length: 10_000 }, (_, index) => `Line ${index}: lorem ipsum dolor sit amet ${index % 97}`);
    const after = [...before];
    for (let index = 50; index < after.length; index += 211) after[index] = `${after[index]} edited`;
    for (let index = 9_000; index > 0; index -= 997) after.splice(index, 0, `inserted near ${index}`);
    for (let index = 7_000; index > 0; index -= 1_499) after.splice(index, 1);
    const started = performance.now();
    const hunks = diffLines(before.join("\n"), after.join("\n"));
    buildSideBySideRows(hunks);
    const elapsed = performance.now() - started;
    const stats = diffStats(hunks);
    expect(stats.additions).toBeGreaterThan(40);
    expect(stats.deletions).toBeGreaterThan(40);
    expect(stats.additions + stats.deletions).toBeLessThan(200);
    expect(elapsed).toBeLessThan(750);
  });

  test("stays fast on two unrelated large texts", () => {
    const before = Array.from({ length: 20_000 }, (_, index) => `before ${index}`).join("\n");
    const after = Array.from({ length: 20_000 }, (_, index) => `after ${index}`).join("\n");
    const started = performance.now();
    const stats = diffStats(diffLines(before, after));
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(stats).toMatchObject({ additions: 20_000, deletions: 20_000 });
  });
});
