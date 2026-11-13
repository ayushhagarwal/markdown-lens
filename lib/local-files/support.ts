/** True when the File System Access pickers exist. Safe on the server and in jsdom. */
export function isFileSystemAccessSupported() {
  if (typeof window === "undefined") return false;
  return (
    typeof window.showOpenFilePicker === "function" &&
    typeof window.showSaveFilePicker === "function" &&
    typeof window.showDirectoryPicker === "function"
  );
}
