"use client";

import { useId, useState } from "react";
import { Printer, X } from "lucide-react";
import { DialogShell, dialogCancelButton, dialogConfirmButton } from "@/components/workspace/dialog-shell";
import {
  PDF_FONT_SIZES,
  PDF_MARGINS,
  PDF_PAPER_SIZES,
  normalizePdfSettings,
  type PdfFontFamily,
  type PdfOrientation,
  type PdfSettings,
} from "@/lib/export/print-pdf";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const PAPER_RATIOS: Record<PdfSettings["paperSize"], number> = { a4: 210 / 297, letter: 8.5 / 11, legal: 8.5 / 14 };
const MARGIN_PREVIEW: Record<PdfSettings["margin"], string> = { narrow: "6%", normal: "10%", wide: "13% 16%" };

export function PdfExportDialog({
  defaultSettings,
  onPrint,
  onClose,
}: {
  defaultSettings: PdfSettings;
  onPrint: (settings: PdfSettings) => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(() => normalizePdfSettings(defaultSettings));
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const update = <K extends keyof PdfSettings>(key: K, value: PdfSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  return (
    <DialogShell onClose={onClose} labelledBy={titleId} describedBy={descriptionId} className="max-h-[90vh] max-w-xl overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em]">Export PDF</h2>
          <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">
            Choose the page layout, then save as PDF from your browser&apos;s print dialog.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close PDF export"
          className={cn("-mr-2 -mt-1.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", focusRing)}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <form
        className="mt-5"
        onSubmit={(event) => {
          event.preventDefault();
          onPrint(settings);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <OptionGroup
              legend="Paper size"
              name={`${id}-paper`}
              value={settings.paperSize}
              options={PDF_PAPER_SIZES.map((size) => ({ value: size.value, label: size.label, hint: size.detail }))}
              onChange={(value) => update("paperSize", value)}
            />
            <OptionGroup
              legend="Orientation"
              name={`${id}-orientation`}
              value={settings.orientation}
              options={[
                { value: "portrait" as PdfOrientation, label: "Portrait" },
                { value: "landscape" as PdfOrientation, label: "Landscape" },
              ]}
              onChange={(value) => update("orientation", value)}
            />
            <OptionGroup
              legend="Margins"
              name={`${id}-margin`}
              value={settings.margin}
              options={PDF_MARGINS.map((margin) => ({ value: margin.value, label: margin.label }))}
              onChange={(value) => update("margin", value)}
            />
            <OptionGroup
              legend="Font"
              name={`${id}-font`}
              value={settings.fontFamily}
              options={[
                { value: "sans" as PdfFontFamily, label: "Sans serif" },
                { value: "serif" as PdfFontFamily, label: "Serif" },
              ]}
              onChange={(value) => update("fontFamily", value)}
            />
            <div>
              <label htmlFor={`${id}-size`} className="text-sm font-medium">Base font size</label>
              <select
                id={`${id}-size`}
                value={settings.fontSize}
                onChange={(event) => update("fontSize", Number(event.target.value))}
                className={cn("mt-1.5 block h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm", focusRing)}
              >
                {(PDF_FONT_SIZES as readonly number[]).includes(settings.fontSize) ? null : (
                  <option value={settings.fontSize}>{settings.fontSize} pt</option>
                )}
                {PDF_FONT_SIZES.map((size) => (
                  <option key={size} value={size}>{size} pt</option>
                ))}
              </select>
            </div>
          </div>

          <PagePreview settings={settings} />
        </div>

        <div className="mt-5 space-y-2 rounded-xl border border-border bg-surface p-3.5">
          <Toggle
            id={`${id}-page-numbers`}
            label="Page numbers in the footer"
            checked={settings.pageNumbers}
            onChange={(checked) => update("pageNumbers", checked)}
          />
          <Toggle
            id={`${id}-h1-break`}
            label="Start each top-level heading on a new page"
            checked={settings.h1NewPage}
            onChange={(checked) => update("h1NewPage", checked)}
          />
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Pick &ldquo;Save as PDF&rdquo; as the destination. Turn off the browser&apos;s own headers and footers for a clean page.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={dialogCancelButton}>Cancel</button>
          <button type="submit" className={cn(dialogConfirmButton, "gap-2")}>
            <Printer aria-hidden="true" className="h-4 w-4" />
            Print / save as PDF
          </button>
        </div>
      </form>
    </DialogShell>
  );
}

function OptionGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              title={option.hint}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border bg-surface px-3 text-sm transition-colors hover:bg-muted peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-semibold peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
            >
              {option.label}
              {option.hint ? <span className="sr-only"> ({option.hint})</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={cn("h-4 w-4 shrink-0 rounded border-border accent-[hsl(var(--accent))]", focusRing)}
      />
      <label htmlFor={id} className="min-h-6 cursor-pointer text-sm leading-6">{label}</label>
    </div>
  );
}

function PagePreview({ settings }: { settings: PdfSettings }) {
  const ratio = PAPER_RATIOS[settings.paperSize];
  const aspect = settings.orientation === "portrait" ? ratio : 1 / ratio;
  const lineHeight = Math.max(2, Math.round(settings.fontSize / 4));
  return (
    <div aria-hidden="true" className="hidden w-36 flex-col items-center justify-start gap-2 sm:flex">
      <div className="flex h-44 w-36 items-center justify-center">
        <div
          className="relative overflow-hidden rounded-sm border border-border bg-white shadow-soft transition-all"
          style={aspect <= 36 / 44 ? { height: "100%", aspectRatio: String(aspect) } : { width: "100%", aspectRatio: String(aspect) }}
        >
          <div className="flex h-full flex-col gap-1" style={{ padding: MARGIN_PREVIEW[settings.margin] }}>
            <div className="h-1.5 w-2/3 rounded-full bg-slate-400" />
            {Array.from({ length: 9 }, (_, index) => (
              <div key={index} className="rounded-full bg-slate-200" style={{ height: lineHeight, width: index % 3 === 2 ? "70%" : "100%" }} />
            ))}
          </div>
          {settings.pageNumbers ? <div className="absolute inset-x-0 bottom-1 mx-auto h-1 w-3 rounded-full bg-slate-300" /> : null}
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {PDF_PAPER_SIZES.find((size) => size.value === settings.paperSize)?.label} · {settings.orientation}
      </span>
    </div>
  );
}
