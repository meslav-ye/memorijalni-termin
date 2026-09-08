"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useOptionalBusy } from "@/components/BusyProvider";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Shown while the parent form's server action is pending. */
  pendingLabel?: ReactNode;
};

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
      aria-hidden
    />
  );
}

/**
 * Drives the global top loading bar from this form's pending state.
 * Kept as a sibling of the button (not in the same render that decides
 * the label) so setState does not reset React 19's useFormStatus.
 */
function FormBusySync() {
  const { pending } = useFormStatus();
  const { setBusy } = useOptionalBusy();

  useEffect(() => {
    setBusy(pending);
    return () => setBusy(false);
  }, [pending, setBusy]);

  return null;
}

/**
 * Submit button that disables itself and swaps the label while the parent
 * form's server action runs. Must be rendered inside a <form>.
 *
 * Shows a spinning indicator with the pending label so long actions (e.g.
 * delete match) do not look frozen.
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
    <>
      <FormBusySync />
      <button
        type={type}
        disabled={disabled || pending}
        aria-busy={pending || undefined}
        className={className + (pending ? " cursor-wait opacity-70" : "")}
        {...rest}
      >
        {pending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner />
            <span>{pendingLabel}</span>
          </span>
        ) : (
          children
        )}
      </button>
    </>
  );
}
