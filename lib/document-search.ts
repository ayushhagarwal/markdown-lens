export function documentMatchSnippet(markdown: string, query: string) {
  const needle = query.trim();
  if (!needle) return null;
  const haystack = markdown.replace(/\s+/g, " ").trim();
  const index = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return null;

  const radius = 42;
  const start = Math.max(0, index - radius);
  const end = Math.min(haystack.length, index + needle.length + radius);
  return {
    prefix: `${start > 0 ? "…" : ""}${haystack.slice(start, index)}`,
    match: haystack.slice(index, index + needle.length),
    suffix: `${haystack.slice(index + needle.length, end)}${end < haystack.length ? "…" : ""}`,
  };
}
