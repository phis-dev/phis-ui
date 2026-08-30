type PhiCmsRegistryEntry = {
  key: string;
  exportName: string;
  pluginKey: string;
  typeKey: string;
  namespacedTypeKey: string;
  slots: readonly PhiCmsLayoutSlotDefinition[];
};

import type { PhiCmsLayoutSlotDefinition } from "../types/cms-plugins";
import { assertUniquePhiCmsRegistryKeys } from "./cms-registry";

function buildNamespacedTypeKey(
  pluginKey: string,
  typeKey: string,
) {
  return `${pluginKey}/${typeKey}`;
}

function defineLayoutType(
  pluginKey: string,
  typeKey: string,
) {
  return buildNamespacedTypeKey(pluginKey, typeKey);
}

const PHI_CMS_LAYOUT_PLUGIN_KEY_BASE = "@phis/ui/modules";

/** Same rule as Widget types: the owning module namespaces the Layout type. */
export const PHI_CMS_LAYOUT_PLUGIN_KEYS = {
  "builder": `${PHI_CMS_LAYOUT_PLUGIN_KEY_BASE}/builder/layouts`,
  "core": `${PHI_CMS_LAYOUT_PLUGIN_KEY_BASE}/core/layouts`,
} as const;

const PHI_CMS_LAYOUT_MODULE_BY_TYPE_KEY: Readonly<Record<string, keyof typeof PHI_CMS_LAYOUT_PLUGIN_KEYS>> = {
  "collapsible": "core",
  "content": "core",
  "flex": "core",
  "flex-vertical": "core",
  "form": "core",
  "grid": "core",
  "masonry": "core",
  "page-region": "builder",
  "split-card": "core",
  "stack": "core",
  "structure-region": "builder",
  "three-column": "core",
};

export function resolvePhiCmsLayoutPluginKey(typeKey: string): string {
  const moduleKey = PHI_CMS_LAYOUT_MODULE_BY_TYPE_KEY[typeKey];
  if (!moduleKey) {
    throw new Error(`Unknown CMS layout type key "${typeKey}".`);
  }
  return PHI_CMS_LAYOUT_PLUGIN_KEYS[moduleKey];
}
export const PHI_CMS_DEFAULT_SLOT_INDEX = 0;
export const PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX = {
  Left: 0,
  Right: 1,
} as const;
export const PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX = {
  Left: 0,
  Middle: 1,
  Right: 2,
} as const;

export const PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOT_INDEX = {
  HeaderTop: 0,
  HeaderMain: 1,
  SiderLeft: 2,
  FooterMain: 3,
  FooterBottom: 4,
} as const;

export const PHI_CMS_PAGE_REGION_LAYOUT_SLOT_INDEX = {
  HeaderBottom: 0,
  Hero: 1,
  Content: 2,
  SiderRight: 3,
  FooterTop: 4,
} as const;

export const PHI_CMS_DEFAULT_LAYOUT_SLOTS = [
  {
    key: "default",
    label: "Default",
    slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
    defaultAnchor: {
      horizontal: "center",
      vertical: "middle",
    },
  },
] as const satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS = Array.from({ length: 12 }, (_, index) => ({
  key: `slot_${index}`,
  label: `Slot ${index}`,
  slotIndex: index,
  sequential: true,
})) satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_FLEX_LAYOUT_SLOTS = PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS.map((slot) => ({
  ...slot,
  defaultAnchor: {
    horizontal: "left",
    vertical: "middle",
  },
})) satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_FLEX_VERTICAL_LAYOUT_SLOTS = PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS.map((slot) => ({
  ...slot,
  defaultAnchor: {
    horizontal: "center",
    vertical: "top",
  },
})) satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_MASONRY_LAYOUT_SLOTS = Array.from({ length: 12 }, (_, index) => ({
  key: `item_${index + 1}`,
  label: `Item ${index + 1}`,
  slotIndex: index,
  sequential: true,
})) satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_GRID_LAYOUT_SLOTS = PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS;
export const PHI_CMS_STACK_LAYOUT_SLOTS = PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS;
export const PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS = 12;
export const PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS = PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS;

