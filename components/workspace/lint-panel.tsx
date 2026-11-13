"use client";

import { memo, useId, useMemo } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, WandSparkles, Wrench } from "lucide-react";
import type { MarkdownIssue, MarkdownIssueSeverity } from "@/lib/markdown-lint";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const groups: { severity: MarkdownIssueSeverity; label: string; icon: typeof Info; iconClass: string }[] = [
  { severity: "error", label: "Errors", icon: CircleAlert, iconClass: "text-danger" },
  { severity: "warning", label: "Warnings", icon: TriangleAlert, iconClass: "text-highlight" },
  { severity: "info", label: "Suggestions", icon: Info, iconClass: "text-accent" },
];

/**
 * Compact list of Markdown lint issues grouped by severity, for a popover or
 * dialog. Rows are buttons that call `onSelect`; long lists are capped.
 */
export const LintPanel = memo(function LintPanel({
  issues,
  onSelect,
  onFixAll,
  onFormat,
  maxItems = 200,
  className,
}: {
  issues: readonly MarkdownIssue[];
  onSelect: (issue: MarkdownIssue) => void;
  onFixAll?: () => void;
  onFormat?: () => void;
  /** Rows shown per severity group before collapsing to "and n more". */
  maxItems?: number;
  className?: string;
}) {
  const titleId = useId();
  const grouped = useMemo(
    () => groups.map((group) => ({ ...group, items: issues.filter((issue) => issue.severity === group.severity) })).filter((group) => group.items.length),
    [issues],
  );
  const fixable = useMemo(() => issues.filter((issue) => issue.fix).length, [issues]);
  const summary = issues.length ? `${issues.length.toLocaleString()} ${issues.length === 1 ? "issue" : "issues"}` : "No issues";

  return (
    <section aria-labelledby={titleId} className={cn("grid gap-2 text-foreground", className)}>
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id={titleId} className="text-xs font-semibold">
          Document checks
        </h2>
        <p role="status" className="text-[11px] tabular-nums text-muted-foreground">
          {summary}
        </p>
      </div>

      {issues.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
          <CircleCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
          No problems found in this document.
        </p>
      ) : (
        <div className="grid max-h-80 gap-2 overflow-y-auto pr-0.5">
          {grouped.map((group) => {
            const Icon = group.icon;
            const headingId = `${titleId}-${group.severity}`;
            const shown = group.items.slice(0, maxItems);
            return (
              <div key={group.severity} role="group" aria-labelledby={headingId} className="grid gap-0.5">
                <h3 id={headingId} className="flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <Icon aria-hidden="true" className={cn("h-3.5 w-3.5", group.iconClass)} />
                  {group.label} <span className="tabular-nums">({group.items.length.toLocaleString()})</span>
                </h3>
                <ul className="grid gap-0.5">
                  {shown.map((issue) => (
                    <li key={`${issue.ruleId}-${issue.from}-${issue.to}`}>
                      <button
                        type="button"
                        onClick={() => onSelect(issue)}
                        className={cn("flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface", focusRing)}
                      >
                        <span className="w-12 shrink-0 font-mono tabular-nums text-muted-foreground">Ln {issue.line}</span>
                        <span className="min-w-0 flex-1 break-words">{issue.message}</span>
                        {issue.fix ? <span className="shrink-0 text-[10px] font-medium text-accent">Fixable</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
                {group.items.length > shown.length ? (
                  <p className="px-2 text-[11px] text-muted-foreground">and {(group.items.length - shown.length).toLocaleString()} more</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {onFixAll || onFormat ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
          {onFixAll ? (
            <button
              type="button"
              onClick={onFixAll}
              disabled={!fixable}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50",
                focusRing,
                "focus-visible:ring-offset-1 focus-visible:ring-offset-panel",
              )}
            >
              <Wrench aria-hidden="true" className="h-3.5 w-3.5" />
              Fix all ({fixable.toLocaleString()})
            </button>
          ) : null}
          {onFormat ? (
            <button
              type="button"
              onClick={onFormat}
              className={cn("flex h-7 items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 text-xs font-medium transition-colors hover:bg-surface", focusRing)}
            >
              <WandSparkles aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
              Format document
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
});
