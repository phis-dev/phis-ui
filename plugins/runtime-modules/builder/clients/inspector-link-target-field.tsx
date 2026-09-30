"use client";

import { useMemo, useState } from "react";

import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiSegmentedControl } from "../../../../components/controls/phi-segmented-control";
import { PhiSwitchControl } from "../../../../components/controls/phi-switch-control";
import { PhiTextControl } from "../../../../components/controls/phi-text-control";
import { PhiTreeSelectControl } from "../../../../components/controls/phi-tree-select-control";
import {
  isPhiStorableExternalHref,
  readPhiLinkTarget,
  type PhiLinkTarget,
  type PhiPageReference,
} from "../../../../types/references";
import { buildPhiBuilderPageReferenceTree } from "../page-reference-tree";
import type { PhiPageReferenceSelection } from "../../../../components/widgets/client/shared/phi-page-reference-picker";
import { usePhiBuilderOfferedPageCatalog } from "../use-offered-page-catalog";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";

export type PhiInspectorLinkTargetLabels = {
  none: string;
  page: string;
  external: string;
  pagePlaceholder: string;
  externalPlaceholder: string;
  newTab: string;
};

export const PHI_INSPECTOR_LINK_TARGET_DEFAULT_LABELS: PhiInspectorLinkTargetLabels = {
  none: "None",
  page: "Page",
  external: "Address",
  pagePlaceholder: "Select Page",
  externalPlaceholder: "https://",
  newTab: "Open in a new tab",
};

type PhiInspectorLinkTargetMode = "none" | "page" | "external";

/**
 * One link, chosen rather than typed, with the two answers it may have kept apart.
 *
 * **The mode is held here and the value is not.** A target is written only once it is one: a Page with
 * nothing picked yet and a half-typed address are both states somebody is passing through, and storing
 * them would put a target in the tree that resolves to nothing, index a reference that is not one, and
 * draw a dead link on the page between two keystrokes. So the segmented control remembers what the
 * author is answering, and the config gets a value when the answer is complete -- or `undefined`, which
 * is a Widget with no link at all.
 *
 * Switching modes drops what the other one held rather than keeping it aside. A hidden address that
 * returns when somebody flips back is a value nobody can see and nobody agreed to, and `REFERENCES.md`
 * has no shape for a target that is two things at once.
 */
export function PhiInspectorLinkTargetFieldControl({
  value,
  disabled,
  labels = PHI_INSPECTOR_LINK_TARGET_DEFAULT_LABELS,
  onChange,
}: {
  value: unknown;
  disabled?: boolean;
  labels?: PhiInspectorLinkTargetLabels;
  onChange?: (next: PhiLinkTarget | undefined) => void;
}) {
  const target = readPhiLinkTarget(value);
  const [mode, setMode] = useState<PhiInspectorLinkTargetMode>(target?.kind ?? "none");
  /*
   * The address as it is being typed, which the stored value cannot be: a target is only written when
   * it is storable, so reading the box back out of config would erase every character before the first
   * one that makes a whole address.
   */
  const [draftHref, setDraftHref] = useState(target?.kind === "external" ? target.href : "");

  const state = usePhiDeveloperBuilderStateValue("public", (current) => current);
  const pages = usePhiBuilderOfferedPageCatalog(state, state.area);
  const options = useMemo(
    () => buildPhiBuilderPageReferenceTree(state.area, pages, pages),
    [pages, state.area],
  );

  const newTab = target?.newTab === true;
  const withNewTab = <TTarget extends PhiLinkTarget>(next: TTarget) =>
    (newTab ? { ...next, newTab: true } : next);

  const changeMode = (nextMode: PhiInspectorLinkTargetMode) => {
    setMode(nextMode);
    setDraftHref("");
    onChange?.(undefined);
  };

  return (
    <PhiFlexControl vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
      <PhiSegmentedControl<PhiInspectorLinkTargetMode>
        value={mode}
        block
        disabled={disabled || !onChange}
        options={[
          { value: "none", label: labels.none },
          { value: "page", label: labels.page },
          { value: "external", label: labels.external },
        ]}
        onChange={changeMode}
      />

      {mode === "page" ? (
        <PhiTreeSelectControl<PhiPageReferenceSelection>
          value={target?.kind === "page" ? target.reference : null}
          options={options}
          placeholder={labels.pagePlaceholder}
          disabled={disabled || !onChange}
          allowClear
          style={{ width: "100%" }}
          onChange={(nextValue) => onChange?.(nextValue
            ? withNewTab({ kind: "page", reference: nextValue as PhiPageReference })
            : undefined)}
        />
      ) : null}

      {mode === "external" ? (
        <PhiTextControl
          value={draftHref}
          inputType="url"
          placeholder={labels.externalPlaceholder}
          disabled={disabled || !onChange}
          style={{ width: "100%" }}
          onChange={(nextValue) => {
            const href = nextValue ?? "";
            setDraftHref(href);
            onChange?.(isPhiStorableExternalHref(href)
              ? withNewTab({ kind: "external", href: href.trim() })
              : undefined);
          }}
        />
      ) : null}

      {target ? (
        <PhiSwitchControl
          checked={newTab}
          label={labels.newTab}
          disabled={disabled || !onChange}
          onChange={(checked) => onChange?.(checked
            ? { ...target, newTab: true }
            : { ...target, newTab: undefined })}
        />
      ) : null}
    </PhiFlexControl>
  );
}