export const PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS = [
  {
    key: "slot_0",
    label: "Slot 0",
    slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
  },
  {
    key: "slot_1",
    label: "Slot 1",
    slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
  },
  {
    key: "slot_2",
    label: "Slot 2",
    slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
  },
] as const satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOTS = [
  {
    key: "header_top",
    label: "Header Top",
    slotIndex: PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOT_INDEX.HeaderTop,
  },
  {
    key: "header_main",
    label: "Header Main",
    slotIndex: PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOT_INDEX.HeaderMain,
  },
  {
    key: "sider_left",
    label: "Sider Left",
    slotIndex: PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOT_INDEX.SiderLeft,
  },
  {
    key: "footer_main",
    label: "Footer Main",
    slotIndex: PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOT_INDEX.FooterMain,
  },
  {
    key: "footer_bottom",
    label: "Footer Bottom",
    slotIndex: PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOT_INDEX.FooterBottom,
  },
] as const satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_PAGE_REGION_LAYOUT_SLOTS = [
  {
    key: "header_bottom",
    label: "Header Bottom",
    slotIndex: PHI_CMS_PAGE_REGION_LAYOUT_SLOT_INDEX.HeaderBottom,
  },
  {
    key: "hero",
    label: "Hero",
    slotIndex: PHI_CMS_PAGE_REGION_LAYOUT_SLOT_INDEX.Hero,
  },
  {
    key: "content",
    label: "Content",
    slotIndex: PHI_CMS_PAGE_REGION_LAYOUT_SLOT_INDEX.Content,
  },
  {
    key: "sider_right",
    label: "Sider Right",
    slotIndex: PHI_CMS_PAGE_REGION_LAYOUT_SLOT_INDEX.SiderRight,
  },
  {
    key: "footer_top",
    label: "Footer Top",
    slotIndex: PHI_CMS_PAGE_REGION_LAYOUT_SLOT_INDEX.FooterTop,
  },
] as const satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PHI_CMS_SPLIT_LAYOUT_SLOTS = [
  {
    key: "slot_0",
    label: "Slot 0",
    slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Left,
  },
  {
    key: "slot_1",
    label: "Slot 1",
    slotIndex: PHI_CMS_SPLIT_LAYOUT_SLOT_INDEX.Right,
  },
] as const satisfies readonly PhiCmsLayoutSlotDefinition[];

export const PhiCmsLayoutType = {
  Content: defineLayoutType(resolvePhiCmsLayoutPluginKey("content"), "content"),
  Form: defineLayoutType(resolvePhiCmsLayoutPluginKey("form"), "form"),
  Flex: defineLayoutType(resolvePhiCmsLayoutPluginKey("flex"), "flex"),
  FlexVertical: defineLayoutType(resolvePhiCmsLayoutPluginKey("flex-vertical"), "flex-vertical"),
  Stack: defineLayoutType(resolvePhiCmsLayoutPluginKey("stack"), "stack"),
  Collapsible: defineLayoutType(resolvePhiCmsLayoutPluginKey("collapsible"), "collapsible"),
  Masonry: defineLayoutType(resolvePhiCmsLayoutPluginKey("masonry"), "masonry"),
  Grid: defineLayoutType(resolvePhiCmsLayoutPluginKey("grid"), "grid"),
  SplitCard: defineLayoutType(resolvePhiCmsLayoutPluginKey("split-card"), "split-card"),
  ThreeColumn: defineLayoutType(resolvePhiCmsLayoutPluginKey("three-column"), "three-column"),
  StructureRegion: defineLayoutType(resolvePhiCmsLayoutPluginKey("structure-region"), "structure-region"),
  PageRegion: defineLayoutType(resolvePhiCmsLayoutPluginKey("page-region"), "page-region"),
} as const;

