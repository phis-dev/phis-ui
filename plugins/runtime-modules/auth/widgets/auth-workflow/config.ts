import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type {
  PhiCmsWidgetPlugin,
  PhiCmsWidgetRuntimeControllerRequirementResolver,
} from "../../../../../types";
import {
  findPhiSignalRoutesByCapabilityId,
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiControllerSignalAddressParts,
  readPhiSignalRouteSet,
} from "../../../../../types/signals";

/**
 * The step that follows a password, when the account asks for one.
 *
 * It is not part of the Login form and never was: the form asks for an address and a password, and a
 * second factor is a different question asked of somebody who has already answered the first. It stands
 * beside the form, listens for the answer the form got back, and takes over when that answer says the
 * sign-in is not finished.
 */
export type PhiCmsAuthWorkflowWidgetConfig = {
  signalRoutes: ReturnType<typeof readPhiSignalRouteSet>;
};

export function parsePhiAuthWorkflowWidgetConfig(
  rawConfig: Record<string, unknown>,
): PhiCmsAuthWorkflowWidgetConfig {
  return { signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes) };
}

/**
 * The Controller this step asks where signing in stands, mounted wherever the step is placed.
 *
 * Read from the placement's own `authWorkflowRequest` route, not written in here: the step names the
 * Auth UI provider's Controller it was wired to, so a different provider's Controller is mounted by the
 * same rule. The Auth Controller is mounted on demand -- with the login Overlay's zones, or on a
 * sign-in Page -- and this is the demand.
 */
const requireAuthWorkflowController: PhiCmsWidgetRuntimeControllerRequirementResolver<
  PhiCmsAuthWorkflowWidgetConfig
> = ({ config }) => findPhiSignalRoutesByCapabilityId(config.signalRoutes?.emits, "authWorkflowRequest")
  .flatMap((route) => {
    const parts = readPhiControllerSignalAddressParts(route.receiver);
    return parts ? [{ type: parts.type, instanceKey: parts.instanceKey, enabled: true }] : [];
  });

export const PHI_AUTH_WORKFLOW_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("auth-workflow"),
  typeKey: "auth-workflow",
  title: "Authentication Step",
  description: "Carries a sign-in through a second factor when the account requires one.",
  category: "account",
  tags: ["auth", "login", "totp"],
  icon: "antd:safety-certificate",
  slotSizePolicy: "fill-inline",
  requiredRuntimeControllers: requireAuthWorkflowController,
  runtimeSignals: {
    emits: [
      /*
       * The finished sign-in, in the same shape the Form Widget reports one.
       *
       * Where a completed authentication sends the visitor is one decision, and it belongs to the Auth
       * Controller whether the password alone settled it or a second factor did. Reporting it the same
       * way means there is one answer to read rather than two to keep in step.
       */
      {
        id: "submitSuccess",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      },
      /*
       * Asked once on mount, for the case this Widget was not there when the Controller last said
       * where signing in stands -- which is every time the Login is an Overlay, since an Overlay body
       * mounts on first open.
       */
      { id: "authWorkflowRequest", action: "reload", valueType: "none" },
      /*
       * The machine's statement, carried the last hop to the Widgets beside this one, so that this step
       * stays the one Widget that demands the Auth Controller and the others depend on the step alone.
       */
      {
        id: "conditionStateChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      },
    ],
    listens: [
      /*
       * The workflow, from the Auth Controller and no longer from the login form.
       *
       * Reading the form's answer directly is what tied this step to a single page view: a reload
       * emptied it, and Core would still have answered the same question. The Controller reads it
       * while the page renders and hands it over; this draws it.
       */
      {
        id: "authWorkflowChange",
        channel: "workflow",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.authWorkflowState,
      },
    ],
  },
  fields: [],
  defaultConfig: { signalRoutes: null },
  parseConfig: parsePhiAuthWorkflowWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsAuthWorkflowWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "requiredRuntimeControllers"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
