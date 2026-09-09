export type LinkifySegment =
  | { type: "text"; value: string }
  | { type: "link"; href: string; value: string };

/** Split plain text into text / http(s) link segments for safe React rendering. */
export function linkifySegments(text: string): LinkifySegment[] {
  if (!text) return [];

  const pattern = /https?:\/\/[^\s<]+/gi;
  const segments: LinkifySegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const raw = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    // Trailing punctuation is usually not part of the URL.
    let href = raw;
    let trailing = "";
    while (/[.,;:!?)"'\]]$/.test(href)) {
      trailing = href.slice(-1) + trailing;
      href = href.slice(0, -1);
    }

    if (href) {
      segments.push({ type: "link", href, value: href });
    }
    if (trailing) {
      segments.push({ type: "text", value: trailing });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}
