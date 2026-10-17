"use client";

import { useState, type ReactNode } from "react";

import { PhiFlexControl } from "../../../controls/phi-flex-control";
import { PhiSegmentedControl } from "../../../controls/phi-segmented-control";
import { PhiSwitchControl } from "../../../controls/phi-switch-control";
import { PhiTextControl } from "../../../controls/phi-text-control";
import { PhiTreeSelectControl } from "../../../controls/phi-tree-select-control";
import type { PhiCmsAreaKey } from "../../../../constants/cms-areas";
import {
  isPhiStorableExternalHref,
  readPhiLinkTarget,
  type PhiLinkTarget,
  type PhiPageReference,
} from "../../../../types/references";
import type { PhiTreeOption } from "../../../../types/tree";
import type { PhiPageReferenceSelection } from "./phi-page-reference-picker";

type PhiLinkTargetMode = "none" | "page" | "external";

export type PhiLinkTargetControlLabels = {
  none: string;
  page: string;
  external: string;
  pagePlaceholder: string;
  externalPlaceholder: string;
  newTab: string;
};

/**
 * One link, chosen rather than typed, with the two answers it may have kept apart (`REFERENCES.md`).
 *
 * **The mode is held here and the value is not.** A target is written only once it is one: a Page with
 * nothing picked yet and a half-typed address are both states somebody is passing through, and storing
 * them would put a target in the config that resolves to nothing, index a reference that is not one, and
 * draw a dead link between two keystrokes. So the segmented control remembers what the author is
 * answering, and the value gets a target when the answer is complete -- or `undefined`, which is no link.
 *
 * Switching modes drops what the other one held rather than keeping it aside. A hidden address that
 * returns when somebody flips back is a value nobody can see and nobody agreed to, and `REFERENCES.md`
 * has no shape for a target that is two things at once.
 *
 * Which Pages it offers is the surface's knowledge: the Builder hands in its Area's catalog, a Form the
 * tree `/api/site/page-references` answered. `area` is written into a Page target where the link leads
 * out of the Area asking -- an Editor Form linking a Public Page.
 */
export function PhiLinkTargetControl({
  value,
  options,
  labels,
  area,
  disabled,
  newTabRow = (control) => (
    <PhiFlexControl align="center" gap={8}>
      {control}
      <span>{labels.newTab}</span>
    </PhiFlexControl>
  ),
  onChange,
}: {
  value: unknown;
  options: PhiTreeOption<PhiPageReferenceSelection>[];
  labels: PhiLinkTargetControlLabels;
  area?: PhiCmsAreaKey;
  disabled?: boolean;
  /** How the new-tab switch stands beside its words; the Inspector puts it in its own field row. */
  newTabRow?: (control: ReactNode) => ReactNode;
  /**
   * The target as it now stands. `none` is set when the author answered "None" -- the link is gone, not
   * only incomplete -- so what depends on a link can go with it.
   */
  onChange?: (next: PhiLinkTarget | undefined, none?: boolean) => void;
}) {
  const target = readPhiLinkTarget(value);
  const [mode, setMode] = useState<PhiLinkTargetMode>(target?.kind ?? "none");
  /*
   * The address as it is being typed, which the stored value cannot be: a target is only written when
   * it is storable, so reading the box back out of the value would erase every character before the
   * first one that makes a whole address.
   */
  const [draftHref, setDraftHref] = useState(target?.kind === "external" ? target.href : "");

  /*
   * The switch stands from the moment the author answers "Address", not only once an address is
   * complete: it is part of the question. Until there is a target to carry it, its answer waits here.
   */
  const [pendingNewTab, setPendingNewTab] = useState(false);

  /*
   * The value can change under this control -- an undo, a Form reset, or the Inspector moving to another
   * Widget of the same kind without remounting it. What this control wrote itself is already on screen;
   * anything else replaces the mode and the address being typed, or they would go on showing, and
   * writing into, the value before.
   */
  const valueKey = JSON.stringify(target ?? null);
  const [syncedValueKey, setSyncedValueKey] = useState(valueKey);
  const [emittedValueKey, setEmittedValueKey] = useState<string | null>(null);
  if (valueKey !== syncedValueKey) {
    setSyncedValueKey(valueKey);
    if (valueKey === emittedValueKey) {
      // This control's own write came back; it is consumed, so a later return to the same value is news.
      setEmittedValueKey(null);
    } else {
      setMode(target?.kind ?? "none");
      setDraftHref(target?.kind === "external" ? target.href : "");
      setPendingNewTab(false);
    }
  }
  const emit = (next: PhiLinkTarget | undefined, none?: boolean) => {
    setEmittedValueKey(JSON.stringify(next ?? null));
    onChange?.(next, none);
  };

  const newTab = target ? target.newTab === true : pendingNewTab;
  const withNewTab = <TTarget extends PhiLinkTarget>(next: TTarget) =>
    (newTab ? { ...next, newTab: true } : next);

  const changeMode = (nextMode: PhiLinkTargetMode) => {
    setMode(nextMode);
    setDraftHref("");
    setPendingNewTab(false);
    emit(undefined, nextMode === "none");
  };

  return (
    <PhiFlexControl vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
      <PhiSegmentedControl<PhiLinkTargetMode>
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
          onChange={(nextValue) => emit(nextValue
            ? { kind: "page", reference: nextValue as PhiPageReference, ...(area ? { area } : {}) }
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
            emit(isPhiStorableExternalHref(href)
              ? withNewTab({ kind: "external", href: href.trim() })
              : undefined);
          }}
        />
      ) : null}

      {/*
        * Only for an address elsewhere. A Page of the Site opens where the reader is, by the client
        * router -- a new tab would leave the Site's own navigation for a second copy of it.
        */}
      {mode === "external" ? newTabRow(
        <PhiSwitchControl
          checked={newTab}
          disabled={disabled || !onChange}
          onChange={(checked) => {
            if (target?.kind !== "external") {
              setPendingNewTab(checked);
              return;
            }
            emit(checked ? { ...target, newTab: true } : { ...target, newTab: undefined });
          }}
        />,
      ) : null}
    </PhiFlexControl>
  );
}
