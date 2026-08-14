"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArchiveRestore,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Command,
  Copy,
  Download,
  Eye,
  FileArchive,
  FileDown,
  FilePlus2,
  FileText,
  FileUp,
  HardDrive,
  Loader2,
  Menu,
  Moon,
  PanelLeft,
  Pencil,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { GithubStarLink } from "@/components/github-star-link";
import { buildStandaloneHtmlDocument } from "@/lib/standalone-html";
import { cn } from "@/lib/utils";
import { BrandIcon } from "@/components/brand-icon";
import { siteConfig } from "@/lib/site";
import {
  addDocument,
  duplicateDocument,
  exportWorkspace,
  getDocumentAssets,
  importWorkspace,
  initializeWorkspace,
  listDocuments,
  moveDocumentToTrash,
  permanentlyDeleteDocument,
  putAssets,
  restoreDocument,
  saveDocument,
  subscribeToWorkspaceStorage,
  type WorkspaceStorageStatus,
} from "@/lib/workspace/db";
import {
  createDocumentRecord,
  createId,
  type DocumentRecord,
} from "@/lib/workspace/types";
import { parseWorkspaceBackupFile } from "@/lib/workspace/backup-validation";
import {
  downloadBlob,
  getDocumentHeadings,
  getDocumentStats,
  getDocumentTitle,
  sanitizePreviewHtml,
  toFileName,
} from "@/lib/editor-utils";
import { convertLocalFile, converterCapabilities } from "@/lib/converters/registry";
import { ConverterError } from "@/lib/converters/error";
import type { ConversionResult, ConverterProgress } from "@/lib/converters/types";
import {
  createShareFragment,
  inspectShareFragment,
  readShareFragment,
  type ShareFragmentPreview,
} from "@/lib/share-state";
import { ServiceWorkerRegister } from "@/components/workspace/service-worker-register";

const MarkdownEditor = dynamic(
  () => import("@/components/workspace/markdown-editor").then((module) => module.MarkdownEditor),
  { ssr: false, loading: () => <PanelLoading label="Loading editor" /> },
);
const MarkdownPreview = dynamic(
  () => import("@/components/workspace/markdown-preview").then((module) => module.MarkdownPreview),
  { ssr: false, loading: () => <PanelLoading label="Loading preview" /> },
);

