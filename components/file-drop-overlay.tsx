"use client";

import { FileUp } from "lucide-react";
import { useState, type DragEvent } from "react";

function dragHasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function useFileDrag() {
  const [active, setActive] = useState(false);

  function reset() {
    setActive(false);
  }

  return {
    active,
    reset,
    dragProps: {
      onDragEnter(event: DragEvent) {
        if (!dragHasFiles(event)) return;
        event.preventDefault();
        setActive(true);
      },
      onDragOver(event: DragEvent) {
        if (!dragHasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setActive(true);
      },
      onDragLeave(event: DragEvent) {
        if (!dragHasFiles(event)) return;
        const next = event.relatedTarget;
        if (next instanceof Node && event.currentTarget.contains(next)) return;
        setActive(false);
      },
    },
  };
}

export function DropToConvertOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm" role="status">
      <div className="w-full max-w-md rounded-xl border border-dashed border-accent bg-panel px-8 py-10 text-center shadow-2xl">
        <FileUp className="mx-auto h-8 w-8 text-accent" aria-hidden />
        <p className="mt-4 text-lg font-semibold">Drop to convert</p>
        <p className="mt-2 text-sm text-muted-foreground">The file stays in this browser.</p>
      </div>
    </div>
  );
}
