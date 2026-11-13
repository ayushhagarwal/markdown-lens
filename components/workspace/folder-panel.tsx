"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { ChevronRight, FileText, Folder, FolderOpen, KeyRound, RefreshCw, X } from "lucide-react";
import type { FolderNode } from "@/lib/local-files";
import { cn } from "@/lib/utils";

export type FolderPanelStatus = "ready" | "loading" | "needs-permission";

export type FolderPanelProps = {
  /** Name of the opened folder. */
  name: string;
  /** Tree from `walkFolder(...).children`. Ignored unless `status` is "ready". */
  nodes: readonly FolderNode[];
  status?: FolderPanelStatus;
  truncated?: boolean;
  /** `path` of the file open in the editor, if it belongs to this folder. */
  activePath?: string | null;
  onOpenFile: (path: string) => void;
  onRefresh: () => void;
  onClose: () => void;
  /** Called from a click, so the handler may request permission. */
  onGrantAccess: () => void;
  className?: string;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const headerButton = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
  focusRing,
);
const rowButton = cn(
  "flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-lg py-1 pr-2 text-left text-xs transition-colors focus-visible:ring-inset",
  focusRing,
);

/** Collapsible file tree for a folder opened from disk. Presentational: all file access happens in the callbacks. */
export function FolderPanel({
  name,
  nodes,
  status = "ready",
  truncated = false,
  activePath = null,
  onOpenFile,
  onRefresh,
  onClose,
  onGrantAccess,
  className,
}: FolderPanelProps) {
  const headingId = useId();
  // Only explicit toggles are stored; folders containing the active file are open by default.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (path: string) => toggled[path] ?? (activePath?.startsWith(`${path}/`) ?? false);
  const toggle = (path: string) => setToggled((current) => ({ ...current, [path]: !isOpen(path) }));

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const target = event.target as HTMLElement;
    if (!target.matches("[data-folder-item]")) return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-folder-item]")];
    const index = items.indexOf(target);
    const expanded = target.getAttribute("aria-expanded");
    let next: HTMLElement | undefined;
    if (event.key === "ArrowDown") next = items[index + 1];
    else if (event.key === "ArrowUp") next = items[index - 1];
    else if (event.key === "Home") next = items[0];
    else if (event.key === "End") next = items[items.length - 1];
    else if (event.key === "ArrowRight" && expanded === "false") target.click();
    else if (event.key === "ArrowLeft" && expanded === "true") target.click();
    else return;
    event.preventDefault();
    next?.focus();
  }

  function renderNodes(items: readonly FolderNode[], depth: number) {
    return items.map((node) => {
      const indent = { paddingLeft: 8 + depth * 12 };
      if (node.kind === "directory") {
        const open = isOpen(node.path);
        const Icon = open ? FolderOpen : Folder;
        return (
          <li key={node.path}>
            <button
              type="button"
              data-folder-item=""
              aria-expanded={open}
              onClick={() => toggle(node.path)}
              style={indent}
              className={cn(rowButton, "text-foreground/90 hover:bg-muted/70")}
            >
              <ChevronRight aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate" title={node.name}>{node.name}</span>
            </button>
            {open ? (
              <ul role="list" aria-label={`${node.name} folder`}>
                {renderNodes(node.children, depth + 1)}
              </ul>
            ) : null}
          </li>
        );
      }
      const active = node.path === activePath;
      return (
        <li key={node.path} className="relative">
          {active ? <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" /> : null}
          <button
            type="button"
            data-folder-item=""
            aria-current={active ? "true" : undefined}
            onClick={() => onOpenFile(node.path)}
            // Files line up with folder names: skip the chevron column.
            style={{ paddingLeft: indent.paddingLeft + 20 }}
            className={cn(rowButton, active ? "bg-panel font-medium text-foreground shadow-soft" : "text-foreground/90 hover:bg-muted/70")}
          >
            <FileText aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", active ? "text-accent" : "text-muted-foreground")} />
            <span className="min-w-0 flex-1 truncate" title={node.path}>{node.name}</span>
          </button>
        </li>
      );
    });
  }

  return (
    <section aria-labelledby={headingId} className={cn("flex min-h-0 flex-col bg-surface text-foreground", className)}>
      <div className="flex items-center gap-1 px-2.5 py-1.5">
        <FolderOpen aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />
        <p id={headingId} className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground" title={name}>
          <span className="sr-only">Folder: </span>
          {name}
        </p>
        <button type="button" aria-label={`Refresh ${name} folder`} title="Refresh folder" onClick={onRefresh} disabled={status !== "ready"} className={headerButton}>
          <RefreshCw aria-hidden="true" className={cn("h-3.5 w-3.5", status === "loading" && "animate-spin motion-reduce:animate-none")} />
        </button>
        <button type="button" aria-label={`Close ${name} folder`} title="Close folder" onClick={onClose} className={headerButton}>
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {status === "needs-permission" ? (
          <div className="rounded-lg border border-border bg-panel p-3 text-xs shadow-soft">
            <p className="font-medium text-foreground">Access needed</p>
            <p className="mt-1 text-muted-foreground">Your browser asks again after a reload. Files stay on this device.</p>
            <button
              type="button"
              onClick={onGrantAccess}
              className={cn("mt-2.5 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent-soft px-2.5 font-medium text-accent transition-colors hover:bg-accent-soft/70", focusRing)}
            >
              <KeyRound aria-hidden="true" className="h-3.5 w-3.5" />
              Grant access to {name}
            </button>
          </div>
        ) : status === "loading" ? (
          <p role="status" className="px-2 py-3 text-xs text-muted-foreground">Reading folder…</p>
        ) : nodes.length ? (
          <>
            <ul role="list" aria-label={`Files in ${name}`} onKeyDown={handleKeyDown}>
              {renderNodes(nodes, 0)}
            </ul>
            {truncated ? (
              <p role="note" className="mt-2 rounded-lg border border-border bg-panel px-2.5 py-2 text-[11px] text-muted-foreground">
                This folder is large, so only part of it is shown. Open a sub-folder to see more.
              </p>
            ) : null}
          </>
        ) : (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            {truncated ? "No Markdown files were found in the part of this folder that was scanned." : "No Markdown files in this folder."}
          </p>
        )}
      </div>
    </section>
  );
}
