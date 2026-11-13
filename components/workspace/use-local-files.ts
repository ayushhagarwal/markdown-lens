"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FolderPanelStatus } from "@/components/workspace/folder-panel";
import {
  checkDiskState,
  findFolderFile,
  findLinkByHandle,
  forgetFolder,
  getRememberedFolder,
  hasDiskChanged,
  hasUnsavedDiskChanges,
  isFileSystemAccessSupported,
  linkDocument,
  listLinks,
  localFileErrorMessage,
  LocalFileError,
  openLocalFiles,
  pickFolder,
  pruneLinks,
  queryAccess,
  readFileHandle,
  rememberFolder,
  reloadLinkedDocument,
  requestAccess,
  saveLinkedDocument,
  saveTextAs,
  titleFromFileName,
  unlinkDocument,
  updateLinkSync,
  walkFolder,
  type FolderNode,
  type LocalFileContents,
  type LocalFileLink,
} from "@/lib/local-files";
import { MAX_INTERACTIVE_MARKDOWN_CHARACTERS } from "@/lib/markdown-limits";
import { saveDocument } from "@/lib/workspace/db";
import { createDocumentRecord, type DocumentRecord } from "@/lib/workspace/types";

const subscribeNever = () => () => undefined;
const unsupportedOnServer = () => false;

type Notify = (notice: { message: string; tone?: "info" | "success" | "error" }) => void;

export type LocalFolderState = {
  handle: FileSystemDirectoryHandle;
  name: string;
  nodes: FolderNode[];
  truncated: boolean;
  status: FolderPanelStatus;
};

export type DiskConflict = { link: LocalFileLink };

type UseLocalFilesOptions = {
  ready: boolean;
  documents: readonly DocumentRecord[];
  activeDocumentId: string | undefined;
  markdown: string;
  /** Flushes the editor into the workspace. Resolves null when the save failed. */
  persistActiveDraft: () => Promise<DocumentRecord | null | undefined>;
  /** Adds (when new) or refreshes the document in the app, then makes it active. */
  showDocument: (document: DocumentRecord, isNew: boolean) => Promise<void>;
  /** Replaces the active editor content with text read from disk. */
  replaceActiveMarkdown: (text: string) => void;
  notify: Notify;
};

/**
 * Connects workspace documents to real files through the File System Access
 * API: open files and folders, save in place, and notice external changes.
 * In browsers without the API `supported` stays false and nothing else runs.
 */
