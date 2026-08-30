import { resolvePhiCmsLayoutPluginKey } from "../../constants/cms-layout-types";
import {
  PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS,
  PHI_CMS_DEFAULT_LAYOUT_SLOTS,
  PHI_CMS_FLEX_LAYOUT_SLOTS,
  PHI_CMS_FLEX_VERTICAL_LAYOUT_SLOTS,
  PHI_CMS_GRID_LAYOUT_SLOTS,
  PHI_CMS_MASONRY_LAYOUT_SLOTS,
  PHI_CMS_PAGE_REGION_LAYOUT_SLOTS,
  PHI_CMS_SPLIT_LAYOUT_SLOTS,
  PHI_CMS_STACK_LAYOUT_SLOTS,
  PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS,
} from "../../constants/cms-layout-types";
import { resolvePhiLayoutDefaults } from "../../helpers/cms-layout-defaults";
import { PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR } from "../../helpers/renderable-block-defaults";
import { PHI_LAYOUT_PADDING_FIELDS } from "../../helpers/layout-padding-field";
import type { PhiCmsLayoutPluginDefinition } from "../../types/cms-plugins";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../plugins/runtime-modules/core/ids";
import type {
  PhiCmsCollapsibleLayoutConfig,
  PhiCmsContentLayoutConfig,
  PhiCmsFlexLayoutConfig,
  PhiCmsFlexVerticalLayoutConfig,
  PhiCmsFormLayoutConfig,
  PhiCmsGridLayoutConfig,
  PhiCmsMasonryLayoutConfig,
  PhiCmsSplitCardLayoutConfig,
  PhiCmsStackLayoutConfig,
  PhiCmsThreeColumnLayoutConfig,
} from "../../types/cms-config";

const PHI_COLLAPSIBLE_SLOT_OPTIONS = PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS.map((slot) => ({
  value: slot.key,
  label: slot.label,
}));

const PHI_FLEX_LAYOUT_DEFAULT_ANCHOR = {
  horizontal: "left",
  vertical: "middle",
} as const;

const PHI_FLEX_LAYOUT_DISTRIBUTION_OPTIONS = [
  { value: "anchor", label: "Anchor" },
  { value: "between", label: "Between" },
  { value: "around", label: "Around" },
  { value: "evenly", label: "Evenly" },
] as const;

const PHI_FLEX_VERTICAL_LAYOUT_DEFAULT_ANCHOR = {
  horizontal: "center",
  vertical: "top",
} as const;

