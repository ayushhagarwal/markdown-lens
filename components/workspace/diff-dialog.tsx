"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type UIEvent, type WheelEvent } from "react";
import { ArrowLeftRight, Check, ChevronDown, ChevronUp, ChevronsUpDown, ClipboardPaste, Columns2, Copy, RotateCcw, Rows2, X } from "lucide-react";
import { DialogShell, dialogCancelButton, dialogConfirmButton } from "@/components/workspace/dialog-shell";
import {
  buildSideBySideRows,
  buildUnifiedRows,
  collapseUnchanged,
  diffLines,
  diffStats,
  formatUnifiedPatch,
  type CollapsedRows,
  type DiffLineCell,
  type DiffSegment,
  type SideBySideRow,
  type UnifiedRow,
} from "@/lib/text-diff";
import { cn } from "@/lib/utils";

export type DiffSource = {
  id: string;
  label: string;
  detail?: string;
  text: string;
  /** Shows a restore action while this source is on either side. */
  restorable?: boolean;
};

type ViewMode = "split" | "unified";
type DiffRow = SideBySideRow | UnifiedRow;
type DisplayItem = DiffRow | CollapsedRows<DiffRow>;

const CONTEXT_LINES = 3;
const RENDER_CHUNK = 400;
/** Rows rendered automatically; beyond this the user asks for more (or jumps to a change). */
const AUTO_RENDER_LIMIT = 3_000;
const SCROLLBAR_MIN_CHARS = 60;
const EMPTY_IDS: ReadonlySet<string> = new Set();

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const fieldClass = "h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30";
const toolButton = cn("inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent", focusRing);
const pressedButton = "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent";
const shiftedText = "[transform:translateX(calc(var(--diff-x,0px)*-1))]";

function sourceOptionLabel(source: DiffSource) {
  return source.detail ? `${source.label} · ${source.detail}` : source.label;
}

function lineCountLabel(text: string) {
  const count = text ? text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").length : 0;
  return `${count.toLocaleString()} line${count === 1 ? "" : "s"}`;
}

/** Approximate rendered width in `ch`: tabs take four columns, wide CJK characters two. */
function textColumns(text: string) {
  let columns = 0;
  for (const character of text) {
    if (character === "\t") columns += 4;
    else columns += (character.codePointAt(0) ?? 0) >= 0x1100 ? 2 : 1;
  }
  return columns;
}

function rowColumns(row: DiffRow) {
  if ("left" in row) return Math.max(row.left ? textColumns(row.left.text) : 0, row.right ? textColumns(row.right.text) : 0);
  return textColumns(row.text);
}

const isChangeRow = (item: DisplayItem | undefined) => item?.kind === "row" && item.type !== "equal";

function initialViewMode(): ViewMode {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "unified";
  return window.matchMedia("(min-width: 1024px)").matches ? "split" : "unified";
}