export function useLocalFiles({
  ready,
  documents,
  activeDocumentId,
  markdown,
  persistActiveDraft,
  showDocument,
  replaceActiveMarkdown,
  notify,
}: UseLocalFilesOptions) {
  const supported = useSyncExternalStore(subscribeNever, isFileSystemAccessSupported, unsupportedOnServer);
  const [links, setLinks] = useState<Record<string, LocalFileLink>>({});
  const [folder, setFolder] = useState<LocalFolderState | null>(null);
  const [conflict, setConflict] = useState<DiskConflict | null>(null);

  const documentsRef = useRef(documents);
  const markdownRef = useRef(markdown);
  const activeIdRef = useRef(activeDocumentId);
  const linksRef = useRef(links);
  const folderRef = useRef(folder);
  // Async handlers read the latest values without being recreated on every keystroke.
  useLayoutEffect(() => {
    documentsRef.current = documents;
    markdownRef.current = markdown;
    activeIdRef.current = activeDocumentId;
    linksRef.current = links;
    folderRef.current = folder;
  });
  const announcedDiskChange = useRef(new Map<string, number>());

  const setLink = useCallback((link: LocalFileLink) => {
    setLinks((current) => ({ ...current, [link.documentId]: link }));
  }, []);
  const dropLink = useCallback((documentId: string) => {
    setLinks((current) => {
      if (!(documentId in current)) return current;
      const next = { ...current };
      delete next[documentId];
      return next;
    });
  }, []);
  const reportError = useCallback((error: unknown) => {
    notify({ message: localFileErrorMessage(error), tone: "error" });
  }, [notify]);

  const loadTree = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setFolder((current) => ({
      handle,
      name: handle.name,
      nodes: current?.handle === handle ? current.nodes : [],
      truncated: current?.handle === handle ? current.truncated : false,
      status: "loading",
    }));
    try {
      const tree = await walkFolder(handle);
      setFolder({ handle, name: tree.name, nodes: tree.children, truncated: tree.truncated, status: "ready" });
    } catch (error) {
      const denied = error instanceof LocalFileError && error.code === "permission-denied";
      setFolder({ handle, name: handle.name, nodes: [], truncated: false, status: "needs-permission" });
      if (!denied) reportError(error);
    }
  }, [reportError]);

  // Restore links and the remembered folder once the workspace has loaded.
  useEffect(() => {
    if (!ready || !supported) return;
    let cancelled = false;
    void (async () => {
      try {
        await pruneLinks(documentsRef.current.map((document) => document.id));
        const stored = await listLinks();
        if (cancelled) return;
        setLinks(Object.fromEntries(stored.map((link) => [link.documentId, link])));
        const remembered = await getRememberedFolder();
        if (cancelled || !remembered) return;
        if ((await queryAccess(remembered.handle, "read")) === "granted") {
          if (!cancelled) await loadTree(remembered.handle);
        } else if (!cancelled) {
          setFolder({ handle: remembered.handle, name: remembered.name, nodes: [], truncated: false, status: "needs-permission" });
        }
      } catch {
        // Links are a convenience; the workspace itself is unaffected.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTree, ready, supported]);

  /** Opens file contents as a workspace document, reusing the document already linked to that file. */
  const openContents = useCallback(async (
    handle: FileSystemFileHandle,
    contents: LocalFileContents,
    folderPath?: string,
  ) => {
    if (contents.text.length > MAX_INTERACTIVE_MARKDOWN_CHARACTERS) {
      notify({ message: `“${contents.name}” is too large to edit here.`, tone: "error" });
      return;
    }
    const saved = await persistActiveDraft();
    if (saved === null) return;
    const existingLink = await findLinkByHandle(handle);
    const existing = existingLink
      ? (saved?.id === existingLink.documentId ? saved : documentsRef.current.find((document) => document.id === existingLink.documentId))
      : undefined;
    if (existingLink && existing) {
      let next = existing;
      if (hasDiskChanged(existingLink, contents) && existing.markdown !== contents.text) {
        if (hasUnsavedDiskChanges(existingLink, existing.markdown)) {
          notify({ message: `“${contents.name}” changed on disk and has unsaved edits here. Saving will ask before overwriting.`, tone: "info" });
        } else {
          next = await saveDocument({ ...existing, markdown: contents.text });
          const updated = await updateLinkSync(existing.id, contents);
          if (updated) setLink(updated);
        }
      }
      await showDocument(next, false);
      return;
    }
    const document = createDocumentRecord({
      title: titleFromFileName(contents.name),
      markdown: contents.text,
      source: { name: contents.name, mimeType: "text/markdown", size: contents.size, lastModified: contents.lastModified },
    });
    await showDocument(document, true);
    setLink(await linkDocument(document.id, handle, contents, folderPath ? { folderPath } : undefined));
  }, [notify, persistActiveDraft, setLink, showDocument]);

  const openFiles = useCallback(async () => {
    try {
      const files = await openLocalFiles();
      for (const file of files) await openContents(file.handle, file);
    } catch (error) {
      reportError(error);
    }
  }, [openContents, reportError]);

  const openFolder = useCallback(async () => {
    try {
      const handle = await pickFolder({ mode: "readwrite" });
      if (!handle) return;
      await loadTree(handle);
      await rememberFolder(handle);
    } catch (error) {
      reportError(error);
    }
  }, [loadTree, reportError]);

  const openFolderFile = useCallback(async (path: string) => {
    const current = folderRef.current;
    const node = current ? findFolderFile(current.nodes, path) : null;
    if (!node) return;
    try {
      await openContents(node.handle, await readFileHandle(node.handle), path);
    } catch (error) {
      reportError(error);
    }
  }, [openContents, reportError]);

  const refreshFolder = useCallback(async () => {
    const current = folderRef.current;
    if (current) await loadTree(current.handle);
  }, [loadTree]);

  const grantFolderAccess = useCallback(async () => {
    const current = folderRef.current;
    if (!current) return;
    if ((await requestAccess(current.handle, "read")) === "granted") await loadTree(current.handle);
    else notify({ message: `Access to “${current.name}” was not granted.`, tone: "error" });
  }, [loadTree, notify]);

  const closeFolder = useCallback(async () => {
    setFolder(null);
    try {
      await forgetFolder();
    } catch {
      // Nothing to clean up if the handle store is unavailable.
    }
  }, []);

  const saveAs = useCallback(async (document: DocumentRecord, text: string) => {
    const file = await saveTextAs(text, { suggestedName: document.title });
    if (!file) return false;
    const owner = await findLinkByHandle(file.handle);
    if (owner && owner.documentId !== document.id) {
      await unlinkDocument(owner.documentId);
      dropLink(owner.documentId);
    }
    setLink(await linkDocument(document.id, file.handle, { ...file, text }));
    notify({ message: `Saved to ${file.name}.`, tone: "success" });
    return true;
  }, [dropLink, notify, setLink]);

  const writeLinked = useCallback(async (document: DocumentRecord, link: LocalFileLink, text: string, overwrite: boolean) => {
    const result = await saveLinkedDocument(link, text, { overwrite });
    if (result.status === "saved") {
      setLink(result.link);
      notify({ message: `Saved to ${result.link.name}.`, tone: "success" });
      return true;
    }
    if (result.status === "conflict") {
      setConflict({ link });
      return false;
    }
    if (result.status === "permission-required") {
      notify({
        message: result.access === "denied"
          ? `This browser blocked writing to “${link.name}”. Use Save as to choose a new location.`
          : `Allow access to “${link.name}” and save again.`,
        tone: "error",
      });
      return false;
    }
    notify({ message: `“${link.name}” was moved or deleted. Choose where to save it.`, tone: "info" });
    return saveAs(document, text);
  }, [notify, saveAs, setLink]);

  /**
   * Saves the active document to its file, or asks where to save it the first
   * time. Call from a click or key handler so permission prompts are allowed.
   * Resolves true when the text reached the disk.
   */
  const save = useCallback(async (options?: { forceSaveAs?: boolean }) => {
    try {
      const document = await persistActiveDraft();
      if (!document) return false;
      const text = markdownRef.current;
      const link = linksRef.current[document.id];
      if (!link || options?.forceSaveAs) return await saveAs(document, text);
      return await writeLinked(document, link, text, false);
    } catch (error) {
      reportError(error);
      return false;
    }
  }, [persistActiveDraft, reportError, saveAs, writeLinked]);

  const resolveConflict = useCallback(async (choice: "overwrite" | "reload" | "cancel") => {
    const pending = conflict;
    setConflict(null);
    if (!pending || choice === "cancel") return;
    const { link } = pending;
    try {
      if (choice === "overwrite") {
        const document = documentsRef.current.find((item) => item.id === link.documentId);
        if (document && activeIdRef.current === link.documentId) await writeLinked(document, link, markdownRef.current, true);
        return;
      }
      const result = await reloadLinkedDocument(link, { requestAccess: true });
      if (result.status !== "reloaded") {
        notify({ message: `“${link.name}” could not be read from disk.`, tone: "error" });
        return;
      }
      setLink(result.link);
      if (activeIdRef.current === link.documentId) replaceActiveMarkdown(result.text);
      notify({ message: `Reloaded ${link.name} from disk. Your previous draft is in Versions.`, tone: "success" });
    } catch (error) {
      reportError(error);
    }
  }, [conflict, notify, replaceActiveMarkdown, reportError, setLink, writeLinked]);

  /** Removes the link for a permanently deleted document. The file on disk is untouched. */
  const forgetDocument = useCallback(async (documentId: string) => {
    dropLink(documentId);
    try {
      await unlinkDocument(documentId);
    } catch {
      // The link is pruned on the next load.
    }
  }, [dropLink]);

  /** Stops saving the active document to its file without touching the file. */
  const detachDocument = useCallback(async (documentId: string) => {
    const link = linksRef.current[documentId];
    await forgetDocument(documentId);
    if (link) notify({ message: `Disconnected from ${link.name}. The file on disk was not changed.`, tone: "info" });
  }, [forgetDocument, notify]);

  const activeLink = activeDocumentId ? links[activeDocumentId] : undefined;
  const activeLinked = Boolean(activeLink);

  // Pull in external edits when the active linked document is clean; warn when it is not.
  useEffect(() => {
    if (!supported || !activeDocumentId || !activeLinked) return;
    let cancelled = false;
    const check = async () => {
      const link = linksRef.current[activeDocumentId];
      if (!link) return;
      try {
        const disk = await checkDiskState(link);
        if (cancelled || activeIdRef.current !== activeDocumentId || disk.status !== "changed") return;
        if (announcedDiskChange.current.get(activeDocumentId) === disk.lastModified) return;
        announcedDiskChange.current.set(activeDocumentId, disk.lastModified);
        if (hasUnsavedDiskChanges(link, markdownRef.current)) {
          notify({ message: `“${link.name}” changed on disk. Saving will ask before overwriting.`, tone: "info" });
          return;
        }
        const result = await reloadLinkedDocument(link);
        if (cancelled || activeIdRef.current !== activeDocumentId || result.status !== "reloaded") return;
        setLink(result.link);
        if (result.text !== markdownRef.current) {
          replaceActiveMarkdown(result.text);
          notify({ message: `Reloaded ${link.name} from disk.`, tone: "info" });
        }
      } catch {
        // A failed background check is retried on the next focus.
      }
    };
    void check();
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
    // `links` is read through a ref: re-running on every sync would re-check after each save.
  }, [activeDocumentId, activeLinked, notify, replaceActiveMarkdown, setLink, supported]);

  return {
    supported,
    links,
    activeLink,
    /** True when the active linked document differs from what was last read or written on disk. */
    diskDirty: activeLink ? hasUnsavedDiskChanges(activeLink, markdown) : false,
    folder,
    conflict,
    openFiles,
    openFolder,
    openFolderFile,
    refreshFolder,
    grantFolderAccess,
    closeFolder,
    save,
    resolveConflict,
    forgetDocument,
    detachDocument,
  };
}
