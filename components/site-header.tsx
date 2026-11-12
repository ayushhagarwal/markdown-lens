"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { GithubStarLink } from "@/components/github-star-link";
import { useLandingFilePicker } from "@/components/landing-import-surface";
import { ThemeToggle } from "@/components/theme-toggle";
import { primaryNav } from "@/lib/site";
import { cn } from "@/lib/utils";

function ConvertFileControl({ className, onActivate }: { className?: string; onActivate?: () => void }) {
  const openPicker = useLandingFilePicker();
  if (openPicker) {
    return (
      <button type="button" className={className} onClick={() => { onActivate?.(); openPicker(); }}>
        Convert a file
      </button>
    );
  }
  return (
    <Link href="/" className={className} onClick={onActivate}>
      Convert a file
    </Link>
  );
}

export function SiteHeader({ wide = false }: { wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu(true);
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
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) closeMenu(true);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [closeMenu, open]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <a href="#main" className="sr-only left-4 top-4 z-50 rounded-lg bg-panel px-4 py-2 text-sm font-semibold text-foreground shadow-lg focus-visible:not-sr-only focus-visible:absolute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Skip to main content
      </a>
      <div className={cn("mx-auto flex h-16 w-full items-center justify-between gap-4", wide ? "max-w-[1400px] px-5 sm:px-8" : "max-w-7xl px-4 sm:px-6 lg:px-8")}>
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            <BrandIcon className="h-8 w-8 shadow-soft" priority />
            <span>Markdown Lens</span>
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
            {primaryNav.map((link) => (
              <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={cn("relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", pathname === link.href && "text-foreground after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-accent")}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <GithubStarLink variant="nav" className="hidden lg:inline-flex" />
          <ThemeToggle />
          <ConvertFileControl className="btn-header" />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls={open ? "site-mobile-menu" : undefined}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-panel text-foreground shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button type="button" aria-label="Close navigation" onClick={() => closeMenu(true)} className="overlay-in fixed inset-0 top-16 z-40 h-dvh bg-black/45 md:hidden" />
          <div ref={menuRef} id="site-mobile-menu" role="dialog" aria-modal="true" aria-label="Mobile navigation" className="pop-in fixed inset-x-3 top-[4.5rem] z-50 rounded-2xl border border-border bg-panel p-3 shadow-lift md:hidden">
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {primaryNav.map((link) => (
              <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} onClick={() => setOpen(false)} className={cn("rounded-xl px-4 py-3 text-base font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", pathname === link.href && "bg-muted text-foreground")}>
                {link.label}
              </Link>
            ))}
            <ConvertFileControl className="btn-primary mt-2" onActivate={() => setOpen(false)} />
            <GithubStarLink variant="button" className="mt-1 h-12" onClick={() => setOpen(false)} />
          </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
