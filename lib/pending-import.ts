export type PendingExample = {
  title: string;
  markdown: string;
};

let pendingImports: File[] = [];
let pendingExample: PendingExample | null = null;

export function stagePendingExample(example: PendingExample) {
  pendingExample = { title: example.title, markdown: example.markdown };
}

export function consumePendingExample() {
  const example = pendingExample;
  pendingExample = null;
  return example;
}

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
