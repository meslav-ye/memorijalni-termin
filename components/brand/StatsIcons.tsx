type IconProps = { className?: string };

/** Best scorer — ball into a goal mouth (not just ball+arrow). */
export function IconScorer({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* Goal frame */}
      <path
        d="M3 19V7h18v12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 7h18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      {/* Net hint */}
      <path
        d="M7 7v5M12 7v5M17 7v5M3 12h18"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* Ball */}
      <circle cx="12" cy="16.5" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 13.25v6.5M9.4 15.1l5.2 2.8M9.4 18.9l5.2-2.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAssist({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="18" cy="12" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8.2 12c2.2-4.2 5.4-4.2 7.6 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Most points (G+A) — ball + assist arc with a clear plus. */
export function IconGoalsAssists({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="13" r="4.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9 9.5v7M6.4 11.4l5.2 3.2M6.4 15.6l5.2-3.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M13.2 12.2c1.6-2.8 3.2-3.4 4.4-3.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M18.5 14.5v5M16 17h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconRating({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 19V10M12 19V5M19 19v-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconAttendance({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.5 9.5h17M9 3.5v4M15 3.5v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14.5" r="1.75" fill="currentColor" />
    </svg>
  );
}

export function IconKeeper({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
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
