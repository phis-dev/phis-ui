import { PhiCmsWidgetType, resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

/**
 * Where a message is written and a file is hung on it.
 *
 * One Widget rather than one per Module, because writing into a conversation is the same act whichever
 * kind of conversation it is: the Support Module and the groups Module place this rather than each
 * growing a composer of their own, and an attachment therefore behaves identically in all of them.
 *
 * It holds no thread of its own. Which conversation it writes into arrives as a runtime signal, which
 * is what lets it sit beside a conversation on a page without the two knowing each other's shape.
 */
export const PHI_THREAD_COMPOSER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("thread-composer"),
  typeKey: "thread-composer",
  title: "Conversation composer",
  description: "Writes a message into the selected conversation, with files from the viewer's own Space.",
  category: "content",
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "fields" | "parseConfig"
>;

export const PHI_THREAD_COMPOSER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ThreadComposer;
