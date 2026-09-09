type IconProps = { className?: string };

export function IconScorer({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 9V4M12 4l-2 2M12 4l2 2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconAssist({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12c2-4 6-4 8 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconGoalsAssists({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="11" cy="12" r="5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M17 8v8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconRating({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 18V11M12 18V6M18 18v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconAttendance({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 9h16M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconKeeper({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Simple glove outline */}
      <path
        d="M8 11V7.5a1.5 1.5 0 0 1 3 0V11M11 11V6.5a1.5 1.5 0 0 1 3 0V11M14 11V8a1.5 1.5 0 0 1 3 0v5.5c0 3-2 5.5-5 5.5h-1c-2.5 0-4-1.5-4-4V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
