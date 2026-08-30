import type { ReactNode } from "react";

export function isRenderablePhiNode(value: ReactNode | undefined) {
  return !(
    value === null ||
    value === undefined ||
    value === false ||
    (Array.isArray(value) && value.length === 0)
  );
}
