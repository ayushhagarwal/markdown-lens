import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandIcon({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/markdown-lens-icon.png"
      width={64}
      height={64}
      alt=""
      aria-hidden="true"
      priority={priority}
      className={cn("shrink-0 rounded-[22%] object-cover", className)}
    />
  );
}
