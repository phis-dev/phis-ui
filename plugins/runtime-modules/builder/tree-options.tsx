"use client";

import type { ReactNode } from "react";
import type { DataNode } from "antd/es/tree";

import type { PhiTreeOption } from "../../../types/tree";

export function mapPhiTreeOptionsToDataNodes<TMeta = unknown>(
  options: readonly PhiTreeOption<TMeta>[],
  overrides?: {
    renderTitle?: (option: PhiTreeOption<TMeta>) => ReactNode;
    renderIcon?: (option: PhiTreeOption<TMeta>) => ReactNode;
  },
): DataNode[] {
  return options.map((option) => {
    const title = overrides?.renderTitle?.(option) ?? option.label;
    const icon = overrides?.renderIcon?.(option);

    return {
      key: option.value,
      title,
      disabled: option.disabled,
      ...(icon == null ? {} : { icon }),
      ...(option.children?.length ? { children: mapPhiTreeOptionsToDataNodes(option.children, overrides) } : {}),
    };
  });
}
