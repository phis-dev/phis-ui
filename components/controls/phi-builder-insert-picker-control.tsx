"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Flex, Input, Segmented, Select, Tag, Tooltip, Typography, theme as antdTheme } from "antd";

import { PhiIcon } from "../shell/phi-icon";
import type { PhiPickerPlacement } from "./phi-picker-control-contract";
import { PhiFlexControl } from "./phi-flex-control";
import { PhiPopoverControl } from "./phi-popover-control";
import { usePhiImmediatePicker } from "./use-phi-immediate-picker";
import {
  PHI_BUILDER_INSERT_PICKER_CONTROL_DEFAULT_LABELS,
  type PhiBuilderInsertPickerControlLabels,
} from "./phi-builder-insert-picker-control-labels";

type PhiBuilderInsertPickerSection = "layout" | "widget";

export type PhiBuilderInsertPickerItem = {
  key: string;
  kind: "layout" | "widget";
  origin: string | null;
  packageName: string | null;
  title: string;
  description: string | null;
  category: string | null;
  tags: readonly string[] | null;
  icon: string | null;
};

export type PhiBuilderInsertPickerControlProps<
  TItem extends PhiBuilderInsertPickerItem = PhiBuilderInsertPickerItem,
> = {
  open: boolean;
  trigger: ReactElement;
  items: readonly TItem[];
  section: PhiBuilderInsertPickerSection;
  packageFilters: readonly string[];
  widgetCategoryFilters: readonly string[];
  allowLayoutSection: boolean;
  allowWidgetSection: boolean;
  placement?: PhiPickerPlacement;
  labels?: PhiBuilderInsertPickerControlLabels;
  onOpenChange: (open: boolean) => void;
  onSectionChange: (section: PhiBuilderInsertPickerSection) => void;
  onPackageFiltersChange: (filters: string[]) => void;
  onWidgetCategoryFiltersChange: (filters: string[]) => void;
  onChange: (item: TItem) => void;
};

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function resolveItemPackageName(item: PhiBuilderInsertPickerItem) {
  const raw = item.packageName ?? item.origin ?? "";
  if (!raw) return null;

  const parts = raw.split("/");
  if (raw.startsWith("@") && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }

  return parts[0] ?? raw;
}

function buildItemSearchText(item: PhiBuilderInsertPickerItem) {
  return [
    item.title,
    item.description ?? "",
    item.category ?? "",
    resolveItemPackageName(item) ?? "",
    ...(item.tags ?? []),
  ].join(" ").toLowerCase();
}

function resolveItemCategoryTagColor(category: string | null) {
  switch (category) {
    case "navigation": return "green";
    case "form": return "gold";
    case "content": return "purple";
    case "commerce": return "volcano";
    case "account": return "geekblue";
    case "data":
    case "media": return "cyan";
    case "configuration": return "orange";
    case "workspace": return "red";
    case "developer": return "magenta";
    case "structure":
    default: return "blue";
  }
}

/**
 * Two items side by side, for Layouts and for Widgets alike.
 *
 * An entry is an icon, a name and the category under it -- narrow enough that one per row left half
 * the popover empty and pushed a catalogue of seventy Widgets into a long scroll. Two columns halve
 * that scroll without widening anything, which is the whole reason the entry gave up the rest.
 */
const PHI_INSERT_PICKER_COLUMNS = 2;

/**
 * The package filter's standing answer.
 *
 * A word and not an empty string, because a Select tells an empty value apart from no value only by
 * accident: the entry has to be selectable, and what it selects is "do not filter".
 */
const PHI_INSERT_PICKER_ALL_PACKAGES = "__all__";

/**
 * The step of the house sequence this popover stands on -- 144, 233, 377, 610, 987.
 *
 * 377 is what two entries need once an entry is an icon, a name and the category under it. What an
 * entry used to print beside the name -- the package it came from, its tags -- is in the hover text
 * instead: at this width they would each have taken more room than the name they stood next to, and a
 * name that is cut off is worth less than a package line that has to be asked for.
 */
