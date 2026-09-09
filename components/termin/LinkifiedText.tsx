import { linkifySegments } from "@/lib/domain/linkify";

/** Render plain text with http(s) URLs as safe external links. */
export function LinkifiedText({ text }: { text: string }) {
  const segments = linkifySegments(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-marka underline underline-offset-2 break-all"
          >
            {seg.value}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
  );
}
