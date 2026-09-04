"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { GithubStarLink } from "@/components/github-star-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { primaryNav } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader({ wide = false }: { wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <header className="relative z-40 border-b border-border bg-panel shadow-sm">
      <a href="#main" className="sr-only left-4 top-4 z-50 rounded-md bg-panel px-4 py-2 text-sm font-semibold text-foreground shadow-lg focus-visible:not-sr-only focus-visible:absolute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Skip to main content
      </a>
      <div className={cn("mx-auto flex h-16 w-full items-center justify-between gap-4", wide ? "max-w-[1500px] px-5 sm:px-8 lg:px-12 xl:px-14" : "max-w-7xl px-4 sm:px-6 lg:px-8")}>
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-md font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <BrandIcon className="h-9 w-9 shadow-sm" priority />
          <span>Markdown Lens</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <nav className="flex items-center" aria-label="Main navigation">
            {primaryNav.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {link.label}
              </Link>
            ))}
            <GithubStarLink variant="nav" />
          </nav>
          <ThemeToggle />
          <Link
            href="/editor"
            className="btn-header ml-1"
          >
            Open workspace
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 top-16 z-40 bg-black/40 md:hidden" />
          <div ref={menuRef} id="site-mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation" className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background p-5 shadow-2xl md:hidden">
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {primaryNav.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {link.label}
              </Link>
            ))}
            <GithubStarLink variant="nav" className="h-11 justify-self-start px-3 py-3 text-base" onClick={() => setOpen(false)} />
            <Link href="/editor" onClick={() => setOpen(false)} className="btn-primary mt-2">
              Open workspace
            </Link>
          </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
