import Link from "next/link";
import {
  Braces,
  CheckCircle2,
  FileText,
  GitBranch,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

const supportedSyntax = [
  "Headings, emphasis, links, images, and blockquotes",
  "GitHub-flavored tables, task lists, strikethrough, and autolinks",
  "Fenced code blocks with syntax highlighting",
  "Mermaid flowcharts and diagrams",
  "Inline and block math rendered with KaTeX",
  "Ordered lists, unordered lists, and horizontal rules",
];

export const markdownViewerFaq = [
  {
    question: "What is Markdown Lens?",
    answer:
      "Markdown Lens is a free online Markdown viewer and editor. Paste or import Markdown to see a clean GitHub-style preview with tables, task lists, code highlighting, Mermaid diagrams, and math.",
  },
  {
    question: "Is this online Markdown viewer free?",
    answer:
      "Yes. Markdown Lens is free and open source. There is no account, subscription, trial, or paid feature gate.",
  },
  {
    question: "Does Markdown Lens upload my documents?",
    answer:
      "No. Your Markdown is parsed and rendered in the browser. Draft autosave uses localStorage in your current browser profile, and document content is not sent to a Markdown Lens backend.",
  },
  {
    question: "Can I preview GitHub-flavored Markdown?",
    answer:
      "Yes. The preview supports GitHub-flavored Markdown, including tables, task lists, strikethrough, autolinks, and fenced code blocks.",
  },
  {
    question: "Can I use Mermaid diagrams and math?",
    answer:
      "Yes. Mermaid code fences render diagrams, while inline and block math render with KaTeX. Invalid Mermaid syntax displays a readable error instead of breaking the document.",
  },
  {
    question: "How can I save or export the result?",
    answer:
      "You can download the Markdown file, copy raw Markdown or rendered HTML, export a standalone HTML document, or print the preview to PDF.",
  },
];

export function SeoContent() {
  return (
    <div className="border-t border-border bg-surface text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <section aria-labelledby="markdown-viewer-about">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Free online Markdown viewer
          </p>
          <h2
            id="markdown-viewer-about"
            className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Preview Markdown accurately without uploading your document
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            Markdown Lens combines a fast Markdown editor with a polished, GitHub-style viewer.
            It is designed for README files, technical documentation, changelogs, AI-generated
            notes, Mermaid diagrams, and developer writing. Everything runs locally in your
            browser, so you can inspect and edit drafts without creating an account.
          </p>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={FileText}
              title="Built for real documents"
              description="Review READMEs, release notes, specifications, meeting notes, and documentation with a readable live preview."
            />
            <FeatureCard
              icon={GitBranch}
              title="GitHub-style rendering"
              description="Check tables, task lists, code fences, links, and other GitHub-flavored Markdown before you publish."
            />
            <FeatureCard
              icon={LockKeyhole}
              title="Private by design"
              description="Markdown content stays in the browser. Local autosave does not require an account, database, or document upload."
            />
          </div>
        </section>

        <section
          className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start"
          aria-labelledby="supported-markdown"
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Supported Markdown
            </p>
            <h2 id="supported-markdown" className="mt-3 text-3xl font-bold tracking-tight">
              More than a basic Markdown previewer
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              The renderer covers everyday Markdown and the extended syntax commonly used in
              GitHub projects and technical documentation.
            </p>
            <Link
              href="/markdown-cheatsheet"
              className="mt-6 inline-flex items-center rounded-md font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
            >
              Explore the Markdown syntax cheatsheet
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {supportedSyntax.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-lg border border-border/80 bg-panel p-4 leading-6 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16" aria-labelledby="how-markdown-lens-works">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            How it works
          </p>
          <h2 id="how-markdown-lens-works" className="mt-3 text-3xl font-bold tracking-tight">
            From Markdown source to finished preview in three steps
          </h2>
          <ol className="mt-7 grid gap-4 md:grid-cols-3">
            <Step
              number="1"
              title="Paste, type, or import"
              description="Start with a local .md or .markdown file, paste an existing document, or write directly in the editor."
            />
            <Step
              number="2"
              title="Review the live result"
              description="Switch between editor, preview, and split views while checking formatting, diagrams, math, and code."
            />
            <Step
              number="3"
              title="Copy or export"
              description="Copy Markdown or HTML, download the source, export standalone HTML, or print the rendered document to PDF."
            />
          </ol>
        </section>

        <section className="mt-16" aria-labelledby="markdown-viewer-use-cases">
          <div className="rounded-xl border border-accent/25 bg-accent-soft/60 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-accent" aria-hidden />
              <h2 id="markdown-viewer-use-cases" className="text-2xl font-bold tracking-tight">
                Useful for developers, writers, and AI-assisted workflows
              </h2>
            </div>
            <div className="mt-6 grid gap-5 text-sm leading-7 text-muted-foreground md:grid-cols-2">
              <p>
                Preview a README before committing it, inspect AI-generated Markdown for broken
                tables or code fences, validate Mermaid diagrams, and polish release notes before
                sharing them.
              </p>
              <p>
                Markdown Lens is also useful as a quick Markdown renderer when you need a clean
                reading view without installing software or sending a private draft to an online
                document service.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="markdown-viewer-faq">
          <div className="flex items-center gap-3">
            <Braces className="h-6 w-6 text-accent" aria-hidden />
            <h2 id="markdown-viewer-faq" className="text-3xl font-bold tracking-tight">
              Online Markdown viewer FAQ
            </h2>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {markdownViewerFaq.map(({ question, answer }) => (
              <article
                key={question}
                className="rounded-xl border border-border/80 bg-panel p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold">{question}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-panel p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </article>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <li className="rounded-xl border border-border/80 bg-panel p-5 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
        {number}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
    </li>
  );
}
