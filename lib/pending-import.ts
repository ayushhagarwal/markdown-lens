let pendingImports: File[] = [];

export function stagePendingImports(files: File[]) {
  pendingImports = files.filter((file) => file.size >= 0);
}

export function addPendingImports(files: File[]) {
  pendingImports = [...pendingImports, ...files];
}

export function consumePendingImports() {
  const files = pendingImports;
  pendingImports = [];
  return files;
}