type Theme = "light" | "dark";
type SaveState = "saved" | "saving" | "error";
type MobilePane = "documents" | "editor" | "preview" | "outline";
type ImportJob = {
  id: string;
  fileName: string;
  state: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress?: ConverterProgress;
  error?: string;
};
type ShareLinkPreview = {
  url: string;
  length: number;
};
type ToastNotice = {
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const THEME_KEY = "markdown-lens:theme";
const SPLIT_KEY = "markdown-lens:split-ratio";
const STAR_ASK_KEY = "markdown-lens:star-ask";
let starAskOfferedThisLoad = false;

function offerStarAsk(setNotice: (notice: ToastNotice) => void) {
  if (starAskOfferedThisLoad) return;
  try {
    if (sessionStorage.getItem(STAR_ASK_KEY) === "1") return;
    sessionStorage.setItem(STAR_ASK_KEY, "1");
  } catch {
    // Private mode can block sessionStorage; the in-memory flag still gates this load.
  }
  starAskOfferedThisLoad = true;
  setNotice({
    message: "Converted locally. Star the project if it helped.",
    actionLabel: "Star",
    actionHref: siteConfig.githubUrl,
  });
}

export function MarkdownLensApp() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [documentSearch, setDocumentSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<MobilePane>("editor");
  const [splitRatio, setSplitRatio] = useState(50);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareLink, setShareLink] = useState<ShareLinkPreview | null>(null);
  const [pendingShareFragment, setPendingShareFragment] = useState<ShareFragmentPreview | null>(null);
  const [pendingSharedMarkdown, setPendingSharedMarkdown] = useState<string | null>(null);
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const [applyServiceWorkerUpdate, setApplyServiceWorkerUpdate] = useState<(() => void) | null>(null);
  const [workspaceStorage, setWorkspaceStorage] = useState<WorkspaceStorageStatus>({
    mode: "persistent",
    message: null,
  });
  const [storageWarningDismissed, setStorageWarningDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const centralRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef(new Map<string, AbortController>());
  const editorActions = useRef<{ focus: () => void; openSearch: () => void } | null>(null);
  const deferredMarkdown = useDeferredValue(markdown);

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeId),
    [activeId, documents],
  );
  const activeDocumentId = activeDocument?.id;
  const activeAssetIds = activeDocument?.assetIds;
  const headings = useMemo(() => getDocumentHeadings(deferredMarkdown), [deferredMarkdown]);
  const stats = useMemo(() => getDocumentStats(markdown), [markdown]);
  const filteredDocuments = useMemo(() => {
    const query = documentSearch.trim().toLowerCase();
    return documents.filter((document) => {
      if (showTrash ? document.deletedAt === undefined : document.deletedAt !== undefined) return false;
      return !query || document.title.toLowerCase().includes(query) || document.markdown.toLowerCase().includes(query);
    });
  }, [documentSearch, documents, showTrash]);

  const persistActiveDraft = useCallback(async () => {
    if (!ready || !activeDocument || activeDocument.markdown === markdown) return activeDocument;
    setSaveState("saving");
    try {
      const inferredTitle = activeDocument.title === "Untitled document" ? getDocumentTitle(markdown) : activeDocument.title;
      const saved = await saveDocument({ ...activeDocument, title: inferredTitle, markdown });
      setDocuments((current) => current.map((document) => (document.id === saved.id ? saved : document)));
      setSaveState("saved");
      return saved;
    } catch {
      setSaveState("error");
      setNotice({ message: "This draft could not be saved. Export a workspace backup before leaving the page." });
      return null;
    }
  }, [activeDocument, markdown, ready]);

  useEffect(() => {
    const unsubscribe = subscribeToWorkspaceStorage((status) => {
      setWorkspaceStorage(status);
      if (status.mode === "memory") setStorageWarningDismissed(false);
    });
    const storedTheme = readLocalPreference(THEME_KEY) as Theme | null;
    const nextTheme = storedTheme ?? "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    const storedRatio = Number(readLocalPreference(SPLIT_KEY));
    if (storedRatio >= 30 && storedRatio <= 70) setSplitRatio(storedRatio);

    async function load() {
      await initializeWorkspace();
      const records = await listDocuments({ includeDeleted: true });
      try {
        const sharedFragment = inspectShareFragment(window.location.hash);
        setPendingShareFragment(sharedFragment);
      } catch (error) {
        setNotice({ message: error instanceof Error ? error.message : "The shared document could not be opened." });
        clearShareFragment();
      }
      setDocuments(records);
      const first = records.find((record) => record.deletedAt === undefined);
      setActiveId(first?.id ?? null);
      setMarkdown(first?.markdown ?? "");
      setReady(true);
    }
    void load();
    return unsubscribe;
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  useEffect(() => {
    const handleSharedFragment = () => {
      try {
        const sharedFragment = inspectShareFragment(window.location.hash);
        setPendingShareFragment(sharedFragment);
      } catch (error) {
        setNotice({ message: error instanceof Error ? error.message : "The shared document could not be opened." });
        clearShareFragment();
      }
    };
    window.addEventListener("hashchange", handleSharedFragment);
    return () => window.removeEventListener("hashchange", handleSharedFragment);
  }, []);

  useEffect(() => {
    if (!activeDocument) return;
    setMarkdown(activeDocument.markdown);
    // Selection owns the editor source; autosave updates must not reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocumentId]);

  useEffect(() => {
    if (!activeDocumentId || !activeAssetIds) {
      setAssetUrls({});
      return;
    }
    let revoked: string[] = [];
    void getDocumentAssets(activeDocumentId, activeAssetIds).then((assets) => {
      const next: Record<string, string> = {};
      for (const asset of assets) {
        const url = URL.createObjectURL(asset.blob);
        next[asset.name] = url;
        revoked.push(url);
      }
      setAssetUrls(next);
    });
    return () => {
      revoked.forEach((url) => URL.revokeObjectURL(url));
      revoked = [];
    };
  }, [activeAssetIds, activeDocumentId]);

  useEffect(() => {
    if (!ready || !activeDocument || activeDocument.markdown === markdown) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => void persistActiveDraft(), 400);
    return () => window.clearTimeout(timeout);
  }, [activeDocument, markdown, persistActiveDraft, ready]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    if (ready) writeLocalPreference(THEME_KEY, theme);
  }, [ready, theme]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setCommandOpen(true);
      } else if (key === "o") {
        event.preventDefault();
        fileInputRef.current?.click();
      } else if (key === "n") {
        event.preventDefault();
        void createNewDocument();
      } else if (key === "s") {
        event.preventDefault();
        downloadMarkdown();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  const refreshDocuments = useCallback(async () => {
    setDocuments(await listDocuments({ includeDeleted: true }));
  }, []);

  const createNewDocument = useCallback(async () => {
    if (!(await persistActiveDraft()) && activeDocument) return;
    const document = createDocumentRecord();
    await addDocument(document);
    setDocuments((current) => [document, ...current]);
    setActiveId(document.id);
    setMarkdown("");
    setMobilePane("editor");
    window.setTimeout(() => editorActions.current?.focus(), 0);
  }, [activeDocument, persistActiveDraft]);

  const selectDocument = useCallback(async (document: DocumentRecord) => {
    if (document.id === activeId) return;
    if (!(await persistActiveDraft()) && activeDocument) return;
    setActiveId(document.id);
    setMarkdown(document.markdown);
    setMobilePane("editor");
  }, [activeDocument, activeId, persistActiveDraft]);

  const renameDocument = useCallback(async (document: DocumentRecord) => {
    const title = window.prompt("Rename document", document.title)?.trim();
    if (!title || title === document.title) return;
    const current = document.id === activeId ? await persistActiveDraft() : document;
    if (!current) return;
    const saved = await saveDocument({ ...current, title });
    setDocuments((current) => current.map((item) => (item.id === document.id ? saved : item)));
  }, [activeId, persistActiveDraft]);

  const removeDocument = useCallback(
    async (document: DocumentRecord) => {
      if (document.id === activeId && !(await persistActiveDraft())) return;
      await moveDocumentToTrash(document.id);
      if (activeId === document.id) {
        const next = documents.find((item) => item.id !== document.id && item.deletedAt === undefined);
        setActiveId(next?.id ?? null);
        setMarkdown(next?.markdown ?? "");
      }
      await refreshDocuments();
      setNotice({ message: `“${document.title}” moved to Trash.` });
    },
    [activeId, documents, persistActiveDraft, refreshDocuments],
  );

  const restoreFromTrash = useCallback(async (document: DocumentRecord) => {
    await restoreDocument(document.id);
    await refreshDocuments();
    setNotice({ message: `“${document.title}” restored.` });
  }, [refreshDocuments]);

  const deleteForever = useCallback(async (document: DocumentRecord) => {
    if (!window.confirm(`Permanently delete “${document.title}”? This cannot be undone.`)) return;
    await permanentlyDeleteDocument(document.id);
    await refreshDocuments();
  }, [refreshDocuments]);

  const duplicate = useCallback(async (document: DocumentRecord) => {
    const current = document.id === activeId ? await persistActiveDraft() : document;
    if (!current) return;
    const copy = await duplicateDocument(current);
    setDocuments((current) => [copy, ...current]);
    setActiveId(copy.id);
  }, [activeId, persistActiveDraft]);

  const importFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = createId();
      const controller = new AbortController();
      abortControllers.current.set(id, controller);
      setJobs((current) => [...current, { id, fileName: file.name, state: "queued" }]);
      try {
        const isImage = file.type.startsWith("image/");
        const useOcr = isImage && window.confirm(`Run local English OCR on “${file.name}”? The image never leaves this browser.`);
        setJobs((current) => current.map((job) => (job.id === id ? { ...job, state: "running" } : job)));
        const result = await convertLocalFile(
          file,
          { ocr: useOcr, tableMode: "html-fallback" },
          {
            signal: controller.signal,
            onProgress(progress) {
              setJobs((current) => current.map((job) => (job.id === id ? { ...job, progress } : job)));
            },
          },
        );
        const results = result.children?.length ? result.children : [result];
        let lastDocument: DocumentRecord | null = null;
        for (const converted of results) lastDocument = await persistConversion(converted);
        await refreshDocuments();
        if (lastDocument) {
          setActiveId(lastDocument.id);
          setMarkdown(lastDocument.markdown);
          setMobilePane("preview");
          offerStarAsk(setNotice);
        }
        setJobs((current) => current.map((job) => (job.id === id ? { ...job, state: "completed" } : job)));
      } catch (error) {
        const cancelled = error instanceof ConverterError && error.code === "cancelled";
        setJobs((current) =>
          current.map((job) =>
            job.id === id
              ? { ...job, state: cancelled ? "cancelled" : "failed", error: error instanceof Error ? error.message : "Conversion failed." }
              : job,
          ),
        );
      } finally {
        abortControllers.current.delete(id);
      }
    }
  }, [refreshDocuments]);

  async function persistConversion(result: ConversionResult) {
    const duration = Number(result.statistics.durationMs ?? 0);
    const completedAt = Date.now();
    const document = createDocumentRecord({
      title: result.title,
      markdown: result.markdown,
      source: result.source,
      conversion: {
        converterId: result.converterId,
        startedAt: completedAt - duration,
        completedAt,
        warnings: result.warnings,
        omitted: result.omitted,
        statistics: result.statistics,
        usedOcr: result.usedOcr,
      },
    });
    const assets = result.assets.map((asset) => ({ ...asset, id: createId(), documentId: document.id }));
    document.assetIds = assets.map((asset) => asset.id);
    await Promise.all([addDocument(document), putAssets(assets)]);
    return document;
  }

  function downloadMarkdown() {
    if (!markdown.trim()) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), `${toFileName(activeDocument?.title ?? getDocumentTitle(markdown))}.md`);
  }

  function exportHtml() {
    if (!previewRef.current) return;
    const html = buildStandaloneHtmlDocument({
      title: activeDocument?.title ?? getDocumentTitle(markdown),
      bodyHtml: sanitizePreviewHtml(previewRef.current),
    });
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), `${toFileName(activeDocument?.title ?? "document")}.html`);
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setNotice({ message: "Markdown copied." });
  }

  function prepareShareLink() {
    try {
      const fragment = createShareFragment(markdown);
      const url = `${location.origin}${location.pathname}${fragment}`;
      setShareLink({ url, length: url.length });
      setExportOpen(false);
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "A share link could not be created." });
    }
  }

  async function copyShareLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink.url);
      setShareLink(null);
      setNotice({ message: "Share link copied. Anyone with the URL can read this document." });
    } catch {
      setNotice({ message: "The share link could not be copied. Check browser clipboard permissions." });
    }
  }

  function inspectPendingSharedDocument() {
    if (pendingShareFragment === null) return;
    try {
      const sharedMarkdown = readShareFragment(pendingShareFragment.fragment);
      if (sharedMarkdown === null) throw new Error("This Markdown Lens share link is malformed.");
      setPendingShareFragment(null);
      setPendingSharedMarkdown(sharedMarkdown);
    } catch (error) {
      setPendingShareFragment(null);
      setNotice({ message: error instanceof Error ? error.message : "The shared document could not be opened." });
      clearShareFragment();
    }
  }

  function dismissPendingShareFragment() {
    setPendingShareFragment(null);
    clearShareFragment();
  }

  async function openSharedDocument() {
    if (pendingSharedMarkdown === null) return;
    try {
      if (!(await persistActiveDraft()) && activeDocument) return;
      const shared = createDocumentRecord({
        title: getDocumentTitle(pendingSharedMarkdown),
        markdown: pendingSharedMarkdown,
      });
      await addDocument(shared);
      setDocuments((current) => [shared, ...current]);
      setActiveId(shared.id);
      setMarkdown(shared.markdown);
      setMobilePane("editor");
      setPendingSharedMarkdown(null);
      clearShareFragment();
      setNotice({ message: "Shared document opened as a new local document." });
    } catch {
      setNotice({ message: "The shared document could not be saved locally." });
    }
  }

  function dismissSharedDocument() {
    setPendingSharedMarkdown(null);
    clearShareFragment();
  }

  async function downloadWorkspaceBackup() {
    if (!(await persistActiveDraft()) && activeDocument) return;
    const backup = await exportWorkspace();
    downloadBlob(
      new Blob([JSON.stringify(backup)], { type: "application/json" }),
      `markdown-lens-workspace-${new Date().toISOString().slice(0, 10)}.markdownlens.json`,
    );
  }

  async function exportDocumentBundle() {
    if (!activeDocument) return;
    const [{ zipSync, strToU8 }, assets] = await Promise.all([
      import("fflate"),
      getDocumentAssets(activeDocument.id, activeDocument.assetIds),
    ]);
    const entries: Record<string, Uint8Array> = {
      [`${toFileName(activeDocument.title)}.md`]: strToU8(markdown),
    };
    for (const asset of assets) entries[`assets/${asset.name}`] = new Uint8Array(await asset.blob.arrayBuffer());
    downloadBlob(
      new Blob([zipSync(entries)], { type: "application/zip" }),
      `${toFileName(activeDocument.title)}-bundle.zip`,
    );
  }

  async function restoreWorkspace(file: File) {
    try {
      const backup = await parseWorkspaceBackupFile(file);
      await importWorkspace(backup);
      await refreshDocuments();
      setNotice({ message: "Workspace backup restored locally." });
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "The workspace backup could not be restored." });
    }
  }

  function beginResize(event: React.PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const update = (clientX: number) => {
      const bounds = centralRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const ratio = Math.min(70, Math.max(30, ((clientX - bounds.left) / bounds.width) * 100));
      updateSplitRatio(ratio);
    };
    const handleMove = (moveEvent: PointerEvent) => update(moveEvent.clientX);
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function updateSplitRatio(ratio: number) {
    setSplitRatio(ratio);
    writeLocalPreference(SPLIT_KEY, String(ratio));
  }

  function resetSplitRatio() {
    setSplitRatio(50);
    removeLocalPreference(SPLIT_KEY);
  }

  function navigateToHeading(id: string) {
    const target = previewRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!target) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const commands = [
      { label: "New document", hint: "⌘N", action: () => void createNewDocument() },
      { label: "Open or convert", hint: "⌘O", action: () => fileInputRef.current?.click() },
      { label: "Find and replace", hint: "⌘F", action: () => editorActions.current?.openSearch() },
      { label: "Show Documents", action: () => setDocumentsOpen(true) },
      { label: "Show Outline", action: () => setOutlineOpen(true) },
      { label: "Reset editor and preview split", action: resetSplitRatio },
      { label: "Download Markdown", hint: "⌘S", action: downloadMarkdown },
      { label: "Copy Markdown", action: () => void copyMarkdown() },
      { label: "Create share link", action: prepareShareLink },
      { label: "Export workspace backup", action: () => void downloadWorkspaceBackup() },
      { label: "Star on GitHub", action: () => window.open(siteConfig.githubUrl, "_blank", "noopener,noreferrer") },
    ];
  const visibleCommands = commands.filter((command) => command.label.toLowerCase().includes(commandSearch.toLowerCase()));

  return (
    <div
      className="workspace-shell flex h-dvh min-h-[620px] flex-col overflow-hidden bg-background text-foreground"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        const files = Array.from(event.dataTransfer.files);
        if (!files.length) return;
        event.preventDefault();
        void importFiles(files);
      }}
    >
      <ServiceWorkerRegister onUpdate={(applyUpdate) => setApplyServiceWorkerUpdate(() => applyUpdate)} />
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Open or convert local documents"
        multiple
        className="sr-only"
        accept=".md,.markdown,.txt,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.html,.htm,.csv,.tsv,.json,.xml,.epub,.zip,.png,.jpg,.jpeg,.webp,.bmp"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) void importFiles(files);
        }}
      />
      <input
        ref={backupInputRef}
        type="file"
        aria-label="Restore Markdown Lens workspace backup"
        className="sr-only"
        accept=".json,.markdownlens.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void restoreWorkspace(file);
        }}
      />

      <header className="flex h-[54px] shrink-0 items-center justify-between border-b border-border bg-background px-3">
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/" prefetch={false} aria-label="Markdown Lens home" className="mr-2 flex items-center gap-2 rounded-md px-1.5 py-2 font-semibold tracking-tight focus:outline-none focus:ring-2 focus:ring-ring">
            <BrandIcon className="h-6 w-6" priority />
            <span className="hidden sm:inline">Markdown Lens</span>
          </Link>
          <TopButton icon={PanelLeft} label="Documents" onClick={() => setDocumentsOpen((open) => !open)} active={documentsOpen} className="hidden md:flex" />
          <TopButton icon={FilePlus2} label="New document" onClick={() => void createNewDocument()} className="hidden sm:flex" />
          <TopButton icon={FileUp} label="Open or convert" onClick={() => fileInputRef.current?.click()} emphasis />
          <button
            type="button"
            onClick={() => setFormatGuideOpen(true)}
            className="hidden rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground lg:inline"
          >
            Formats
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("hidden items-center gap-1.5 px-2 text-xs md:flex", saveState === "error" || workspaceStorage.mode === "memory" ? "text-amber-400" : "text-muted-foreground")}>
            {saveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saveState === "error" || workspaceStorage.mode === "memory" ? <HardDrive className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5 text-accent" />}
            {saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed" : workspaceStorage.mode === "memory" ? "Session only" : "Saved locally"}
          </span>
          {!online ? <span role="status" aria-live="polite" aria-label="Offline. Changes remain on this device." className="px-1.5 text-[11px] text-amber-400 sm:px-2 sm:text-xs">Offline</span> : null}
          {installPrompt ? (
            <button
              type="button"
              aria-label="Install Markdown Lens"
              title="Install Markdown Lens"
              onClick={async () => {
                await installPrompt.prompt();
                const choice = await installPrompt.userChoice;
                setInstallPrompt(null);
                if (choice.outcome === "accepted") setNotice({ message: "Markdown Lens was installed." });
              }}
              className="flex h-9 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:px-3"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Install</span>
            </button>
          ) : null}
          <button type="button" onClick={() => setCommandOpen(true)} className="hidden h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted lg:flex">
            <Search className="h-3.5 w-3.5" /> <span>Commands</span><kbd>⌘K</kbd>
          </button>
          <IconButton icon={theme === "dark" ? Sun : Moon} label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
          <GithubStarLink variant="nav" className="h-9 px-2 text-xs" />
          <IconButton icon={Menu} label="Open commands" onClick={() => setCommandOpen(true)} className="lg:hidden" />
        </div>
      </header>

      <nav className="flex h-11 shrink-0 items-center border-b border-border px-2 lg:hidden" aria-label="Workspace panes">
        {(["documents", "editor", "preview", "outline"] as MobilePane[]).map((pane) => (
          <button key={pane} type="button" onClick={() => setMobilePane(pane)} className={cn("flex-1 rounded-md px-2 py-2 text-xs font-medium capitalize text-muted-foreground", mobilePane === pane && "bg-muted text-foreground")}>
            {pane}
          </button>
        ))}
      </nav>

      <div className="relative flex min-h-0 flex-1">
        <aside
          className={cn(
            "workspace-rail z-30 flex w-[260px] shrink-0 flex-col border-r border-border bg-background 2xl:w-[300px]",
            !documentsOpen && "hidden",
            mobilePane !== "documents" && "hidden lg:flex",
            mobilePane === "documents" && "absolute inset-y-0 left-0 flex w-full max-w-[340px] shadow-2xl lg:static lg:shadow-none",
          )}
          aria-label="Documents"
        >
          <RailHeader label={showTrash ? "Trash" : "Documents"} onClose={() => setDocumentsOpen(false)} />
          <div className="border-b border-border p-2.5">
            <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
              <Search className="h-3.5 w-3.5" />
              <input value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Search documents" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {filteredDocuments.length ? (
              filteredDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  active={activeId === document.id}
                  trashed={showTrash}
                  onSelect={() => void selectDocument(document)}
                  onRename={() => void renameDocument(document)}
                  onDuplicate={() => void duplicate(document)}
                  onDelete={() => void removeDocument(document)}
                  onRestore={() => void restoreFromTrash(document)}
                  onDeleteForever={() => void deleteForever(document)}
                />
              ))
            ) : (
              <div className="px-3 py-10 text-center text-xs leading-5 text-muted-foreground">
                {showTrash ? "Trash is empty." : "No documents match this search."}
              </div>
            )}
          </div>
          <div className="border-t border-border p-2">
            <button type="button" onClick={() => setShowTrash((current) => !current)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              {showTrash ? <BookOpen className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
              {showTrash ? "Back to documents" : "Trash"}
            </button>
          </div>
          <ImportJobs jobs={jobs} onCancel={(id) => abortControllers.current.get(id)?.abort()} onClear={() => setJobs((current) => current.filter((job) => job.state === "running" || job.state === "queued"))} />
        </aside>

        <main ref={centralRef} className={cn("min-w-0 flex-1", mobilePane === "documents" || mobilePane === "outline" ? "hidden lg:block" : "block")}>
          <div
            className="hidden h-full min-h-0 lg:grid"
            style={{ gridTemplateColumns: `${splitRatio}fr 7px ${100 - splitRatio}fr` }}
          >
            <WorkspacePanel label="Markdown" icon={FileText} detail="Local source">
              <MarkdownEditor value={markdown} theme={theme} onChange={setMarkdown} onCursorChange={setCursor} onReady={(actions) => (editorActions.current = actions)} />
            </WorkspacePanel>
            <button
              type="button"
              className="group flex cursor-col-resize items-center justify-center border-x border-border bg-background hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring"
              role="separator"
              aria-label="Resize editor and preview"
              aria-valuemin={30}
              aria-valuemax={70}
              aria-valuenow={Math.round(splitRatio)}
              onPointerDown={beginResize}
              onDoubleClick={resetSplitRatio}
              title="Drag or use arrow keys to resize. Double-click to reset."
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 30 : event.key === "End" ? 70 : Math.min(70, Math.max(30, splitRatio + (event.key === "ArrowLeft" ? -2 : 2)));
                updateSplitRatio(next);
              }}
            >
              <span className="grid gap-0.5 opacity-50 group-hover:opacity-100" aria-hidden><i className="h-0.5 w-0.5 rounded-full bg-current" /><i className="h-0.5 w-0.5 rounded-full bg-current" /><i className="h-0.5 w-0.5 rounded-full bg-current" /></span>
            </button>
            <WorkspacePanel label="Preview" icon={Eye} detail="GitHub-style output">
              <div className="h-full overflow-y-auto">
                <MarkdownPreview markdown={deferredMarkdown} theme={theme} previewRef={previewRef} assetUrls={assetUrls} />
              </div>
            </WorkspacePanel>
          </div>
          <div className="h-full lg:hidden">
            {mobilePane === "editor" ? (
              <WorkspacePanel label="Markdown" icon={FileText} detail="Local source">
                <MarkdownEditor value={markdown} theme={theme} onChange={setMarkdown} onCursorChange={setCursor} onReady={(actions) => (editorActions.current = actions)} />
              </WorkspacePanel>
            ) : (
              <WorkspacePanel label="Preview" icon={Eye} detail="GitHub-style output">
                <div className="h-full overflow-y-auto"><MarkdownPreview markdown={deferredMarkdown} theme={theme} previewRef={previewRef} assetUrls={assetUrls} /></div>
              </WorkspacePanel>
            )}
          </div>
        </main>

        <aside
          className={cn(
            "workspace-rail z-30 flex w-[220px] shrink-0 flex-col border-l border-border bg-background 2xl:w-[260px]",
            !outlineOpen && "hidden",
            mobilePane !== "outline" && "hidden lg:flex",
            mobilePane === "outline" && "absolute inset-y-0 right-0 flex w-full max-w-[320px] shadow-2xl lg:static lg:shadow-none",
          )}
          aria-label="Outline"
        >
          <RailHeader label="Outline" onClose={() => setOutlineOpen(false)} />
          <nav className="min-h-0 flex-1 overflow-y-auto py-2" aria-label="Document outline">
            {headings.length ? headings.map((heading) => (
              <button key={`${heading.id}-${heading.line}`} type="button" aria-label={`${heading.text}, heading level ${heading.level}`} onClick={() => navigateToHeading(heading.id)} className="flex w-full items-start gap-2 border-l-2 border-transparent px-4 py-2 text-left text-xs text-muted-foreground hover:border-accent hover:bg-muted hover:text-foreground" style={{ paddingLeft: `${Math.min(32, 12 + heading.level * 4)}px` }}>
                <span aria-hidden className="mt-px font-mono text-[10px] text-foreground/65">H{heading.level}</span>
                <span className="line-clamp-2 leading-4">{heading.text}</span>
              </button>
            )) : <p className="px-5 py-10 text-center text-xs leading-5 text-muted-foreground">Add Markdown headings to build an outline.</p>}
          </nav>
          <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>{headings.length} heading{headings.length === 1 ? "" : "s"}</span>
              {activeDocument?.conversion ? <button type="button" onClick={() => setReportOpen(true)} className="font-medium text-accent hover:underline">Conversion report</button> : null}
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-3 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-3">
          {!documentsOpen ? <IconButton icon={ChevronRight} label="Show Documents" onClick={() => setDocumentsOpen(true)} compact /> : null}
          <span className="hidden items-center gap-1.5 2xl:flex"><ShieldCheck className="h-3.5 w-3.5 text-accent" />All documents stay on this device.</span>
          <span>Ln {cursor.line}, Col {cursor.column}</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="hidden md:inline">Markdown</span>
          <span className="hidden md:inline">{stats.words.toLocaleString()} words</span>
          {splitRatio !== 50 ? (
            <button
              type="button"
              onClick={resetSplitRatio}
              className="hidden h-7 items-center gap-1.5 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring lg:flex"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset split
            </button>
          ) : null}
          <span role="status" className={cn("h-1.5 w-1.5 rounded-full", saveState === "saved" ? "bg-accent" : saveState === "saving" ? "bg-amber-400" : "bg-red-400")}>
            <span className="sr-only">{saveState}</span>
          </span>
        </div>
        <div className="relative flex items-center gap-1">
          <button type="button" onClick={() => setExportOpen((open) => !open)} className="flex h-8 items-center gap-1.5 rounded-md border border-accent/55 px-3 font-medium text-accent hover:bg-accent/10">
            Export <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="hidden h-8 overflow-hidden rounded-md border border-border xl:flex">
            <QuickExport label=".md" onClick={downloadMarkdown} />
            <QuickExport label=".html" onClick={exportHtml} />
            <QuickExport label=".pdf" onClick={() => window.print()} />
            <QuickExport label="…" onClick={() => setExportOpen(true)} ariaLabel="More export options" />
          </div>
          {exportOpen ? (
            <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 grid w-64 gap-1 rounded-lg border border-border bg-panel p-1.5 shadow-xl">
              <MenuAction icon={Clipboard} label="Copy Markdown" onClick={() => void copyMarkdown()} />
              <MenuAction icon={Download} label="Download .md" onClick={downloadMarkdown} />
              <MenuAction icon={FileDown} label="Export HTML" onClick={exportHtml} />
              {activeDocument?.assetIds.length ? <MenuAction icon={FileArchive} label="Export Markdown + assets" onClick={() => void exportDocumentBundle()} /> : null}
              <MenuAction icon={Share2} label="Create share link" onClick={prepareShareLink} />
              <MenuAction icon={FileArchive} label="Export workspace backup" onClick={() => void downloadWorkspaceBackup()} />
              <MenuAction icon={ArchiveRestore} label="Restore workspace backup" onClick={() => backupInputRef.current?.click()} />
              <MenuAction icon={FileText} label="Print / save PDF" onClick={() => window.print()} />
            </div>
          ) : null}
          {!outlineOpen ? <IconButton icon={ChevronLeft} label="Show Outline" onClick={() => setOutlineOpen(true)} compact /> : null}
        </div>
      </footer>

      {notice ? (
        <Notice
          message={notice.message}
          actionLabel={notice.actionLabel}
          actionHref={notice.actionHref}
          onClose={() => setNotice(null)}
        />
      ) : null}
      {workspaceStorage.mode === "memory" && !storageWarningDismissed ? (
        <Notice
          message={workspaceStorage.message}
          actionLabel="Export backup"
          onAction={() => {
            void downloadWorkspaceBackup();
            setStorageWarningDismissed(true);
          }}
          onClose={() => setStorageWarningDismissed(true)}
          persistent
        />
      ) : null}
      {applyServiceWorkerUpdate ? (
        <Notice
          message="A new Markdown Lens version is ready."
          actionLabel="Reload"
          onAction={() => {
            applyServiceWorkerUpdate();
            setApplyServiceWorkerUpdate(null);
          }}
          onClose={() => setApplyServiceWorkerUpdate(null)}
          persistent
        />
      ) : null}
      {commandOpen ? <CommandPalette search={commandSearch} onSearch={setCommandSearch} commands={visibleCommands} onClose={() => { setCommandOpen(false); setCommandSearch(""); }} /> : null}
      {formatGuideOpen ? <FormatGuide onClose={() => setFormatGuideOpen(false)} /> : null}
      {reportOpen && activeDocument?.conversion ? <ConversionReportDialog document={activeDocument} onClose={() => setReportOpen(false)} /> : null}
      {shareLink ? <ShareLinkDialog preview={shareLink} onCopy={() => void copyShareLink()} onClose={() => setShareLink(null)} /> : null}
      {pendingShareFragment !== null ? (
        <SharedLinkConsentDialog
          preview={pendingShareFragment}
          existingDocumentCount={documents.filter((document) => document.deletedAt === undefined).length}
          onInspect={inspectPendingSharedDocument}
          onClose={dismissPendingShareFragment}
        />
      ) : null}
      {pendingSharedMarkdown !== null ? (
        <SharedDocumentDialog
          markdown={pendingSharedMarkdown}
          existingDocumentCount={documents.filter((document) => document.deletedAt === undefined).length}
          onOpen={() => void openSharedDocument()}
          onClose={dismissSharedDocument}
        />
      ) : null}
    </div>
  );
}

