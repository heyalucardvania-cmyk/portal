"use client";

import type { ComponentProps } from "react";
import {
  FieldError as FieldErrorPrimitive,
  Label as LabelPrimitive,
  Text,
  composeRenderProps,
  type FieldErrorProps,
  type LabelProps,
  type TextProps,
} from "react-aria-components";
import { cx } from "@/lib/cx";

export function Label({ className, ...props }: LabelProps) {
  return (
    <LabelPrimitive
      {...props}
      className={cx("text-sm font-medium text-zinc-950 dark:text-zinc-50", className)}
    />
  );
}

export function FieldError({ className, ...props }: FieldErrorProps) {
  return (
    <FieldErrorPrimitive
      {...props}
      className={composeRenderProps(className, (className) =>
        cx("text-sm text-red-600 dark:text-red-400", className),
      )}
    />
  );
}

export function Fieldset({
  className,
  ...props
}: ComponentProps<"fieldset">) {
  return <fieldset className={cx("space-y-4", className)} {...props} />;
}

export function Description({ className, ...props }: TextProps) {
  return (
    <Text
      {...props}
      slot="description"
      className={cx("text-sm text-zinc-500 dark:text-zinc-400", className)}
    />
  );
}