const PHI_INSERT_PICKER_MAX_WIDTH = 377;

/**
 * How tall the list stands, on the same sequence as the width -- 144, 233, 377, 610, 987.
 *
 * A height and not a ceiling: the list is the one part of the popover that changes size as somebody
 * types or picks a category, and a popover that grows and shrinks under the cursor moves the entry
 * that was about to be clicked. Fixed, the filters change what is in the box and never the box.
 *
 * `controlHeight * 12` was 408, which is not a step of anything: near enough to 377 to look like it
 * and far enough to sit wrong beside a popover that is 377 wide. The box is now square, which is the
 * one proportion that needs no justification.
 */
const PHI_INSERT_PICKER_LIST_HEIGHT = 377;

/**
 * What an entry no longer prints, gathered for the hover text.
 *
 * Description, package and tags all answer "which one is this?", which is a question asked of one
 * entry at a time -- not of the whole list at once, which is what printing them in every row amounts
 * to. The category is the exception and stays in the row, under the name: it is the one word that
 * sorts a catalogue of seventy into groups, so it is read down the list rather than per entry -- and
 * a line of its own costs the name nothing, where beside the name it would have taken most of it.
 */
function renderItemDetails(item: PhiBuilderInsertPickerItem) {
  const packageName = resolveItemPackageName(item);
  const tags = item.tags ?? [];
  if (!item.description && !packageName && tags.length === 0) {
    return undefined;
  }

  return (
    <PhiFlexControl vertical gap={4} align="flex-start">
      <Typography.Text strong style={{ color: "inherit" }}>{item.title}</Typography.Text>
      {item.description ? <Typography.Text style={{ color: "inherit" }}>{item.description}</Typography.Text> : null}
      {packageName ? <Typography.Text style={{ color: "inherit" }}>{packageName}</Typography.Text> : null}
      {tags.length > 0 ? (
        <PhiFlexControl align="center" gap={4} wrap>
          {tags.map((tag) => <Tag key={tag} color="blue" style={{ marginInlineEnd: 0 }}>{tag}</Tag>)}
        </PhiFlexControl>
      ) : null}
    </PhiFlexControl>
  );
}

const WIDGET_CATEGORY_ORDER = [
  "content",
  "navigation",
  "form",
  "data",
  "media",
  "commerce",
  "account",
  "configuration",
  "structure",
  "workspace",
  "developer",
  "other",
];

function resolveWidgetCategorySortValue(category: string) {
  const order = WIDGET_CATEGORY_ORDER.indexOf(category);
  return order >= 0 ? order : WIDGET_CATEGORY_ORDER.length;
}

function resolveItemIcon(item: PhiBuilderInsertPickerItem) {
  if (item.icon) return item.icon;
  return item.kind === "layout"
    ? "@phis/ui/layouts:flex"
    : "@phis/ui/widgets:internal";
}

