export type PhiSignalsWidgetLabels = {
  title: string;
  description: string;
  blocks: {
    commands: string;
    events: string;
    state: string;
    configured: string;
    value: string;
    emits: string;
    receives: string;
    showStandardChannels: string;
    none: string;
  };
  routes: {
    title: string;
    wire: string;
    modalTitle: string;
    direction: string;
    capability: string;
    channel: string;
    action: string;
    valueType: string;
    receiver: string;
    senderEndpoint: string;
    senderOutput: string;
    receiverEndpoint: string;
    receiverInput: string;
    derivedScope: string;
    routePreview: string;
    noCompatibleRoute: string;
    duplicateRoute: string;
    unavailableReceiver: string;
    cancel: string;
    apply: string;
    add: string;
    update: string;
    edit: string;
    delete: string;
  };
};

export const PHI_SIGNALS_WIDGET_DEFAULT_LABELS: PhiSignalsWidgetLabels = {
  title: "Signals",
  description: "Declarative signal contract for this widget.",
  blocks: {
    commands: "Commands",
    events: "Events",
    state: "State",
    configured: "Configured",
    value: "Value",
    emits: "Emits",
    receives: "Receives",
    showStandardChannels: "Standard channels",
    none: "none",
  },
  routes: {
    title: "Routes",
    wire: "Wire…",
    modalTitle: "Wire signal",
    direction: "Direction",
    capability: "Capability",
    channel: "Channel",
    action: "Action",
    valueType: "Value type",
    receiver: "Receiver",
    senderEndpoint: "Sender endpoint",
    senderOutput: "Sender output",
    receiverEndpoint: "Receiver endpoint",
    receiverInput: "Receiver input",
    derivedScope: "Derived scope",
    routePreview: "Route preview",
    noCompatibleRoute: "No compatible route",
    duplicateRoute: "This route already exists.",
    unavailableReceiver: "Configured receiver is unavailable",
    cancel: "Cancel",
    apply: "Apply",
    add: "Add route",
    update: "Update route",
    edit: "Edit",
    delete: "Delete",
  },
};
