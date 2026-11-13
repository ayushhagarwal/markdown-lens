"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  ClipboardPaste,
  Plus,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { DialogShell, dialogCancelButton, dialogConfirmButton } from "@/components/workspace/dialog-shell";
import {
  columnCount,
  createTable,
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  moveColumn,
  moveRow,
  normalizeTable,
  parseDelimitedCells,
  parsePastedTable,
  pasteCells,
  serializeMarkdownTable,
  setAlignment,
  setGridCell,
  sortByColumn,
  type TableAlignment,
  type TableModel,
} from "@/lib/markdown-table";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const toolButton = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent",
  focusRing,
);
const textButton = cn(
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-50",
  focusRing,
);

type CellPosition = { row: number; column: number };

const ALIGNMENT_CLASS: Record<Exclude<TableAlignment, null>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function ToolButton({ icon: Icon, label, onClick, disabled, pressed }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(toolButton, pressed && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent")}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

function gridLabel(position: CellPosition) {
  return position.row === 0 ? `Header, column ${position.column + 1}` : `Row ${position.row}, column ${position.column + 1}`;
}

/**
 * Visual grid editor for a GFM pipe table. Grid row 0 is the header row; body rows start at 1.
 * Pasting multi-cell clipboard text into a cell fills the grid from that cell.
 */
export function TableEditorDialog({
  initialTable,
  onApply,
  onClose,
  mode,
}: {
  initialTable?: TableModel;
  onApply: (markdown: string) => void;
  onClose: () => void;
  mode: "insert" | "edit";
}) {
  const [table, setTable] = useState<TableModel>(() => normalizeTable(initialTable ?? createTable()));
  const [active, setActive] = useState<CellPosition>({ row: 0, column: 0 });
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState("");
  const cellRefs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<(CellPosition & { select?: boolean }) | null>(null);

  const columns = columnCount(table);
  const gridRows = table.rows.length + 1;
  const titleId = "table-editor-title";

  const focusCell = useCallback((position: CellPosition, select = true) => {
    const input = cellRefs.current.get(`${position.row}:${position.column}`);
    if (!input) return false;
    input.focus();
    if (select) input.select();
    return true;
  }, []);

  /** Focus a cell now if it exists, otherwise after the next render. */
  const requestFocus = useCallback(
    (position: CellPosition, select = true) => {
      setActive(position);
      if (!focusCell(position, select)) pendingFocus.current = { ...position, select };
    },
    [focusCell],
  );

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    focusCell(pending, pending.select);
  }, [table, focusCell]);

  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => focusCell({ row: 0, column: 0 }));
    });
    return () => cancelAnimationFrame(frame);
  }, [focusCell]);

  const update = useCallback((transform: (current: TableModel) => TableModel, focus?: CellPosition) => {
    setTable((current) => transform(current));
    if (focus) {
      setActive(focus);
      pendingFocus.current = { ...focus, select: false };
    }
  }, []);

  const activeColumn = Math.min(active.column, columns - 1);
  const activeRow = Math.min(active.row, gridRows - 1);
  const bodyIndex = activeRow - 1;
  const alignment = table.alignments[activeColumn] ?? null;

  const addRow = (focus = true) => update((current) => insertRow(current, current.rows.length), focus ? { row: gridRows, column: 0 } : undefined);
  const addColumn = () => update((current) => insertColumn(current, columnCount(current)), { row: 0, column: columns });

  function moveFocus(event: KeyboardEvent<HTMLInputElement>, position: CellPosition) {
    const input = event.currentTarget;
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
    const isLastCell = position.row === gridRows - 1 && position.column === columns - 1;
    let target: CellPosition | null = null;

    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onApply(serializeMarkdownTable(table));
      return;
    }
    switch (event.key) {
      case "Tab":
        if (event.altKey || event.metaKey || event.ctrlKey) return;
        if (event.shiftKey) {
          if (position.row === 0 && position.column === 0) return;
          target = position.column > 0 ? { row: position.row, column: position.column - 1 } : { row: position.row - 1, column: columns - 1 };
        } else if (isLastCell) {
          event.preventDefault();
          event.stopPropagation();
          addRow(false);
          requestFocus({ row: gridRows, column: 0 });
          return;
        } else {
          target = position.column < columns - 1 ? { row: position.row, column: position.column + 1 } : { row: position.row + 1, column: 0 };
        }
        break;
      case "Enter":
        if (event.shiftKey) {
          if (position.row > 0) target = { row: position.row - 1, column: position.column };
          else return;
        } else if (position.row === gridRows - 1) {
          event.preventDefault();
          addRow(false);
          requestFocus({ row: gridRows, column: position.column });
          return;
        } else {
          target = { row: position.row + 1, column: position.column };
        }
        break;
      case "ArrowUp":
        if (position.row > 0) target = { row: position.row - 1, column: position.column };
        break;
      case "ArrowDown":
        if (position.row < gridRows - 1) target = { row: position.row + 1, column: position.column };
        break;
      case "ArrowLeft":
        if (atStart && position.column > 0) target = { row: position.row, column: position.column - 1 };
        break;
      case "ArrowRight":
        if (atEnd && position.column < columns - 1) target = { row: position.row, column: position.column + 1 };
        break;
      default:
        return;
    }
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    requestFocus(target, event.key !== "ArrowLeft" && event.key !== "ArrowRight");
  }

  function handleCellPaste(event: ClipboardEvent<HTMLInputElement>, position: CellPosition) {
    const text = event.clipboardData.getData("text/plain");
    if (!/[\t\n\r]/.test(text.replace(/[\r\n]+$/, ""))) return;
    const block = parseDelimitedCells(text, "\t");
    if (block.length <= 1 && (block[0]?.length ?? 0) <= 1) return;
    event.preventDefault();
    update((current) => pasteCells(current, position, block), position);
  }

  function replaceFromPaste(text: string) {
    const parsed = parsePastedTable(text);
    if (!parsed || (parsed.rows.length === 0 && parsed.headers.length <= 1)) {
      setPasteError("No rows or columns found. Copy cells from a spreadsheet and paste them here.");
      return false;
    }
    setPasteError("");
    setPasteText("");
    setPasteOpen(false);
    update(() => parsed, { row: 0, column: 0 });
    return true;
  }

  const columnLabel = `column ${activeColumn + 1}`;
  const rowLabel = activeRow === 0 ? "header row" : `row ${activeRow}`;
  const alignmentButtons: { value: Exclude<TableAlignment, null>; icon: LucideIcon; label: string }[] = [
    { value: "left", icon: AlignLeft, label: "left" },
    { value: "center", icon: AlignCenter, label: "center" },
    { value: "right", icon: AlignRight, label: "right" },
  ];

  return (
    <DialogShell
      onClose={onClose}
      labelledBy={titleId}
      describedBy="table-editor-description"
      dismissOnBackdrop={false}
      className="flex max-h-[min(92vh,56rem)] max-w-5xl flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em]">{mode === "edit" ? "Edit table" : "Insert table"}</h2>
          <p id="table-editor-description" className="mt-1 text-sm leading-6 text-muted-foreground">
            Tab and Enter move between cells. Paste cells from Excel, Google Sheets, or Numbers into any cell.
          </p>
        </div>
        <button type="button" aria-label="Close table editor" title="Close table editor" onClick={onClose} className={cn(toolButton, "-mr-2 h-9 w-9 rounded-lg")}>
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-border bg-surface px-4 py-2" role="toolbar" aria-label="Table tools">
        <div className="flex items-center gap-0.5" role="group" aria-label={`Column ${activeColumn + 1} tools`}>
          <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Col {activeColumn + 1}</span>
          {alignmentButtons.map((item) => (
            <ToolButton
              key={item.value}
              icon={item.icon}
              label={`Align ${columnLabel} ${item.label}`}
              pressed={alignment === item.value}
              onClick={() => update((current) => setAlignment(current, activeColumn, alignment === item.value ? null : item.value), { row: activeRow, column: activeColumn })}
            />
          ))}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
          <ToolButton icon={BetweenVerticalStart} label={`Insert column left of ${columnLabel}`} onClick={() => update((current) => insertColumn(current, activeColumn), { row: activeRow, column: activeColumn })} />
          <ToolButton icon={BetweenVerticalEnd} label={`Insert column right of ${columnLabel}`} onClick={() => update((current) => insertColumn(current, activeColumn + 1), { row: activeRow, column: activeColumn + 1 })} />
          <ToolButton icon={ArrowLeft} label={`Move ${columnLabel} left`} disabled={activeColumn === 0} onClick={() => update((current) => moveColumn(current, activeColumn, activeColumn - 1), { row: activeRow, column: activeColumn - 1 })} />
          <ToolButton icon={ArrowRight} label={`Move ${columnLabel} right`} disabled={activeColumn >= columns - 1} onClick={() => update((current) => moveColumn(current, activeColumn, activeColumn + 1), { row: activeRow, column: activeColumn + 1 })} />
          <ToolButton icon={ArrowDownAZ} label={`Sort rows by ${columnLabel}, ascending`} disabled={table.rows.length < 2} onClick={() => update((current) => sortByColumn(current, activeColumn, "asc"), { row: activeRow, column: activeColumn })} />
          <ToolButton icon={ArrowDownZA} label={`Sort rows by ${columnLabel}, descending`} disabled={table.rows.length < 2} onClick={() => update((current) => sortByColumn(current, activeColumn, "desc"), { row: activeRow, column: activeColumn })} />
          <ToolButton icon={Trash2} label={`Delete ${columnLabel}`} disabled={columns <= 1} onClick={() => update((current) => deleteColumn(current, activeColumn), { row: activeRow, column: Math.max(0, Math.min(activeColumn, columns - 2)) })} />
        </div>
        <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
        <div className="flex items-center gap-0.5" role="group" aria-label={`${activeRow === 0 ? "Header row" : `Row ${activeRow}`} tools`}>
          <span className="mr-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{activeRow === 0 ? "Header" : `Row ${activeRow}`}</span>
          <ToolButton icon={BetweenHorizontalStart} label={`Insert row above ${rowLabel}`} disabled={activeRow === 0} onClick={() => update((current) => insertRow(current, bodyIndex), { row: activeRow, column: activeColumn })} />
          <ToolButton icon={BetweenHorizontalEnd} label={`Insert row below ${rowLabel}`} onClick={() => update((current) => insertRow(current, bodyIndex + 1), { row: activeRow + 1, column: activeColumn })} />
          <ToolButton icon={ArrowUp} label={`Move ${rowLabel} up`} disabled={activeRow <= 1} onClick={() => update((current) => moveRow(current, bodyIndex, bodyIndex - 1), { row: activeRow - 1, column: activeColumn })} />
          <ToolButton icon={ArrowDown} label={`Move ${rowLabel} down`} disabled={activeRow === 0 || activeRow >= gridRows - 1} onClick={() => update((current) => moveRow(current, bodyIndex, bodyIndex + 1), { row: activeRow + 1, column: activeColumn })} />
          <ToolButton icon={Trash2} label={`Delete ${rowLabel}`} disabled={activeRow === 0} onClick={() => update((current) => deleteRow(current, bodyIndex), { row: Math.min(activeRow, gridRows - 2), column: activeColumn })} />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={textButton} onClick={() => addRow()}><Plus aria-hidden="true" className="h-3.5 w-3.5 text-accent" />Add row</button>
          <button type="button" className={textButton} onClick={addColumn}><Plus aria-hidden="true" className="h-3.5 w-3.5 text-accent" />Add column</button>
          <button type="button" className={cn(textButton, pasteOpen && "bg-accent-soft text-accent hover:bg-accent-soft")} aria-expanded={pasteOpen} aria-controls="table-editor-paste" onClick={() => { setPasteOpen((open) => !open); setPasteError(""); }}>
            <ClipboardPaste aria-hidden="true" className="h-3.5 w-3.5 text-accent" />Paste from spreadsheet
          </button>
        </div>
      </div>

      {pasteOpen ? (
        <div id="table-editor-paste" className="border-b border-border bg-panel px-6 py-3">
          <label htmlFor="table-editor-paste-input" className="block text-xs font-medium text-foreground">Paste cells to replace the table</label>
          <p id="table-editor-paste-hint" className="mt-0.5 text-xs text-muted-foreground">Copy a range from Excel, Google Sheets, or Numbers (or CSV or a Markdown table). The first row becomes the header.</p>
          <textarea
            id="table-editor-paste-input"
            value={pasteText}
            rows={3}
            aria-describedby={pasteError ? "table-editor-paste-hint table-editor-paste-error" : "table-editor-paste-hint"}
            onChange={(event) => setPasteText(event.target.value)}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text/plain");
              if (text && replaceFromPaste(text)) event.preventDefault();
            }}
            placeholder="Paste here"
            className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            {pasteError ? <p id="table-editor-paste-error" role="alert" className="text-xs text-danger">{pasteError}</p> : <span />}
            <button type="button" className={textButton} disabled={!pasteText.trim()} onClick={() => replaceFromPaste(pasteText)}>Replace table</button>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto bg-panel" role="region" aria-label="Table cells">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <td className="sticky left-0 top-0 z-20 w-10 border-b border-r border-border bg-surface" />
              {table.headers.map((header, column) => {
                const position = { row: 0, column };
                const align = table.alignments[column];
                return (
                  <th key={column} scope="col" className={cn("sticky top-0 z-10 min-w-[9rem] border-b border-r border-border bg-surface p-0 font-semibold", activeColumn === column && "bg-accent-soft")}>
                    <input
                      ref={(element) => { if (element) cellRefs.current.set(`0:${column}`, element); else cellRefs.current.delete(`0:${column}`); }}
                      value={header}
                      aria-label={gridLabel(position)}
                      onFocus={() => setActive(position)}
                      onChange={(event) => { const value = event.target.value; setTable((current) => setGridCell(current, 0, column, value)); }}
                      onKeyDown={(event) => moveFocus(event, position)}
                      onPaste={(event) => handleCellPaste(event, position)}
                      className={cn("h-10 w-full min-w-[9rem] bg-transparent px-3 font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground focus:bg-panel focus:ring-2 focus:ring-inset focus:ring-ring", align && ALIGNMENT_CLASS[align])}
                      placeholder={`Column ${column + 1}`}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => {
              const gridRow = rowIndex + 1;
              return (
                <tr key={rowIndex}>
                  <th scope="row" className={cn("sticky left-0 z-[5] w-10 border-b border-r border-border bg-surface px-2 text-right font-mono text-[11px] font-normal tabular-nums text-muted-foreground", activeRow === gridRow && "bg-accent-soft text-accent")}>
                    {gridRow}
                  </th>
                  {row.map((cell, column) => {
                    const position = { row: gridRow, column };
                    const align = table.alignments[column];
                    return (
                      <td key={column} className="border-b border-r border-border p-0">
                        <input
                          ref={(element) => { const key = `${gridRow}:${column}`; if (element) cellRefs.current.set(key, element); else cellRefs.current.delete(key); }}
                          value={cell}
                          aria-label={gridLabel(position)}
                          onFocus={() => setActive(position)}
                          onChange={(event) => { const value = event.target.value; setTable((current) => setGridCell(current, gridRow, column, value)); }}
                          onKeyDown={(event) => moveFocus(event, position)}
                          onPaste={(event) => handleCellPaste(event, position)}
                          className={cn("h-9 w-full min-w-[9rem] bg-transparent px-3 text-foreground outline-none focus:bg-accent-soft/40 focus:ring-2 focus:ring-inset focus:ring-ring", align && ALIGNMENT_CLASS[align])}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {table.rows.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">This table has only a header row. Use Add row to add data.</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
        <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {columns} {columns === 1 ? "column" : "columns"} × {table.rows.length} {table.rows.length === 1 ? "row" : "rows"}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={dialogCancelButton}>Cancel</button>
          <button type="button" onClick={() => onApply(serializeMarkdownTable(table))} className={dialogConfirmButton}>
            {mode === "edit" ? "Update table" : "Insert table"}
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
