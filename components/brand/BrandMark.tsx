type BrandMarkProps = {
  className?: string;
  /** Tailwind text-* color controls stroke via currentColor */
  title?: string;
};

/** Compact 5v5 pitch mark. Stroke follows `currentColor`. */
export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 56 56"
      fill="none"
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect x="10" y="14" width="36" height="28" rx="2.5" stroke="currentColor" strokeWidth="2.5" />
      <line x1="28" y1="14" x2="28" y2="42" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="28" cy="28" r="5" stroke="currentColor" strokeWidth="2.5" />
      <rect x="10" y="22" width="5" height="12" stroke="currentColor" strokeWidth="2" />
      <rect x="41" y="22" width="5" height="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
