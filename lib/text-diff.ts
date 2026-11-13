export type DiffChangeType = "equal" | "insert" | "delete";

export type DiffHunk = {
  type: DiffChangeType;
  /** 1-based number of the first line on each side. For a one-sided hunk, the line the change sits before. */
  oldStart: number;
  newStart: number;
  /** Lines from `before` (empty for inserts). */
  oldLines: string[];
  /** Lines from `after` (empty for deletes). */
  newLines: string[];
  /** The hunk ends on the last line of `before`, which has no trailing newline. */
  oldNoNewlineAtEnd?: boolean;
  /** The hunk ends on the last line of `after`, which has no trailing newline. */
  newNoNewlineAtEnd?: boolean;
  /** A change hidden by `ignoreBlankLines`: render it as context and leave it out of stats. */
  ignored?: boolean;
};

export type DiffOptions = {
  /** Treat lines that differ only in trailing whitespace (and a missing final newline) as equal. */
  ignoreTrailingWhitespace?: boolean;
  /** Treat change blocks made only of blank lines as unchanged. */
  ignoreBlankLines?: boolean;
  /** Work budget for the line diff before it falls back to a coarse delete/insert result. */
  maxCost?: number;
};

export type DiffSegment = { text: string; changed: boolean };

export type WordDiff = { before: DiffSegment[]; after: DiffSegment[] };

export type DiffLineCell = {
  lineNumber: number;
  text: string;
  /** Intra-line highlights; absent when the line is unchanged or too different to pair. */
  segments?: DiffSegment[];
  noNewlineAtEnd?: boolean;
};

export type SideBySideRow = {
  kind: "row";
  type: "equal" | "insert" | "delete" | "modify";
  left: DiffLineCell | null;
  right: DiffLineCell | null;
};

export type UnifiedRow = {
  kind: "row";
  type: DiffChangeType;
  oldLineNumber: number | null;
  newLineNumber: number | null;
  text: string;
  segments?: DiffSegment[];
  noNewlineAtEnd?: boolean;
};

export type CollapsedRows<T> = {
  kind: "collapsed";
  /** Stable for a given row list: derived from the index of the first hidden row. */
  id: string;
  count: number;
  rows: T[];
};

export type DiffStats = {
  additions: number;
  deletions: number;
  /** Deleted lines paired with an inserted line in the same change block. */
  changed: number;
  /** Contiguous change blocks. */
  blocks: number;
};

const EQUAL = 0;
const DELETE = 1;
const INSERT = 2;
const DEFAULT_MAX_COST = 25_000_000;
const WORD_MAX_COST = 200_000;
const WORD_MAX_LINE_LENGTH = 4_000;
const WORD_MIN_SIMILARITY = 0.3;
const MIN_COLLAPSED_LINES = 2;

/**
 * Myers' O(ND) diff with linear-space bisection (after diff-match-patch).
 * Returns flat [op, count, op, count, …] pairs. Once `maxCost` units of work
 * are spent, remaining sub-problems become a single delete + insert.
 */
