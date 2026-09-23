"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DropToConvertOverlay, useFileDrag } from "@/components/file-drop-overlay";
import { fileMatchesAccept, landingImportFor } from "@/lib/import-accept";
import { stagePendingImports } from "@/lib/pending-import";
import { createSamplePdfFile } from "@/lib/sample-pdf";

const LandingImportContext = createContext<(() => void) | null>(null);
const SamplePdfContext = createContext<(() => void) | null>(null);

export function LandingImportSurface({ path, children }: { path: string; children: ReactNode }) {
  const target = landingImportFor(path);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { active, reset, dragProps } = useFileDrag();
  const [rejectMessage, setRejectMessage] = useState<string | null>(null);

  function launch(files: File[]) {
    const accepted = files.filter((file) => fileMatchesAccept(file, target.accept));
    if (!accepted.length) {
      setRejectMessage(target.rejectMessage);
      return;
    }
    setRejectMessage(null);
    stagePendingImports(accepted);
    router.push("/editor");
  }

  return (
    <LandingImportContext.Provider value={() => inputRef.current?.click()}>
      <SamplePdfContext.Provider value={() => launch([createSamplePdfFile()])}>
        <div
          {...dragProps}
          onDrop={(event) => {
            const files = Array.from(event.dataTransfer.files);
            if (!files.length) return;
            event.preventDefault();
            reset();
            launch(files);
          }}
        >
          <section aria-label="File import controls" className="sr-only">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={target.accept}
              aria-label={target.fileLabel}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (files.length) launch(files);
              }}
            />
          </section>
          {children}
          <DropToConvertOverlay active={active} />
          {rejectMessage ? (
            <p role="status" className="fixed bottom-6 left-1/2 z-[90] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-border bg-panel px-4 py-3 text-sm text-foreground shadow-xl">
              {rejectMessage}
            </p>
          ) : null}
        </div>
      </SamplePdfContext.Provider>
    </LandingImportContext.Provider>
  );
}

export function useLandingFilePicker() {
  return useContext(LandingImportContext);
}

export function ConvertFileButton({ className, children }: { className?: string; children: ReactNode }) {
  const openPicker = useContext(LandingImportContext);
  return (
    <button type="button" onClick={() => openPicker?.()} className={className}>
      {children}
    </button>
  );
}

export function TrySamplePdfButton({ className, children }: { className?: string; children: ReactNode }) {
  const trySample = useContext(SamplePdfContext);
  return (
    <button type="button" onClick={() => trySample?.()} className={className}>
      {children}
    </button>
  );
}
