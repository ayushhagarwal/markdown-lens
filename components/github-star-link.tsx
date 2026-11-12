import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const variantClassName = {
  nav: cn("star-target inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-panel px-3 text-sm font-medium text-foreground shadow-soft transition-colors hover:border-foreground/25", focusRing),
  text: cn("star-target inline-flex items-center gap-1.5 rounded-sm", focusRing),
  button: cn("star-target btn-secondary h-11", focusRing),
  cta: cn("star-target btn-secondary h-12 px-6 text-base", focusRing),
} as const;

/**
 * Link to the GitHub repository with a star affordance. The star fills and
 * pops on hover/focus (CSS only) so the ask reads as an invitation, not a nag.
 */
export function GithubStarLink({
  variant,
  className,
  onClick,
  children,
}: {
  variant: keyof typeof variantClassName;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const label = children ?? (variant === "nav" ? "Star" : "Star on GitHub");

  return (
    <a
      href={siteConfig.githubUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label === "Star on GitHub" ? "Star on GitHub: Markdown Lens (opens in a new tab)" : "Star Markdown Lens on GitHub (opens in a new tab)"}
      onClick={onClick}
      className={cn(variantClassName[variant], className)}
    >
      {variant === "text" ? null : <GithubIcon className="h-4 w-4" aria-hidden />}
      <span>{label}</span>
      <Star className={cn("star-icon h-4 w-4", variant === "text" && "h-3.5 w-3.5")} aria-hidden />
    </a>
  );
}
