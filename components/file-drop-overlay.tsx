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
    <div className="overlay-in pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-background/75 p-6 backdrop-blur-sm" role="status">
      <div className="pop-in w-full max-w-md rounded-2xl border-2 border-dashed border-accent/60 bg-panel px-8 py-10 text-center shadow-lift">
        <span aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent">
          <FileUp className="h-7 w-7" />
        </span>
        <p className="mt-5 text-lg font-semibold tracking-[-0.02em]">Drop to convert</p>
        <p className="mt-1.5 text-sm text-muted-foreground">The file stays in this browser.</p>
      </div>
    </div>
  );
}
