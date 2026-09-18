import { PhiCmsWidgetType, resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { parsePhiPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";

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
  fields: [],
  parseConfig: parsePhiPaddingOnlyWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "fields" | "parseConfig"
>;

export const PHI_THREAD_CONVERSATION_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ThreadConversation;
