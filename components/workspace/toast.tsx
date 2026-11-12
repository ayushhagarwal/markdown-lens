"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Info, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info" | "star";

const DEFAULT_DURATION = 6000;

const toneStyles: Record<ToastTone, { icon: typeof Check; circle: string; iconClass?: string; timer: string }> = {
  success: { icon: Check, circle: "bg-accent-soft text-accent", timer: "bg-accent/70" },
  error: { icon: CircleAlert, circle: "bg-danger/10 text-danger", timer: "bg-danger/70" },
  info: { icon: Info, circle: "bg-muted text-muted-foreground", timer: "bg-muted-foreground/45" },
  star: { icon: Star, circle: "bg-highlight/15 text-highlight", iconClass: "fill-current", timer: "bg-highlight/80" },
};

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Compact toast card. Auto-dismissing toasts show a countdown bar; hovering or
 * focusing the toast pauses both the timer and the bar. The `onClose` callback
 * is read through a ref so a parent re-render (for example while typing) never
 * restarts the countdown.
 */
export const Notice = memo(function Notice({
  message,
  onClose,
  onResolve,
  actionLabel,
  onAction,
  actionHref,
  tone = "info",
  duration = DEFAULT_DURATION,
  persistent = false,
}: {
  message: string;
  onClose: () => void;
  /** Called when the person acts on the toast or dismisses it explicitly (not on timeout). */
  onResolve?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  tone?: ToastTone;
  duration?: number;
  persistent?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const onCloseRef = useRef(onClose);
  const remaining = useRef(duration);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (persistent || paused) return;
    const startedAt = Date.now();
    const timeout = window.setTimeout(() => onCloseRef.current(), Math.max(0, remaining.current));
    return () => {
      window.clearTimeout(timeout);
      remaining.current -= Date.now() - startedAt;
    };
  }, [paused, persistent]);

  const style = toneStyles[tone];
  const Icon = style.icon;
  const dismiss = () => {
    onResolve?.();
    onClose();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setPaused(false);
      }}
      className="toast fixed bottom-14 left-1/2 z-[90] w-max max-w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-panel text-xs text-foreground shadow-lift"
    >
      <div className="flex items-center gap-3 py-2.5 pl-2.5 pr-2">
        <span aria-hidden="true" className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", style.circle)}>
          <Icon className={cn("h-3.5 w-3.5", style.iconClass)} />
        </span>
        <span className="min-w-0 flex-1 leading-5 [overflow-wrap:anywhere]">{message}</span>
        {actionLabel && actionHref ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${actionLabel} (opens in a new tab)`}
            onClick={dismiss}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 font-semibold text-accent-foreground shadow-soft transition-colors hover:bg-accent/90",
              tone === "star" && "star-target",
              focusRing,
              "focus-visible:ring-offset-2 focus-visible:ring-offset-panel",
            )}
          >
            {tone === "star" ? <Star aria-hidden="true" className="star-icon h-3.5 w-3.5" /> : null}
            {actionLabel}
          </a>
        ) : actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className={cn("shrink-0 whitespace-nowrap rounded-lg bg-accent px-2.5 py-1.5 font-semibold text-accent-foreground shadow-soft transition-colors hover:bg-accent/90", focusRing, "focus-visible:ring-offset-2 focus-visible:ring-offset-panel")}
          >
            {actionLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", focusRing)}
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
      {persistent ? null : (
        <span
          aria-hidden="true"
          className={cn("toast-timer absolute inset-x-0 bottom-0 h-0.5", style.timer)}
          style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? "paused" : "running" }}
        />
      )}
    </div>
  );
});
