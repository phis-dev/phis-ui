"use client";

import { useMemo, useState, type ReactElement } from "react";
import { Flex, Input, Segmented, Select, Space, Tag, Tooltip, Typography, theme as antdTheme } from "antd";

import { PhiIcon } from "../shell/phi-icon";
import type { PhiPickerPlacement } from "./phi-picker-control-contract";
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
  const popoverWidth = Math.min(token.controlHeight * 26, 420);
  const popoverMaxWidth = `calc(100vw - ${token.paddingLG * 2}px)`;
  const popoverHeight = `min(${token.controlHeight * 18}px, calc(100vh - ${token.paddingLG * 2}px))`;
  const listMaxHeight = token.controlHeight * 12;
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

        <Select
          mode="multiple"
          allowClear
          showSearch={false}
          value={[...packageFilters]}
          onChange={onPackageFiltersChange}
          options={packageOptions.map((packageName) => ({ value: packageName, label: packageName }))}
          placeholder={labels.filterPackages}
          maxTagCount="responsive"
          style={{ width: "100%" }}
        />

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

        <div
          style={{
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: 0,
            background: token.colorBgElevated,
            padding: token.paddingSM,
            flex: "1 1 auto",
            minHeight: 0,
            maxHeight: listMaxHeight,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {visibleItems.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: section === "widget" ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
                gap: token.paddingMD,
                width: "100%",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: token.paddingXS, width: "100%" }}>
                <Typography.Text type="secondary">{section === "widget" ? labels.widgets : labels.layouts}</Typography.Text>
                <Space orientation="vertical" size={0} style={{ width: "100%" }}>
                  {visibleItems.map((item, index) => {
                    const isLast = index === visibleItems.length - 1;
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
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: `${itemIconFrameSize}px minmax(0, 1fr) auto`,
                            alignItems: "center",
                            gap: token.paddingSM,
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
                            <Tooltip title={item.description ?? undefined} placement="top">
                              <PhiIcon name={resolveItemIcon(item)} size={itemIconSize} />
                            </Tooltip>
                          </span>
                          <Space orientation="vertical" size={0} style={{ minWidth: 0 }}>
                            <Typography.Text strong ellipsis>{item.title}</Typography.Text>
                            {resolveItemPackageName(item) ? (
                              <Typography.Text type="secondary">{resolveItemPackageName(item)}</Typography.Text>
                            ) : null}
                          </Space>
                          <Space orientation="vertical" size={2} style={{ alignItems: "flex-end" }}>
                            {item.kind === "widget" && item.category ? (
                              <Tag color={resolveItemCategoryTagColor(item.category)} style={{ marginInlineEnd: 0 }}>
                                {item.category}
                              </Tag>
                            ) : null}
                            {(item.tags ?? []).length > 0 ? (
                              <Space size={4} wrap style={{ justifyContent: "flex-end" }}>
                                {(item.tags ?? []).map((tag) => <Tag key={tag} color="blue">{tag}</Tag>)}
                              </Space>
                            ) : null}
                          </Space>
                        </div>
                      </div>
                    );
                  })}
                </Space>
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
