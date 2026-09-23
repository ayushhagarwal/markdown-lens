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
  Download,
  Ellipsis,
  Eye,
  FileArchive,
  FileDown,
  FilePlus2,
  FileText,
  FileUp,
  HardDrive,
  History,
  Loader2,
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
import { DropToConvertOverlay, useFileDrag } from "@/components/file-drop-overlay";
import { GithubStarLink } from "@/components/github-star-link";
import { clipboardImageFiles } from "@/lib/clipboard-images";
import { conversionWarningLabel, documentFormatLabel } from "@/lib/document-format";
import { documentListEmptyState } from "@/lib/document-list";
import { documentMatchSnippet } from "@/lib/document-search";
import { versionTimeLabel } from "@/lib/document-versions";
import { conversionProgressPercent } from "@/lib/import-progress";
import { activeHeadingId, pairedScrollOffset } from "@/lib/scroll-sync";
import { addPendingImports, consumePendingImports } from "@/lib/pending-import";
import { createSamplePdfFile } from "@/lib/sample-pdf";
import { buildStandaloneHtmlDocument } from "@/lib/standalone-html";
import { cn } from "@/lib/utils";
import { BrandIcon } from "@/components/brand-icon";
import { siteConfig } from "@/lib/site";
import { recordConversionAndShouldAsk } from "@/lib/star-prompt";
import {
  addDocument,
  addDocumentWithAssets,
  duplicateDocument,
  exportWorkspace,
  getDocumentAssets,
  importWorkspace,
  initializeWorkspace,
  listDocumentVersions,
  listDocuments,
  moveDocumentToTrash,
  permanentlyDeleteDocument,
  putAssets,
  recordDocumentVersion,
  restoreDocument,
  saveDocument,
  subscribeToWorkspaceStorage,
  type WorkspaceStorageStatus,
} from "@/lib/workspace/db";
import {
  createDocumentRecord,
  createId,
  type DocumentRecord,
  type DocumentVersion,
} from "@/lib/workspace/types";
import type { MarkdownEditorActions } from "@/components/workspace/markdown-editor";
import { parseWorkspaceBackupFile } from "@/lib/workspace/backup-validation";
import {
  downloadBlob,
  getDocumentHeadings,
  getDocumentStats,
  getUniqueAssetFileName,
  prepareStandaloneBodyHtml,
  getDocumentTitle,
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

const MOBILE_PANES: { id: MobilePane; label: string; icon: typeof FileText }[] = [
  { id: "documents", label: "Files", icon: FileText },
  { id: "editor", label: "Edit", icon: Pencil },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "outline", label: "Outline", icon: BookOpen },
];
type ImportJob = {
  id: string;
  fileName: string;
  file: File;
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
const FOCUS_KEY = "markdown-lens:focus";
const FONT_SIZE_KEY = "markdown-lens:font-size";
const WRAP_KEY = "markdown-lens:wrap";
const EDITOR_FONT_SIZES = [13.5, 15, 17] as const;

function isApplePlatform() {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
  );
}

function commandModPrefix(apple = isApplePlatform()) {
  return apple ? "⌘" : "Ctrl+";
}

