export function clipboardImageFiles(data: DataTransfer | null) {
  if (!data) return [];
  const fromFiles = [...data.files].filter((file) => file.type.startsWith("image/"));
  if (fromFiles.length) return fromFiles;
  return [...data.items].flatMap((item) => {
    if (item.kind !== "file" || !item.type.startsWith("image/")) return [];
    const file = item.getAsFile();
    return file ? [file] : [];
  });
}