const PHI_CMS_LAYOUT_REGISTRY_RAW = [
  {
    key: "content",
    exportName: "PhiContentLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("content"),
    typeKey: "content",
    namespacedTypeKey: PhiCmsLayoutType.Content,
    slots: PHI_CMS_DEFAULT_LAYOUT_SLOTS,
  },
  {
    key: "form",
    exportName: "PhiFormLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("form"),
    typeKey: "form",
    namespacedTypeKey: PhiCmsLayoutType.Form,
    slots: PHI_CMS_DEFAULT_LAYOUT_SLOTS,
  },
  {
    key: "flex",
    exportName: "PhiFlexLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("flex"),
    typeKey: "flex",
    namespacedTypeKey: PhiCmsLayoutType.Flex,
    slots: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  },
  {
    key: "flex_vertical",
    exportName: "PhiFlexVerticalLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("flex-vertical"),
    typeKey: "flex-vertical",
    namespacedTypeKey: PhiCmsLayoutType.FlexVertical,
    slots: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  },
  {
    key: "stack",
    exportName: "PhiStackLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("stack"),
    typeKey: "stack",
    namespacedTypeKey: PhiCmsLayoutType.Stack,
    slots: PHI_CMS_STACK_LAYOUT_SLOTS,
  },
  {
    key: "collapsible",
    exportName: "PhiCollapsibleLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("collapsible"),
    typeKey: "collapsible",
    namespacedTypeKey: PhiCmsLayoutType.Collapsible,
    slots: PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS,
  },
  {
    key: "masonry",
    exportName: "PhiMasonryLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("masonry"),
    typeKey: "masonry",
    namespacedTypeKey: PhiCmsLayoutType.Masonry,
    slots: PHI_CMS_MASONRY_LAYOUT_SLOTS,
  },
  {
    key: "grid",
    exportName: "PhiGridLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("grid"),
    typeKey: "grid",
    namespacedTypeKey: PhiCmsLayoutType.Grid,
    slots: PHI_CMS_GRID_LAYOUT_SLOTS,
  },
  {
    key: "split_card",
    exportName: "PhiSplitCardLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("split-card"),
    typeKey: "split-card",
    namespacedTypeKey: PhiCmsLayoutType.SplitCard,
    slots: PHI_CMS_SPLIT_LAYOUT_SLOTS,
  },
  {
    key: "three_column",
    exportName: "PhiThreeColumnLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("three-column"),
    typeKey: "three-column",
    namespacedTypeKey: PhiCmsLayoutType.ThreeColumn,
    slots: PHI_CMS_THREE_COLUMN_LAYOUT_SLOTS,
  },
  {
    key: "structure_region",
    exportName: "PhiStructureRegionLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("structure-region"),
    typeKey: "structure-region",
    namespacedTypeKey: PhiCmsLayoutType.StructureRegion,
    slots: PHI_CMS_STRUCTURE_REGION_LAYOUT_SLOTS,
  },
  {
    key: "page_region",
    exportName: "PhiPageRegionLayout",
    pluginKey: resolvePhiCmsLayoutPluginKey("page-region"),
    typeKey: "page-region",
    namespacedTypeKey: PhiCmsLayoutType.PageRegion,
    slots: PHI_CMS_PAGE_REGION_LAYOUT_SLOTS,
  },
 ] as const satisfies readonly PhiCmsRegistryEntry[];

function sortPhiCmsLayoutRegistryEntries(entries: readonly PhiCmsRegistryEntry[]) {
  return [...entries].sort((left, right) => {
    const typeCompare = left.typeKey.localeCompare(right.typeKey);
    if (typeCompare !== 0) {
      return typeCompare;
    }

    return left.key.localeCompare(right.key);
  });
}

export const PHI_CMS_LAYOUT_REGISTRY = sortPhiCmsLayoutRegistryEntries(PHI_CMS_LAYOUT_REGISTRY_RAW) as readonly PhiCmsRegistryEntry[];

assertUniquePhiCmsRegistryKeys("layout", PHI_CMS_LAYOUT_REGISTRY);

export function buildPhiCmsLayoutNamespacedTypeKey(
  pluginKey: string,
  typeKey: string,
) {
  return buildNamespacedTypeKey(pluginKey, typeKey);
}

export function splitPhiCmsLayoutNamespacedTypeKey(namespacedTypeKey: string) {
  const parts = namespacedTypeKey.split("/");
  if (parts.length < 2) {
    throw new Error(`Invalid CMS layout type key "${namespacedTypeKey}".`);
  }

  return {
    pluginKey: parts.slice(0, -1).join("/"),
    typeKey: parts[parts.length - 1],
  };
}

export const PHI_CMS_LAYOUT_REGISTRY_BY_NAMESPACED_KEY = new Map(
  PHI_CMS_LAYOUT_REGISTRY.map((entry) => [entry.namespacedTypeKey, entry]),
);
