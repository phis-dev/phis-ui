"use client";

import type { ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiCollapseControl } from "./phi-collapse-control";

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
 *
 * **It draws through `PhiCollapseControl`**, the folding sections the Collapsible Layout draws with, so a
 * section's `description` is the same (i) behind its title in both and the click on it folds nothing.
 * What stays here is the undoing: no ground, no inline inset, the size of chrome.
 */
export type PhiAccordionControlSection = {
  key: string;
  label: ReactNode;
  /** What the section is about, behind (i) after its title (`PhiCollapseControlSection.description`). */
  description?: ReactNode;
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
  const { token } = usePhiConfig();
  return (
    <PhiCollapseControl
      accordion
      // The whole row folds, as the primitive's own default did.
      collapsible="row"
      size="small"
      headerClassName="phi-accordion-control__header"
      headerPadding={`${token.paddingXS}px 0`}
      bodyPadding={`0 0 ${token.padding}px`}
      style={{ background: "transparent" }}
      openKeys={openSection ? [openSection] : []}
      // An accordion closes the last section as it opens the next, so the list is always the one key or none.
      onOpenKeysChange={(keys) => onOpenSectionChange?.(keys[0] ?? "")}
      sections={sections}
    />
  );
}
