"use client";

import {
  Input as InputPrimitive,
  composeRenderProps,
  type InputProps,
} from "react-aria-components";
import { cx } from "@/lib/cx";

export function Input({ className, ...props }: InputProps) {
  return (
    <InputPrimitive
      {...props}
      className={composeRenderProps(className, (className) =>
        cx(
          "block w-full rounded-lg border border-zinc-950/10 bg-white/70 px-3 py-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 hover:border-zinc-950/20 focus:border-zinc-950/40 focus:ring-2 focus:ring-zinc-950/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:hover:border-white/20 dark:focus:border-white/30 dark:focus:ring-white/10",
          className,
        ),
      )}
    />
  );
}