function diffSequences(a: ArrayLike<number>, b: ArrayLike<number>, maxCost: number): number[] {
  const ops: number[] = [];
  let cost = 0;

  function emit(op: number, count: number) {
    if (count <= 0) return;
    const length = ops.length;
    if (length && ops[length - 2] === op) ops[length - 1] += count;
    else ops.push(op, count);
  }

  function bisect(aLo: number, aHi: number, bLo: number, bHi: number): [number, number] | null {
    const n = aHi - aLo;
    const m = bHi - bLo;
    const maxD = Math.ceil((n + m) / 2);
    const offset = maxD;
    const length = 2 * maxD;
    const v1 = new Int32Array(length).fill(-1);
    const v2 = new Int32Array(length).fill(-1);
    v1[offset + 1] = 0;
    v2[offset + 1] = 0;
    const delta = n - m;
    const front = delta % 2 !== 0;
    let k1start = 0;
    let k1end = 0;
    let k2start = 0;
    let k2end = 0;
    for (let d = 0; d < maxD; d++) {
      if (cost > maxCost) return null;
      for (let k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
        const k1Offset = offset + k1;
        let x1 = k1 === -d || (k1 !== d && v1[k1Offset - 1] < v1[k1Offset + 1]) ? v1[k1Offset + 1] : v1[k1Offset - 1] + 1;
        let y1 = x1 - k1;
        const startX = x1;
        while (x1 < n && y1 < m && a[aLo + x1] === b[bLo + y1]) {
          x1++;
          y1++;
        }
        cost += x1 - startX + 1;
        v1[k1Offset] = x1;
        if (x1 > n) k1end += 2;
        else if (y1 > m) k1start += 2;
        else if (front) {
          const k2Offset = offset + delta - k1;
          if (k2Offset >= 0 && k2Offset < length && v2[k2Offset] !== -1 && x1 >= n - v2[k2Offset]) return [x1, y1];
        }
      }
      for (let k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
        const k2Offset = offset + k2;
        let x2 = k2 === -d || (k2 !== d && v2[k2Offset - 1] < v2[k2Offset + 1]) ? v2[k2Offset + 1] : v2[k2Offset - 1] + 1;
        let y2 = x2 - k2;
        const startX = x2;
        while (x2 < n && y2 < m && a[aHi - 1 - x2] === b[bHi - 1 - y2]) {
          x2++;
          y2++;
        }
        cost += x2 - startX + 1;
        v2[k2Offset] = x2;
        if (x2 > n) k2end += 2;
        else if (y2 > m) k2start += 2;
        else if (!front) {
          const k1Offset = offset + delta - k2;
          if (k1Offset >= 0 && k1Offset < length && v1[k1Offset] !== -1) {
            const x1 = v1[k1Offset];
            const y1 = offset + x1 - k1Offset;
            if (x1 >= n - x2) return [x1, y1];
          }
        }
      }
    }
    return null;
  }

  function solve(aLo: number, aHi: number, bLo: number, bHi: number) {
    let prefix = 0;
    while (aLo + prefix < aHi && bLo + prefix < bHi && a[aLo + prefix] === b[bLo + prefix]) prefix++;
    emit(EQUAL, prefix);
    aLo += prefix;
    bLo += prefix;
    let suffix = 0;
    while (aHi - suffix > aLo && bHi - suffix > bLo && a[aHi - 1 - suffix] === b[bHi - 1 - suffix]) suffix++;
    aHi -= suffix;
    bHi -= suffix;
    if (aLo === aHi) emit(INSERT, bHi - bLo);
    else if (bLo === bHi) emit(DELETE, aHi - aLo);
    else {
      const split = cost > maxCost ? null : bisect(aLo, aHi, bLo, bHi);
      if (split) {
        solve(aLo, aLo + split[0], bLo, bLo + split[1]);
        solve(aLo + split[0], aHi, bLo + split[1], bHi);
      } else {
        emit(DELETE, aHi - aLo);
        emit(INSERT, bHi - bLo);
      }
    }
    emit(EQUAL, suffix);
  }

  solve(0, a.length, 0, b.length);
  return ops;
}

function internAll(sequences: string[][]): Int32Array[] {
  const ids = new Map<string, number>();
  return sequences.map((items) => {
    const result = new Int32Array(items.length);
    for (let index = 0; index < items.length; index++) {
      const key = items[index];
      let id = ids.get(key);
      if (id === undefined) {
        id = ids.size;
        ids.set(key, id);
      }
      result[index] = id;
    }
    return result;
  });
}

/** Splits text into lines after normalising CRLF/CR to LF. `endsWithNewline` is true for empty text. */
export function splitLines(text: string): { lines: string[]; endsWithNewline: boolean } {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (!normalized) return { lines: [], endsWithNewline: true };
  const lines = normalized.split("\n");
  const endsWithNewline = lines[lines.length - 1] === "";
  if (endsWithNewline) lines.pop();
  return { lines, endsWithNewline };
}

const isBlank = (line: string) => line.trim() === "";

function appendOps(target: number[], ops: number[]) {
  for (let index = 0; index < ops.length; index += 2) {
    const length = target.length;
    if (length && target[length - 2] === ops[index]) target[length - 1] += ops[index + 1];
    else target.push(ops[index], ops[index + 1]);
  }
}

/**
 * Aligns the non-blank lines first so blank lines cannot pull the alignment
 * off, then diffs the small gaps between matched lines in full.
 */
