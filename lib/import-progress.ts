export function conversionProgressPercent(progress?: { current?: number; total?: number }) {
  if (progress?.current == null || progress.total == null || progress.total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((progress.current / progress.total) * 100)));
}
