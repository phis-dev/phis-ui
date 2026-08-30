import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiAnchorWidgetPlacement } from "../../../../../components/controls/phi-anchor-control-contract";
import { isPhiCmsPluginCategory, type PhiCmsPluginCategory } from "../../../../../constants/cms-plugin-categories";

export type PhiStructureRegionPickItem = {
  key: string;
  kind: "layout" | "widget";
  origin: string | null;
  packageName: string | null;
  title: string;
  description: string | null;
  category: PhiCmsPluginCategory | null;
  tags: string[] | null;
  icon: string | null;
  defaultAnchor?: PhiAnchorWidgetPlacement | null;
  defaultConfig?: Record<string, unknown> | null;
};

export type PhiStructureRegionWidgetConfig = {
  slotKind?: "structure" | "content";
  origin?: string;
  regionKey?: string;
  title?: string;
  subtitle?: string | null;
  allowSelect?: boolean;
  allowInsert?: boolean;
  pickItems?: PhiStructureRegionPickItem[];
  fallbackMinHeight?: number;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readPickItems(value: unknown): PhiStructureRegionPickItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const key = readString(record.key);
      const kind = record.kind === "layout" || record.kind === "widget"
        ? record.kind
        : null;
      const title = readString(record.title);
      if (!key || !kind || !title) {
        return null;
      }

      return {
        key,
        kind,
        origin: readString(record.origin) ?? null,
        packageName: readString(record.packageName) ?? null,
        title,
        description: readString(record.description) ?? null,
        category: isPhiCmsPluginCategory(record.category) ? record.category : null,
        tags: Array.isArray(record.tags)
          ? record.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
          : null,
        icon: readString(record.icon) ?? null,
        defaultAnchor:
          typeof record.defaultAnchor === "string"
            ? (record.defaultAnchor as PhiAnchorWidgetPlacement)
            : null,
        defaultConfig:
          record.defaultConfig && typeof record.defaultConfig === "object" && !Array.isArray(record.defaultConfig)
            ? { ...(record.defaultConfig as Record<string, unknown>) }
            : null,
      };
    })
    .filter((item) => item !== null);

  return items.length > 0 ? (items as PhiStructureRegionPickItem[]) : undefined;
}

function parseStructureRegionWidgetConfig(raw: Record<string, unknown>): PhiStructureRegionWidgetConfig {
  return {
    slotKind: raw.slotKind === "content" ? "content" : "structure",
    origin: readString(raw.origin),
    regionKey: readString(raw.regionKey),
    title: readString(raw.title),
    subtitle: readString(raw.subtitle),
    allowSelect: readBoolean(raw.allowSelect),
    allowInsert: readBoolean(raw.allowInsert),
    pickItems: readPickItems(raw.pickItems),
    fallbackMinHeight: readNumber(raw.fallbackMinHeight),
  };
}

export const PHI_STRUCTURE_REGION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("structure-region"),
  typeKey: "structure-region",
  title: "Structure Region",
  description: "Region preview widget for the Builder structure workspace.",
  category: "workspace",
  iconFamily: "builder",
  slotSizePolicy: "fill",
  fields: [
    { key: "regionKey", type: "string", label: "Region Key" },
    { key: "title", type: "string", label: "Title" },
    { key: "subtitle", type: "string", label: "Subtitle" },
    { key: "allowSelect", type: "boolean", label: "Allow Select" },
    { key: "allowInsert", type: "boolean", label: "Allow Insert" },
  ],
  parseConfig: parseStructureRegionWidgetConfig,
} satisfies Omit<PhiCmsWidgetPlugin<PhiStructureRegionWidgetConfig>, "render" | "renderPreview">;
