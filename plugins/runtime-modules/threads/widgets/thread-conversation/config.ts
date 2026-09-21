import { PhiCmsWidgetType, resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import { parsePhiThreadWidgetConfig, type PhiThreadWidgetConfig } from "../thread-widget-config";

/**
 * One conversation, read.
 *
 * The widget all three Modules share. A Support ticket's messages, a group's conversation and a note
 * from a colleague are the same thing read the same way -- the same attachment rules, the same withheld
 * notes, the same composer beneath it. What differs between them is the listing that led here, and a
 * listing is where a way of working belongs ([THREADS.md](../../../../../../phis-server/design/THREADS.md)
 * section 13).
 *
 * It holds no conversation of its own either. Which one it shows arrives as a runtime signal or as
 * `?thread=` on the address, and the one it opened itself it announces -- which is what makes the
 * composer beside it live.
 */
export const PHI_THREAD_CONVERSATION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("thread-conversation"),
  typeKey: "thread-conversation",
  title: "Conversation",
  description: "Reads the selected conversation: its messages, who wrote them, and what hangs on them.",
  category: "content",
  /*
   * What it is told, and the one thing it says back.
   *
   * `select` and `reload` are two capabilities rather than one because they mean different things to
   * whoever listens: a selection switches conversation, a reload says the open one has moved on. Folded
   * into one action, every reload would put the composer beside it through a switch -- which clears the
   * reply somebody is halfway through.
   *
   * `opened` is announced only for a conversation this Widget opened by itself, which is the `?thread=`
   * case. It carries no channel, like every emit: where the announcement goes is the route's business.
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
      {
        id: "reload",
        channel: "thread",
        action: "reload",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
      },
    ],
    emits: [
      { id: "opened", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection },
    ],
  },
  fields: [],
  parseConfig: parsePhiThreadWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiThreadWidgetConfig>,
  | "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category"
  | "runtimeSignals" | "fields" | "parseConfig"
>;

export const PHI_THREAD_CONVERSATION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ThreadConversation;
