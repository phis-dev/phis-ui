"use client";

import type { ReactNode } from "react";
import { Collapse } from "antd";

/**
 * A stack of sections where one is open at a time.
 *
 * What the Theme inspector repeated four times, byte for byte apart from the state it was bound to --
 * and the whole of what it repeated was an undoing. Three `styles` overrides took the panel look back
 * off the primitive: a transparent ground instead of a filled one, and no inline padding on the header
 * or the body. An inspector section is not a panel; it is a heading with things under it, and the box
 * around it belongs to whatever the inspector is already standing in.
 *
 * **One open at a time is the shape, not a prop.** Sections fold so a long inspector stays short, which
 * only works if opening one closes the last. A region of a page that folds independently is the
 * CollapsibleLayout, which owns the primitive's full surface -- this is the narrow case, and it has
 * nothing to decide.
 *
 * It is controlled, because every caller already keeps the open section somewhere it survives a reload,
 * and a Control that also kept its own would give them two answers to the same question.
 */
export type PhiAccordionControlSection = {
  key: string;
  label: ReactNode;
  children: ReactNode;
};

export type PhiAccordionControlProps = {
  sections: readonly PhiAccordionControlSection[];
  /** The open section. An empty string, or a key no section carries, opens none. */
  openSection?: string;
  onOpenSectionChange?: (key: string) => void;
};

export function PhiAccordionControl({
  sections,
  openSection = "",
  onOpenSectionChange,
}: PhiAccordionControlProps) {
  return (
    <Collapse
      accordion
      bordered={false}
      size="small"
      activeKey={openSection}
      // An accordion closes the last section as it opens the next, so the primitive still answers with a
      // list and it is always the one key or none.
      onChange={(keys) => onOpenSectionChange?.(Array.isArray(keys) ? keys[0] ?? "" : String(keys ?? ""))}
      styles={{
        root: { background: "transparent" },
        header: { alignItems: "center", paddingInline: 0 },
        body: { paddingInline: 0 },
      }}
      items={sections.map((section) => ({
        key: section.key,
        label: section.label,
        children: section.children,
      }))}
    />
  );
}
