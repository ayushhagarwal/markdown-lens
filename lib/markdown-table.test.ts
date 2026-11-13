import { describe, expect, it } from "vitest";
import {
  createTable,
  deleteColumn,
  deleteRow,
  displayWidth,
  findTableAt,
  getGridCell,
  insertColumn,
  insertRow,
  moveColumn,
  moveRow,
  normalizeTable,
  parseDelimitedCells,
  parseDelimitedTable,
  parseMarkdownTable,
  parsePastedTable,
  pasteCells,
  serializeMarkdownTable,
  setAlignment,
  setCell,
  setGridCell,
  setHeader,
  sortByColumn,
  splitTableRow,
  type TableModel,
} from "@/lib/markdown-table";

const sample: TableModel = {
  headers: ["Name", "Qty", "Note"],
  alignments: ["left", "right", null],
  rows: [
    ["Apple", "3", "red"],
    ["Banana", "12", "yellow"],
  ],
};

describe("parseMarkdownTable", () => {
  it("parses a table with outer pipes and alignment", () => {
    const table = parseMarkdownTable("| A | B | C | D |\n| :-- | :-: | --: | --- |\n| 1 | 2 | 3 | 4 |");
    expect(table).toEqual({
      headers: ["A", "B", "C", "D"],
      alignments: ["left", "center", "right", null],
      rows: [["1", "2", "3", "4"]],
    });
  });

  it("parses a table without outer pipes", () => {
    expect(parseMarkdownTable("a | b\n--- | ---\n1 | 2\n3 | 4")).toEqual({
      headers: ["a", "b"],
      alignments: [null, null],
      rows: [["1", "2"], ["3", "4"]],
    });
  });

  it("unescapes pipes and keeps pipes inside inline code", () => {
    const table = parseMarkdownTable("| Expr | Code |\n| --- | --- |\n| a \\| b | `x || y` |");
    expect(table?.rows[0]).toEqual(["a | b", "`x || y`"]);
    expect(splitTableRow("| `a\\|b` | c |")).toEqual(["`a|b`", "c"]);
  });

  it("keeps other backslash escapes and treats an escaped backslash before a pipe as a separator", () => {
    expect(splitTableRow("| \\*a\\* | b\\\\| c |")).toEqual(["\\*a\\*", "b\\\\", "c"]);
  });

  it("pads ragged rows and drops extra cells", () => {
    const table = parseMarkdownTable("| a | b | c |\n|---|---|---|\n| 1 |\n| 1 | 2 | 3 | 4 |");
    expect(table?.rows).toEqual([["1", "", ""], ["1", "2", "3"]]);
  });

  it("rejects text that is not a table", () => {
    expect(parseMarkdownTable("just text")).toBeNull();
    expect(parseMarkdownTable("Heading\n---")).toBeNull();
    expect(parseMarkdownTable("| a | b |\n| --- |")).toBeNull();
    expect(parseMarkdownTable("    | a |\n    | --- |")).toBeNull();
  });

  it("stops at a blank line or a new block", () => {
    expect(parseMarkdownTable("| a |\n| - |\n| 1 |\n\n| 2 |")?.rows).toEqual([["1"]]);
    expect(parseMarkdownTable("| a |\n| - |\n| 1 |\n# Next")?.rows).toEqual([["1"]]);
  });

  it("parses a single-column and header-only table", () => {
    expect(parseMarkdownTable("| Only |\n| --- |")).toEqual({ headers: ["Only"], alignments: [null], rows: [] });
  });
});

