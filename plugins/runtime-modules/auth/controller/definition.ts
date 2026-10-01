import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";
import {
  PHI_ACCOUNTING_BASE_CONTROLLER_KEY,
  PHI_ACCOUNTING_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_APP_BASE_CONTROLLER_KEY,
  PHI_APP_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_AUTH_CONTROLLER_KEY,
  PHI_AUTH_CONTROLLER_PLUGIN_KEY,
  PHI_PUBLIC_BASE_CONTROLLER_KEY,
  PHI_PUBLIC_BASE_CONTROLLER_PLUGIN_KEY,
} from "./area-base-controller-addresses";

type PhiEmptyControllerConfig = Record<string, never>;

/**
 * What the Auth Controller is handed about the viewer before it renders.
 *
 * Declared here rather than beside the `serverPreload` that produces it, because the Client needs the
 * type and that module is `server-only` -- importing it from there would drag it into the Client graph
 * for a shape that is erased at compile time.
 */
export type PhiAuthControllerPreload = {
  /** What Core said, or null when this request carries no Session. */
  workflow: import("../../types/auth-manifest").PhiAuthWorkflow | null;
  /**
   * That Core could not be asked, which is not the same as nobody being signed in.
   *
   * Kept apart on purpose: folding an unreachable Core into "anonymous" is the fault
   * `fetchPhiAuthWorkflow` was just repaired for. The Controller then projects nothing rather than
   * asserting a state it does not know.
   */
  unavailable: boolean;
};

function createPhiEmptyControllerDefinition(
  pluginKey: string,
  key: string,
  title: string,
  iconFamily: string,
  areaBase = true,
) {
  return {
    kind: "controller",
    pluginKey,
    key,
    title,
    description: areaBase
      ? `Locked Area controller for ${title}.`
      : `Runtime module controller for ${title}.`,
    iconFamily,
    allowedMountScopes: ["area"],
    runtimeSignals: { emits: [], listens: [] },
    defaultConfig: {},
    parseConfig: (): PhiEmptyControllerConfig => ({}),
  } satisfies PhiRuntimeControllerDefinition<PhiEmptyControllerConfig>;
}

export const PHI_PUBLIC_BASE_CONTROLLER_DEFINITION = createPhiEmptyControllerDefinition(
  PHI_PUBLIC_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_PUBLIC_BASE_CONTROLLER_KEY, "Public Base Controller", "public",
);
export const PHI_APP_BASE_CONTROLLER_DEFINITION = createPhiEmptyControllerDefinition(
  PHI_APP_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_APP_BASE_CONTROLLER_KEY, "App Base Controller", "app",
);
export const PHI_AUTH_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_AUTH_CONTROLLER_PLUGIN_KEY,
  key: PHI_AUTH_CONTROLLER_KEY,
  title: "Auth Controller",
  description: "Coordinates the active Auth UI provider modal and workflow presentation state.",
  iconFamily: "auth",
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [
      { id: "loginOverlayOpen", action: "activate", valueType: "none" },
      { id: "loginOverlayClose", action: "close", valueType: "none" },
      {
        id: "loginValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      /*
       * Where a completed sign-in sends the visitor.
       *
       * Deciding it is this Controller's business -- the area they signed into, the page they were
       * headed for, whether that page still exists -- and performing it is the runtime's. The Login
       * form is told none of it: it submits, and what its answer means is read here.
       */
      {
        id: "navigate",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeNavigation,
      },
      /*
       * Where the viewer stands in signing in, for the Widgets that have to arrange themselves around
       * it. What travels is the machine's published statements and never its state keys, so a state
       * added later cannot change what a reader was told without its author saying so.
       */
      {
        id: "conditionStateChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      },
      /*
       * The workflow itself, for the one Widget that draws it.
       *
       * Separate from the statements above, and deliberately: those are what anybody may condition on,
       * this is the Module's own data and goes to the Widget that presents it. Broadcast in Area scope
       * rather than addressed, because the same Login preset is built twice -- once as the Public page
       * and once as an Area Overlay -- with different instance ids, so there is no one address to name.
       * Only one of them is ever on screen, and the other hears nothing it would act on.
       */
      {
        id: "authWorkflowChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.authWorkflowState,
      },
    ],
    listens: [
      { id: "loginOpen", channel: "command", action: "open", valueType: "path" },
      { id: "conditionStateRequest", channel: "condition", action: "reload", valueType: "none" },
      /*
       * Asked by a step Widget that mounted after the broadcast went out, which an Overlay body always
       * does: it mounts on first open. The same push-and-pull pair the condition channel uses, for the
       * same reason -- a broadcast is not held for a receiver that does not exist yet.
       */
      { id: "authWorkflowRequest", channel: "workflow", action: "reload", valueType: "none" },
      {
        id: "loginResult",
        channel: "submit",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      },
      { id: "loginClose", channel: "command", action: "close", valueType: "none" },
      {
        id: "loginOverlayCloseRequest",
        channel: "dialog",
        action: "close",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.overlayCloseRequest,
      },
    ],
  },
  defaultConfig: {},
  parseConfig: (): PhiEmptyControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<PhiEmptyControllerConfig>;
export const PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION = createPhiEmptyControllerDefinition(
  PHI_ACCOUNTING_BASE_CONTROLLER_PLUGIN_KEY,
  PHI_ACCOUNTING_BASE_CONTROLLER_KEY, "Accounting Base Controller", "accounting",
);
