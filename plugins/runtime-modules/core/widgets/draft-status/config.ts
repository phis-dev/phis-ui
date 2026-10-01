import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet, type PhiSignalRouteSet } from "../../../../../types/signals";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * The state of a draft, as the Controller that keeps it states it: unsaved, draft, published, or not
 * readable.
 *
 * The Widget knows nothing about what the draft is of. Its placement names the Controller twice --
 * `request` is where it asks when it mounts, `status` is what it hears back and every change after --
 * and the Controller answers in `PhiDraftStatusSignalValue`, subject included. So the Builder's
 * workspaces, the Theme, and a Module with drafts of its own place the same Widget, each pointing it at
 * their own Controller.
 */
export type PhiDraftStatusWidgetConfig = PhiCmsWidgetConfigBase & {
  signalRoutes?: PhiSignalRouteSet | null;
};

export function parsePhiDraftStatusWidgetConfig(config: Record<string, unknown>): PhiDraftStatusWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    signalRoutes: readPhiSignalRouteSet(config.signalRoutes),
  };
}

export const PHI_DRAFT_STATUS_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("draft-status"),
  typeKey: "draft-status",
  title: "Draft status",
  description: "Shows whether a Controller's draft is unsaved, saved as a draft, or published.",
  category: "content",
  iconFamily: "content",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    emits: [
      // Asked once on mount, so a Widget that comes up after the last change still starts out right.
      { id: "request", action: "activate", valueType: "none" },
    ],
    listens: [
      {
        id: "status",
        channel: "draftStatus",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      },
    ],
  },
  fields: [],
  defaultConfig: {},
  parseConfig: parsePhiDraftStatusWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiDraftStatusWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