describe("serializeMarkdownTable", () => {
  it("aligns columns and writes the alignment row", () => {
    expect(serializeMarkdownTable(sample)).toBe(
      [
        "| Name   | Qty | Note   |",
        "| :----- | --: | ------ |",
        "| Apple  |   3 | red    |",
        "| Banana |  12 | yellow |",
      ].join("\n"),
    );
  });

  it("centres cells and uses at least three dashes", () => {
    expect(serializeMarkdownTable({ headers: ["a"], alignments: ["center"], rows: [["b"]] })).toBe("|  a  |\n| :-: |\n|  b  |");
  });

  it("escapes pipes and turns newlines into <br>", () => {
    const markdown = serializeMarkdownTable({ headers: ["x"], alignments: [null], rows: [["a|b"], ["one\ntwo"], ["c\\|d"]] });
    expect(markdown.split("\n").slice(2)).toEqual(["| a\\|b       |", "| one<br>two |", "| c\\|d       |"]);
  });

  it("measures CJK and emoji as double width", () => {
    expect(displayWidth("漢字")).toBe(4);
    expect(displayWidth("é")).toBe(1);
    expect(displayWidth("👍")).toBe(2);
    expect(displayWidth("👩‍💻")).toBe(2);
    const markdown = serializeMarkdownTable({ headers: ["名前", "x"], alignments: [null, null], rows: [["a", "日本語"]] });
    expect(markdown).toBe("| 名前 | x      |\n| ---- | ------ |\n| a    | 日本語 |");
  });

  it("round-trips through parse", () => {
    const tricky: TableModel = {
      headers: ["Code", "Text", "Empty"],
      alignments: ["center", null, "right"],
      rows: [["`a|b`", "x | y", ""], ["漢字", "**bold**", "1"]],
    };
    expect(parseMarkdownTable(serializeMarkdownTable(tricky))).toEqual(tricky);
    expect(parseMarkdownTable(serializeMarkdownTable(sample))).toEqual(sample);
  });

  it("normalises ragged models before writing", () => {
    expect(serializeMarkdownTable({ headers: ["a", "b"], alignments: [], rows: [["1"]] })).toBe("| a   | b   |\n| --- | --- |\n| 1   |     |");
  });
});

describe("findTableAt", () => {
  const doc = ["Intro", "", "| a | b |", "| - | - |", "| 1 | 2 |", "", "Outro"].join("\n");
  const from = doc.indexOf("| a");
  const to = doc.indexOf("| 2 |") + "| 2 |".length;

  it("finds the table around the cursor, inclusive of both ends", () => {
    expect(findTableAt(doc, from)).toMatchObject({ from, to });
    expect(findTableAt(doc, to)?.table.rows).toEqual([["1", "2"]]);
    expect(findTableAt(doc, from + 5)).not.toBeNull();
    expect(doc.slice(from, to)).toBe("| a | b |\n| - | - |\n| 1 | 2 |");
  });

  it("returns null outside the table", () => {
    expect(findTableAt(doc, from - 1)).toBeNull();
    expect(findTableAt(doc, to + 1)).toBeNull();
    expect(findTableAt(doc, 0)).toBeNull();
    expect(findTableAt(doc, doc.length)).toBeNull();
  });

  it("ignores tables inside fenced code", () => {
    const fenced = ["```md", "| a | b |", "| - | - |", "```", "", "~~~~", "| c |", "| - |", "~~~", "~~~~"].join("\n");
    for (let offset = 0; offset <= fenced.length; offset += 1) expect(findTableAt(fenced, offset)).toBeNull();
  });

  it("finds a table after a fenced block and among several tables", () => {
    const markdown = ["```", "| x |", "| - |", "```", "| a |", "| - |", "", "| b |", "| - |", "| 2 |"].join("\n");
    expect(findTableAt(markdown, markdown.indexOf("| a"))?.table.headers).toEqual(["a"]);
    expect(findTableAt(markdown, markdown.indexOf("| 2"))?.table.headers).toEqual(["b"]);
    expect(findTableAt(markdown, markdown.indexOf("| x"))).toBeNull();
  });

  it("handles CRLF line endings", () => {
    const markdown = "| a |\r\n| - |\r\n| 1 |\r\n\r\nafter";
    const range = findTableAt(markdown, 2);
    expect(range?.to).toBe(markdown.indexOf("| 1 |") + 5);
    expect(range?.table.rows).toEqual([["1"]]);
  });

  it("uses the last paragraph line as the header", () => {
    const markdown = "Some text\na | b\n--|--\n1 | 2";
    expect(findTableAt(markdown, markdown.length)?.from).toBe(markdown.indexOf("a | b"));
  });
});

