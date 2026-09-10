import type { ButtonHTMLAttributes } from "react";
import { softControlClassName } from "./softControl";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

/** Soft-brand secondary action as a native button. */
export function SoftButton({ className, type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      {...props}
      className={
        className ? `${softControlClassName} ${className}` : softControlClassName
      }
    />
  );
}
