"use client";

import type { ReactNode } from "react";
import { Breadcrumb } from "antd";

export type PhiBreadcrumbControlItem = {
  key?: string;
  title: ReactNode;
  /** Where the item leads; an item without one is text. */
  href?: string;
};

export type PhiBreadcrumbControlProps = {
  items: readonly PhiBreadcrumbControlItem[];
  /** What stands between two items. The primitive's slash when absent. */
  separator?: ReactNode;
};

/** Where the reader is, as the steps that lead there. */
export function PhiBreadcrumbControl({ items, separator }: PhiBreadcrumbControlProps) {
  return <Breadcrumb items={[...items]} separator={separator} />;
}