function SharedLinkConsentDialog({
  preview,
  existingDocumentCount,
  onInspect,
  onClose,
}: {
  preview: ShareFragmentPreview;
  existingDocumentCount: number;
  onInspect: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="shared-link-consent-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="shared-link-consent-title" className="text-lg font-semibold">Inspect shared document?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">The URL contains compressed, untrusted Markdown. It has not been decompressed or parsed. Your {existingDocumentCount === 1 ? "existing draft" : `${existingDocumentCount.toLocaleString()} existing drafts`} will not be replaced.</p>
          </div>
          <IconButton icon={X} label="Close shared link dialog" onClick={onClose} />
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-px overflow-hidden border border-border bg-border text-sm">
          <ReportFact label="Compressed size" value={`${preview.compressedCharacters.toLocaleString()} characters`} />
        </dl>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Inspection uses strict decompression output and work limits before showing any document details.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
          <button type="button" onClick={onInspect} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">Inspect safely</button>
        </div>
      </div>
    </div>
  );
}

function WorkspacePanel({ label, icon: Icon, detail, children }: { label: string; icon: typeof FileText; detail: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col bg-panel" aria-label={label}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        <span className="flex items-center gap-2 text-xs font-semibold"><Icon className="h-3.5 w-3.5 text-accent" />{label}</span>
        <span className="text-[11px] text-muted-foreground">{detail}</span>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function DocumentRow({ document, active, trashed, onSelect, onRename, onDuplicate, onDelete, onRestore, onDeleteForever }: { document: DocumentRecord; active: boolean; trashed: boolean; onSelect: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void; onRestore: () => void; onDeleteForever: () => void }) {
  return (
    <div className={cn("group mb-0.5 flex items-center rounded-md border border-transparent", active && !trashed && "border-accent/45 bg-accent/10")}>
      <button type="button" onClick={onSelect} onDoubleClick={onRename} className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left focus:outline-none">
        <FileText className={cn("h-3.5 w-3.5 shrink-0", active ? "text-accent" : "text-muted-foreground")} />
        <span className="min-w-0 flex-1 truncate text-xs">{document.title}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(document.updatedAt)}</span>
      </button>
      <div className="mr-1 hidden items-center group-hover:flex group-focus-within:flex">
        {trashed ? (
          <><IconButton icon={RotateCcw} label="Restore document" onClick={onRestore} compact /><IconButton icon={Trash2} label="Delete permanently" onClick={onDeleteForever} compact /></>
        ) : (
          <><IconButton icon={Pencil} label="Rename document" onClick={onRename} compact /><IconButton icon={Copy} label="Duplicate document" onClick={onDuplicate} compact /><IconButton icon={Trash2} label="Move to Trash" onClick={onDelete} compact /></>
        )}
      </div>
    </div>
  );
}

function ImportJobs({ jobs, onCancel, onClear }: { jobs: ImportJob[]; onCancel: (id: string) => void; onClear: () => void }) {
  if (!jobs.length) return (
    <div className="m-2 border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      <FileUp className="mx-auto mb-2 h-4 w-4" />Drop files anywhere to import
    </div>
  );
  const active = jobs.find((job) => job.state === "running" || job.state === "queued") ?? jobs.at(-1)!;
  const percent = active.progress?.current && active.progress?.total ? Math.round((active.progress.current / active.progress.total) * 100) : null;
  return (
    <div className="border-t border-border p-2">
      <div className="border border-border bg-surface p-2.5">
        <div className="flex items-center gap-2 text-xs"><FileText className="h-3.5 w-3.5 text-accent" /><span className="min-w-0 flex-1 truncate">{active.fileName}</span>{active.state === "running" ? <button type="button" onClick={() => onCancel(active.id)} aria-label="Cancel conversion"><X className="h-3.5 w-3.5" /></button> : active.state === "completed" ? <Check className="h-3.5 w-3.5 text-accent" /> : null}</div>
        {active.state === "running" ? <div className="mt-2 h-1 overflow-hidden bg-muted"><div className="h-full bg-accent transition-all" style={{ width: `${percent ?? 35}%` }} /></div> : null}
        <p className={cn("mt-2 line-clamp-2 text-[10px] text-muted-foreground", active.state === "failed" && "text-red-400")}>{active.error ?? active.progress?.message ?? active.state}</p>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{jobs.length} job{jobs.length === 1 ? "" : "s"}</span><button type="button" onClick={onClear} className="hover:text-foreground">Clear finished</button></div>
      </div>
    </div>
  );
}

function CommandPalette({ search, onSearch, commands, onClose }: { search: string; onSearch: (value: string) => void; commands: Array<{ label: string; hint?: string; action: () => void }>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-panel shadow-2xl">
        <label className="flex h-12 items-center gap-3 border-b border-border px-4"><Command className="h-4 w-4 text-accent" /><input autoFocus value={search} onChange={(event) => onSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }} placeholder="Type a command…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">{commands.length ? commands.map((command) => <button key={command.label} type="button" onClick={() => { command.action(); onClose(); }} className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted"><span>{command.label}</span>{command.hint ? <kbd className="text-xs text-muted-foreground">{command.hint}</kbd> : null}</button>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching commands.</p>}</div>
      </div>
    </div>
  );
}

function FormatGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="formats-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id="formats-title" className="text-lg font-semibold">Local format support</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Files are processed in this browser. Nothing is uploaded.</p></div><IconButton icon={X} label="Close format guide" onClick={onClose} /></div>
        <div className="mt-5 divide-y divide-border border-y border-border">{converterCapabilities.map((capability) => <div key={capability.label} className="grid grid-cols-[120px_1fr] gap-4 py-3 text-sm"><strong>{capability.label}</strong><span className="text-muted-foreground">{capability.extensions}</span></div>)}</div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Legacy DOC, PPT, and XLS files must be exported to their modern formats. PDF and Office layout is inferred and should be reviewed after conversion.</p>
      </div>
    </div>
  );
}

