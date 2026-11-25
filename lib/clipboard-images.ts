import { isSafeImageAssetMimeType } from "@/lib/asset-mime";

export function clipboardImageFiles(data: DataTransfer | null) {
  if (!data) return [];
  const fromFiles = [...data.files].filter((file) => isSafeImageAssetMimeType(file.type));
  if (fromFiles.length) return fromFiles;
  return [...data.items].flatMap((item) => {
    if (item.kind !== "file" || !isSafeImageAssetMimeType(item.type)) return [];
    const file = item.getAsFile();
    return file ? [file] : [];
  });
}
