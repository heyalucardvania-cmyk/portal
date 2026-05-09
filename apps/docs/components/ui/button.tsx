"use client";

import {
  Button as ButtonPrimitive,
  composeRenderProps,
  type ButtonProps,
} from "react-aria-components";
import { cx } from "@/lib/cx";

export function Button({ className, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      {...props}
      className={composeRenderProps(className, (className) =>
        cx(
          "inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-950/10 bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white outline-none transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
          className,
        ),
      )}
    />
  );
}
