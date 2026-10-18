"use client";

import type { CSSProperties, ReactNode } from "react";

import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import type { PhiSequenceSlotEditorProps } from "./phi-sequence-slot-editor";
import type { PhiLayoutKind } from "../phi-layout-contract";
import { usePhiLayoutSignalSurface } from "../phi-layout-signal-surface";
import type { PhiBaseLayoutProps } from "../phi-layout-view-model";
import { resolvePhiSequenceEditableSlotCount, usePhiSlotSequence } from "../use-phi-slot-sequence";

export type PhiSequenceLayoutSlotMeta = {
  key: string;
  label: string;
  slotIndex: number;
  hasContent?: boolean;
};

/** What a Stack and a Carousel are both handed; each adds the props of its own act. */
export type PhiSequenceLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  slots: ReactNode[];
  slotKeys: string[];
  slotMeta?: PhiSequenceLayoutSlotMeta[];
  defaultActiveSlotKey?: string;
  slotAnchor?: PhiAnchorWidgetPlacement | null;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  style?: CSSProperties;
};

/**
 * The part of a Stack and a Carousel that comes before they differ.
 *
 * Both own an index through `usePhiSlotSequence`, both answer Surface Signals on their root, and both
 * are authored one slot at a time by `PhiSequenceSlotEditor` (see there). What is left to each is what an
 * index means on the page: one slot in a box, or a window on a track.
 *
 * `editor` is everything the slot editor needs but the noun the counter speaks of.
 */
export function usePhiSequenceLayout({
  slots,
  slotKeys,
  slotMeta,
  defaultActiveSlotKey,
  defaultLayoutKind,
  layoutProps,
}: Pick<PhiSequenceLayoutProps, "slots" | "slotKeys" | "slotMeta" | "defaultActiveSlotKey"> & {
  defaultLayoutKind: PhiLayoutKind;
  layoutProps: Omit<PhiSequenceLayoutProps, "slots" | "slotKeys" | "slotMeta" | "defaultActiveSlotKey" | "slotAnchor">;
}) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const authoring = {
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
  };
  const {
    blockId,
    renderMode,
    style,
    layoutKind = defaultLayoutKind,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    surface: storedSurface,
    editSlotAction,
    editRenderInsertControl,
    editSlotAnchor = "center",
  } = layoutProps;
  const surface = usePhiLayoutSignalSurface(blockId, storedSurface);
  const isEditMode = renderMode === "editor";
  const editableSlotCount = resolvePhiSequenceEditableSlotCount(slots, slotKeys);
  const {
    activeIndex,
    slotMeta: resolvedSlotMeta,
    setActiveIndex,
  } = usePhiSlotSequence({
    blockId,
    slots,
    slotKeys,
    // While authoring, the sequence reaches one slot past the last filled one -- the empty slot the
    // next child goes into. A page has no such slot and steps through what it holds.
    ...(isEditMode ? { slotCount: editableSlotCount } : {}),
    ...(slotMeta ? { slotLabels: slotMeta } : {}),
    ...(defaultActiveSlotKey === undefined ? {} : { defaultActiveSlotKey }),
  });
  const paddings = { padding, paddingTop, paddingRight, paddingBottom, paddingLeft };
  // The Builder draws with the signalled Surface; the page hands `PhiLayoutSurfaceBox` the stored one
  // and lets it swap in what Signals left.
  const chrome = { ...paddings, surface };
  // Named rather than inferred: the inferred type spells csstype's padding types, which the package's
  // declarations cannot name (TS2883).
  const storedChrome: PhiSequenceSlotEditorProps["chrome"] = { ...paddings, surface: storedSurface };
  const editor: Omit<PhiSequenceSlotEditorProps, "slotNoun"> = {
    slots,
    slotKeys,
    slotLabels: resolvedSlotMeta,
    slotCount: editableSlotCount,
    activeIndex,
    onActiveIndexChange: setActiveIndex,
    layoutKind,
    renderMode,
    authoring,
    chrome,
    editSlotAction,
    editRenderInsertControl,
    editSlotAnchor,
    style,
  };

  return {
    blockId,
    layoutKind,
    style,
    isEditMode,
    storedChrome,
    activeIndex,
    slotMeta: resolvedSlotMeta,
    setActiveIndex,
    editor,
  };
}
