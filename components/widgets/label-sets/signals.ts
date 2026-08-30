import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_SIGNALS_WIDGET_DEFAULT_LABELS,
  type PhiSignalsWidgetLabels,
} from "../label-types/signals";

const PHI_SIGNALS_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:signals",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.title,
    description: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.description,
    block_commands: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.commands,
    block_events: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.events,
    block_state: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.state,
    block_configured: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.configured,
    block_value: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.value,
    block_emits: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.emits,
    block_receives: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.receives,
    block_show_standard_channels: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.showStandardChannels,
    block_none: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.blocks.none,
    routes_title: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.title,
    routes_wire: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.wire,
    routes_modal_title: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.modalTitle,
    routes_direction: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.direction,
    routes_capability: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.capability,
    routes_channel: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.channel,
    routes_action: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.action,
    routes_value_type: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.valueType,
    routes_receiver: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.receiver,
    routes_sender_endpoint: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.senderEndpoint,
    routes_sender_output: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.senderOutput,
    routes_receiver_endpoint: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.receiverEndpoint,
    routes_receiver_input: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.receiverInput,
    routes_derived_scope: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.derivedScope,
    routes_route_preview: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.routePreview,
    routes_no_compatible_route: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.noCompatibleRoute,
    routes_duplicate_route: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.duplicateRoute,
    routes_unavailable_receiver: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.unavailableReceiver,
    routes_cancel: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.cancel,
    routes_apply: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.apply,
    routes_add: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.add,
    routes_update: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.update,
    routes_edit: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.edit,
    routes_delete: PHI_SIGNALS_WIDGET_DEFAULT_LABELS.routes.delete,
  },
});

export async function getPhiSignalsWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiSignalsWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_SIGNALS_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    blocks: {
      commands: labels.block_commands,
      events: labels.block_events,
      state: labels.block_state,
      configured: labels.block_configured,
      value: labels.block_value,
      emits: labels.block_emits,
      receives: labels.block_receives,
      showStandardChannels: labels.block_show_standard_channels,
      none: labels.block_none,
    },
    routes: {
      title: labels.routes_title,
      wire: labels.routes_wire,
      modalTitle: labels.routes_modal_title,
      direction: labels.routes_direction,
      capability: labels.routes_capability,
      channel: labels.routes_channel,
      action: labels.routes_action,
      valueType: labels.routes_value_type,
      receiver: labels.routes_receiver,
      senderEndpoint: labels.routes_sender_endpoint,
      senderOutput: labels.routes_sender_output,
      receiverEndpoint: labels.routes_receiver_endpoint,
      receiverInput: labels.routes_receiver_input,
      derivedScope: labels.routes_derived_scope,
      routePreview: labels.routes_route_preview,
      noCompatibleRoute: labels.routes_no_compatible_route,
      duplicateRoute: labels.routes_duplicate_route,
      unavailableReceiver: labels.routes_unavailable_receiver,
      cancel: labels.routes_cancel,
      apply: labels.routes_apply,
      add: labels.routes_add,
      update: labels.routes_update,
      edit: labels.routes_edit,
      delete: labels.routes_delete,
    },
  };
}