function offerStarAsk(setNotice: (notice: ToastNotice) => void) {
  try {
    if (!recordConversionAndShouldAsk(localStorage)) return;
  } catch {
    // Private mode can block localStorage; do not interrupt the conversion flow.
    return;
  }
  setNotice({
    message: "You’ve converted two documents locally. Star the project if it helped.",
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
  const [renameTarget, setRenameTarget] = useState<DocumentRecord | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const [ocrTarget, setOcrTarget] = useState<File | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState<(typeof EDITOR_FONT_SIZES)[number]>(13.5);
  const [lineWrap, setLineWrap] = useState(true);
  const [versions, setVersions] = useState<readonly DocumentVersion[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [activeHeadingIdState, setActiveHeadingId] = useState<string | null>(null);
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
  const [dismissedWarningIds, setDismissedWarningIds] = useState<ReadonlySet<string>>(() => new Set());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const centralRef = useRef<HTMLDivElement>(null);
  const exportToggleRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef(new Map<string, AbortController>());
  const ocrResolution = useRef<((useOcr: boolean) => void) | null>(null);
  const editorActions = useRef<MarkdownEditorActions | null>(null);
  const editorScrollRef = useRef<HTMLElement | null>(null);
  const previewScrollRef = useRef<HTMLElement | null>(null);
  const scrollHold = useRef(false);
  const [scrollSurfaceVersion, setScrollSurfaceVersion] = useState(0);
  const pasteImagesRef = useRef<(files: File[]) => Promise<string[]>>(async () => []);
  const handlePasteImages = useCallback((files: File[]) => pasteImagesRef.current(files), []);
  const persistActiveDraftRef = useRef<(() => Promise<DocumentRecord | null | undefined>) | null>(null);
  const importFilesRef = useRef<(files: File[]) => Promise<void>>(async () => undefined);
  const readyRef = useRef(false);
  const { active: fileDragActive, reset: resetFileDrag, dragProps } = useFileDrag();
  const deferredMarkdown = useDeferredValue(markdown);
  const modPrefix = useMemo(() => commandModPrefix(), []);

  useEffect(() => {
    if (!exportOpen) return;
    const frame = window.requestAnimationFrame(() => {
      exportMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [exportOpen]);

  useEffect(() => {
    if (!exportOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (exportMenuRef.current?.contains(target) || exportToggleRef.current?.contains(target)) return;
      setExportOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [exportOpen]);

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
      const previousMarkdown = activeDocument.markdown;
      const saved = await saveDocument({ ...activeDocument, title: inferredTitle, markdown });
      setDocuments((current) => current.map((document) => (document.id === saved.id ? saved : document)));
      if (previousMarkdown !== markdown) {
        setVersions(await recordDocumentVersion(saved.id, previousMarkdown, saved.updatedAt));
      }
      setSaveState("saved");
      return saved;
    } catch {
      setSaveState("error");
      setNotice({ message: "This draft could not be saved. Export a workspace backup before leaving the page." });
      return null;
    }
  }, [activeDocument, markdown, ready]);

  const updateMarkdown = useCallback((nextMarkdown: string) => {
    setMarkdown(nextMarkdown);
    if (!activeDocument || activeDocument.title !== "Untitled document") return;
    const inferredTitle = getDocumentTitle(nextMarkdown);
    if (inferredTitle === activeDocument.title) return;
    setDocuments((current) => current.map((document) => (
      document.id === activeDocument.id ? { ...document, title: inferredTitle } : document
    )));
  }, [activeDocument]);

  useEffect(() => {
    persistActiveDraftRef.current = persistActiveDraft;
  }, [persistActiveDraft]);

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
    setFocusMode(readLocalPreference(FOCUS_KEY) === "1");
    const storedFontSize = Number(readLocalPreference(FONT_SIZE_KEY));
    if (EDITOR_FONT_SIZES.includes(storedFontSize as (typeof EDITOR_FONT_SIZES)[number])) {
      setEditorFontSize(storedFontSize as (typeof EDITOR_FONT_SIZES)[number]);
    }
    setLineWrap(readLocalPreference(WRAP_KEY) !== "off");

    let cancelled = false;
    async function load() {
      await initializeWorkspace();
      if (cancelled) return;
      const records = await listDocuments({ includeDeleted: true });
      if (cancelled) return;
      try {
        const sharedFragment = inspectShareFragment(window.location.hash);
        setPendingShareFragment(sharedFragment);
      } catch (error) {
        setNotice({ message: error instanceof Error ? error.message : "The shared document could not be opened." });
        clearShareFragment();
      }
      if (cancelled) return;
      setDocuments(records);
      const first = records.find((record) => record.deletedAt === undefined);
      setActiveId(first?.id ?? null);
      setMarkdown(first?.markdown ?? "");
      readyRef.current = true;
      const files = consumePendingImports();
      setReady(true);
      if (files.length) void importFilesRef.current(files);
    }
    void load();
    return () => {
      cancelled = true;
      unsubscribe();
    };
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
    if (!activeDocumentId) {
      setVersions([]);
      return;
    }
    let cancelled = false;
    void listDocumentVersions(activeDocumentId).then((records) => {
      if (!cancelled) setVersions(records);
    });
    return () => {
      cancelled = true;
    };
  }, [activeDocumentId]);

  useEffect(() => {
    if (!ready || !activeDocument || activeDocument.markdown === markdown) return;
    setSaveState("saving");
    const timeout = window.setTimeout(() => void persistActiveDraft(), 400);
    return () => window.clearTimeout(timeout);
  }, [activeDocument, markdown, persistActiveDraft, ready]);

  useEffect(() => {
    if (!ready) return;
    const flushDraft = () => void persistActiveDraftRef.current?.();
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };
    window.addEventListener("pagehide", flushDraft);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flushDraft();
    };
  }, [ready]);

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
        void saveAndDownload();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  useEffect(() => {
    const editor = editorScrollRef.current;
    const preview = previewScrollRef.current;
    if (!editor || !preview) return;
    let lock: "editor" | "preview" | null = null;
    let timer = 0;
    const arm = (source: "editor" | "preview") => {
      lock = source;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        lock = null;
      }, 90);
    };
    const onEditorScroll = () => {
      if (scrollHold.current || lock === "preview") return;
      arm("editor");
      preview.scrollTop = pairedScrollOffset(editor, preview);
    };
    const updateHeading = () => {
      const viewportTop = preview.getBoundingClientRect().top + 80;
      const entries = [...preview.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")].map((heading) => ({
        id: heading.id,
        top: heading.getBoundingClientRect().top,
      }));
      const nextHeading = activeHeadingId(entries, viewportTop);
      setActiveHeadingId((current) => (current === nextHeading ? current : nextHeading));
    };
    const onPreviewScroll = () => {
      updateHeading();
      if (scrollHold.current || lock === "editor") return;
      arm("preview");
      editor.scrollTop = pairedScrollOffset(preview, editor);
    };
    editor.addEventListener("scroll", onEditorScroll, { passive: true });
    preview.addEventListener("scroll", onPreviewScroll, { passive: true });
    updateHeading();
    return () => {
      window.clearTimeout(timer);
      editor.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
    };
  }, [deferredMarkdown, scrollSurfaceVersion]);

  const refreshDocuments = useCallback(async () => {
    setDocuments(await listDocuments({ includeDeleted: true }));
  }, []);

  const createNewDocument = useCallback(async () => {
    if (!readyRef.current) return;
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

  const renameDocument = useCallback((document: DocumentRecord) => {
    setRenameTarget(document);
    setRenameValue(document.title);
  }, []);

  const submitRename = useCallback(async () => {
    const document = renameTarget;
    const title = renameValue.trim();
    if (!document || !title || title === document.title) {
      setRenameTarget(null);
      return;
    }
    const current = document.id === activeId ? await persistActiveDraft() : document;
    if (!current) return;
    const saved = await saveDocument({ ...current, title });
    setDocuments((current) => current.map((item) => (item.id === document.id ? saved : item)));
    setRenameTarget(null);
  }, [activeId, persistActiveDraft, renameTarget, renameValue]);

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

  const deleteForever = useCallback((document: DocumentRecord) => {
    setDeleteTarget(document);
  }, []);

  const confirmDeleteForever = useCallback(async () => {
    if (!deleteTarget) return;
    await permanentlyDeleteDocument(deleteTarget.id);
    await refreshDocuments();
    setDeleteTarget(null);
  }, [deleteTarget, refreshDocuments]);

  const duplicate = useCallback(async (document: DocumentRecord) => {
    const current = document.id === activeId ? await persistActiveDraft() : document;
    if (!current) return;
    const copy = await duplicateDocument(current);
    setDocuments((current) => [copy, ...current]);
    setActiveId(copy.id);
  }, [activeId, persistActiveDraft]);

  const importFiles = useCallback(async (files: File[]) => {
    if (!readyRef.current) {
      addPendingImports(files);
      return;
    }
    for (const file of files) {
      const id = createId();
      const controller = new AbortController();
      abortControllers.current.set(id, controller);
      setJobs((current) => [...current, { id, fileName: file.name, file, state: "queued" }]);
      try {
        if (controller.signal.aborted) throw new ConverterError("cancelled", "Conversion was cancelled.");
        const isImage = file.type.startsWith("image/");
        const useOcr = isImage ? await new Promise<boolean>((resolve) => {
          if (controller.signal.aborted) {
            resolve(false);
            return;
          }
          const onAbort = () => {
            ocrResolution.current = null;
            setOcrTarget(null);
            resolve(false);
          };
          controller.signal.addEventListener("abort", onAbort, { once: true });
          ocrResolution.current = (value) => {
            controller.signal.removeEventListener("abort", onAbort);
            resolve(value);
          };
          setOcrTarget(file);
        }) : false;
        if (controller.signal.aborted) throw new ConverterError("cancelled", "Conversion was cancelled.");
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

  importFilesRef.current = importFiles;

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
    await addDocumentWithAssets(document, assets);
    return document;
  }

  function downloadMarkdown() {
    if (!markdown.trim()) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), `${toFileName(activeDocument?.title ?? getDocumentTitle(markdown))}.md`);
  }

  async function saveAndDownload() {
    const saved = await persistActiveDraft();
    if (!saved) return;
    if (markdown.trim()) downloadMarkdown();
    setNotice({ message: markdown.trim() ? "Saved on this device. Downloaded a copy." : "Saved on this device." });
  }

  async function pasteImages(files: File[]) {
    if (!activeDocument || !files.length) return [];
    const usedNames = new Set(Object.keys(assetUrls).map((name) => name.toLowerCase()));
    const assets = files.map((file) => ({
      id: createId(),
      documentId: activeDocument.id,
      name: getUniqueAssetFileName(file.name || "pasted-image.png", usedNames),
      mimeType: file.type || "image/png",
      blob: file,
    }));
    const inferredTitle = activeDocument.title === "Untitled document" ? getDocumentTitle(markdown) : activeDocument.title;
    const saved = await saveDocument({
      ...activeDocument,
      title: inferredTitle,
      markdown,
      assetIds: [...activeDocument.assetIds, ...assets.map((asset) => asset.id)],
    });
    await putAssets(assets);
    setDocuments((current) => current.map((document) => (document.id === saved.id ? saved : document)));
    setSaveState("saved");
    return assets.map((asset) => `![Pasted image](assets/${asset.name})`);
  }
  pasteImagesRef.current = pasteImages;

  function bindScrollSurface(kind: "editor" | "preview", element: HTMLElement) {
    const ref = kind === "editor" ? editorScrollRef : previewScrollRef;
    if (ref.current === element) return;
    ref.current = element;
    setScrollSurfaceVersion((version) => version + 1);
  }

  function registerEditor(actions: MarkdownEditorActions) {
    editorActions.current = actions;
    const element = actions.scrollElement();
    if (element.clientHeight > 0) bindScrollSurface("editor", element);
  }

  function leaveFocus() {
    setFocusMode(false);
    removeLocalPreference(FOCUS_KEY);
  }

  function toggleFocus() {
    setFocusMode((current) => {
      const next = !current;
      if (next) writeLocalPreference(FOCUS_KEY, "1");
      else removeLocalPreference(FOCUS_KEY);
      return next;
    });
  }

  function updateEditorFontSize(direction: -1 | 1) {
    setEditorFontSize((current) => {
      const index = EDITOR_FONT_SIZES.indexOf(current);
      const next = EDITOR_FONT_SIZES[Math.min(EDITOR_FONT_SIZES.length - 1, Math.max(0, index + direction))] ?? current;
      writeLocalPreference(FONT_SIZE_KEY, String(next));
      return next;
    });
  }

  function toggleLineWrap() {
    setLineWrap((current) => {
      const next = !current;
      if (next) removeLocalPreference(WRAP_KEY);
      else writeLocalPreference(WRAP_KEY, "off");
      return next;
    });
  }

  async function restoreVersion(version: DocumentVersion) {
    if (!activeDocument) return;
    setVersions(await recordDocumentVersion(activeDocument.id, markdown, Date.now(), { force: true }));
    setMarkdown(version.markdown);
    setVersionsOpen(false);
    setNotice({ message: "Restored a local version. The current draft was kept in the version list." });
  }

  async function exportHtml() {
    if (!previewRef.current) return;
    const html = buildStandaloneHtmlDocument({
      title: activeDocument?.title ?? getDocumentTitle(markdown),
      bodyHtml: await prepareStandaloneBodyHtml(previewRef.current),
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
    const usedAssetNames = new Set<string>();
    for (const asset of assets) {
      const fileName = getUniqueAssetFileName(asset.name, usedAssetNames);
      entries[`assets/${fileName}`] = new Uint8Array(await asset.blob.arrayBuffer());
    }
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
    const line = headings.find((heading) => heading.id === id)?.line;
    scrollHold.current = true;
    window.setTimeout(() => {
      scrollHold.current = false;
    }, 450);
    if (line) editorActions.current?.revealLine(line);
    setActiveHeadingId(id);
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePreviewClick(event: React.MouseEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element) || target.closest("a, button")) return;
    const heading = target.closest<HTMLElement>("h1, h2, h3, h4, h5, h6");
    if (!heading?.id) return;
    const line = headings.find((item) => item.id === heading.id)?.line;
    if (!line) return;
    editorActions.current?.moveCursorToLine(line);
    setActiveHeadingId(heading.id);
  }

  function handleWorkspacePaste(event: React.ClipboardEvent<HTMLElement>) {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("input, textarea, select, [contenteditable='true']")) return;
    const files = clipboardImageFiles(event.clipboardData);
    const text = event.clipboardData.getData("text/plain");
    if (!files.length && !text) return;
    event.preventDefault();
    if (files.length) {
      void pasteImages(files).then((snippets) => {
        if (snippets.length) editorActions.current?.insertText(`${snippets.join("\n")}\n`);
      });
      return;
    }
    editorActions.current?.insertText(text);
  }

  const commands = [
      { label: "New document", hint: `${modPrefix}N`, action: () => void createNewDocument() },
      { label: "Open or convert", hint: `${modPrefix}O`, action: () => fileInputRef.current?.click() },
      { label: "Try a sample PDF", action: () => void importFiles([createSamplePdfFile()]) },
      { label: "Find and replace", hint: `${modPrefix}F`, action: () => editorActions.current?.openSearch() },
      { label: focusMode ? "Leave focus layout" : "Focus layout", action: toggleFocus },
      { label: "Show Documents", action: () => { leaveFocus(); setDocumentsOpen(true); } },
      { label: "Show Outline", action: () => { leaveFocus(); setOutlineOpen(true); } },
      { label: "Reset editor and preview split", action: resetSplitRatio },
      { label: "Show local versions", action: () => setVersionsOpen(true) },
      { label: "Save and download", hint: `${modPrefix}S`, action: () => void saveAndDownload() },
      { label: "Copy Markdown", action: () => void copyMarkdown() },
      { label: "Create share link", action: prepareShareLink },
      { label: "Export workspace backup", action: () => void downloadWorkspaceBackup() },
      { label: "Star on GitHub", action: () => window.open(siteConfig.githubUrl, "_blank", "noopener,noreferrer") },
    ];
  const visibleCommands = commands.filter((command) => command.label.toLowerCase().includes(commandSearch.toLowerCase()));

  return (
    <div
      className="workspace-shell flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground"
      {...dragProps}
      onPaste={handleWorkspacePaste}
      onDrop={(event) => {
        const files = Array.from(event.dataTransfer.files);
        if (!files.length) return;
        event.preventDefault();
        resetFileDrag();
        if (!readyRef.current) {
          addPendingImports(files);
          return;
        }
        void importFiles(files);
      }}
    >
      <DropToConvertOverlay active={fileDragActive} />
      <ServiceWorkerRegister onUpdate={(applyUpdate) => setApplyServiceWorkerUpdate(() => applyUpdate)} />
      <section aria-label="File import controls" className="sr-only">
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Open or convert local documents"
        multiple
        className="sr-only"
        accept=".md,.markdown,.txt,.pdf,.docx,.pptx,.xlsx,.html,.htm,.csv,.tsv,.json,.xml,.epub,.zip,.png,.jpg,.jpeg,.webp,.bmp"
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
      </section>

      <header className="flex h-[54px] shrink-0 items-center justify-between overflow-hidden border-b border-border bg-panel px-3 shadow-sm">
        <a href="#main" className="sr-only left-4 top-4 z-[100] rounded-md bg-panel px-4 py-2 text-sm font-semibold text-foreground shadow-lg focus-visible:not-sr-only focus-visible:fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Skip to main content
        </a>
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/" prefetch={false} aria-label="Markdown Lens home" className="mr-2 flex items-center gap-2 rounded-md px-1.5 py-2 font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandIcon className="h-6 w-6" priority />
            <span className="hidden sm:inline">Markdown Lens</span>
          </Link>
          <TopButton icon={PanelLeft} label="Documents" onClick={() => { if (focusMode) { leaveFocus(); setDocumentsOpen(true); return; } setDocumentsOpen((open) => !open); }} active={documentsOpen && !focusMode} expanded={documentsOpen && !focusMode} controls="workspace-pane-documents" className="hidden md:flex" />
          <IconButton icon={FilePlus2} label="New document" onClick={() => void createNewDocument()} disabled={!ready} className="sm:hidden" />
          <TopButton icon={FilePlus2} label="New document" onClick={() => void createNewDocument()} disabled={!ready} className="hidden sm:flex" />
          <TopButton icon={FileUp} label="Open or convert" onClick={() => fileInputRef.current?.click()} disabled={!ready} emphasis className="max-[380px]:gap-0 max-[380px]:px-2" compactAtNarrow />
          <button
            type="button"
            onClick={() => setFormatGuideOpen(true)}
            aria-haspopup="dialog"
            className="hidden rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline"
          >
            File types
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("hidden items-center gap-1.5 px-2 text-xs md:flex", saveState === "error" || workspaceStorage.mode === "memory" ? "text-amber-400" : "text-muted-foreground")}>
            {saveState === "saving" ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : saveState === "error" || workspaceStorage.mode === "memory" ? <HardDrive aria-hidden="true" className="h-3.5 w-3.5" /> : <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-accent" />}
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
              className="flex h-9 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Install</span>
            </button>
          ) : null}
          <button type="button" onClick={() => setCommandOpen(true)} aria-haspopup="dialog" className="hidden h-9 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex">
            <Search className="h-3.5 w-3.5" /> <span>Commands</span><kbd>{modPrefix}K</kbd>
          </button>
          <IconButton icon={theme === "dark" ? Sun : Moon} label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} />
          <GithubStarLink variant="nav" className="h-9 px-2.5 text-xs" />
          <IconButton icon={Command} label="Open commands" hasPopup="dialog" onClick={() => setCommandOpen(true)} className="lg:hidden" />
        </div>
      </header>

      {ready ? (
      <>
      <div role="region" aria-label="Workspace pane navigation" className="lg:hidden">
      <nav className="flex h-11 shrink-0 items-center border-b border-border px-2" role="tablist" aria-label="Workspace panes">
        {MOBILE_PANES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMobilePane(id)}
            role="tab"
            id={`workspace-pane-tab-${id}`}
            aria-selected={mobilePane === id}
            aria-controls={`workspace-pane-${id}`}
            tabIndex={mobilePane === id ? 0 : -1}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const currentIndex = MOBILE_PANES.findIndex((pane) => pane.id === id);
              const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? MOBILE_PANES.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + MOBILE_PANES.length) % MOBILE_PANES.length;
              const nextPane = MOBILE_PANES[nextIndex].id;
              setMobilePane(nextPane);
              event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[role="tab"][data-pane="${nextPane}"]`)?.focus();
            }}
            data-pane={id}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              mobilePane === id && "bg-accent/10 text-accent",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <aside
          id="workspace-pane-documents"
          role={mobilePane === "documents" ? "tabpanel" : "complementary"}
          aria-labelledby={mobilePane === "documents" ? "workspace-pane-tab-documents" : undefined}
          className={cn(
            "workspace-rail z-30 w-[260px] shrink-0 flex-col border-r border-border bg-background 2xl:w-[300px]",
            railDisplay(documentsOpen && !focusMode, mobilePane === "documents"),
            mobilePane === "documents" && "absolute inset-y-0 left-0 w-full max-w-[340px] shadow-2xl lg:static lg:w-[260px] lg:max-w-none lg:shadow-none 2xl:w-[300px]",
          )}
          aria-label="Documents"
        >
          <RailHeader
            label={showTrash ? "Trash" : "Documents"}
            onClose={() => {
              setDocumentsOpen(false);
              setMobilePane((pane) => (pane === "documents" ? "editor" : pane));
            }}
          />
          <div className="border-b border-border p-2.5">
            <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-muted-foreground focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
              <Search className="h-3.5 w-3.5" />
              <input aria-label="Search documents" value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Search documents" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {filteredDocuments.length ? (
              filteredDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  query={documentSearch}
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
              <DocumentListEmpty
                showTrash={showTrash}
                query={documentSearch}
                onCreate={() => void createNewDocument()}
                onOpen={() => fileInputRef.current?.click()}
              />
            )}
          </div>
          <div className="border-t border-border p-2">
            <button type="button" onClick={() => setShowTrash((current) => !current)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {showTrash ? <BookOpen className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
              {showTrash ? "Back to documents" : "Trash"}
            </button>
          </div>
          <div className="border-t border-border p-2">
            <button type="button" onClick={() => void importFiles([createSamplePdfFile()])} className="flex min-h-11 w-full items-center justify-center rounded-md border border-border px-2.5 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Try a sample PDF
            </button>
          </div>
          <ImportJobs jobs={jobs} onCancel={(id) => abortControllers.current.get(id)?.abort()} onRetry={(file) => void importFiles([file])} onClear={() => setJobs((current) => current.filter((job) => job.state === "running" || job.state === "queued"))} />
        </aside>

        <main id="main" ref={centralRef} className={cn("flex min-w-0 flex-1 flex-col", mobilePane === "documents" || mobilePane === "outline" ? "hidden lg:flex" : "flex")}>
          <h1 className="sr-only">Markdown editor workspace</h1>
          {activeDocument && (activeDocument.conversion?.warnings.length ?? 0) > 0 && !dismissedWarningIds.has(activeDocument.id) ? (
            <ConversionWarningBanner
              count={activeDocument.conversion?.warnings.length ?? 0}
              onReview={() => setReportOpen(true)}
              onDismiss={() => setDismissedWarningIds((current) => new Set(current).add(activeDocument.id))}
            />
          ) : null}
          <div
            className="hidden min-h-0 flex-1 lg:grid"
            style={{ gridTemplateColumns: `${splitRatio}fr 7px ${100 - splitRatio}fr` }}
          >
            <WorkspacePanel label="Markdown" icon={FileText} detail="Local source">
              <MarkdownEditor value={markdown} theme={theme} fontSize={editorFontSize} lineWrap={lineWrap} onChange={updateMarkdown} onCursorChange={setCursor} onPasteImages={handlePasteImages} onReady={registerEditor} />
            </WorkspacePanel>
            <button
              type="button"
              className="group flex cursor-col-resize items-center justify-center border-x border-border bg-background hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize editor and preview"
              aria-valuemin={30}
              aria-valuemax={70}
              aria-valuenow={Math.round(splitRatio)}
              aria-valuetext={`${Math.round(splitRatio)}% editor, ${Math.round(100 - splitRatio)}% preview`}
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
              <div
                className="h-full overflow-y-auto"
                onClick={handlePreviewClick}
                ref={(node) => {
                  if (!node) return;
                  const publish = () => {
                    if (node.clientHeight > 0) bindScrollSurface("preview", node);
                  };
                  const observer = new ResizeObserver(publish);
                  observer.observe(node);
                  publish();
                  return () => observer.disconnect();
                }}
              >
                <MarkdownPreview markdown={deferredMarkdown} theme={theme} previewRef={previewRef} assetUrls={assetUrls} />
              </div>
            </WorkspacePanel>
          </div>
          <div
            id={`workspace-pane-${mobilePane === "preview" ? "preview" : "editor"}`}
            role="tabpanel"
            aria-labelledby={`workspace-pane-tab-${mobilePane === "preview" ? "preview" : "editor"}`}
            className="min-h-0 flex-1 lg:hidden"
          >
            {mobilePane === "editor" ? (
              <WorkspacePanel label="Markdown" icon={FileText} detail="Local source">
                <MarkdownEditor value={markdown} theme={theme} fontSize={editorFontSize} lineWrap={lineWrap} onChange={updateMarkdown} onCursorChange={setCursor} onPasteImages={handlePasteImages} onReady={registerEditor} />
              </WorkspacePanel>
            ) : (
              <WorkspacePanel label="Preview" icon={Eye} detail="GitHub-style output">
                <div
                  className="h-full overflow-y-auto"
                  onClick={handlePreviewClick}
                  ref={(node) => {
                    if (!node) return;
                    const publish = () => {
                      if (node.clientHeight > 0) bindScrollSurface("preview", node);
                    };
                    const observer = new ResizeObserver(publish);
                    observer.observe(node);
                    publish();
                    return () => observer.disconnect();
                  }}
                >
                  <MarkdownPreview markdown={deferredMarkdown} theme={theme} previewRef={previewRef} assetUrls={assetUrls} />
                </div>
              </WorkspacePanel>
            )}
          </div>
        </main>

        <aside
          id="workspace-pane-outline"
          role={mobilePane === "outline" ? "tabpanel" : "complementary"}
          aria-labelledby={mobilePane === "outline" ? "workspace-pane-tab-outline" : undefined}
          className={cn(
            "workspace-rail z-30 w-[220px] shrink-0 flex-col border-l border-border bg-background 2xl:w-[260px]",
            railDisplay(outlineOpen && !focusMode, mobilePane === "outline"),
            mobilePane === "outline" && "absolute inset-y-0 right-0 w-full max-w-[320px] shadow-2xl lg:static lg:w-[220px] lg:max-w-none lg:shadow-none 2xl:w-[260px]",
          )}
          aria-label="Outline"
        >
          <RailHeader
            label="Outline"
            onClose={() => {
              setOutlineOpen(false);
              setMobilePane((pane) => (pane === "outline" ? "editor" : pane));
            }}
          />
          <nav className="min-h-0 flex-1 overflow-y-auto py-2" aria-label="Document outline">
            {headings.length ? headings.map((heading) => (
              <button key={`${heading.id}-${heading.line}`} type="button" aria-label={`${heading.text}, heading level ${heading.level}`} aria-current={activeHeadingIdState === heading.id ? "location" : undefined} onClick={() => navigateToHeading(heading.id)} className={cn("flex w-full items-start gap-2 border-l-2 border-transparent px-4 py-2 text-left text-xs text-muted-foreground hover:border-accent hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", activeHeadingIdState === heading.id && "border-accent bg-muted text-foreground")} style={{ paddingLeft: `${Math.min(32, 12 + heading.level * 4)}px` }}>
                <span aria-hidden className="mt-px font-mono text-[10px] text-foreground/65">H{heading.level}</span>
                <span className="line-clamp-2 leading-4">{heading.text}</span>
              </button>
            )) : <p className="px-5 py-10 text-center text-xs leading-5 text-muted-foreground">Add Markdown headings to build an outline.</p>}
          </nav>
          <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>{headings.length} heading{headings.length === 1 ? "" : "s"}</span>
              {activeDocument?.conversion ? <button type="button" aria-haspopup="dialog" onClick={() => setReportOpen(true)} className="font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Conversion report</button> : null}
            </div>
          </div>
        </aside>
      </div>

      <footer className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-3 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-3">
          {!documentsOpen ? <IconButton icon={ChevronRight} label="Show Documents" onClick={() => setDocumentsOpen(true)} compact /> : null}
          <span className="hidden items-center gap-1.5 2xl:flex"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-accent" />All documents stay on this device.</span>
          <span>Ln {cursor.line}, Col {cursor.column}</span>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="hidden md:inline">Markdown</span>
          <span className="hidden md:inline" aria-label={`${stats.words.toLocaleString()} words`}>
            {stats.words.toLocaleString()} words
          </span>
          <span className="hidden lg:inline" aria-label={`${stats.characters.toLocaleString()} characters`}>
            {stats.characters.toLocaleString()} chars
          </span>
          <span className="hidden lg:inline" aria-label={`${stats.minutes} minute estimated reading time`}>
            {stats.minutes} min read
          </span>
          {splitRatio !== 50 ? (
            <button
              type="button"
              onClick={resetSplitRatio}
              className="hidden h-7 items-center gap-1.5 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset split
            </button>
          ) : null}
          <button type="button" onClick={toggleFocus} aria-pressed={focusMode} className={cn("h-7 rounded-md px-2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", focusMode && "bg-muted text-foreground")}>Focus</button>
          <span className="hidden items-center sm:flex">
            <button type="button" onClick={() => updateEditorFontSize(-1)} disabled={editorFontSize === EDITOR_FONT_SIZES[0]} aria-label="Decrease font size" className="h-7 rounded-md px-2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40">A−</button>
            <button type="button" onClick={() => updateEditorFontSize(1)} disabled={editorFontSize === EDITOR_FONT_SIZES[EDITOR_FONT_SIZES.length - 1]} aria-label="Increase font size" className="h-7 rounded-md px-2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40">A+</button>
            <button type="button" onClick={toggleLineWrap} aria-pressed={lineWrap} className={cn("h-7 rounded-md px-2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", lineWrap && "bg-muted text-foreground")}>Wrap</button>
          </span>
          <button type="button" onClick={() => setVersionsOpen(true)} aria-haspopup="dialog" className="inline-flex h-7 items-center gap-1 rounded-md px-2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><History aria-hidden="true" className="h-3.5 w-3.5" />Versions</button>
          <span role="status" className={cn("h-1.5 w-1.5 rounded-full", saveState === "saved" ? "bg-accent" : saveState === "saving" ? "bg-amber-400" : "bg-red-400")}>
            <span className="sr-only">{saveState}</span>
          </span>
        </div>
        <div className="relative flex items-center gap-1">
          <button ref={exportToggleRef} type="button" onClick={() => setExportOpen((open) => !open)} aria-haspopup="menu" aria-expanded={exportOpen} aria-controls="export-options-menu" className="flex h-8 items-center gap-1.5 rounded-md border border-accent/55 px-3 font-medium text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Export <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
          <div className="hidden h-8 overflow-hidden rounded-md border border-border xl:flex">
            <QuickExport label=".md" onClick={downloadMarkdown} />
            <QuickExport label=".html" onClick={exportHtml} />
            <QuickExport label=".pdf" onClick={() => window.print()} />
            <QuickExport label="…" onClick={() => setExportOpen(true)} ariaLabel="More export options" />
          </div>
          {exportOpen ? (
            <div
              ref={exportMenuRef}
              id="export-options-menu"
              role="menu"
              aria-label="Export options"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('[role="menuitem"]')) {
                  setExportOpen(false);
                  window.requestAnimationFrame(() => exportToggleRef.current?.focus());
                }
              }}
              onKeyDown={(event) => {
                const items = Array.from(exportMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
                const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
                if (event.key === "Escape") {
                  event.preventDefault();
                  setExportOpen(false);
                  exportToggleRef.current?.focus();
                  return;
                }
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !items.length) return;
                event.preventDefault();
                const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
                items[nextIndex]?.focus();
              }}
              className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 grid w-64 gap-1 rounded-lg border border-border bg-panel p-1.5 shadow-xl"
            >
              <MenuAction icon={Clipboard} label="Copy Markdown" onClick={() => void copyMarkdown()} />
              <MenuAction icon={Download} label="Download .md" onClick={downloadMarkdown} />
              <MenuAction icon={FileDown} label="Export HTML" onClick={exportHtml} />
              {activeDocument?.assetIds.length ? <MenuAction icon={FileArchive} label="Export Markdown + assets" onClick={() => void exportDocumentBundle()} /> : null}
              <MenuAction icon={Share2} label="Create share link" hasPopup="dialog" onClick={prepareShareLink} />
              <MenuAction icon={FileArchive} label="Export workspace backup" onClick={() => void downloadWorkspaceBackup()} />
              <MenuAction icon={ArchiveRestore} label="Restore workspace backup" onClick={() => backupInputRef.current?.click()} />
              <MenuAction icon={FileText} label="Print / save PDF" onClick={() => window.print()} />
            </div>
          ) : null}
          {!outlineOpen ? <IconButton icon={ChevronLeft} label="Show Outline" onClick={() => setOutlineOpen(true)} compact /> : null}
        </div>
      </footer>
      </>
      ) : (
        <WorkspaceSkeleton />
      )}

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
      {versionsOpen ? <VersionsDialog versions={versions} onRestore={(version) => void restoreVersion(version)} onClose={() => setVersionsOpen(false)} /> : null}
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
      {renameTarget ? <RenameDialog value={renameValue} onChange={setRenameValue} onSubmit={() => void submitRename()} onClose={() => setRenameTarget(null)} /> : null}
      {deleteTarget ? <ConfirmDialog title="Delete document permanently?" message={`“${deleteTarget.title}” cannot be recovered after deletion.`} confirmLabel="Delete permanently" onConfirm={() => void confirmDeleteForever()} onClose={() => setDeleteTarget(null)} /> : null}
      {ocrTarget ? <ConfirmDialog title="Run local OCR?" message={`Run English OCR on “${ocrTarget.name}”? The image stays in this browser and is not uploaded.`} confirmLabel="Run OCR" onConfirm={() => { ocrResolution.current?.(true); ocrResolution.current = null; setOcrTarget(null); }} onClose={() => { ocrResolution.current?.(false); ocrResolution.current = null; setOcrTarget(null); }} /> : null}
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true">
      <p role="status" className="sr-only">Loading workspace</p>
      <div aria-hidden="true" className="flex min-h-0 flex-1">
        <div className="hidden w-[260px] shrink-0 border-r border-border p-3 lg:block">
          <div className="h-9 animate-pulse rounded-md bg-muted" />
          <div className="mt-3 space-y-2">
            <div className="h-10 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
        <div className="grid min-w-0 flex-1 lg:grid-cols-2">
          <div className="border-border p-6 lg:border-r">
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-6 space-y-3">
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="hidden p-6 lg:block">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-6 h-8 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-3 w-full animate-pulse rounded bg-muted" />
            <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentListEmpty({ showTrash, query, onCreate, onOpen }: { showTrash: boolean; query: string; onCreate: () => void; onOpen: () => void }) {
  const state = documentListEmptyState(showTrash, query);
  if (state === "trash") return <p className="px-3 py-10 text-center text-xs leading-5 text-muted-foreground">Trash is empty.</p>;
  if (state === "search") return <p className="px-3 py-10 text-center text-xs leading-5 text-muted-foreground">No documents match this search.</p>;
  return (
    <div className="px-3 py-8 text-center">
      <p className="text-xs leading-5 text-muted-foreground">No documents yet.</p>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={onCreate} className="flex min-h-11 items-center justify-center rounded-md bg-accent px-3 text-xs font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">New document</button>
        <button type="button" onClick={onOpen} className="flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open or convert</button>
      </div>
    </div>
  );
}

function RenameDialog({ value, onChange, onSubmit, onClose }: { value: string; onChange: (value: string) => void; onSubmit: () => void; onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="rename-document-title" className="w-full max-w-md rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <h2 id="rename-document-title" className="text-lg font-semibold">Rename document</h2>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <label htmlFor="rename-document-input" className="mt-4 block text-sm font-medium text-foreground">Document name</label>
          <input id="rename-document-input" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring" />
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
            <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Save name</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onClose }: { title: string; message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message" className="w-full max-w-md rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold">{title}</h2>
        <p id="confirm-dialog-message" className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"));
    requestAnimationFrame(() => focusable()[0]?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => previousFocus?.focus());
    };
  }, [onClose]);
  return dialogRef;
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
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="shared-link-consent-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
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
      <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
      <button type="button" onClick={onInspect} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Inspect safely</button>
        </div>
      </div>
    </div>
  );
}

function WorkspacePanel({ label, icon: Icon, detail, children }: { label: string; icon: typeof FileText; detail: string; children: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-panel" aria-label={label}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        <span className="flex items-center gap-2 text-xs font-semibold"><Icon className="h-3.5 w-3.5 text-accent" />{label}</span>
        <span className="text-[11px] text-muted-foreground">{detail}</span>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function DocumentRow({ document, query, active, trashed, onSelect, onRename, onDuplicate, onDelete, onRestore, onDeleteForever }: { document: DocumentRecord; query: string; active: boolean; trashed: boolean; onSelect: () => void; onRename: () => void; onDuplicate: () => void; onDelete: () => void; onRestore: () => void; onDeleteForever: () => void }) {
  const format = documentFormatLabel(document.source);
  const warnings = document.conversion?.warnings.length ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const snippet = documentMatchSnippet(document.markdown, query);
  const actions = trashed
    ? [{ label: "Restore document", onClick: onRestore }, { label: "Delete permanently", onClick: onDeleteForever }]
    : [{ label: "Rename document", onClick: onRename }, { label: "Duplicate document", onClick: onDuplicate }, { label: "Move to Trash", onClick: onDelete }];
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      const items = [...menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []];
      const currentIndex = items.indexOf(window.document.activeElement as HTMLButtonElement);
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[nextIndex]?.focus();
    };
    window.document.addEventListener("pointerdown", close);
    window.document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => {
      window.document.removeEventListener("pointerdown", close);
      window.document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  return (
    <div className={cn("mb-0.5 rounded-md border border-transparent", active && !trashed && "border-accent/45 bg-accent/10")}>
      <div className="flex items-start">
        <button type="button" onClick={onSelect} onDoubleClick={onRename} className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-muted-foreground">{format}</span>
            <span className="min-w-0 flex-1 truncate text-xs">{document.title}</span>
            {warnings > 0 ? <span className="shrink-0 text-[10px] font-medium text-amber-800 dark:text-amber-200" aria-label={`${warnings} conversion warning${warnings === 1 ? "" : "s"}`}>{warnings}</span> : null}
            <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(document.updatedAt)}</span>
          </span>
          {snippet ? <span className="line-clamp-1 pl-6 text-[10px] text-muted-foreground">{snippet.prefix}<mark className="rounded-sm bg-amber-400/35 px-0.5 text-foreground">{snippet.match}</mark>{snippet.suffix}</span> : null}
        </button>
        <button ref={triggerRef} type="button" aria-label={`Actions for ${document.title}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="mr-0.5 mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Ellipsis aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {menuOpen ? (
        <div ref={menuRef} role="menu" aria-label={`Actions for ${document.title}`} className="grid gap-0.5 px-1 pb-1">
          {actions.map((action) => (
            <button key={action.label} type="button" role="menuitem" onClick={() => { setMenuOpen(false); action.onClick(); }} className="flex h-9 items-center rounded-md px-2.5 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{action.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VersionsDialog({ versions, onRestore, onClose }: { versions: readonly DocumentVersion[]; onRestore: (version: DocumentVersion) => void; onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="versions-title" className="w-full max-w-md rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="versions-title" className="text-lg font-semibold">Local versions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Up to four snapshots stay on this device.</p>
          </div>
          <IconButton icon={X} label="Close local versions" onClick={onClose} />
        </div>
        {versions.length ? (
          <ul className="mt-5 max-h-64 space-y-1 overflow-y-auto" aria-label="Saved versions" tabIndex={0}>
            {versions.map((version) => {
              const label = versionTimeLabel(version.savedAt);
              return (
                <li key={version.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span className="text-sm">{label}</span>
                  <button type="button" onClick={() => onRestore(version)} className="min-h-11 rounded-md px-2 text-xs font-medium text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Restore {label}</button>
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-5 text-sm text-muted-foreground">No earlier versions yet. Snapshots appear as you edit.</p>}
      </div>
    </div>
  );
}

function ConversionWarningBanner({ count, onReview, onDismiss }: { count: number; onReview: () => void; onDismiss: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-700/25 bg-amber-500/10 px-3 py-1 text-amber-950 dark:text-amber-100">
      <button type="button" onClick={onReview} className="min-h-11 min-w-0 flex-1 truncate text-left text-xs font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {conversionWarningLabel(count)}
      </button>
      <button type="button" onClick={onDismiss} className="min-h-11 shrink-0 rounded-md px-2 text-xs font-medium hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Dismiss
      </button>
    </div>
  );
}

function ImportJobs({ jobs, onCancel, onRetry, onClear }: { jobs: ImportJob[]; onCancel: (id: string) => void; onRetry: (file: File) => void; onClear: () => void }) {
  if (!jobs.length) return (
    <div className="m-2 border border-dashed border-border p-4 text-center text-xs text-muted-foreground" role="status">
      <FileUp aria-hidden="true" className="mx-auto mb-2 h-4 w-4" />Drop supported files anywhere to import
    </div>
  );
  const finished = jobs.some((job) => job.state === "completed" || job.state === "failed" || job.state === "cancelled");
  return (
    <div className="border-t border-border p-2">
      <ul className="max-h-48 space-y-1.5 overflow-y-auto" aria-label="Conversion jobs" tabIndex={0}>
        {jobs.map((job) => {
          const percent = conversionProgressPercent(job.progress);
          const status = job.error ?? job.progress?.message ?? jobStateLabel(job.state);
          return (
            <li key={job.id} className="border border-border bg-surface p-2.5">
              <div className="flex items-center gap-2 text-xs">
                {job.state === "completed" ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" /> : <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />}
                <span className="min-w-0 flex-1 truncate">{job.fileName}</span>
                {job.state === "running" || job.state === "queued" ? (
                  <button type="button" onClick={() => onCancel(job.id)} aria-label={`Cancel conversion of ${job.fileName}`} className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {job.state === "running" ? <ImportProgress fileName={job.fileName} percent={percent} /> : null}
              <p className={cn("mt-2 line-clamp-2 text-[10px] text-muted-foreground", job.state === "failed" && "text-red-400")} role="status">{status}</p>
              {job.state === "failed" || job.state === "cancelled" ? (
                <button type="button" onClick={() => onRetry(job.file)} aria-label={`Retry conversion of ${job.fileName}`} className="mt-1 min-h-11 rounded-md px-2 text-[10px] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Retry
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between gap-2 px-1 text-[10px] text-muted-foreground">
        <span>{jobs.length} file{jobs.length === 1 ? "" : "s"}</span>
        <button type="button" onClick={onClear} disabled={!finished} className="min-h-11 rounded-md px-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40">Clear finished</button>
      </div>
    </div>
  );
}

function jobStateLabel(state: ImportJob["state"]) {
  if (state === "queued") return "Queued";
  if (state === "running") return "Converting";
  if (state === "completed") return "Done";
  if (state === "cancelled") return "Cancelled";
  return "Failed";
}

function ImportProgress({ fileName, percent }: { fileName: string; percent: number | null }) {
  if (percent === null) {
    return (
      <div className="mt-2 h-1 overflow-hidden bg-muted" role="progressbar" aria-label={`Converting ${fileName}`} aria-busy="true">
        <div className="import-progress-indeterminate h-full bg-accent" />
      </div>
    );
  }
  return (
    <div className="mt-2 h-1 overflow-hidden bg-muted" role="progressbar" aria-label={`Converting ${fileName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}

function CommandPalette({ search, onSearch, commands, onClose }: { search: string; onSearch: (value: string) => void; commands: Array<{ label: string; hint?: string; action: () => void }>; onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedIndex = Math.min(activeIndex, Math.max(commands.length - 1, 0));
  const runCommand = (index: number) => {
    const command = commands[index];
    if (!command) return;
    command.action();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Command palette" className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-panel shadow-2xl">
        <label className="flex h-12 items-center gap-3 border-b border-border px-4"><Command className="h-4 w-4 text-accent" aria-hidden /><span className="sr-only">Search commands</span><input autoFocus value={search} onChange={(event) => { onSearch(event.target.value); setActiveIndex(0); }} aria-controls="command-palette-results" aria-activedescendant={commands[selectedIndex] ? `command-${selectedIndex}` : undefined} onKeyDown={(event) => { if (event.key === "Escape") onClose(); if (!commands.length) return; if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + commands.length) % commands.length); } if (event.key === "Home") { event.preventDefault(); setActiveIndex(0); } if (event.key === "End") { event.preventDefault(); setActiveIndex(commands.length - 1); } if (event.key === "Enter") { event.preventDefault(); runCommand(selectedIndex); } }} placeholder="Type a command…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <div id="command-palette-results" className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox" aria-label="Commands">{commands.length ? commands.map((command, index) => <button key={command.label} id={`command-${index}`} type="button" role="option" aria-selected={index === selectedIndex} onMouseEnter={() => setActiveIndex(index)} onClick={() => runCommand(index)} className={cn("flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", index === selectedIndex && "bg-muted")}><span>{command.label}</span>{command.hint ? <kbd className="text-xs text-muted-foreground">{command.hint}</kbd> : null}</button>) : <p className="px-3 py-8 text-center text-sm text-muted-foreground" role="status">No matching commands.</p>}</div>
      </div>
    </div>
  );
}

function FormatGuide({ onClose }: { onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="formats-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id="formats-title" className="text-lg font-semibold">Local format support</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Files are processed in this browser. Nothing is uploaded.</p></div><IconButton icon={X} label="Close format guide" onClick={onClose} /></div>
        <div className="mt-5 divide-y divide-border border-y border-border">{converterCapabilities.map((capability) => <div key={capability.label} className="grid grid-cols-[120px_1fr] gap-4 py-3 text-sm"><strong>{capability.label}</strong><span className="text-muted-foreground">{capability.extensions}</span></div>)}</div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Legacy DOC, PPT, and XLS files must be exported to their modern formats. PDF and Office layout is inferred and should be reviewed after conversion.</p>
      </div>
    </div>
  );
}

function ConversionReportDialog({ document, onClose }: { document: DocumentRecord; onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  const report = document.conversion!;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="report-title" className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-panel p-5 shadow-2xl">
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
          <a href={siteConfig.githubUrl} target="_blank" rel="noopener noreferrer" aria-label="Inspect or star Markdown Lens on GitHub (opens in a new tab)" className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="share-link-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
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
        <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
        <button type="button" onClick={onCopy} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Copy share link</button>
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
  const dialogRef = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="shared-document-title" className="w-full max-w-lg rounded-lg border border-border bg-panel p-5 shadow-2xl">
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
        <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
        <button type="button" onClick={onOpen} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open as new document</button>
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
        <a href={actionHref} target="_blank" rel="noopener noreferrer" aria-label={`${actionLabel} (opens in a new tab)`} onClick={onClose} className="rounded-md bg-accent px-2.5 py-1 font-medium text-accent-foreground">
          {actionLabel}
        </a>
      ) : actionLabel && onAction ? (
      <button type="button" onClick={onAction} className="rounded-md bg-accent px-2.5 py-1 font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{actionLabel}</button>
      ) : null}
      <button type="button" onClick={onClose} aria-label="Dismiss" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3.5 w-3.5" /></button>
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

function railDisplay(desktopOpen: boolean, mobileOpen: boolean) {
  if (mobileOpen && desktopOpen) return "flex";
  if (mobileOpen) return "flex lg:hidden";
  if (desktopOpen) return "hidden lg:flex";
  return "hidden";
}

function RailHeader({ label, onClose }: { label: string; onClose: () => void }) {
  return <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3"><span className="text-xs font-semibold">{label}</span><IconButton icon={X} label={`Hide ${label}`} onClick={onClose} compact /></header>;
}

function TopButton({ icon: Icon, label, onClick, emphasis, active, expanded, controls, className, compactAtNarrow, disabled }: { icon: typeof FileText; label: string; onClick: () => void; emphasis?: boolean; active?: boolean; expanded?: boolean; controls?: string; className?: string; compactAtNarrow?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={compactAtNarrow ? label : undefined} aria-expanded={expanded} aria-controls={controls} className={cn("inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50", emphasis && "border border-accent/55 text-accent hover:bg-accent/10", active && !emphasis && "bg-muted text-foreground", className)}><Icon aria-hidden="true" className="h-3.5 w-3.5" /><span className={compactAtNarrow ? "max-[380px]:hidden" : undefined}>{label}</span></button>;
}

function IconButton({ icon: Icon, label, hasPopup, onClick, compact, className, disabled }: { icon: typeof FileText; label: string; hasPopup?: "dialog"; onClick: () => void; compact?: boolean; className?: string; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} aria-haspopup={hasPopup} title={label} className={cn("inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50", compact ? "h-11 w-11" : "h-9 w-9", className)}><Icon aria-hidden="true" className={compact ? "h-4 w-4" : "h-4 w-4"} /></button>;
}

function MenuAction({ icon: Icon, label, hasPopup, onClick }: { icon: typeof FileText; label: string; hasPopup?: "dialog"; onClick: () => void }) {
  return <button type="button" role="menuitem" tabIndex={-1} aria-haspopup={hasPopup} onClick={() => { onClick(); }} className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Icon aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />{label}</button>;
}

function QuickExport({ label, onClick, ariaLabel }: { label: string; onClick: () => void; ariaLabel?: string }) {
  return <button type="button" onClick={onClick} aria-label={ariaLabel} className="min-w-12 border-r border-border px-2.5 font-mono text-[10px] text-muted-foreground last:border-r-0 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">{label}</button>;
}

function PanelLoading({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{label}</div>;
}

function relativeTime(timestamp: number) {
  const difference = Date.now() - timestamp;
  if (difference < 60_000) return "now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)}m`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}