function diffIgnoringBlankLines(a: Int32Array, b: Int32Array, aBlank: boolean[], bBlank: boolean[], maxCost: number): number[] {
  const aKeep = aBlank.flatMap((blank, index) => (blank ? [] : [index]));
  const bKeep = bBlank.flatMap((blank, index) => (blank ? [] : [index]));
  const filtered = diffSequences(aKeep.map((index) => a[index]), bKeep.map((index) => b[index]), maxCost);
  const ops: number[] = [];
  let aCursor = 0;
  let bCursor = 0;
  const gap = (aEnd: number, bEnd: number) => {
    if (aEnd > aCursor || bEnd > bCursor) appendOps(ops, diffSequences(a.subarray(aCursor, aEnd), b.subarray(bCursor, bEnd), maxCost));
  };
  let aFiltered = 0;
  let bFiltered = 0;
  for (let index = 0; index < filtered.length; index += 2) {
    const op = filtered[index];
    const count = filtered[index + 1];
    if (op === DELETE) aFiltered += count;
    else if (op === INSERT) bFiltered += count;
    else {
      for (let step = 0; step < count; step++) {
        const aIndex = aKeep[aFiltered++];
        const bIndex = bKeep[bFiltered++];
        gap(aIndex, bIndex);
        appendOps(ops, [EQUAL, 1]);
        aCursor = aIndex + 1;
        bCursor = bIndex + 1;
      }
    }
  }
  gap(a.length, b.length);
  return ops;
}

/** Line diff of two texts as ordered hunks; a change block is always a delete hunk followed by an insert hunk. */
export function diffLines(before: string, after: string, options: DiffOptions = {}): DiffHunk[] {
  const old = splitLines(before);
  const next = splitLines(after);
  const keyFor = (lines: string[], endsWithNewline: boolean) =>
    lines.map((line, index) => {
      if (options.ignoreTrailingWhitespace) return line.trimEnd();
      // A missing final newline is a real difference, as in `diff`.
      return !endsWithNewline && index === lines.length - 1 ? `${line}\u0000` : line;
    });
  const [oldIds, newIds] = internAll([keyFor(old.lines, old.endsWithNewline), keyFor(next.lines, next.endsWithNewline)]);
  const maxCost = options.maxCost ?? DEFAULT_MAX_COST;
  const ops = options.ignoreBlankLines
    ? diffIgnoringBlankLines(oldIds, newIds, old.lines.map(isBlank), next.lines.map(isBlank), maxCost)
    : diffSequences(oldIds, newIds, maxCost);

  const hunks: DiffHunk[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  let pendingDelete = null as DiffHunk | null;
  let pendingInsert = null as DiffHunk | null;

  const flushChanges = () => {
    const block = [pendingDelete, pendingInsert].filter((hunk): hunk is DiffHunk => hunk !== null);
    if (options.ignoreBlankLines && block.every((hunk) => [...hunk.oldLines, ...hunk.newLines].every(isBlank))) {
      for (const hunk of block) hunk.ignored = true;
    }
    hunks.push(...block);
    pendingDelete = null;
    pendingInsert = null;
  };

  for (let index = 0; index < ops.length; index += 2) {
    const op = ops[index];
    const count = ops[index + 1];
    if (op === EQUAL) {
      flushChanges();
      hunks.push({
        type: "equal",
        oldStart: oldIndex + 1,
        newStart: newIndex + 1,
        oldLines: old.lines.slice(oldIndex, oldIndex + count),
        newLines: next.lines.slice(newIndex, newIndex + count),
      });
      oldIndex += count;
      newIndex += count;
    } else if (op === DELETE) {
      pendingDelete ??= { type: "delete", oldStart: oldIndex + 1, newStart: (pendingInsert?.newStart ?? newIndex + 1), oldLines: [], newLines: [] };
      pendingDelete.oldLines.push(...old.lines.slice(oldIndex, oldIndex + count));
      oldIndex += count;
    } else {
      // Inserts in a change block start where the block started on the old side.
      pendingInsert ??= { type: "insert", oldStart: (pendingDelete?.oldStart ?? oldIndex + 1), newStart: newIndex + 1, oldLines: [], newLines: [] };
      pendingInsert.newLines.push(...next.lines.slice(newIndex, newIndex + count));
      newIndex += count;
    }
  }
  flushChanges();

  // Mark the hunks that hold each side's final line when it lacks a newline.
  if (!old.endsWithNewline) {
    const last = findLast(hunks, (hunk) => hunk.oldLines.length > 0);
    if (last) last.oldNoNewlineAtEnd = true;
  }
  if (!next.endsWithNewline) {
    const last = findLast(hunks, (hunk) => hunk.newLines.length > 0);
    if (last) last.newNoNewlineAtEnd = true;
  }
  return hunks;
}

function findLast<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
  for (let index = items.length - 1; index >= 0; index--) if (predicate(items[index])) return items[index];
  return undefined;
}

