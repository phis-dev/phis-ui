import type { PhiSurfacePolicy } from "./surface";
import type {
  PhiCmsBuilderWidgetPlugin,
  PhiCmsConfigField,
  PhiCmsLayoutPluginDefinition,
  PhiCmsLayoutPlugin,
  PhiCmsLayoutSlotDefinition,
  PhiCmsWidgetContentBinding,
  PhiCmsWidgetPlugin,
  PhiCmsWidgetPluginDefinition,
  PhiCmsWidgetSignalSubcontrolCollection,
} from "./cms-plugins";
import type { PhiRenderableBlockAnchor } from "./renderable-block";
import type { PhiCmsRegionOwnership } from "../helpers/cms-region-keys";
import type { PhiSlotSizePolicy } from "./slot-size-policy";
import type { PhiSignalPluginMeta } from "./signals";
import type { PhiCmsPluginCategory } from "../constants/cms-plugin-categories";

export type PhiBuilderPluginKind = "layout" | "widget";

export type PhiBuilderPluginMetaBase = {
  kind: PhiBuilderPluginKind;
  pluginKey: string;
  typeKey: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  iconName?: string | null;
  iconFamily?: string | null;
  iconKey?: string | null;
  category: PhiCmsPluginCategory;
  tags?: string[] | null;
  runtimeSignals?: PhiSignalPluginMeta | null;
  slotSizePolicy?: PhiSlotSizePolicy | null;
  defaultConfig?: Record<string, unknown> | null;
  resolvedDefaultConfig?: Record<string, unknown> | null;
};

export type PhiBuilderContainerMeta = PhiBuilderPluginMetaBase & {
  kind: "layout";
  slots: readonly PhiCmsLayoutSlotDefinition[];
  slotPositions: "compact" | "fixed";
  slotMode?: "named" | "sequential" | "single";
  allowReorder?: true;
  defaultAnchor?: PhiRenderableBlockAnchor | null;
  fields: readonly PhiCmsConfigField[];
};

export type PhiBuilderWidgetMeta = PhiBuilderPluginMetaBase & {
  kind: "widget";
  leaf: true;
  /** What the Widget declared about where it can stand; the insert picker is what reads it. */
  requiredRegionOwnership?: PhiCmsRegionOwnership | null;
  contentBinding?: PhiCmsWidgetContentBinding | null;
  translatesOwnText?: true;
  signalSubcontrols?: readonly PhiCmsWidgetSignalSubcontrolCollection[];
  /** Who draws the Widget's Surface; the Inspector offers no Surface section under `none`. */
  surface?: PhiSurfacePolicy | null;
  fields: readonly PhiCmsConfigField[];
};

export type PhiBuilderPluginMeta = PhiBuilderContainerMeta | PhiBuilderWidgetMeta;

export type { PhiCmsWidgetPluginDefinition } from "./cms-plugins";
export type { PhiCmsLayoutPluginDefinition } from "./cms-plugins";

export type PhiAnyCmsBuilderPlugin =
  | PhiCmsLayoutPlugin<unknown>
  | PhiCmsLayoutPluginDefinition<unknown>
  | PhiCmsWidgetPlugin<unknown>
  | PhiCmsBuilderWidgetPlugin<unknown>
  | PhiCmsWidgetPluginDefinition<unknown>;
