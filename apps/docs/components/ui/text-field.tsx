"use client";

import {
  TextField as TextFieldPrimitive,
  composeRenderProps,
  type TextFieldProps,
} from "react-aria-components";
import { cx } from "@/lib/cx";

export function TextField({ className, ...props }: TextFieldProps) {
  return (
    <TextFieldPrimitive
      data-slot="control"
      className={composeRenderProps(className, (className) =>
        cx("space-y-1.5", className),
      )}
      {...props}
    />
  );
}
