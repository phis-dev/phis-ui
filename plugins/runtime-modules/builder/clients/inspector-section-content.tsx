"use client";

import { Fragment, type ReactNode } from "react";

export type PhiInspectorSection = {
  key: string;
  title: string;
  children: ReactNode;
};

export function PhiInspectorSectionContent({
  sections,
  sectionKey,
  excludeSectionKeys = [],
}: {
  sections: readonly PhiInspectorSection[];
  sectionKey: string;
  excludeSectionKeys?: readonly string[];
}) {
  const visibleSections = sectionKey === "*"
    ? sections.filter((section) => !excludeSectionKeys.includes(section.key))
    : sections.filter((section) => section.key === sectionKey);

  return visibleSections.map((section) => (
    <Fragment key={section.key}>{section.children}</Fragment>
  ));
}
