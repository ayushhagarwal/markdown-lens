export type DocumentListEmptyState = "trash" | "search" | "none";

export function documentListEmptyState(showTrash: boolean, query: string): DocumentListEmptyState {
  if (showTrash) return "trash";
  if (query.trim()) return "search";
  return "none";
}
