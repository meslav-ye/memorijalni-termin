import Link from "next/link";
import type { ComponentProps } from "react";
import { softControlClassName } from "./softControl";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
};

/** Soft-brand navigation / secondary action as a Next.js Link. */
export function SoftLink({ className, ...props }: Props) {
  return (
    <Link
      {...props}
      className={
        className ? `${softControlClassName} ${className}` : softControlClassName
      }
    />
  );
}
