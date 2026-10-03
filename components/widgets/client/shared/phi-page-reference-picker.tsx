"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { PhiButtonControl } from "../../../controls/phi-button-control";
import { PhiPopoverControl } from "../../../controls/phi-popover-control";
import { PhiTreeSelectControl } from "../../../controls/phi-tree-select-control";
import type { PhiPageReference } from "../../../../types/references";
import type { PhiTreeOption } from "../../../../types/tree";
import { PhiIcon } from "../../../shell/phi-icon";

/** A Page picked to link to: its reference, and what to show for it. */
export type PhiPageReferenceSelection = {
  reference: PhiPageReference;
  title: string;
  path: string;
};

/*
 * The Pages an authoring surface offers to link to.
 *
 * Which Pages those are is the surface's knowledge, not the tool button's: the Builder knows its Area's
 * catalog, and a tool button inside a Widget's authoring knows nothing of the Builder and must not. The
 * surface provides the tree beside the tool labels, so a picker is inside it for the same reason.
 */
const PhiAuthoringPageReferencesContext = createContext<
  readonly PhiTreeOption<PhiPageReferenceSelection>[] | null
>(null);

export function PhiAuthoringPageReferencesProvider({
  options,
  children,
}: {
  options: readonly PhiTreeOption<PhiPageReferenceSelection>[];
  children: ReactNode;
}) {
  return (
    <PhiAuthoringPageReferencesContext.Provider value={options}>
      {children}
    </PhiAuthoringPageReferencesContext.Provider>
  );
}

/** The link button that picks an internal Page. A surface that offers no Pages shows none. */
export function PhiPageReferencePicker({
  ariaLabel = "Select internal Page",
  onSelect,
}: {
  ariaLabel?: string;
  onSelect: (selection: PhiPageReferenceSelection) => void;
}) {
  const options = useContext(PhiAuthoringPageReferencesContext);
  const [open, setOpen] = useState(false);
  if (!options) {
    return null;
  }

  return (
    <PhiPopoverControl
      open={open}
      trigger="click"
      placement="bottomRight"
      onOpenChange={setOpen}
      content={(
        <PhiTreeSelectControl<PhiPageReferenceSelection>
          ariaLabel={ariaLabel}
          placeholder="Select Page"
          options={[...options]}
          popupMatchSelectWidth={320}
          style={{ width: 280 }}
          onChange={(_value, option) => {
            if (!option?.meta) return;
            onSelect(option.meta);
            setOpen(false);
          }}
        />
      )}
    >
      <span style={{ display: "inline-flex" }}>
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={ariaLabel}
          icon={<PhiIcon name="link" size="inherit" />}
          onClick={() => undefined}
        />
      </span>
    </PhiPopoverControl>
  );
}