function ConversionReportDialog({ document, onClose }: { document: DocumentRecord; onClose: () => void }) {
  const report = document.conversion!;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id="report-title" className="text-lg font-semibold">Conversion report</h2><p className="mt-1 text-sm text-muted-foreground">{document.source?.name} · processed locally</p></div><IconButton icon={X} label="Close conversion report" onClick={onClose} /></div>
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border text-sm">
          <ReportFact label="Converter" value={report.converterId} />
          <ReportFact label="OCR" value={report.usedOcr ? "Used locally" : "Not used"} />
          {Object.entries(report.statistics).map(([label, value]) => <ReportFact key={label} label={label} value={String(value)} />)}
        </dl>
        <ReportList title="Warnings" items={report.warnings} empty="No conversion warnings." />
        <ReportList title="Omitted content" items={report.omitted} empty="No omitted content was reported." />
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Document conversion is structural rather than visually lossless. Review complex tables, columns, diagrams, and embedded media before publishing.</p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Source is public if you want to{" "}
          <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            inspect or star it
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function ShareLinkDialog({
  preview,
  onCopy,
  onClose,
}: {
  preview: ShareLinkPreview;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-link-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="share-link-title" className="text-lg font-semibold">Create share link</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">The Markdown is compressed into the URL fragment and restored entirely in the browser.</p>
          </div>
          <IconButton icon={X} label="Close share link dialog" onClick={onClose} />
        </div>
        <div className="mt-5 rounded-md border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          Anyone with this URL can read and copy the document. Encoding is not encryption—do not use this for secrets or confidential content.
        </div>
        <dl className="mt-4 border-y border-border py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">URL length</dt>
            <dd className="font-mono">{preview.length.toLocaleString()} characters</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">The document stays after the <code>#</code> in the URL. Browsers do not include URL fragments in network requests.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
          <button type="button" onClick={onCopy} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">Copy share link</button>
        </div>
      </div>
    </div>
  );
}

function SharedDocumentDialog({
  markdown,
  existingDocumentCount,
  onOpen,
  onClose,
}: {
  markdown: string;
  existingDocumentCount: number;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="shared-document-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="shared-document-title" className="text-lg font-semibold">Open shared document?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">This untrusted Markdown will be added as a new local document. Your {existingDocumentCount === 1 ? "existing draft" : `${existingDocumentCount.toLocaleString()} existing drafts`} will not be replaced.</p>
          </div>
          <IconButton icon={X} label="Close shared document dialog" onClick={onClose} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border text-sm">
          <ReportFact label="Title" value={getDocumentTitle(markdown)} />
          <ReportFact label="Size" value={`${markdown.length.toLocaleString()} characters`} />
        </dl>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Only open links from people you trust. The existing safe Markdown renderer will treat the content as untrusted input.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
          <button type="button" onClick={onOpen} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90">Open as new document</button>
        </div>
      </div>
    </div>
  );
}

function ReportFact({ label, value }: { label: string; value: string }) {
  return <div className="bg-panel p-3"><dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-mono text-xs">{value}</dd></div>;
}

function ReportList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="mt-5"><h3 className="text-sm font-semibold">{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">{empty}</p>}</section>;
}

function Notice({
  message,
  onClose,
  actionLabel,
  onAction,
  actionHref,
  persistent = false,
}: {
  message: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  persistent?: boolean;
}) {
  useEffect(() => {
    if (persistent) return;
    const timeout = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(timeout);
  }, [onClose, persistent]);
  return (
    <div role="status" aria-live="polite" className="fixed bottom-14 left-1/2 z-[90] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-panel px-4 py-3 text-xs shadow-xl">
      <span>{message}</span>
      {actionLabel && actionHref ? (
        <a href={actionHref} target="_blank" rel="noreferrer" onClick={onClose} className="rounded-md bg-accent px-2.5 py-1 font-medium text-accent-foreground">
          {actionLabel}
        </a>
      ) : actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="rounded-md bg-accent px-2.5 py-1 font-medium text-accent-foreground">{actionLabel}</button>
      ) : null}
      <button type="button" onClick={onClose} aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function clearShareFragment() {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

function readLocalPreference(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // IndexedDB workspace persistence is handled separately.
  }
}

function removeLocalPreference(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Preference storage is optional.
  }
}

function RailHeader({ label, onClose }: { label: string; onClose: () => void }) {
  return <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3"><span className="text-xs font-semibold">{label}</span><IconButton icon={X} label={`Hide ${label}`} onClick={onClose} compact /></header>;
}

function TopButton({ icon: Icon, label, onClick, emphasis, active, className }: { icon: typeof FileText; label: string; onClick: () => void; emphasis?: boolean; active?: boolean; className?: string }) {
  return <button type="button" onClick={onClick} className={cn("h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground", emphasis && "border border-accent/55 text-accent hover:bg-accent/10", active && !emphasis && "bg-muted text-foreground", className)}><Icon className="h-3.5 w-3.5" />{label}</button>;
}

function IconButton({ icon: Icon, label, onClick, compact, className }: { icon: typeof FileText; label: string; onClick: () => void; compact?: boolean; className?: string }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={cn("inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring", compact ? "h-7 w-7" : "h-9 w-9", className)}><Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /></button>;
}

function MenuAction({ icon: Icon, label, onClick }: { icon: typeof FileText; label: string; onClick: () => void }) {
  return <button type="button" onClick={() => { onClick(); }} className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs text-foreground hover:bg-muted"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{label}</button>;
}

function QuickExport({ label, onClick, ariaLabel }: { label: string; onClick: () => void; ariaLabel?: string }) {
  return <button type="button" onClick={onClick} aria-label={ariaLabel} className="min-w-12 border-r border-border px-2.5 font-mono text-[10px] text-muted-foreground last:border-r-0 hover:bg-muted hover:text-foreground">{label}</button>;
}

function PanelLoading({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>;
}

function relativeTime(timestamp: number) {
  const difference = Date.now() - timestamp;
  if (difference < 60_000) return "now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)}m`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}
