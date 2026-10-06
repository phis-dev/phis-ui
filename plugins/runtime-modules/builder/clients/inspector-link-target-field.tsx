"use client";

import { useMemo, useState } from "react";

import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiSegmentedControl } from "../../../../components/controls/phi-segmented-control";
import { PhiSwitchControl } from "../../../../components/controls/phi-switch-control";
import { PhiInspectorFieldRow } from "../../../../components/widgets/inspector-field-row";
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
  landingPage: string;
  externalPlaceholder: string;
  newTab: string;
};

export const PHI_INSPECTOR_LINK_TARGET_DEFAULT_LABELS: PhiInspectorLinkTargetLabels = {
  none: "None",
  page: "Page",
  external: "Address",
  pagePlaceholder: "Select Page",
  landingPage: "(Landing page)",
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
  /**
   * The target as it now stands. `none` is set when the author answered "None" -- the link is gone, not
   * only incomplete -- so what depends on a link can go with it.
   */
  onChange?: (next: PhiLinkTarget | undefined, none?: boolean) => void;
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
    () => buildPhiBuilderPageReferenceTree(state.area, pages, pages, { landing: labels.landingPage }),
    [labels.landingPage, pages, state.area],
  );

  /*
   * The switch stands from the moment the author answers "Address", not only once an address is
   * complete: it is part of the question. Until there is a target to carry it, its answer waits here.
   */
  const [pendingNewTab, setPendingNewTab] = useState(false);
  const newTab = target ? target.newTab === true : pendingNewTab;
  const withNewTab = <TTarget extends PhiLinkTarget>(next: TTarget) =>
    (newTab ? { ...next, newTab: true } : next);

  const changeMode = (nextMode: PhiInspectorLinkTargetMode) => {
    setMode(nextMode);
    setDraftHref("");
    setPendingNewTab(false);
    onChange?.(undefined, nextMode === "none");
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
            ? { kind: "page", reference: nextValue as PhiPageReference }
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

      {/*
        * Only for an address elsewhere. A Page of the Site opens where the reader is, by the client
        * router -- a new tab would leave the Site's own navigation for a second copy of it.
        */}
      {/* A row like every switch in the Inspector: its words on the left, the switch in the control column. */}
      {mode === "external" ? (
        <PhiInspectorFieldRow label={labels.newTab}>
          <PhiFlexControl align="center" style={{ minHeight: "var(--ant-control-height)" }}>
            <PhiSwitchControl
              checked={newTab}
              disabled={disabled || !onChange}
              onChange={(checked) => {
                if (target?.kind !== "external") {
                  setPendingNewTab(checked);
                  return;
                }
                onChange?.(checked ? { ...target, newTab: true } : { ...target, newTab: undefined });
              }}
            />
          </PhiFlexControl>
        </PhiInspectorFieldRow>
      ) : null}
    </PhiFlexControl>
  );
}
