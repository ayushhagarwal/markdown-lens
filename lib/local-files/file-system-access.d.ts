// Minimal ambient types for the File System Access API (Chromium only).
// TypeScript's DOM lib covers the handles themselves but not the pickers or
// the permission methods, so they are declared here as optional members.

type FileSystemPermissionMode = "read" | "readwrite";

interface FileSystemHandlePermissionDescriptor {
  mode?: FileSystemPermissionMode;
}

interface FileSystemHandle {
  queryPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FilePickerOptions {
  id?: string;
  startIn?: FileSystemHandle | "desktop" | "documents" | "downloads";
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
}

interface OpenFilePickerOptions extends FilePickerOptions {
  multiple?: boolean;
}

interface SaveFilePickerOptions extends FilePickerOptions {
  suggestedName?: string;
}

interface DirectoryPickerOptions {
  id?: string;
  mode?: FileSystemPermissionMode;
  startIn?: FileSystemHandle | "desktop" | "documents" | "downloads";
}

interface Window {
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}
