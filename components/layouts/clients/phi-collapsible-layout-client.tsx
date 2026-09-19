"use client";

import { Collapse } from "antd";
import type { CollapseProps } from "antd";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import { usePhiConfig } from "../../root/phi-config-provider";
import { createPhiSignalAddress } from "../../../types/signals";
import type { PhiRenderableBlockAnchor } from "../../../types/renderable-block";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiControlSize } from "../../../types/control";
import { usePhiSignalListener } from "../../runtime/runtime-signal-bus";
import type { PhiAnchorWidgetPlacement } from "../../controls/phi-anchor-control-contract";
import { PhiLayoutAnchoredOverlay } from "./phi-layout-anchored-overlay";
import {
  PhiBaseLayoutSlotStateProvider,
  usePhiBaseLayoutSlotStates,
  PhiBaseLayoutSlotScope,
} from "./phi-base-layout-client";
import {
  resolvePhiBaseLayoutChrome,
  type PhiBaseLayoutProps,
} from "../phi-layout-view-model";
import { resolvePhiAnchorPlacement } from "../phi-layout-contract";
import {
  isPhiLayoutAuthoringRender,
  phiLayoutDebugLayerMarker,
  phiLayoutSlotClassName,
  phiLayoutSlotContentMarker,
} from "../../../helpers/layout-authoring-markers";

export type PhiCollapsibleLayoutSlotMeta = {
  key: string;
  label: string;
  slotIndex: number;
  hasContent?: boolean;
};

export type PhiCollapsibleLayoutProps = Omit<PhiBaseLayoutProps, "slots"> & {
  blockId?: PhiCmsInstanceId | null;
  slots: ReactNode[];
  slotKeys: string[];
  slotMeta?: PhiCollapsibleLayoutSlotMeta[];
  anchor?: PhiRenderableBlockAnchor;
  editSlotAnchor?: PhiAnchorWidgetPlacement | null;
  panelMinHeight?: CSSProperties["minHeight"];
  accordion?: boolean;
  slotTitles?: string[];
  translateSlotTitles?: boolean;
  onOpenSlotKeysChange?: (next: string[]) => void;
  defaultOpenSlotKeys?: string[];
  collapsible?: "header" | "icon" | "disabled";
  bordered?: boolean;
  ghost?: boolean;
  expandIconPlacement?: "start" | "end";
  collapseSize?: PhiControlSize;
  titleStrong?: boolean;
  headerPadding?: CSSProperties["padding"];
  innerPadding?: CSSProperties["padding"];
  style?: CSSProperties;
};

function isRenderableSlotChild(child: ReactNode) {
  return child !== null && child !== undefined && child !== false;
}

function uniqueSlotKeys(keys: readonly string[]) {
  return [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
}

function normalizeOpenSlotKeys(
  keys: readonly string[] | null | undefined,
  validSlotKeys: readonly string[],
  accordion: boolean,
) {
  const valid = new Set(validSlotKeys);
  const normalized = uniqueSlotKeys(keys ?? []).filter((key) => valid.has(key));
  return accordion ? normalized.slice(0, 1) : normalized;
}

function resolveDefaultOpenSlotKeys(
  defaultOpenSlotKeys: readonly string[] | null | undefined,
  validSlotKeys: readonly string[],
  accordion: boolean,
) {
  if (defaultOpenSlotKeys != null) {
    return normalizeOpenSlotKeys(defaultOpenSlotKeys, validSlotKeys, accordion);
  }

  return validSlotKeys[0] ? [validSlotKeys[0]] : [];
}

function toCollapseActiveKey(keys: readonly string[], accordion: boolean) {
  return accordion ? keys[0] ?? undefined : [...keys];
}

function readCollapseKeys(value: string | string[]) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

/**
 * The header's own class, put there by this adapter rather than read off Ant Design.
 *
 * A click in the header belongs to the header -- it folds the slot -- and in edit mode the scaffold
 * around this Layout is listening for the same click to select and drag the block, so the one has to be
 * told from the other. The test used to be `.ant-collapse-header`, which is a name the library owns: no
 * import names it, no validator sees it, and swapping Ant Design out would have left the check compiling
 * and silently matching nothing, so every header click in the Builder would have selected the block
 * instead of folding the slot. The primitive takes a class for that element, so the name is ours and the
 * element is the same one.
 */
const PHI_COLLAPSIBLE_HEADER_CLASS = "phi-collapsible-header";

function shouldStopCollapsibleEditorScaffoldEvent(event: MouseEvent<HTMLElement>) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  /*
   * The expand icon needs no test of its own: Ant Design draws it inside the header, so `closest` has
   * already passed it on the way up.
   */
  return Boolean(
    target.closest(`.${PHI_COLLAPSIBLE_HEADER_CLASS}`) ||
    target.closest("[data-phi-collapsible-title-control='true']"),
  );
}