describe("pasted spreadsheet data", () => {
  it("parses TSV from Excel or Google Sheets, including quoted newlines", () => {
    const tsv = 'Name\tNotes\tQty\r\nApple\t"line one\nline two"\t3\r\nPear\t"says ""hi"""\t\r\n';
    expect(parseDelimitedTable(tsv)).toEqual({
      headers: ["Name", "Notes", "Qty"],
      alignments: [null, null, null],
      rows: [["Apple", "line one\nline two", "3"], ["Pear", 'says "hi"', ""]],
    });
  });

  it("detects CSV and pads ragged rows", () => {
    expect(parseDelimitedTable('a,b,c\n1,"x, y"\n')).toEqual({
      headers: ["a", "b", "c"],
      alignments: [null, null, null],
      rows: [["1", "x, y", ""]],
    });
  });

  it("serialises pasted newlines as <br>", () => {
    const table = parseDelimitedTable('h\n"a\nb"');
    expect(table && serializeMarkdownTable(table).split("\n")[2]).toBe("| a<br>b |");
  });

  it("returns null for empty input", () => {
    expect(parseDelimitedTable("  \n")).toBeNull();
    expect(parseDelimitedCells("")).toEqual([]);
  });

  it("splits only on tabs when forced", () => {
    expect(parseDelimitedCells("a, b\nc", "\t")).toEqual([["a, b"], ["c"]]);
  });

  it("accepts Markdown tables when pasting", () => {
    expect(parsePastedTable("| a | b |\n|---|---|\n| 1 | 2 |")?.rows).toEqual([["1", "2"]]);
    expect(parsePastedTable("x\ty\n1\t2")?.headers).toEqual(["x", "y"]);
  });
});

describe("row operations", () => {
  it("inserts rows at any index", () => {
    expect(insertRow(sample, 0).rows[0]).toEqual(["", "", ""]);
    expect(insertRow(sample, 1).rows.map((row) => row[0])).toEqual(["Apple", "", "Banana"]);
    expect(insertRow(sample, 99).rows).toHaveLength(3);
    expect(insertRow(sample, 2, ["x"]).rows[2]).toEqual(["x", "", ""]);
  });

  it("deletes rows", () => {
    expect(deleteRow(sample, 0).rows).toEqual([["Banana", "12", "yellow"]]);
    expect(deleteRow(sample, 5)).toBe(sample);
  });

  it("moves rows", () => {
    expect(moveRow(sample, 0, 1).rows.map((row) => row[0])).toEqual(["Banana", "Apple"]);
    expect(moveRow(sample, 1, 0).rows.map((row) => row[0])).toEqual(["Banana", "Apple"]);
    expect(moveRow(sample, 4, 0).rows).toEqual(sample.rows);
  });

  it("does not mutate the input", () => {
    const before = JSON.stringify(sample);
    insertRow(sample, 0);
    deleteRow(sample, 0);
    moveRow(sample, 0, 1);
    insertColumn(sample, 0);
    deleteColumn(sample, 0);
    moveColumn(sample, 0, 2);
    setAlignment(sample, 0, "center");
    setCell(sample, 0, 0, "x");
    setHeader(sample, 0, "x");
    sortByColumn(sample, 0, "desc");
    pasteCells(sample, { row: 2, column: 2 }, [["a", "b"], ["c", "d"]]);
    expect(JSON.stringify(sample)).toBe(before);
  });
});

