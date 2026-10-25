import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { readPhiTextSource, type PhiTextSource } from "../../../../../helpers/text-source";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readRenderableBlockConfig, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_TEXT_TONE_FIELD_OPTIONS,
  readPhiTextTone,
  type PhiTextTone,
} from "../../../../../components/widgets/config/text-tone";
import {
  buildPhiBulletListFields,
  readPhiBulletListEntries,
  readPhiBulletListStyle,
  type PhiBulletListEntry,
  type PhiBulletListStyle,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";
import { PHI_SURFACE_CARD } from "../../../../../helpers/surface-presets";

export type PhiCmsDescriptionWidgetConfig = PhiCmsWidgetConfigBase & {
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  /** The aside's entries, drawn as a list (`components/controls/phi-bullet-list-control.tsx`). */
  asideItems?: PhiBulletListEntry[];
  /** How the aside's list is set. */
  asideList?: PhiBulletListStyle;
  footer?: string;
  /** The tone of the description text; absent is the default secondary text. */
  tone?: PhiTextTone;
  /** `"preset"` while the words are a Preset's and translated globally (`helpers/text-source.ts`). */
  textSource?: PhiTextSource;
};

function parsePhiCmsDescriptionWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsDescriptionWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    eyebrow: readString(config.eyebrow),
    title: readString(config.title),
    description: readString(config.description),
    asideTitle: readString(config.asideTitle),
    asideItems: readPhiBulletListEntries(config.asideItems),
    asideList: readPhiBulletListStyle(config.asideList),
    footer: readString(config.footer),
    tone: readPhiTextTone(config.tone),
    textSource: readPhiTextSource(config.textSource),
  };
}

export const PHI_DESCRIPTION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("description"),
  typeKey: "description",
  translatesOwnText: true,
  slotSizePolicy: "intrinsic",
  title: "Description",
  category: "content",
  description: "Introductory text block with eyebrow, title, body, a list, and footer.",
  iconFamily: "basic",
  fields: [
    { key: "eyebrow", type: "string", label: "Eyebrow" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "asideTitle", type: "string", label: "Aside Title" },
    { key: "asideItems", type: "string", label: "Aside Items", editorPlacement: "toolbar" },
    { key: "footer", type: "string", label: "Footer" },
    { key: "tone", type: "choice", label: "Tone", options: [...PHI_TEXT_TONE_FIELD_OPTIONS] },
    ...buildPhiBulletListFields("asideList", "List"),
  ],
  /*
   * A new Description's entries stand in cards, as they always have. Written in rather than a default:
   * "None" for the entries is stored, and a default would draw the cards again under it.
   */
  creationConfig: { asideList: { itemSurface: PHI_SURFACE_CARD } },
  parseConfig: parsePhiCmsDescriptionWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsDescriptionWidgetConfig>,
  "translatesOwnText" | "creationConfig" | "kind" | "pluginKey" | "typeKey" | "slotSizePolicy" | "title" | "description" | "category" | "iconFamily" | "fields" | "parseConfig"
>;

export const PHI_DESCRIPTION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Description;
