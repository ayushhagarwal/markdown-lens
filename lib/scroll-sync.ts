export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

export function pairedScrollOffset(source: ScrollMetrics, target: Pick<ScrollMetrics, "scrollHeight" | "clientHeight">) {
  const sourceRange = source.scrollHeight - source.clientHeight;
  const targetRange = target.scrollHeight - target.clientHeight;
  if (sourceRange <= 0 || targetRange <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, source.scrollTop / sourceRange));
  return Math.round(ratio * targetRange);
}

export function activeHeadingId(entries: readonly { id: string; top: number }[], viewportTop: number) {
  let active: string | null = null;
  for (const entry of entries) {
    if (entry.top <= viewportTop) active = entry.id;
  }
  return active;
}