export function PhiBuilderInsertPickerControl<TItem extends PhiBuilderInsertPickerItem>({
  open,
  trigger,
  items,
  section,
  packageFilters,
  widgetCategoryFilters,
  allowLayoutSection,
  allowWidgetSection,
  placement = "top",
  labels = PHI_BUILDER_INSERT_PICKER_CONTROL_DEFAULT_LABELS,
  onOpenChange,
  onSectionChange,
  onPackageFiltersChange,
  onWidgetCategoryFiltersChange,
  onChange,
}: PhiBuilderInsertPickerControlProps<TItem>) {
  const { token } = antdTheme.useToken();
  const picker = usePhiImmediatePicker<TItem | null>({
    value: null,
    open,
    onOpenChange,
    onChange: (item) => {
      if (item) onChange(item);
    },
  });
  const [search, setSearch] = useState("");
  const popoverWidth = Math.min(token.controlHeight * 38, PHI_INSERT_PICKER_MAX_WIDTH);
  const popoverMaxWidth = `calc(100vw - ${token.paddingLG * 2}px)`;
  const popoverHeight = `min(${token.controlHeight * 18}px, calc(100vh - ${token.paddingLG * 2}px))`;
  const itemIconFrameSize = token.controlHeight;
  const itemIconSize = token.fontSizeHeading3;
  const normalizedSearch = normalizeSearchText(search);
  const packageFilterSet = useMemo(() => new Set(packageFilters), [packageFilters]);
  const categoryFilterSet = useMemo(() => new Set(widgetCategoryFilters), [widgetCategoryFilters]);
  const sectionItems = useMemo(() => items.filter((item) => item.kind === section), [items, section]);
  const packageOptions = useMemo(() => [...new Set(
    sectionItems
      .map(resolveItemPackageName)
      .filter((packageName): packageName is string => Boolean(packageName)),
  )].sort((left, right) => left.localeCompare(right)), [sectionItems]);
  const categoryOptions = useMemo(() => [...new Set(
    items
      .filter((item) => item.kind === "widget" && item.category != null)
      .map((item) => item.category as string),
  )].sort((left, right) => {
    const orderDelta = resolveWidgetCategorySortValue(left) - resolveWidgetCategorySortValue(right);
    return orderDelta !== 0 ? orderDelta : left.localeCompare(right);
  }), [items]);
  const visibleItems = sectionItems.filter((item) => {
    const packageName = resolveItemPackageName(item) ?? "";
    if (packageFilters.length > 0 && !packageFilterSet.has(packageName)) return false;
    if (item.kind === "widget" && widgetCategoryFilters.length > 0 && !categoryFilterSet.has(item.category ?? "other")) return false;
    return !normalizedSearch || buildItemSearchText(item).includes(normalizedSearch);
  });
  /*
   * The bottom rule belongs to the last row, not to the last item: in two columns the item before the
   * last one sits beside it rather than above it, and a rule under it would hang in the middle.
   */
  const lastRowStartIndex = Math.floor(Math.max(visibleItems.length - 1, 0) / PHI_INSERT_PICKER_COLUMNS)
    * PHI_INSERT_PICKER_COLUMNS;
  const title = section === "widget" ? labels.pickWidget : labels.pickLayout;
  const placeholder = section === "widget" ? labels.searchWidgets : labels.searchLayouts;

  const selectItem = (item: TItem) => {
    picker.changeValue(item);
    picker.closePicker("commit");
  };

  const content = (
    <div
      style={{
        width: popoverWidth,
        maxWidth: popoverMaxWidth,
        maxHeight: popoverHeight,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Flex vertical gap={token.paddingSM} style={{ width: "100%", minHeight: 0, overflow: "hidden" }}>
        <Flex align="center" justify="space-between" gap={token.paddingSM} wrap>
          <Typography.Text strong style={{ fontSize: token.fontSize }}>{title}</Typography.Text>
          {/*
            * The package filter stands between the title and the section switch, small and without a
            * frame, because it belongs to the same question they do: which part of the catalogue is
            * in front of me. One package at a time, with "all" as the standing answer -- a house
            * installs a handful of Modules, and picking two of them at once against a list this
            * short was a choice nobody made twice.
            *
            * Two packages before it appears, because "all" is not one of them: with a single package
            * installed, the choice is between everything and everything.
            */}
          {packageOptions.length > 1 ? (
            <Select<string>
              size="small"
              variant="borderless"
              showSearch={false}
              value={packageFilters[0] ?? PHI_INSERT_PICKER_ALL_PACKAGES}
              onChange={(nextPackage) =>
                onPackageFiltersChange(
                  nextPackage === PHI_INSERT_PICKER_ALL_PACKAGES ? [] : [nextPackage],
                )
              }
              options={[
                { value: PHI_INSERT_PICKER_ALL_PACKAGES, label: labels.allPackages },
                ...packageOptions.map((packageName) => ({ value: packageName, label: packageName })),
              ]}
              aria-label={labels.filterPackages}
              style={{ flex: "1 1 0", minWidth: 0 }}
            />
          ) : null}
          <Segmented<PhiBuilderInsertPickerSection>
            value={section}
            onChange={(nextSection) => {
              if (nextSection === "layout" && !allowLayoutSection) {
                onSectionChange("widget");
                return;
              }
              onSectionChange(nextSection);
            }}
            size="small"
            options={[
              { label: labels.layouts, value: "layout", disabled: !allowLayoutSection },
              { label: labels.widgets, value: "widget", disabled: !allowWidgetSection },
            ]}
          />
        </Flex>

        {section === "widget" ? (
          <Select
            mode="multiple"
            allowClear
            showSearch={false}
            value={[...widgetCategoryFilters]}
            onChange={onWidgetCategoryFiltersChange}
            options={categoryOptions.map((category) => ({ value: category, label: category }))}
            placeholder={labels.filterCategories}
            maxTagCount="responsive"
            style={{ width: "100%" }}
          />
        ) : null}

        <Input
          autoFocus
          allowClear
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          variant="borderless"
          style={{
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 0,
            paddingInline: 0,
            boxShadow: "none",
          }}
        />

        <div
          style={{
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 0,
            background: token.colorBgElevated,
            padding: token.paddingSM,
            flex: "0 1 auto",
            height: PHI_INSERT_PICKER_LIST_HEIGHT,
            maxHeight: "100%",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {visibleItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: token.paddingXS, width: "100%" }}>
              <Typography.Text type="secondary">{section === "widget" ? labels.widgets : labels.layouts}</Typography.Text>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${PHI_INSERT_PICKER_COLUMNS}, minmax(0, 1fr))`,
                  columnGap: token.paddingSM,
                  width: "100%",
                }}
              >
                  {visibleItems.map((item, index) => {
                    const isLast = index >= lastRowStartIndex;
                    const isActive = picker.value?.key === item.key;
                    return (
                      <div
                        key={item.key}
                        role="button"
                        tabIndex={0}
                        style={{
                          cursor: "pointer",
                          paddingInline: 0,
                          paddingBlock: token.paddingSM,
                          borderBottom: isLast ? "none" : `1px solid ${token.colorBorderSecondary}`,
                          borderRadius: 0,
                          background: isActive ? token.colorFillQuaternary : "transparent",
                          outline: isActive ? `1px solid ${token.colorPrimary}` : "none",
                          outlineOffset: -1,
                        }}
                        onClick={() => selectItem(item)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          selectItem(item);
                        }}
                      >
                        <Tooltip title={renderItemDetails(item)} placement="top">
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: `${itemIconFrameSize}px minmax(0, 1fr)`,
                              alignItems: "center",
                              gap: token.paddingXS,
                              width: "100%",
                            }}
                          >
                            <span
                              style={{
                                width: itemIconFrameSize,
                                height: itemIconFrameSize,
                                lineHeight: 1,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <PhiIcon name={resolveItemIcon(item)} size={itemIconSize} />
                            </span>
                            <PhiFlexControl vertical gap={2} align="flex-start" style={{ minWidth: 0 }}>
                              <Typography.Text strong ellipsis style={{ minWidth: 0 }}>{item.title}</Typography.Text>
                              {item.kind === "widget" && item.category ? (
                                <Tag
                                  color={resolveItemCategoryTagColor(item.category)}
                                  style={{ marginInlineEnd: 0, maxWidth: "100%" }}
                                >
                                  {item.category}
                                </Tag>
                              ) : null}
                            </PhiFlexControl>
                          </div>
                        </Tooltip>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <Typography.Text type="secondary">{labels.noCompatibleItems}</Typography.Text>
          )}
        </div>
      </Flex>
    </div>
  );

  return (
    <PhiPopoverControl
      open={picker.open}
      trigger="click"
      placement={placement}
      arrow="point-at-center"
      destroyOnHidden
      content={content}
      popupContentStyle={{ overflow: "hidden" }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSearch("");
        picker.handleOpenChange(nextOpen);
      }}
    >
      {trigger}
    </PhiPopoverControl>
  );
}