function resolveCollapsibleStyles(
  titleStrong: boolean,
  headerPadding: CSSProperties["padding"] | undefined,
  innerPadding: CSSProperties["padding"] | undefined,
): CollapseProps["styles"] {
  return {
    header: headerPadding == null ? undefined : { padding: headerPadding },
    title: titleStrong ? { fontWeight: 600 } : undefined,
    body: innerPadding == null ? undefined : { padding: innerPadding },
  };
}

export function PhiCollapsibleLayout(props: PhiCollapsibleLayoutProps) {
  return (
    <PhiBaseLayoutSlotStateProvider slotCount={props.slots.length} initialSlotStates={props.initialSlotStates}>
      <PhiCollapsibleLayoutBody {...props} />
    </PhiBaseLayoutSlotStateProvider>
  );
}

function PhiCollapsibleLayoutBody({
  blockId,
  slots,
  slotKeys,
  slotMeta,
  panelMinHeight,
  accordion = false,
  slotTitles,
  onOpenSlotKeysChange,
  defaultOpenSlotKeys,
  collapsible = "header",
  bordered = false,
  ghost = true,
  expandIconPlacement = "start",
  collapseSize = "medium",
  titleStrong = true,
  headerPadding,
  innerPadding,
  ...layoutProps
}: PhiCollapsibleLayoutProps) {
  // Named fields rather than the rest object: handing the compiler a whole rest object makes every
  // value later destructured out of it look like it may change, which costs the component its memoization.
  const isAuthoringRender = isPhiLayoutAuthoringRender({
    editSlotAction: layoutProps.editSlotAction,
    editSlotLabels: layoutProps.editSlotLabels,
    capabilities: layoutProps.capabilities,
  });
  const { token } = usePhiConfig();
  const resolvedHeaderPadding = headerPadding ?? token.paddingSM;
  const resolvedInnerPadding = innerPadding ?? token.padding;
  const {
    layoutKind = "collapsible",
    renderMode,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    background,
    backgroundLayer,
    border,
    borderRadius,
    effect,
    shadow,
    anchor,
    editSlotAnchor,
    editSlotAction,
    editRenderInsertControl,
    editRenderTitleControl,
    editSlotLabels,
    editSlotTitleAction,
    style,
    labelEnd,
  } = layoutProps;
  const resolvedRenderMode = renderMode ?? "live";
  const isEditMode = resolvedRenderMode === "editor";
  const resolvedSlotStates = usePhiBaseLayoutSlotStates() ?? [];
  const occupiedSlotIndices = useMemo(
    () =>
      slots.reduce<number[]>((indices, slot, slotIndex) => {
        if (isRenderableSlotChild(slot)) {
          indices.push(slotIndex);
        }
        return indices;
      }, []),
    [slots],
  );
  const appendSlotIndex = Math.min(
    Math.max(...occupiedSlotIndices, -1) + 1,
    Math.max(slotKeys.length - 1, 0),
  );
  const validSlotKeys = useMemo(
    () => slotKeys.map((key, index) => key || `slot_${index}`),
    [slotKeys],
  );
  const renderedSlotIndices = useMemo(() => {
    if (!isEditMode) {
      return occupiedSlotIndices;
    }

    return Array.from({ length: appendSlotIndex + 1 }, (_, slotIndex) => slotIndex);
  }, [appendSlotIndex, isEditMode, occupiedSlotIndices]);
  const baseOpenSlotKeys = useMemo(
    () => resolveDefaultOpenSlotKeys(defaultOpenSlotKeys, validSlotKeys, accordion),
    [accordion, defaultOpenSlotKeys, validSlotKeys],
  );
  const baseOpenSlotKeysSignature = useMemo(() => JSON.stringify(baseOpenSlotKeys), [baseOpenSlotKeys]);
  const [controlledOpenSlotKeys, setControlledOpenSlotKeys] = useState<{
    signature: string;
    keys: string[];
  } | null>(null);
  const resolvedOpenSlotKeysBase =
    controlledOpenSlotKeys?.signature === baseOpenSlotKeysSignature
      ? controlledOpenSlotKeys.keys
      : baseOpenSlotKeys;
  const appendSlotKey = validSlotKeys[appendSlotIndex];
  const resolvedOpenSlotKeys = useMemo(() => {
    if (!isEditMode || !appendSlotKey) {
      return resolvedOpenSlotKeysBase;
    }
    if (accordion) {
      return [appendSlotKey];
    }
    return resolvedOpenSlotKeysBase.includes(appendSlotKey)
      ? resolvedOpenSlotKeysBase
      : [...resolvedOpenSlotKeysBase, appendSlotKey];
  }, [accordion, appendSlotKey, isEditMode, resolvedOpenSlotKeysBase]);
  const effectiveCollapsible = isEditMode && collapsible !== "disabled" ? "icon" : collapsible;
  const receiverAddress = useMemo(
    () => blockId == null ? null : createPhiSignalAddress("cms", blockId),
    [blockId],
  );
  const [editingSlotTitle, setEditingSlotTitle] = useState<{
    slotIndex: number;
    value: string;
  } | null>(null);

  const commitSlotTitle = useCallback(() => {
    if (!editingSlotTitle) {
      return;
    }

    editSlotTitleAction?.(editingSlotTitle.slotIndex, editingSlotTitle.value);
    setEditingSlotTitle(null);
  }, [editSlotTitleAction, editingSlotTitle]);

  const cancelSlotTitleEdit = useCallback(() => {
    setEditingSlotTitle(null);
  }, []);

  const setOpenKeys = useCallback(
    (keys: readonly string[]) => {
      const normalizedKeys = normalizeOpenSlotKeys(keys, validSlotKeys, accordion);
      setControlledOpenSlotKeys({
        signature: baseOpenSlotKeysSignature,
        keys: normalizedKeys,
      });
      onOpenSlotKeysChange?.(normalizedKeys);
    },
    [accordion, baseOpenSlotKeysSignature, onOpenSlotKeysChange, validSlotKeys],
  );

  const openSlot = useCallback(
    (slotKey: string) => {
      setControlledOpenSlotKeys((current) => {
        const normalizedSlotKey = slotKey.trim();
        if (!validSlotKeys.includes(normalizedSlotKey)) {
          return current;
        }
        const currentKeys = current?.signature === baseOpenSlotKeysSignature ? current.keys : baseOpenSlotKeys;
        if (accordion) {
          return { signature: baseOpenSlotKeysSignature, keys: [normalizedSlotKey] };
        }
        return {
          signature: baseOpenSlotKeysSignature,
          keys: currentKeys.includes(normalizedSlotKey) ? currentKeys : [...currentKeys, normalizedSlotKey],
        };
      });
    },
    [accordion, baseOpenSlotKeys, baseOpenSlotKeysSignature, validSlotKeys],
  );

  const closeSlot = useCallback((slotKey: string) => {
    setControlledOpenSlotKeys((current) => {
      const currentKeys = current?.signature === baseOpenSlotKeysSignature ? current.keys : baseOpenSlotKeys;
      return {
        signature: baseOpenSlotKeysSignature,
        keys: currentKeys.filter((key) => key !== slotKey.trim()),
      };
    });
  }, [baseOpenSlotKeys, baseOpenSlotKeysSignature]);

  const toggleSlot = useCallback(
    (slotKey: string) => {
      setControlledOpenSlotKeys((current) => {
        const normalizedSlotKey = slotKey.trim();
        if (!validSlotKeys.includes(normalizedSlotKey)) {
          return current;
        }
        const currentKeys = current?.signature === baseOpenSlotKeysSignature ? current.keys : baseOpenSlotKeys;
        if (currentKeys.includes(normalizedSlotKey)) {
          return {
            signature: baseOpenSlotKeysSignature,
            keys: currentKeys.filter((key) => key !== normalizedSlotKey),
          };
        }
        if (accordion) {
          return { signature: baseOpenSlotKeysSignature, keys: [normalizedSlotKey] };
        }
        return { signature: baseOpenSlotKeysSignature, keys: [...currentKeys, normalizedSlotKey] };
      });
    },
    [accordion, baseOpenSlotKeys, baseOpenSlotKeysSignature, validSlotKeys],
  );

  usePhiSignalListener(
    useCallback(
      (signal) => {
        if (signal.receiver !== receiverAddress) {
          return;
        }

        if (signal.channel === "openSlotKeys" && signal.action === "change" && Array.isArray(signal.value)) {
          setOpenKeys(signal.value.filter((value): value is string => typeof value === "string"));
          return;
        }

        if (signal.channel === "activeSlotKey" && signal.action === "change" && typeof signal.value === "string") {
          openSlot(signal.value);
          return;
        }

        if (signal.channel === "activeSlotIndex" && signal.action === "change" && typeof signal.value === "number") {
          const slotKey = validSlotKeys[signal.value];
          if (slotKey) {
            openSlot(slotKey);
          }
          return;
        }

        if (signal.channel !== "slot" || typeof signal.value !== "string") {
          return;
        }

        if (signal.action === "open") {
          openSlot(signal.value);
          return;
        }
        if (signal.action === "close") {
          closeSlot(signal.value);
          return;
        }
        if (signal.action === "toggle") {
          toggleSlot(signal.value);
        }
      },
      [closeSlot, openSlot, receiverAddress, setOpenKeys, toggleSlot, validSlotKeys],
    ),
    receiverAddress
      ? {
          receiver: receiverAddress,
          channels: ["openSlotKeys", "activeSlotKey", "activeSlotIndex", "slot"],
        }
      : null,
  );

  const {
    style: resolvedLayoutStyle,
    hasExplicitLayoutBackground,
  } = resolvePhiBaseLayoutChrome({
    labelEnd,
    padding,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    background,
    border,
    borderRadius,
    effect,
    shadow,
  });
  const resolvedStyle: CSSProperties = {
    position: "relative",
    ...resolvedLayoutStyle,
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    ...style,
  };

  const items = renderedSlotIndices
    .map((slotIndex): NonNullable<CollapseProps["items"]>[number] | null => {
      const slotKey = validSlotKeys[slotIndex];
      if (!slotKey) {
        return null;
      }
      const slotState = resolvedSlotStates[slotIndex] ?? "expanded";
      if (slotState === "hidden") {
        return null;
      }

      const child = slots[slotIndex] ?? null;
      const hasContent = isRenderableSlotChild(child);
      if (!hasContent && !isEditMode) {
        return null;
      }

      const meta = slotMeta?.find((candidate) => candidate.key === slotKey || candidate.slotIndex === slotIndex);
      const title = slotTitles?.[slotIndex]?.trim() || meta?.label?.trim() || `Slot ${slotIndex}`;
      const resolvedSlotAnchor = editSlotAnchor ?? resolvePhiAnchorPlacement(anchor);
      const childContent = hasContent
        ? (
            <div
              className={phiLayoutSlotClassName(isAuthoringRender)}
              data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, true)}
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minHeight: panelMinHeight,
                minWidth: 0,
              }}
            >
              {/*
                The scope wraps the overlay rather than the child: the overlay reads the child's slot
                sizing off the element it is handed, and a provider in between would hide it.
              */}
              <PhiBaseLayoutSlotScope slotIndex={slotIndex}>
                <PhiLayoutAnchoredOverlay
                  anchor={resolvedSlotAnchor}
                  positionMode="flow"
                  fillAvailableInline
                  fillAvailableBlock={panelMinHeight != null}
                >
                  {child}
                </PhiLayoutAnchoredOverlay>
              </PhiBaseLayoutSlotScope>
            </div>
          )
        : null;
      const label =
        isEditMode && editSlotTitleAction && editRenderTitleControl
          ? editingSlotTitle?.slotIndex === slotIndex
            ? editRenderTitleControl({
                  value: editingSlotTitle.value,
                  onChange: (value) =>
                    setEditingSlotTitle({
                      slotIndex,
                      value,
                    }),
                  onCommit: commitSlotTitle,
                  onCancel: cancelSlotTitleEdit,
                  ariaLabel: `Edit title for slot ${slotIndex}`,
                  style: {
                    maxWidth: 320,
                    paddingInline: 0,
                  },
                })
            : (
                <button
                  type="button"
                  data-phi-collapsible-title-control="true"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingSlotTitle({ slotIndex, value: title });
                  }}
                  style={{
                    appearance: "none",
                    border: 0,
                    background: "transparent",
                    padding: 0,
                    color: "inherit",
                    font: "inherit",
                    textAlign: "left",
                    cursor: "text",
                  }}
                >
                  {title}
                </button>
              )
          : title;
      return {
        key: slotKey,
        label,
        collapsible: effectiveCollapsible,
        forceRender: isEditMode,
        children: childContent
          ? childContent
          : editSlotAction && editRenderInsertControl
            ? (
                <div
                  className={phiLayoutSlotClassName(isAuthoringRender)}
                  data-phi-layout-has-content={phiLayoutSlotContentMarker(isAuthoringRender, false)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    minHeight: panelMinHeight,
                    minWidth: 0,
                  }}
                >
                  <PhiLayoutAnchoredOverlay
                    anchor={resolvedSlotAnchor}
                    positionMode="flow"
                    fillAvailableInline
                    fillAvailableBlock={panelMinHeight != null}
                  >
                    {editRenderInsertControl({
                      presentation: "inline",
                      slotIndex,
                      label: editSlotLabels?.[slotIndex],
                      onInsert: (targetSlotIndex) =>
                        editSlotAction(targetSlotIndex, {
                          defaultPickSection: "widget",
                          allowWidgetSection: true,
                          slotIndex: targetSlotIndex,
                        }),
                    })}
                  </PhiLayoutAnchoredOverlay>
                </div>
              )
            : null,
      };
    })
    .filter((item): item is NonNullable<CollapseProps["items"]>[number] => item !== null);

  return (
    <div
      data-layout-kind={layoutKind}
      data-phi-block-render-mode={resolvedRenderMode}
      data-phi-layout-debug-layer={phiLayoutDebugLayerMarker(isAuthoringRender)}
      data-phi-layout-has-explicit-layout-background={hasExplicitLayoutBackground ? "true" : "false"}
      className="phi-layout"
      style={resolvedStyle}
    >
      {backgroundLayer}
      <div
        onMouseDown={
          isEditMode
            ? (event) => {
                if (shouldStopCollapsibleEditorScaffoldEvent(event)) {
                  event.stopPropagation();
                }
              }
            : undefined
        }
        onClick={
          isEditMode
            ? (event) => {
                if (shouldStopCollapsibleEditorScaffoldEvent(event)) {
                  event.stopPropagation();
                }
              }
            : undefined
        }
      >
        <Collapse
          accordion={accordion}
          activeKey={toCollapseActiveKey(resolvedOpenSlotKeys, accordion)}
          bordered={bordered}
          ghost={ghost}
          collapsible={effectiveCollapsible}
          destroyOnHidden={false}
          expandIconPlacement={expandIconPlacement}
          size={collapseSize}
          classNames={{ header: PHI_COLLAPSIBLE_HEADER_CLASS }}
          items={items}
          onChange={(nextKeys) => setOpenKeys(readCollapseKeys(nextKeys))}
          styles={resolveCollapsibleStyles(
            titleStrong,
            resolvedHeaderPadding,
            resolvedInnerPadding,
          )}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
