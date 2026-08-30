import type { PhiLayoutKind } from "../components/layouts/phi-layout-contract";
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
  layoutKind: PhiLayoutKind;
  slots: readonly PhiCmsLayoutSlotDefinition[];
  slotMode?: "named" | "sequential" | "single";
  allowReorder?: true;
  defaultAnchor?: PhiRenderableBlockAnchor | null;
  fields: readonly PhiCmsConfigField[];
};

export type PhiBuilderWidgetMeta = PhiBuilderPluginMetaBase & {
  kind: "widget";
  leaf: true;
  contentBinding?: PhiCmsWidgetContentBinding | null;
  signalSubcontrols?: readonly PhiCmsWidgetSignalSubcontrolCollection[];
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
