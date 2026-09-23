import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import {
  PHI_THREADS_CONTROLLER_KEY,
  PHI_THREADS_CONTROLLER_PLUGIN_KEY,
} from "./address";

export type PhiThreadsControllerConfig = {
  /**
   * Who this Controller speaks to, written by the Page that placed it.
   *
   * It used to speak to five Widget ids out of a preset id map, which worked because the same code
   * owned both ends and would have stopped working for a Site that rearranged the Page. A route set is
   * how every Widget already says the same thing, so the Controller now says it the same way.
   */
  signalRoutes: PhiSignalRouteSet | null;
};

/**
 * Turns "a row is selected" into "that conversation", and runs the dialog that opens a new one.
 *
 * The two ends speak different vocabularies and neither may learn the other's. A Table reports what a
 * generic Table reports -- `{ selectedRowIdentities }`, a list of row keys, which is true of every
 * Table on every Site and says nothing about conversations. The conversation and the composer read
 * `{ threadId }`, because that is what they are about. Labelling the first as the second would satisfy
 * every check on the route and hand the receiver a payload it cannot read.
 *
 * So the translation happens here, in domain code, which is the only place that may know that a row
 * key in this listing is a conversation id. The same is true of the answer the Form comes back with:
 * a Form reports an HTTP result, and only this Module knows that a conversation id is in it.
 *
 * Everything else it does is choreography no single Widget can do: the toolbar's `+` opens the dialog,
 * the dialog's buttons submit or cancel the Form inside it, and an accepted submit closes the dialog,
 * asks the listing to read itself again and announces the conversation that was just opened -- because
 * a person who opens one is already reading it. Who may do any of this is settled by the control plane.
 */
export const PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_THREADS_CONTROLLER_PLUGIN_KEY,
  key: PHI_THREADS_CONTROLLER_KEY,
  title: "Conversations Controller",
  description: "Carries the chosen conversation to the readers, and runs the dialog that opens a new one.",
  iconFamily: "threads",
  allowedMountScopes: ["page"],
  runtimeSignals: {
    emits: [
      {
        id: "threadChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
      },
      /*
       * The listing is ordered by last activity and carries an unread mark, so a message written on
       * this Page makes it stale -- and the Table is the one surface that cannot notice. It reloads
       * itself after its own mutations; this is for the write that happened somewhere else.
       */
      { id: "reload", action: "activate", valueType: "none" },
      { id: "dialogOpen", action: "activate", valueType: "none" },
      { id: "dialogClose", action: "close", valueType: "none" },
      { id: "formSubmit", action: "activate", valueType: "none" },
      { id: "formReset", action: "activate", valueType: "none" },
      { id: "submitting", action: "change", valueType: "boolean" },
      {
        id: "conditionStateChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      },
    ],
    listens: [
      {
        id: "selectionChange",
        channel: "selection",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableSelection,
      },
      {
        id: "written",
        channel: "thread",
        action: "reload",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.threadSelection,
      },
      {
        id: "actionActivate",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "formCommand", channel: "command", action: "activate", valueType: "string" },
      {
        id: "formSuccess",
        channel: "submit",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      },
      { id: "formSubmitting", channel: "submitting", action: "change", valueType: "boolean" },
      { id: "overlayState", channel: "state", action: "change", valueType: "boolean" },
      {
        id: "closeRequest",
        channel: "dialog",
        action: "close",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
      },
      // A Widget asking for the condition state is also what declares it needs this Controller, which
      // is how a `demand` Controller comes to be mounted at all.
      { id: "conditionStateRequest", channel: "condition", action: "reload", valueType: "none" },
    ],
  },
  defaultConfig: {},
  parseConfig: (raw): PhiThreadsControllerConfig => ({
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
  }),
} satisfies PhiRuntimeControllerDefinition<PhiThreadsControllerConfig>;
