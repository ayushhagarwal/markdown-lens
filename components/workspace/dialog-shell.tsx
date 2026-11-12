"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-panel";
const dialogButtonBase = cn("inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors", focusRing);

export const dialogCancelButton = cn(dialogButtonBase, "text-muted-foreground hover:bg-muted hover:text-foreground");
export const dialogConfirmButton = cn(dialogButtonBase, "bg-accent font-semibold text-accent-foreground shadow-soft hover:bg-accent/90");
export const dialogDangerButton = cn(dialogButtonBase, "bg-danger font-semibold text-background shadow-soft hover:bg-danger/90 focus-visible:ring-danger");

/** Moves focus into the dialog, traps Tab, closes on Escape, and restores focus on close. */
export function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"));
    requestAnimationFrame(() => focusable()[0]?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [onClose]);
  return dialogRef;
}

/**
 * Shared modal chrome: blurred backdrop that fades in and a panel that pops in.
 * Backdrop clicks close the dialog only when `dismissOnBackdrop` is set, which
 * keeps each dialog's existing behaviour.
 */
export function DialogShell({
  onClose,
  role = "dialog",
  labelledBy,
  describedBy,
  label,
  dismissOnBackdrop = true,
  placement = "center",
  layer = 80,
  className,
  children,
}: {
  onClose: () => void;
  role?: "dialog" | "alertdialog";
  labelledBy?: string;
  describedBy?: string;
  label?: string;
  dismissOnBackdrop?: boolean;
  placement?: "center" | "top";
  layer?: 70 | 80;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useDialogFocus(onClose);
  return (
    <div
      className={cn(
        "overlay-in fixed inset-0 flex justify-center bg-black/55 backdrop-blur-sm",
        layer === 70 ? "z-[70]" : "z-[80]",
        placement === "top" ? "items-start px-4 pt-[12vh]" : "items-center p-4",
      )}
      role={dismissOnBackdrop ? "presentation" : undefined}
      onMouseDown={dismissOnBackdrop ? (event) => { if (event.target === event.currentTarget) onClose(); } : undefined}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-label={label}
        className={cn("pop-in w-full rounded-2xl border border-border bg-panel text-foreground shadow-lift", className)}
      >
        {children}
      </div>
    </div>
  );
}