describe("column operations", () => {
  it("inserts columns left or right", () => {
    const left = insertColumn(sample, 0, "New");
    expect(left.headers).toEqual(["New", "Name", "Qty", "Note"]);
    expect(left.alignments).toEqual([null, "left", "right", null]);
    expect(left.rows[0]).toEqual(["", "Apple", "3", "red"]);
    expect(insertColumn(sample, 3).headers).toEqual(["Name", "Qty", "Note", ""]);
  });

  it("deletes columns but keeps the last one", () => {
    const deleted = deleteColumn(sample, 1);
    expect(deleted.headers).toEqual(["Name", "Note"]);
    expect(deleted.alignments).toEqual(["left", null]);
    expect(deleted.rows[1]).toEqual(["Banana", "yellow"]);
    const single = { headers: ["a"], alignments: [null], rows: [["1"]] };
    expect(deleteColumn(single, 0)).toEqual(single);
  });

  it("moves columns with their alignment", () => {
    const moved = moveColumn(sample, 0, 2);
    expect(moved.headers).toEqual(["Qty", "Note", "Name"]);
    expect(moved.alignments).toEqual(["right", null, "left"]);
    expect(moved.rows[0]).toEqual(["3", "red", "Apple"]);
  });

  it("sets alignment", () => {
    expect(setAlignment(sample, 2, "center").alignments).toEqual(["left", "right", "center"]);
    expect(setAlignment(sample, 0, null).alignments[0]).toBeNull();
  });
});

describe("cell operations", () => {
  it("sets header and body cells", () => {
    expect(setHeader(sample, 1, "Count").headers).toEqual(["Name", "Count", "Note"]);
    expect(setCell(sample, 1, 2, "ripe").rows[1]).toEqual(["Banana", "12", "ripe"]);
    expect(setCell(sample, 9, 0, "x")).toBe(sample);
  });

  it("addresses cells by grid row", () => {
    expect(getGridCell(sample, 0, 1)).toBe("Qty");
    expect(getGridCell(sample, 2, 0)).toBe("Banana");
    expect(setGridCell(sample, 0, 0, "Fruit").headers[0]).toBe("Fruit");
    expect(setGridCell(sample, 1, 0, "Cherry").rows[0][0]).toBe("Cherry");
  });

  it("pastes a block from a cell and grows the grid", () => {
    const pasted = pasteCells(sample, { row: 2, column: 2 }, [["a", "b"], ["c", "d"]]);
    expect(pasted.headers).toEqual(["Name", "Qty", "Note", ""]);
    expect(pasted.rows).toEqual([
      ["Apple", "3", "red", ""],
      ["Banana", "12", "a", "b"],
      ["", "", "c", "d"],
    ]);
    expect(pasteCells(sample, { row: 0, column: 0 }, [["H1"], ["v1"]]).headers[0]).toBe("H1");
  });

  it("normalises tables", () => {
    expect(normalizeTable({ headers: [], alignments: [], rows: [["a", "b"]] })).toEqual({ headers: [""], alignments: [null], rows: [["a"]] });
    expect(createTable(2, 1)).toEqual({ headers: ["Column 1", "Column 2"], alignments: [null, null], rows: [["", ""]] });
  });
});

describe("sortByColumn", () => {
  const table: TableModel = {
    headers: ["Item", "Price"],
    alignments: [null, null],
    rows: [["banana", "10"], ["", "2"], ["Apple", "$1,200"], ["cherry", ""], ["apple", "-3.5"]],
  };

  it("sorts text case-insensitively and stably, with empty cells last", () => {
    expect(sortByColumn(table, 0).rows.map((row) => row[0])).toEqual(["Apple", "apple", "banana", "cherry", ""]);
    expect(sortByColumn(table, 0, "desc").rows.map((row) => row[0])).toEqual(["cherry", "banana", "Apple", "apple", ""]);
  });

  it("sorts numbers numerically", () => {
    expect(sortByColumn(table, 1).rows.map((row) => row[1])).toEqual(["-3.5", "2", "10", "$1,200", ""]);
    expect(sortByColumn(table, 1, "desc").rows.map((row) => row[1])).toEqual(["$1,200", "10", "2", "-3.5", ""]);
  });
});