export const PHI_CONTENT_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("content"),
  typeKey: "content",
  layoutKind: "content",
  title: "Content",
  description: "Neutral full-width content wrapper with a single default slot.",
  category: "structure",
  iconName: "content",
  defaultConfig: resolvePhiLayoutDefaults("content"),
  fields: [...PHI_LAYOUT_PADDING_FIELDS],
  slots: [...PHI_CMS_DEFAULT_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsContentLayoutConfig>;

export const PHI_FORM_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("form"),
  typeKey: "form",
  layoutKind: "form",
  title: "Form",
  description: "Single-slot form layout for form-oriented content.",
  category: "structure",
  iconName: "content",
  defaultConfig: resolvePhiLayoutDefaults("form"),
  fields: [...PHI_LAYOUT_PADDING_FIELDS],
  slots: [...PHI_CMS_DEFAULT_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsFormLayoutConfig>;

export const PHI_FLEX_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("flex"),
  typeKey: "flex",
  layoutKind: "flex",
  title: "Flex",
  description: "Sequential slot layout using Ant Design Flex.",
  category: "structure",
  iconName: "flex",
  defaultAnchor: PHI_FLEX_LAYOUT_DEFAULT_ANCHOR,
  defaultConfig: resolvePhiLayoutDefaults("flex"),
  fields: [
    ...PHI_LAYOUT_PADDING_FIELDS,
    {
      key: "distribution",
      type: "choice",
      label: "Distribution",
      options: [...PHI_FLEX_LAYOUT_DISTRIBUTION_OPTIONS],
    },
    { key: "wrap", type: "boolean", label: "Wrap" },
    { key: "verticalSeparators", type: "boolean", label: "Vertical separators" },
    { key: "separatorBeforeFirst", type: "boolean", label: "Separator before first" },
    { key: "separatorSpan", type: "length", label: "Separator span", min: 0 },
  ],
  slots: [...PHI_CMS_FLEX_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsFlexLayoutConfig>;

export const PHI_FLEX_VERTICAL_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("flex-vertical"),
  typeKey: "flex-vertical",
  layoutKind: "verticalflex",
  title: "Flex Vertical",
  description: "Sequential vertical slot layout using Ant Design Flex.",
  category: "structure",
  iconName: "flex",
  defaultAnchor: PHI_FLEX_VERTICAL_LAYOUT_DEFAULT_ANCHOR,
  defaultConfig: resolvePhiLayoutDefaults("verticalflex"),
  fields: [...PHI_LAYOUT_PADDING_FIELDS],
  slots: [...PHI_CMS_FLEX_VERTICAL_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsFlexVerticalLayoutConfig>;

export const PHI_COLLAPSIBLE_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("collapsible"),
  typeKey: "collapsible",
  layoutKind: "collapsible",
  title: "Collapsible",
  description: "Sequential multi-section layout with one collapsible header per slot.",
  category: "structure",
  iconName: "collapse",
  defaultAnchor: PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR,
  defaultConfig: resolvePhiLayoutDefaults("collapsible"),
  fields: [
    ...PHI_LAYOUT_PADDING_FIELDS,
    {
      key: "defaultOpenSlotKeys",
      type: "choice",
      mode: "multiple",
      valueType: "string[]",
      label: "Default Open Slots",
      options: PHI_COLLAPSIBLE_SLOT_OPTIONS,
    },
    { key: "panelMinHeight", type: "length", label: "Panel Min Height", min: 0 },
    { key: "translateSlotTitles", type: "boolean", label: "Translate Slot Titles" },
    { key: "accordion", type: "boolean", label: "Accordion" },
    { key: "bordered", type: "boolean", label: "Bordered" },
    { key: "ghost", type: "boolean", label: "Ghost" },
    {
      key: "collapsible",
      type: "choice",
      label: "Toggle Area",
      options: [
        { value: "header", label: "Header" },
        { value: "icon", label: "Icon" },
        { value: "disabled", label: "Disabled" },
      ],
    },
    {
      key: "expandIconPlacement",
      type: "choice",
      label: "Icon Position",
      options: [
        { value: "start", label: "Start" },
        { value: "end", label: "End" },
      ],
    },
    {
      key: "collapseSize",
      type: "choice",
      label: "Size",
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
      ],
    },
    { key: "titleStrong", type: "boolean", label: "Strong Titles" },
    {
      key: "headerPadding",
      type: "choice",
      label: "Header Padding",
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale, params: { family: "padding" } },
    },
    {
      key: "innerPadding",
      type: "choice",
      label: "Inner Padding",
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale, params: { family: "padding" } },
    },
  ],
  runtimeSignals: {
    emits: [
      { id: "openSlotKeys", action: "change", valueType: "string[]" },
      { id: "activeSlotKey", action: "change", valueType: "string" },
    ],
    listens: [
      { id: "openSlotKeys", channel: "openSlotKeys", action: "change", valueType: "string[]" },
      { id: "activeSlotKey", channel: "activeSlotKey", action: "change", valueType: "string" },
      { id: "activeSlotIndex", channel: "activeSlotIndex", action: "change", valueType: "number" },
      { id: "slotToggle", channel: "slot", action: "toggle", valueType: "string" },
      { id: "slotOpen", channel: "slot", action: "open", valueType: "string" },
      { id: "slotClose", channel: "slot", action: "close", valueType: "string" },
    ],
  },
  slots: [...PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsCollapsibleLayoutConfig>;

export const PHI_STACK_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("stack"),
  typeKey: "stack",
  layoutKind: "stack",
  title: "Stack",
  description: "Single-active-slot layout for tabbed or step-like sections.",
  category: "structure",
  iconName: "stack",
  defaultConfig: resolvePhiLayoutDefaults("stack"),
  fields: [
    ...PHI_LAYOUT_PADDING_FIELDS,
    { key: "activeSlotKey", type: "string", label: "Active Slot Key" },
    { key: "defaultActiveSlotKey", type: "string", label: "Default Active Slot Key" },
    {
      key: "mountPolicy",
      type: "choice",
      label: "Slot Mounting",
      options: [
        { value: "active", label: "Active slot only" },
        { value: "keep", label: "Keep all slots" },
      ],
    },
    {
      key: "slotTransition",
      type: "choice",
      label: "Slot Transition",
      options: [
        { value: "none", label: "None" },
        { value: "fade-over", label: "Fade over" },
      ],
    },
  ],
  runtimeSignals: {
    emits: [
      {
        id: "stackMeta",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta,
      },
    ],
    listens: [
      { id: "stackMeta", channel: "stackMeta", action: "activate", valueType: "none" },
      { id: "activeSlotIndex", channel: "activeSlotIndex", action: "change", valueType: "number" },
      { id: "activeSlotKey", channel: "activeSlotKey", action: "change", valueType: "string" },
    ],
  },
  slots: [...PHI_CMS_STACK_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsStackLayoutConfig>;

export const PHI_GRID_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("grid"),
  typeKey: "grid",
  layoutKind: "grid",
  title: "Grid",
  description: "Container-responsive 24-column slot grid using Phi responsive profiles.",
  category: "structure",
  iconName: "grid",
  defaultConfig: resolvePhiLayoutDefaults("grid"),
  fields: [
    ...PHI_LAYOUT_PADDING_FIELDS,
    {
      key: "columnGap",
      type: "choice",
      label: "Col Gap",
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.spacingScale, params: { family: "margin" } },
    },
    { key: "slotPlacements", type: "slot-placement", label: "Slot placement" },
  ],
  slots: [...PHI_CMS_GRID_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsGridLayoutConfig>;

export const PHI_MASONRY_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("masonry"),
  typeKey: "masonry",
  layoutKind: "masonry",
  title: "Masonry",
  description: "Sequential slot masonry layout with column-based flow.",
  category: "structure",
  iconName: "masonry",
  defaultConfig: resolvePhiLayoutDefaults("masonry"),
  fields: [
    ...PHI_LAYOUT_PADDING_FIELDS,
    { key: "columns", type: "number", label: "Columns" },
    { key: "minColumnWidth", type: "length", label: "Min Column Width", min: 0 },
  ],
  slots: [...PHI_CMS_MASONRY_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsMasonryLayoutConfig>;

export const PHI_SPLIT_CARD_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("split-card"),
  typeKey: "split-card",
  layoutKind: "split",
  title: "Split Card",
  description: "Two-panel card layout with left and right slots.",
  category: "structure",
  iconName: "split-card",
  defaultConfig: resolvePhiLayoutDefaults("split"),
  fields: [
    ...PHI_LAYOUT_PADDING_FIELDS,
    { key: "leftBackground", type: "background", label: "Left Card Background", section: "left-card-background" },
    { key: "leftBorder", type: "border", label: "Left Card Border", section: "left-card-border" },
    { key: "leftShadow", type: "shadow", label: "Left Card Shadow", section: "left-card-shadow" },
    { key: "rightBackground", type: "background", label: "Right Card Background", section: "right-card-background" },
    { key: "rightBorder", type: "border", label: "Right Card Border", section: "right-card-border" },
    { key: "rightShadow", type: "shadow", label: "Right Card Shadow", section: "right-card-shadow" },
  ],
  slots: [...PHI_CMS_SPLIT_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsSplitCardLayoutConfig>;

export const PHI_THREE_COLUMN_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("three-column"),
  typeKey: "three-column",
  layoutKind: "threecol",
  slotSizePolicy: "fill-inline",
  title: "Three Column",
  description: "Fixed left, middle and right slots.",
  category: "structure",
  iconName: "three-column",
  defaultConfig: resolvePhiLayoutDefaults("threecol"),
  fields: [
    ...PHI_LAYOUT_PADDING_FIELDS,
    { key: "balancedSides", type: "boolean", label: "Balanced Sides" },
    { key: "leftWidth", type: "length", label: "Left Width", min: 0 },
    { key: "middleWidth", type: "length", label: "Middle Width", min: 0 },
    { key: "rightWidth", type: "length", label: "Right Width", min: 0 },
  ],
  slots: [...PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiCmsThreeColumnLayoutConfig>;

type PhiInternalRegionLayoutConfig = Record<string, never>;

export const PHI_STRUCTURE_REGION_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("structure-region"),
  typeKey: "structure-region",
  layoutKind: "grid",
  title: "Structure Region",
  description: "Preview shell layout for dev structure editing.",
  category: "workspace",
  iconName: "structure-region",
  fields: [],
  slots: [...PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiInternalRegionLayoutConfig>;

export const PHI_PAGE_REGION_LAYOUT_DEFINITION = {
  kind: "layout",
  pluginKey: resolvePhiCmsLayoutPluginKey("page-region"),
  typeKey: "page-region",
  layoutKind: "grid",
  title: "Page Region",
  description: "Preview page layout for dev page editing.",
  category: "workspace",
  iconName: "content",
  fields: [],
  slots: [...PHI_CMS_PAGE_REGION_LAYOUT_SLOTS],
} satisfies PhiCmsLayoutPluginDefinition<PhiInternalRegionLayoutConfig>;

export const PHI_CORE_LAYOUT_DEFINITIONS = [
  PHI_CONTENT_LAYOUT_DEFINITION,
  PHI_FORM_LAYOUT_DEFINITION,
  PHI_FLEX_LAYOUT_DEFINITION,
  PHI_FLEX_VERTICAL_LAYOUT_DEFINITION,
  PHI_COLLAPSIBLE_LAYOUT_DEFINITION,
  PHI_STACK_LAYOUT_DEFINITION,
  PHI_GRID_LAYOUT_DEFINITION,
  PHI_MASONRY_LAYOUT_DEFINITION,
  PHI_SPLIT_CARD_LAYOUT_DEFINITION,
  PHI_THREE_COLUMN_LAYOUT_DEFINITION,
  PHI_STRUCTURE_REGION_LAYOUT_DEFINITION,
  PHI_PAGE_REGION_LAYOUT_DEFINITION,
] as const;
