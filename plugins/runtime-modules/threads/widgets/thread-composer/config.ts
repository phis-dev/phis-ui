import { PhiCmsWidgetType, resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import { parsePhiThreadWidgetConfig, type PhiThreadWidgetConfig } from "../thread-widget-config";

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
  /*
   * The conversation channel, declared rather than agreed on between two clients.
   *
   * This is where something else docks: a link panel beside a ticket's conversation is wired by this
   * signal and nothing else ([THREADS.md] section 13), and a package from another repository cannot
   * find a channel that exists only as a string in two source files. Declaring it is also what lets a
   * Site place two conversations on one page and say which composer belongs to which.
   *
   * An emit names no channel on purpose -- `assertPhiSignalPluginMetaContract` refuses one. The sender
   * says what it sends, the route says where it goes, which is why `written` can be wired to the
   * conversation above it on one page and to a listing on another.
   */
  runtimeSignals: {
    listens: [
      {
        id: "select",
        channel: "thread",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
      },
    ],
    emits: [
      { id: "written", action: "reload", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection },
    ],
  },
  fields: [],
  parseConfig: parsePhiThreadWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiThreadWidgetConfig>,
  | "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category"
  | "runtimeSignals" | "fields" | "parseConfig"
>;

export const PHI_THREAD_COMPOSER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ThreadComposer;