const WORD_TOKEN = /\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu;

function pushSegment(segments: DiffSegment[], text: string, changed: boolean) {
  if (!text) return;
  const last = segments[segments.length - 1];
  if (last && last.changed === changed) last.text += text;
  else segments.push({ text, changed });
}

/** Absorbs whitespace sandwiched between two changes so highlights read as one span. */
function tidySegments(segments: DiffSegment[]): DiffSegment[] {
  const result: DiffSegment[] = [];
  segments.forEach((segment, index) => {
    const bridge = !segment.changed && /^\s+$/.test(segment.text) && segments[index - 1]?.changed && segments[index + 1]?.changed;
    pushSegment(result, segment.text, segment.changed || Boolean(bridge));
  });
  return result;
}

/**
 * Word-level diff of a modified line pair. Returns null when the lines are
 * too long or too dissimilar for intra-line highlights to help.
 */
export function diffWords(beforeLine: string, afterLine: string): WordDiff | null {
  if (beforeLine === afterLine) {
    return { before: beforeLine ? [{ text: beforeLine, changed: false }] : [], after: afterLine ? [{ text: afterLine, changed: false }] : [] };
  }
  if (!beforeLine.trim() || !afterLine.trim()) return null;
  if (beforeLine.length > WORD_MAX_LINE_LENGTH || afterLine.length > WORD_MAX_LINE_LENGTH) return null;
  const beforeTokens = beforeLine.match(WORD_TOKEN) ?? [];
  const afterTokens = afterLine.match(WORD_TOKEN) ?? [];
  const [beforeIds, afterIds] = internAll([beforeTokens, afterTokens]);
  const ops = diffSequences(beforeIds, afterIds, WORD_MAX_COST);

  const before: DiffSegment[] = [];
  const after: DiffSegment[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;
  let unchangedChars = 0;
  for (let index = 0; index < ops.length; index += 2) {
    const op = ops[index];
    const count = ops[index + 1];
    if (op === EQUAL || op === DELETE) {
      const text = beforeTokens.slice(beforeIndex, beforeIndex + count).join("");
      pushSegment(before, text, op === DELETE);
      if (op === EQUAL && text.trim()) unchangedChars += text.length;
      beforeIndex += count;
    }
    if (op === EQUAL || op === INSERT) {
      pushSegment(after, afterTokens.slice(afterIndex, afterIndex + count).join(""), op === INSERT);
      afterIndex += count;
    }
  }
  const similarity = (2 * unchangedChars) / (beforeLine.length + afterLine.length);
  if (similarity < WORD_MIN_SIMILARITY) return null;
  return { before: tidySegments(before), after: tidySegments(after) };
}

type ChangeBlock = { deleted: DiffHunk | null; inserted: DiffHunk | null };

/** Walks hunks, grouping each delete/insert pair into one change block. */
function walkHunks(hunks: readonly DiffHunk[], onEqual: (hunk: DiffHunk) => void, onBlock: (block: ChangeBlock) => void) {
  for (let index = 0; index < hunks.length; index++) {
    const hunk = hunks[index];
    if (hunk.type === "equal" || hunk.ignored) {
      onEqual(hunk);
      continue;
    }
    if (hunk.type === "delete" && hunks[index + 1]?.type === "insert" && !hunks[index + 1].ignored) {
      onBlock({ deleted: hunk, inserted: hunks[index + 1] });
      index++;
    } else {
      onBlock(hunk.type === "delete" ? { deleted: hunk, inserted: null } : { deleted: null, inserted: hunk });
    }
  }
}

function cell(lineNumber: number, text: string, noNewlineAtEnd: boolean, segments?: DiffSegment[]): DiffLineCell {
  const result: DiffLineCell = { lineNumber, text };
  if (segments) result.segments = segments;
  if (noNewlineAtEnd) result.noNewlineAtEnd = true;
  return result;
}

const isLast = (lines: string[], index: number, flag?: boolean) => Boolean(flag) && index === lines.length - 1;

function pairedWords(block: ChangeBlock, index: number, wordDiff: boolean): WordDiff | null {
  if (!wordDiff || !block.deleted || !block.inserted) return null;
  if (index >= block.deleted.oldLines.length || index >= block.inserted.newLines.length) return null;
  return diffWords(block.deleted.oldLines[index], block.inserted.newLines[index]);
}

export function buildSideBySideRows(hunks: readonly DiffHunk[], options: { wordDiff?: boolean } = {}): SideBySideRow[] {
  const wordDiff = options.wordDiff ?? true;
  const rows: SideBySideRow[] = [];
  walkHunks(
    hunks,
    (hunk) => {
      const count = Math.max(hunk.oldLines.length, hunk.newLines.length);
      for (let index = 0; index < count; index++) {
        const left = index < hunk.oldLines.length ? cell(hunk.oldStart + index, hunk.oldLines[index], isLast(hunk.oldLines, index, hunk.oldNoNewlineAtEnd)) : null;
        const right = index < hunk.newLines.length ? cell(hunk.newStart + index, hunk.newLines[index], isLast(hunk.newLines, index, hunk.newNoNewlineAtEnd)) : null;
        rows.push({ kind: "row", type: "equal", left, right });
      }
    },
    (block) => {
      const oldLines = block.deleted?.oldLines ?? [];
      const newLines = block.inserted?.newLines ?? [];
      const count = Math.max(oldLines.length, newLines.length);
      for (let index = 0; index < count; index++) {
        const words = pairedWords(block, index, wordDiff);
        const left = block.deleted && index < oldLines.length ? cell(block.deleted.oldStart + index, oldLines[index], isLast(oldLines, index, block.deleted.oldNoNewlineAtEnd), words?.before) : null;
        const right = block.inserted && index < newLines.length ? cell(block.inserted.newStart + index, newLines[index], isLast(newLines, index, block.inserted.newNoNewlineAtEnd), words?.after) : null;
        rows.push({ kind: "row", type: left && right ? "modify" : left ? "delete" : "insert", left, right });
      }
    },
  );
  return rows;
}

export function buildUnifiedRows(hunks: readonly DiffHunk[], options: { wordDiff?: boolean } = {}): UnifiedRow[] {
  const wordDiff = options.wordDiff ?? true;
  const rows: UnifiedRow[] = [];
  const row = (type: DiffChangeType, oldLineNumber: number | null, newLineNumber: number | null, text: string, noNewlineAtEnd: boolean, segments?: DiffSegment[]) => {
    const result: UnifiedRow = { kind: "row", type, oldLineNumber, newLineNumber, text };
    if (segments) result.segments = segments;
    if (noNewlineAtEnd) result.noNewlineAtEnd = true;
    rows.push(result);
  };
  walkHunks(
    hunks,
    (hunk) => {
      if (hunk.type === "equal") {
        // Equal lines can differ in whitespace when it is ignored; show the newer text.
        hunk.newLines.forEach((text, index) => row("equal", hunk.oldStart + index, hunk.newStart + index, text, isLast(hunk.newLines, index, hunk.newNoNewlineAtEnd)));
      } else if (hunk.type === "delete") {
        hunk.oldLines.forEach((text, index) => row("equal", hunk.oldStart + index, null, text, isLast(hunk.oldLines, index, hunk.oldNoNewlineAtEnd)));
      } else {
        hunk.newLines.forEach((text, index) => row("equal", null, hunk.newStart + index, text, isLast(hunk.newLines, index, hunk.newNoNewlineAtEnd)));
      }
    },
    (block) => {
      const words = block.deleted && block.inserted ? block.deleted.oldLines.map((_, index) => pairedWords(block, index, wordDiff)) : [];
      block.deleted?.oldLines.forEach((text, index) => row("delete", block.deleted!.oldStart + index, null, text, isLast(block.deleted!.oldLines, index, block.deleted!.oldNoNewlineAtEnd), words[index]?.before));
      block.inserted?.newLines.forEach((text, index) => row("insert", null, block.inserted!.newStart + index, text, isLast(block.inserted!.newLines, index, block.inserted!.newNoNewlineAtEnd), words[index]?.after));
    },
  );
  return rows;
}

/**
 * Folds runs of unchanged rows, keeping `context` rows next to each change.
 * Runs that would hide fewer than two rows stay expanded.
 */
export function collapseUnchanged<T extends { kind: "row"; type: string }>(rows: readonly T[], context = 3): Array<T | CollapsedRows<T>> {
  const result: Array<T | CollapsedRows<T>> = [];
  let index = 0;
  while (index < rows.length) {
    if (rows[index].type !== "equal") {
      result.push(rows[index]);
      index++;
      continue;
    }
    const start = index;
    while (index < rows.length && rows[index].type === "equal") index++;
    const keepBefore = start === 0 ? 0 : context;
    const keepAfter = index === rows.length ? 0 : context;
    const hidden = index - start - keepBefore - keepAfter;
    if (hidden < MIN_COLLAPSED_LINES) {
      result.push(...rows.slice(start, index));
      continue;
    }
    const hiddenStart = start + keepBefore;
    result.push(...rows.slice(start, hiddenStart));
    result.push({ kind: "collapsed", id: `collapsed-${hiddenStart}`, count: hidden, rows: rows.slice(hiddenStart, hiddenStart + hidden) });
    result.push(...rows.slice(hiddenStart + hidden, index));
  }
  return result;
}

export function diffStats(hunks: readonly DiffHunk[]): DiffStats {
  const stats: DiffStats = { additions: 0, deletions: 0, changed: 0, blocks: 0 };
  walkHunks(
    hunks,
    () => undefined,
    (block) => {
      const deleted = block.deleted?.oldLines.length ?? 0;
      const inserted = block.inserted?.newLines.length ?? 0;
      stats.deletions += deleted;
      stats.additions += inserted;
      stats.changed += Math.min(deleted, inserted);
      stats.blocks++;
    },
  );
  return stats;
}

type PatchLine = { op: " " | "-" | "+"; text: string; oldBefore: number; newBefore: number; noNewlineAtEnd: boolean };

/** A standard unified diff (`diff -u` style). Returns an empty string when the texts have no line differences. */
export function formatUnifiedPatch(before: string, after: string, options: { fromLabel: string; toLabel: string; context?: number }): string {
  const context = options.context ?? 3;
  const lines: PatchLine[] = [];
  let oldCount = 0;
  let newCount = 0;
  for (const hunk of diffLines(before, after)) {
    if (hunk.type === "equal") {
      hunk.oldLines.forEach((text, index) => {
        lines.push({ op: " ", text, oldBefore: oldCount, newBefore: newCount, noNewlineAtEnd: isLast(hunk.oldLines, index, hunk.oldNoNewlineAtEnd) });
        oldCount++;
        newCount++;
      });
    } else if (hunk.type === "delete") {
      hunk.oldLines.forEach((text, index) => {
        lines.push({ op: "-", text, oldBefore: oldCount, newBefore: newCount, noNewlineAtEnd: isLast(hunk.oldLines, index, hunk.oldNoNewlineAtEnd) });
        oldCount++;
      });
    } else {
      hunk.newLines.forEach((text, index) => {
        lines.push({ op: "+", text, oldBefore: oldCount, newBefore: newCount, noNewlineAtEnd: isLast(hunk.newLines, index, hunk.newNoNewlineAtEnd) });
        newCount++;
      });
    }
  }

  const changeIndexes = lines.flatMap((line, index) => (line.op === " " ? [] : [index]));
  if (!changeIndexes.length) return "";

  // Group changes whose context windows touch or overlap.
  const groups: Array<[number, number]> = [];
  for (const index of changeIndexes) {
    const start = Math.max(0, index - context);
    const end = Math.min(lines.length, index + context + 1);
    const last = groups[groups.length - 1];
    if (last && start <= last[1]) last[1] = end;
    else groups.push([start, end]);
  }

  const range = (start: number, count: number) => (count === 1 ? `${start}` : `${count === 0 ? start - 1 : start},${count}`);
  const output = [`--- ${options.fromLabel}`, `+++ ${options.toLabel}`];
  for (const [start, end] of groups) {
    const slice = lines.slice(start, end);
    const oldLines = slice.filter((line) => line.op !== "+").length;
    const newLines = slice.filter((line) => line.op !== "-").length;
    output.push(`@@ -${range(slice[0].oldBefore + 1, oldLines)} +${range(slice[0].newBefore + 1, newLines)} @@`);
    for (const line of slice) {
      output.push(`${line.op}${line.text}`);
      if (line.noNewlineAtEnd) output.push("\\ No newline at end of file");
    }
  }
  return `${output.join("\n")}\n`;
}
