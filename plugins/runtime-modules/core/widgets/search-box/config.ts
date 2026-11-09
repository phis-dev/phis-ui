import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiControlSize } from "../../../../../types/control";
import { readPhiLinkTarget, type PhiLinkTarget } from "../../../../../types/references";
import {
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

const PHI_SEARCH_BOX_SIZES = ["small", "medium", "large"] as const satisfies readonly PhiControlSize[];

/**
 * The box a visitor types a search into (SEARCH.md).
 *
 * It is a form the browser submits: `GET` to the results Page, the query in the URL. So it works before
 * anything hydrated and in a static render, where no script has run yet; and the results Page reads the
 * same URL whether it was reached from here, from a bookmark or from a link somebody pasted.
 */
export type PhiSearchBoxWidgetConfig = PhiCmsWidgetConfigBase & {
  /** What the empty box says; empty for the label set's word. The author's text, translated. */
  placeholder: string;
  /**
   * Where the query goes: a results Page, as a reference (REFERENCES.md). Absent, the Area's own search
   * Page -- the App's in App, the Public one everywhere else -- so a box dropped into a Page works
   * without being told where.
   */
  linkTarget?: PhiLinkTarget;
  /** The field's size; `size` is the block's own geometry and cannot be this. */
  controlSize?: PhiControlSize;
};

function normalizePhiSearchBoxWidgetConfig(raw: Record<string, unknown>): PhiSearchBoxWidgetConfig {
  return {
    ...readRenderableBlockConfig(raw),
    placeholder: readString(raw.placeholder)?.trim() ?? "",
    linkTarget: readPhiLinkTarget(raw.linkTarget) ?? undefined,
    controlSize: (PHI_SEARCH_BOX_SIZES as readonly unknown[]).includes(raw.controlSize)
      ? raw.controlSize as PhiControlSize
      : undefined,
  };
}

export const PHI_SEARCH_BOX_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("search-box"),
  typeKey: "search-box",
  title: "Search Box",
  description: "A box that sends what a visitor types to the Site's search results page.",
  category: "navigation",
  tags: ["search", "find", "navigation"],
  translatesOwnText: true,
  icon: "antd:search",
  slotSizePolicy: "fill-inline",
  fields: [
    { key: "placeholder", type: "string", label: "Placeholder", description: "Empty shows \"Search\"." },
    {
      key: "linkTarget",
      type: "link-target",
      heading: "Results",
      label: "Results page",
      description: "Where the query is answered. Empty is this Area's own search page.",
    },
    {
      key: "controlSize",
      type: "choice",
      label: "Size",
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
      ],
    },
  ],
  defaultConfig: normalizePhiSearchBoxWidgetConfig({}),
  parseConfig: normalizePhiSearchBoxWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSearchBoxWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "translatesOwnText"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