export function DiffDialog({
  sources,
  initialLeftId,
  initialRightId,
  onRestore,
  onClose,
}: {
  sources: DiffSource[];
  initialLeftId?: string;
  initialRightId?: string;
  onRestore?: (source: DiffSource) => void;
  onClose: () => void;
}) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const [pasted, setPasted] = useState<DiffSource[]>([]);
  const allSources = useMemo(() => [...sources, ...pasted], [sources, pasted]);
  const [leftId, setLeftId] = useState(() => initialLeftId ?? sources[0]?.id ?? "");
  const [rightId, setRightId] = useState(() => initialRightId ?? (sources[1] ?? sources[0])?.id ?? "");
  const left = allSources.find((source) => source.id === leftId) ?? allSources[0];
  const right = allSources.find((source) => source.id === rightId) ?? allSources[1] ?? allSources[0];

  const [view, setView] = useState<ViewMode>(initialViewMode);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [collapse, setCollapse] = useState(true);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteDraft, setPasteDraft] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const leftText = left?.text ?? "";
  const rightText = right?.text ?? "";
  const hunks = useMemo(
    () => diffLines(leftText, rightText, ignoreWhitespace ? { ignoreTrailingWhitespace: true, ignoreBlankLines: true } : {}),
    [leftText, rightText, ignoreWhitespace],
  );
  const stats = useMemo(() => diffStats(hunks), [hunks]);
  const rows = useMemo<DiffRow[]>(() => (view === "split" ? buildSideBySideRows(hunks) : buildUnifiedRows(hunks)), [hunks, view]);
  const items = useMemo<DisplayItem[]>(() => (collapse ? collapseUnchanged(rows, CONTEXT_LINES) : rows), [rows, collapse]);
  const maxColumns = useMemo(() => rows.reduce((max, row) => Math.max(max, rowColumns(row)), 0), [rows]);
  const hasScrollbar = maxColumns > SCROLLBAR_MIN_CHARS;

  // Per-diff UI state is keyed to `items` so it resets when sources or options change.
  const [expanded, setExpanded] = useState<{ key: DisplayItem[]; ids: ReadonlySet<string> }>({ key: items, ids: EMPTY_IDS });
  const expandedIds = expanded.key === items ? expanded.ids : EMPTY_IDS;
  const display = useMemo(
    () => (expandedIds.size ? items.flatMap((item) => (item.kind === "collapsed" && expandedIds.has(item.id) ? item.rows : [item])) : items),
    [items, expandedIds],
  );
  const [renderState, setRenderState] = useState({ key: items, limit: RENDER_CHUNK });
  const limit = renderState.key === items ? renderState.limit : RENDER_CHUNK;
  const [activeState, setActiveState] = useState({ key: items, index: -1 });
  const activeIndex = activeState.key === items ? activeState.index : -1;

  const anchors = useMemo(() => display.flatMap((item, index) => (isChangeRow(item) && !isChangeRow(display[index - 1]) ? [index] : [])), [display]);

  const regionRef = useRef<HTMLDivElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const scrollersRef = useRef<Array<HTMLDivElement | null>>([]);
  const pendingFocusRef = useRef(false);

  // Render long diffs in chunks so the dialog opens immediately.
  useEffect(() => {
    if (limit >= Math.min(display.length, AUTO_RENDER_LIMIT)) return;
    const handle = window.setTimeout(() => setRenderState({ key: items, limit: limit + RENDER_CHUNK }), 16);
    return () => window.clearTimeout(handle);
  }, [display.length, items, limit]);

  useEffect(() => {
    if (!pendingFocusRef.current || activeIndex < 0) return;
    const target = regionRef.current?.querySelector<HTMLElement>(`[data-change-index="${activeIndex}"]`);
    if (!target) return;
    pendingFocusRef.current = false;
    target.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
  }, [activeIndex, limit]);

  // Keep the shared horizontal offset in step with whichever scrollbar is mounted.
  useEffect(() => {
    tableWrapRef.current?.style.setProperty("--diff-x", `${scrollersRef.current[0]?.scrollLeft ?? 0}px`);
  }, [view, hasScrollbar, items]);

  useEffect(() => {
    if (copyState === "idle") return;
    const handle = window.setTimeout(() => setCopyState("idle"), 2_000);
    return () => window.clearTimeout(handle);
  }, [copyState]);

  const expand = useCallback((id: string) => {
    setExpanded((current) => {
      const ids = new Set(current.key === items ? current.ids : EMPTY_IDS);
      ids.add(id);
      return { key: items, ids };
    });
  }, [items]);

  function goToChange(direction: 1 | -1) {
    if (!anchors.length) return;
    const next = activeIndex < 0 ? (direction === 1 ? 0 : anchors.length - 1) : (activeIndex + direction + anchors.length) % anchors.length;
    pendingFocusRef.current = true;
    setActiveState({ key: items, index: next });
    const needed = anchors[next] + RENDER_CHUNK;
    if (limit < needed) setRenderState({ key: items, limit: needed });
  }

  function handleHorizontalScroll(event: UIEvent<HTMLDivElement>) {
    const x = event.currentTarget.scrollLeft;
    for (const scroller of scrollersRef.current) if (scroller && scroller !== event.currentTarget && scroller.scrollLeft !== x) scroller.scrollTo({ left: x });
    tableWrapRef.current?.style.setProperty("--diff-x", `${x}px`);
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const scroller = scrollersRef.current[0];
    if (!scroller) return;
    const horizontal = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    if (horizontal && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) scroller.scrollBy({ left: horizontal });
  }

  function swap() {
    setLeftId(right?.id ?? "");
    setRightId(left?.id ?? "");
  }

  function addPasted() {
    if (!pasteDraft) return;
    const number = pasted.length + 1;
    const source: DiffSource = { id: `${baseId}-pasted-${number}`, label: `Pasted text ${number}`, detail: lineCountLabel(pasteDraft), text: pasteDraft };
    setPasted((current) => [...current, source]);
    if (left) setLeftId(left.id);
    setRightId(source.id);
    setPasteDraft("");
    setPasteOpen(false);
  }

  async function copyPatch() {
    if (!left || !right) return;
    try {
      await navigator.clipboard.writeText(formatUnifiedPatch(left.text, right.text, { fromLabel: left.label, toLabel: right.label }));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  const identical = stats.blocks === 0;
  const rawIdentical = leftText.replace(/\r\n?/g, "\n") === rightText.replace(/\r\n?/g, "\n");
  const statsAnnouncement = !left || !right
    ? "Choose two sources to compare."
    : identical
      ? `No differences between ${left.label} and ${right.label}.`
      : `${stats.additions.toLocaleString()} line${stats.additions === 1 ? "" : "s"} added and ${stats.deletions.toLocaleString()} removed in ${stats.blocks.toLocaleString()} change${stats.blocks === 1 ? "" : "s"}.`;
  const restorable = [left, right].filter((source, index, list): source is DiffSource => Boolean(source?.restorable && onRestore) && list.indexOf(source) === index);
  const columnCount = view === "split" ? 6 : 4;
  const scrollbarColumns = view === "split" ? "grid-cols-[5rem_minmax(0,1fr)_5rem_minmax(0,1fr)]" : "grid-cols-[8.5rem_minmax(0,1fr)]";
  const spacerStyle: CSSProperties = { width: `calc(${maxColumns}ch + 1rem)` };

  return (
    <DialogShell onClose={onClose} labelledBy={titleId} className="flex h-[min(92vh,60rem)] max-w-6xl flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border p-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em]">Compare</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Differences are computed in this browser. Nothing is uploaded.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close compare" title="Close compare" className={cn("-mr-2 -mt-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", focusRing)}>
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="min-w-0">
            <label htmlFor={`${baseId}-left`} className="mb-1.5 block text-xs font-medium text-muted-foreground">Before <span className="text-danger" aria-hidden="true">−</span></label>
            <select id={`${baseId}-left`} value={left?.id ?? ""} onChange={(event) => setLeftId(event.target.value)} className={fieldClass}>
              {allSources.map((source) => <option key={source.id} value={source.id}>{sourceOptionLabel(source)}</option>)}
            </select>
          </div>
          <button type="button" onClick={swap} aria-label="Swap before and after" title="Swap before and after" className={cn(toolButton, "h-10 w-10 justify-self-center border border-border px-0")}>
            <ArrowLeftRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <label htmlFor={`${baseId}-right`} className="mb-1.5 block text-xs font-medium text-muted-foreground">After <span className="text-accent" aria-hidden="true">+</span></label>
            <select id={`${baseId}-right`} value={right?.id ?? ""} onChange={(event) => setRightId(event.target.value)} className={fieldClass}>
              {allSources.map((source) => <option key={source.id} value={source.id}>{sourceOptionLabel(source)}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label="Layout" className="inline-flex rounded-lg border border-border p-0.5">
            <button type="button" aria-pressed={view === "split"} onClick={() => setView("split")} className={cn(toolButton, "min-h-8", view === "split" && pressedButton)}>
              <Columns2 aria-hidden="true" className="h-3.5 w-3.5" />Side by side
            </button>
            <button type="button" aria-pressed={view === "unified"} onClick={() => setView("unified")} className={cn(toolButton, "min-h-8", view === "unified" && pressedButton)}>
              <Rows2 aria-hidden="true" className="h-3.5 w-3.5" />Unified
            </button>
          </div>
          <button type="button" aria-pressed={ignoreWhitespace} onClick={() => setIgnoreWhitespace((value) => !value)} className={cn(toolButton, ignoreWhitespace && pressedButton)}>Ignore whitespace</button>
          <button type="button" aria-pressed={collapse} onClick={() => setCollapse((value) => !value)} className={cn(toolButton, collapse && pressedButton)}>Collapse unchanged</button>
          <button type="button" aria-expanded={pasteOpen} aria-controls={`${baseId}-paste`} onClick={() => setPasteOpen((value) => !value)} className={cn(toolButton, pasteOpen && pressedButton)}>
            <ClipboardPaste aria-hidden="true" className="h-3.5 w-3.5" />Paste text to compare
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <p className="px-1 font-mono text-xs font-semibold tabular-nums" aria-hidden="true">
              <span className="text-accent">+{stats.additions.toLocaleString()}</span>{" "}
              <span className="text-danger">−{stats.deletions.toLocaleString()}</span>
            </p>
            <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground" aria-hidden="true">
              {anchors.length ? `${activeIndex < 0 ? "–" : activeIndex + 1} of ${anchors.length}` : "No changes"}
            </span>
            <button type="button" onClick={() => goToChange(-1)} disabled={!anchors.length} aria-label="Previous change" title="Previous change" className={cn(toolButton, "w-9 px-0")}>
              <ChevronUp aria-hidden="true" className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => goToChange(1)} disabled={!anchors.length} aria-label="Next change" title="Next change" className={cn(toolButton, "w-9 px-0")}>
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => void copyPatch()} disabled={rawIdentical} className={toolButton}>
              {copyState === "copied" ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
              {copyState === "copied" ? "Copied" : "Copy patch"}
            </button>
            {restorable.map((source) => (
              <button key={source.id} type="button" onClick={() => onRestore?.(source)} className={cn(toolButton, "text-accent hover:bg-accent-soft hover:text-accent")}>
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                {restorable.length > 1 ? `Restore ${source === left ? "before" : "after"}` : "Restore this version"}
                <span className="sr-only">: {source.label}</span>
              </button>
            ))}
          </div>
        </div>
        <p role="status" className="sr-only">{statsAnnouncement}</p>
        <p role="status" className="sr-only">{copyState === "copied" ? "Patch copied to clipboard." : copyState === "failed" ? "Could not copy the patch." : ""}</p>
      </div>

      {pasteOpen ? (
        <form
          id={`${baseId}-paste`}
          className="shrink-0 border-b border-border bg-surface p-4 sm:px-5"
          onSubmit={(event) => {
            event.preventDefault();
            addPasted();
          }}
        >
          <label htmlFor={`${baseId}-paste-input`} className="block text-sm font-medium">Text to compare</label>
          <textarea
            id={`${baseId}-paste-input`}
            value={pasteDraft}
            onChange={(event) => setPasteDraft(event.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="Paste Markdown or plain text…"
            className="mt-2 block max-h-48 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-5 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setPasteOpen(false)} className={dialogCancelButton}>Cancel</button>
            <button type="submit" disabled={!pasteDraft} className={cn(dialogConfirmButton, "disabled:cursor-default disabled:opacity-50")}>Compare as after</button>
          </div>
        </form>
      ) : null}

      {!left || !right ? (
        <EmptyState title="Nothing to compare" detail="Paste text to compare or open a document with saved versions." />
      ) : identical ? (
        <EmptyState
          title="No differences"
          detail={rawIdentical ? (left === right ? "The same source is selected on both sides." : "Both sides contain exactly the same text.") : "Only whitespace or blank-line changes, which are being ignored."}
        />
      ) : (
        <div
          ref={regionRef}
          role="region"
          aria-label={`Differences between ${left.label} and ${right.label}`}
          tabIndex={0}
          onWheel={hasScrollbar ? handleWheel : undefined}
          className={cn("relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-panel", focusRing, "focus-visible:ring-inset")}
        >
          <div ref={tableWrapRef}>
            <table className="w-full table-fixed border-collapse font-mono text-xs leading-5">
              <caption className="sr-only">
                {view === "split" ? "Side-by-side" : "Unified"} comparison of {left.label} (before) and {right.label} (after). {statsAnnouncement}
              </caption>
              <colgroup>
                {view === "split" ? (
                  <>
                    <col className="w-14" /><col className="w-6" /><col />
                    <col className="w-14" /><col className="w-6" /><col />
                  </>
                ) : (
                  <>
                    <col className="w-14" /><col className="w-14" /><col className="w-6" /><col />
                  </>
                )}
              </colgroup>
              <thead className="font-sans text-[11px] font-medium text-muted-foreground">
                {view === "split" ? (
                  <tr>
                    <th scope="col" className={headerCell}><span className="sr-only">Line before</span></th>
                    <th scope="col" className={headerCell}><span className="sr-only">Change</span></th>
                    <th scope="col" className={cn(headerCell, "truncate px-2 text-left text-danger")}>{left.label}</th>
                    <th scope="col" className={cn(headerCell, "border-l border-border")}><span className="sr-only">Line after</span></th>
                    <th scope="col" className={headerCell}><span className="sr-only">Change</span></th>
                    <th scope="col" className={cn(headerCell, "truncate px-2 text-left text-accent")}>{right.label}</th>
                  </tr>
                ) : (
                  <tr>
                    <th scope="col" className={cn(headerCell, "pr-2 text-right")}>Before</th>
                    <th scope="col" className={cn(headerCell, "pr-2 text-right")}>After</th>
                    <th scope="col" className={headerCell}><span className="sr-only">Change</span></th>
                    <th scope="col" className={cn(headerCell, "truncate px-2 text-left")}>Text</th>
                  </tr>
                )}
              </thead>
              <DiffBody items={display} limit={limit} anchors={anchors} activeIndex={activeIndex} shifted={hasScrollbar} columnCount={columnCount} onExpand={expand} />
            </table>
            {limit < display.length ? (
              <div className="flex items-center justify-center gap-3 border-t border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
                <span>{(display.length - limit).toLocaleString()} more rows</span>
                {limit >= AUTO_RENDER_LIMIT ? (
                  <button type="button" onClick={() => setRenderState({ key: items, limit: limit + AUTO_RENDER_LIMIT })} className={cn(toolButton, "text-accent hover:bg-accent-soft hover:text-accent")}>Show more</button>
                ) : null}
              </div>
            ) : null}
          </div>
          {hasScrollbar ? (
            <div className={cn("sticky bottom-0 z-10 grid border-t border-border bg-surface", scrollbarColumns)}>
              {(view === "split" ? [0, 1] : [0]).map((index) => (
                <div
                  key={`${view}-${index}`}
                  ref={(element) => { scrollersRef.current[index] = element; }}
                  onScroll={handleHorizontalScroll}
                  tabIndex={0}
                  role="group"
                  aria-label={view === "split" ? `Scroll ${index === 0 ? "before" : "after"} text horizontally` : "Scroll text horizontally"}
                  className={cn("col-start-2 overflow-x-auto overflow-y-hidden", index === 1 && "col-start-4", focusRing, "focus-visible:ring-inset")}
                >
                  <div aria-hidden="true" className="h-3 font-mono text-xs" style={spacerStyle} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </DialogShell>
  );
}

const headerCell = "sticky top-0 z-[1] h-8 border-b border-border bg-surface px-0 font-medium";

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="max-w-sm rounded-xl border border-dashed border-border px-6 py-8 text-center">
        <span aria-hidden="true" className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent"><Check className="h-4 w-4" /></span>
        <p className="mt-3 text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

const DiffBody = memo(function DiffBody({
  items,
  limit,
  anchors,
  activeIndex,
  shifted,
  columnCount,
  onExpand,
}: {
  items: DisplayItem[];
  limit: number;
  anchors: number[];
  activeIndex: number;
  shifted: boolean;
  columnCount: number;
  onExpand: (id: string) => void;
}) {
  const anchorByIndex = useMemo(() => new Map(anchors.map((itemIndex, changeIndex) => [itemIndex, changeIndex])), [anchors]);
  return (
    <tbody>
      {items.slice(0, limit).map((item, index) => {
        if (item.kind === "collapsed") {
          return (
            <tr key={item.id}>
              <td colSpan={columnCount} className="border-y border-border bg-surface p-0 font-sans">
                <button type="button" onClick={() => onExpand(item.id)} className={cn("flex min-h-8 w-full items-center gap-2 px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", focusRing, "focus-visible:ring-inset")}>
                  <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5" />
                  {item.count.toLocaleString()} unchanged lines
                  <span className="sr-only">, show them</span>
                </button>
              </td>
            </tr>
          );
        }
        const changeIndex = anchorByIndex.get(index);
        const anchorProps = changeIndex === undefined
          ? {}
          : {
              "data-change-index": changeIndex,
              tabIndex: -1,
              "aria-label": `Change ${changeIndex + 1} of ${anchors.length}`,
            };
        const rowClass = cn("scroll-my-12 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ring", changeIndex !== undefined && changeIndex === activeIndex && "outline outline-1 -outline-offset-1 outline-ring/60");
        return "left" in item ? (
          <tr key={index} className={rowClass} {...anchorProps}>
            <SplitCells cell={item.left} side="before" changed={item.type === "delete" || item.type === "modify"} shifted={shifted} />
            <SplitCells cell={item.right} side="after" changed={item.type === "insert" || item.type === "modify"} shifted={shifted} />
          </tr>
        ) : (
          <tr key={index} className={cn(rowClass, item.type === "insert" && "bg-accent/10", item.type === "delete" && "bg-danger/10")} {...anchorProps}>
            <td className={lineNumberCell}>{item.oldLineNumber ?? ""}</td>
            <td className={lineNumberCell}>{item.newLineNumber ?? ""}</td>
            <ChangeMark type={item.type === "equal" ? null : item.type} />
            <TextCell text={item.text} segments={item.segments} type={item.type === "equal" ? null : item.type} noNewlineAtEnd={item.noNewlineAtEnd} shifted={shifted} />
          </tr>
        );
      })}
    </tbody>
  );
});

const lineNumberCell = "select-none overflow-hidden whitespace-nowrap pr-2 text-right align-top tabular-nums text-muted-foreground";

function SplitCells({ cell, side, changed, shifted }: { cell: DiffLineCell | null; side: "before" | "after"; changed: boolean; shifted: boolean }) {
  const type = changed ? (side === "before" ? "delete" : "insert") : null;
  const tint = type === "delete" ? "bg-danger/10" : type === "insert" ? "bg-accent/10" : null;
  const divider = side === "after" && "border-l border-border";
  if (!cell) {
    return (
      <>
        <td className={cn(lineNumberCell, divider, "bg-muted/60")} />
        <td className="bg-muted/60" />
        <td className="bg-muted/60"><span className="sr-only">No line</span></td>
      </>
    );
  }
  return (
    <>
      <td className={cn(lineNumberCell, divider, tint)}>{cell.lineNumber}</td>
      <ChangeMark type={type} className={tint ?? undefined} />
      <TextCell text={cell.text} segments={cell.segments} type={type} noNewlineAtEnd={cell.noNewlineAtEnd} shifted={shifted} className={tint ?? undefined} />
    </>
  );
}

function ChangeMark({ type, className }: { type: "insert" | "delete" | null; className?: string }) {
  if (!type) return <td className={className} />;
  return (
    <td className={cn("select-none text-center align-top font-semibold", type === "insert" ? "text-accent" : "text-danger", className)}>
      <span aria-hidden="true">{type === "insert" ? "+" : "−"}</span>
      <span className="sr-only">{type === "insert" ? "Added" : "Removed"}</span>
    </td>
  );
}

function TextCell({ text, segments, type, noNewlineAtEnd, shifted, className }: { text: string; segments?: DiffSegment[]; type: "insert" | "delete" | null; noNewlineAtEnd?: boolean; shifted: boolean; className?: string }) {
  return (
    <td className={cn("overflow-hidden px-2 align-top", className)}>
      <span className={cn("inline-block whitespace-pre text-foreground [tab-size:4]", shifted && shiftedText)}>
        {segments && type
          ? segments.map((segment, index) => {
              if (!segment.changed) return <span key={index}>{segment.text}</span>;
              return type === "insert"
                ? <ins key={index} className="rounded-sm bg-accent/25 no-underline">{segment.text}</ins>
                : <del key={index} className="rounded-sm bg-danger/25 no-underline">{segment.text}</del>;
            })
          : text || "​"}
        {noNewlineAtEnd ? <span className="ml-2 rounded border border-border px-1 font-sans text-[10px] text-muted-foreground">No newline at end</span> : null}
      </span>
    </td>
  );
}
