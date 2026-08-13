"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandIcon } from "@/components/brand-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { GithubIcon } from "@/components/github-icon";
import { primaryNav, siteConfig } from "@/lib/site";

export function HomepageHeader() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const firstLink = menuRef.current?.querySelector<HTMLElement>("a");
    firstLink?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  return (
    <header className="relative z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12 xl:px-14">
        <Link href="/" className="flex items-center gap-3 rounded-md font-semibold tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandIcon className="h-9 w-9" priority />
          <span>Markdown Lens</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <nav className="flex items-center" aria-label="Homepage navigation">
            {primaryNav.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {link.label}
              </Link>
            ))}
            <a href={siteConfig.githubUrl} className="rounded-md px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">GitHub</a>
          </nav>
          <ThemeToggle />
          <Link href="/editor" className="ml-3 inline-flex h-10 items-center rounded-md border border-accent px-4 text-sm font-semibold text-accent transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
            aria-controls="homepage-mobile-menu"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div ref={menuRef} id="homepage-mobile-menu" className="absolute inset-x-0 top-16 border-b border-border bg-background p-5 shadow-2xl md:hidden">
          <nav className="grid gap-1" aria-label="Mobile navigation">
            {primaryNav.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {link.label}
              </Link>
            ))}
            <a href={siteConfig.githubUrl} className="flex items-center gap-2 rounded-md px-3 py-3 text-base hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              GitHub <GithubIcon className="h-4 w-4" aria-hidden />
            </a>
            <Link href="/editor" onClick={() => setOpen(false)} className="mt-2 inline-flex h-12 items-center justify-center rounded-md bg-accent px-4 font-semibold text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Open workspace
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
