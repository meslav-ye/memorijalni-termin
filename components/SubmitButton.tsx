"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Shown while the parent form's server action is pending. */
  pendingLabel?: ReactNode;
};

/**
 * Submit button that disables itself and swaps the label while the parent
 * form's server action runs. Must be rendered inside a <form>.
 *
 * Intentionally does NOT drive BusyProvider: calling setState (via context)
 * from the same tree that reads useFormStatus can reset `pending` to false
 * (React 19), so the button never shows its loading label.
 */
export function SubmitButton({
  children,
  pendingLabel = "…",
  className = "",
  disabled,
  type = "submit",
  ...rest
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={
        className + (pending ? " cursor-wait opacity-70" : "")
      }
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
