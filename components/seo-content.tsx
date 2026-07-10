import Link from "next/link";
import { ArrowRight, Check, Code2, FileText, LockKeyhole } from "lucide-react";

export const markdownViewerFaq = [
  {
    question: "What is Markdown Lens?",
    answer:
      "Markdown Lens is a free local document-to-Markdown workbench for PDF, DOCX, PPTX, XLSX, HTML, EPUB, structured data, images, archives, and GitHub-flavored Markdown.",
  },
  {
    question: "Does Markdown Lens upload my documents?",
    answer:
      "No. Rendering, document conversion, optional English OCR, workspace persistence, and export happen in your browser. Document content is not sent to a Markdown Lens backend.",
  },
  {
    question: "Can Markdown Lens convert PDF and Word files to Markdown?",
    answer:
      "Yes. Open a text-based PDF or Word `.docx` file up to 100 MB and Markdown Lens converts it into editable Markdown locally. DOCX embedded images are stored as local assets; scanned PDFs still require a dedicated OCR workflow.",
  },
  {
    question: "How can I export my Markdown?",
    answer:
      "You can download Markdown, copy source, export standalone HTML, bundle Markdown with local assets, back up the workspace, create a URL-fragment share link, or print the preview to PDF.",
  },
];

const capabilities = [
  {
    icon: FileText,
    title: "Upload real documents",
    description: (
      <>
        Use the private, browser-based{" "}
        <Link href="/pdf-to-markdown" className="font-semibold text-accent hover:underline">
          PDF to Markdown converter
        </Link>{" "}
        or{" "}
        <Link href="/word-to-markdown" className="font-semibold text-accent hover:underline">
          Word to Markdown converter
        </Link>{" "}
        for handbooks, specs, and knowledge files.
      </>
    ),
  },
  {
    icon: Code2,
    title: "Accurate technical preview",
    description: "GFM tables, task lists, highlighted code, Mermaid diagrams, and KaTeX math.",
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    description: "Your document stays in this browser. No account, upload, or server-side storage.",
  },
];

export function SeoContent() {
  return (
    <>
      <section className="border-y border-border/75 bg-surface" aria-labelledby="capabilities">
        <div className="mx-auto grid w-full max-w-7xl gap-0 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          <h2 id="capabilities" className="sr-only">
            Markdown Lens capabilities
          </h2>
          {capabilities.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className={`py-7 md:px-7 md:py-9 ${
                index > 0 ? "border-t border-border/75 md:border-l md:border-t-0" : ""
              }`}
            >
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <h2 className="max-w-md text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Everything technical Markdown needs. Nothing it doesn&apos;t.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Review a document exactly where you write it, then take the source or rendered output
            wherever it needs to go.
          </p>
          <Link
            href="/markdown-cheatsheet"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse the Markdown cheatsheet
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            { label: "GitHub-flavored Markdown" },
            { label: "Mermaid diagrams" },
            { label: "Syntax-highlighted code" },
            { label: "Inline and block math" },
            { label: "Local draft autosave" },
            { label: "Convert PDF to Markdown locally", href: "/pdf-to-markdown" },
            { label: "Convert Word .docx to Markdown locally", href: "/word-to-markdown" },
            { label: "Markdown, HTML, and PDF export" },
          ].map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 border-b border-border/70 py-3 text-sm"
            >
              <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              {item.href ? (
                <Link href={item.href} className="font-medium underline-offset-4 hover:underline">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border/75">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Quick answers</h2>
          <div className="divide-y divide-border/75 border-y border-border/75">
            {markdownViewerFaq.map(({ question, answer }) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {question}
                  <span
                    className="text-xl font-light text-muted-foreground transition group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-2xl pt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/75 bg-foreground text-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ready when your Markdown is.</h2>
            <p className="mt-2 text-sm text-background/65">
              Open the editor and start typing. No sign-up required.
            </p>
          </div>
          <Link
            href="/editor"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-foreground"
          >
            Open editor
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
