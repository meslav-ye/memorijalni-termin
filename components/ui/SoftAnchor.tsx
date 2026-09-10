import type { AnchorHTMLAttributes } from "react";
import { softControlClassName } from "./softControl";

type Props = AnchorHTMLAttributes<HTMLAnchorElement>;

/** Soft-brand secondary action as a plain `<a>` (external / download). */
export function SoftAnchor({ className, ...props }: Props) {
  return (
    <a
      {...props}
      className={
        className ? `${softControlClassName} ${className}` : softControlClassName
      }
    />
  );
}
