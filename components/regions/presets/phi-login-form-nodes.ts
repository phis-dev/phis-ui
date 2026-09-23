import { localizeAreaPath } from "../../../helpers/locale";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import { PHI_AUTH_RUNTIME_MODULE_FEATURE_NAMESPACE } from "../../../plugins/runtime-modules/auth/ids";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import {
  createPhiSignalAddress,
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiControllerSignalAddress,
  type PhiSignalAddress,
} from "../../../types/signals";
import { PHI_AUTH_MACHINE_STATEMENTS } from "../../../plugins/runtime-modules/auth/machine";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutNode } from "../../../types/cms";

/**
 * What the Login is made of, wherever it appears, said once.
 *
 * There are two Logins -- the Overlay the Shell opens and the `/login` page -- and they stand on
 * different surfaces, but what they are made of must not differ: the same form, the same providers, the
 * same second step. Those had drifted before, the page running on the default column while the Overlay
 * set its own.
 *
 * None of it is one component. A password form, a row of identity providers, a second factor and the
 * confirmation for an account that already exists are four separate things that happen to appear in one
 * place; each is placed on its own and says for itself when it belongs on screen. Chrome is deliberately
 * absent here: padding, background and width belong to the surface, and a dialog is not a page.
 */

/**
 * Where the label column ends, on the 24-track form grid (LAYOUTING.md, "Form grid").
 *
 * Line 9 is a third of the width: enough for "Password" beside its input without the input growing
 * short, in a dialog narrow enough to read as a dialog.
 */
export const PHI_LOGIN_FORM_LAYOUT_CONFIG = {
  labelEnd: 9,
} as const;

function feature(key: string) {
  return {
    source: "feature",
    valuePath: `${PHI_AUTH_RUNTIME_MODULE_FEATURE_NAMESPACE}.${key}`,
    operator: "truthy",
  } as const;
}

/**
 * That this is a place where somebody may start signing in.
 *
 * Read from the step Widget, but no longer decided there: it is the Auth machine's published statement,
 * passed on. The Widget used to report `active` about itself and this asked for the negation of it --
 * right until the machine gained a state, then silently wrong, because a negation over an open set of
 * states cannot account for what it has not been told about. `awaitingCredentials` is true only in the
 * states where credentials really are the next thing, so a state added later has to opt in.
 *
 * `whenUnavailable: "matched"` because a page that has just opened is the ordinary case: nobody is
 * part-way through a second factor, and waiting would leave the sign-in form absent until hydration.
 */
function awaitingCredentials(stepAddress: PhiSignalAddress) {
  return {
    source: "widget",
    widgetAddress: stepAddress,
    valuePath: PHI_AUTH_MACHINE_STATEMENTS.awaitingCredentials,
    operator: "truthy",
    whenUnavailable: "matched",
  } as const;
}

export type PhiLoginNodeIds = {
  widgetLogin: PhiCmsInstanceId;
  widgetMethods: PhiCmsInstanceId;
  widgetStep: PhiCmsInstanceId;
  widgetProviderLink: PhiCmsInstanceId;
};

export type PhiLoginNodesOptions = {
  ids: PhiLoginNodeIds;
  siteId: number;
  visibilityMask: number;
  parentLayoutNodeId: PhiCmsInstanceId;
  locale: string;
  /** The Controller that decides where a finished sign-in goes, and performs nothing itself. */
  authControllerAddress: PhiControllerSignalAddress;
  /** The first free slot on the surface this is placed on. */
  slotIndex?: number;
};

export function buildPhiLoginNodes({
  ids,
  siteId,
  visibilityMask,
  parentLayoutNodeId,
  locale,
  authControllerAddress,
  slotIndex = 0,
}: PhiLoginNodesOptions): {
  layoutNodes: PhiCmsLayoutNode[];
  contentWidgets: PhiCmsContentWidgetNode[];
} {
  const stepAddress = createPhiSignalAddress("cms", ids.widgetStep);
  /*
   * The step Widget passes on what the Controller told it, because the Controller cannot be asked.
   *
   * A `controller` condition needs a `conditionStateRequest` route to ask along, and that route is also
   * what materializes the Controller -- at the scope of the tree the asking node sits in. These nodes
   * sit in a Page, and the Auth Controller allows `area` only, so the question is refused outright:
   * "Runtime controller \"default\" cannot be mounted at \"page\" scope". Relaying keeps the answer's
   * origin where it now belongs -- the machine -- and only the last hop is a neighbour.
   */
  const relayStatementRoute = (routeKey: string, receiver: PhiSignalAddress) => ({
    routeKey,
    capabilityId: "conditionStateChange",
    scope: "area" as const,
    channel: "condition",
    action: "change" as const,
    valueType: "json" as const,
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
    receiver,
  });
  const nodes = createPhiCmsPresetNodes({ siteId, visibilityMask });
  /*
   * Both the form and the step report the same way, so the Controller reads one answer rather than two.
   */
  const reportResultRoute = (routeKey: string) => ({
    emits: [{
      routeKey,
      capabilityId: "submitSuccess",
      scope: "area" as const,
      channel: "submit",
      action: "activate" as const,
      valueType: "json" as const,
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      receiver: authControllerAddress,
    }],
  });

  return {
    layoutNodes: [],
    contentWidgets: [
      /*
       * The second factor stands first, because when it is running it is the only thing to do. It places
       * itself whether or not it has anything to show and reports which of the two it is.
       */
      nodes.widget({
        typeKey: "auth-workflow",
        id: ids.widgetStep,
        parentLayoutNodeId,
        slotIndex,
        sortOrder: slotIndex,
        label: "login second factor",
        config: {
          signalRoutes: {
            emits: [
              ...reportResultRoute("login-step-result").emits,
              relayStatementRoute("login-step-state", createPhiSignalAddress("cms", ids.widgetLogin)),
              relayStatementRoute("login-step-state-methods", createPhiSignalAddress("cms", ids.widgetMethods)),
              {
                routeKey: "login-step-workflow-request",
                capabilityId: "authWorkflowRequest",
                scope: "area" as const,
                channel: "workflow",
                action: "reload" as const,
                valueType: "none" as const,
                receiver: authControllerAddress,
              },
            ],
            listens: [{
              routeKey: "login-step-workflow",
              capabilityId: "authWorkflowChange",
              scope: "area" as const,
              channel: "workflow",
              action: "change" as const,
              valueType: "json" as const,
              valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.authWorkflowState,
              receiver: createPhiSignalAddress("cms", ids.widgetStep),
            }],
          },
        },
      }),
      nodes.widget({
        typeKey: "form",
        id: ids.widgetLogin,
        parentLayoutNodeId,
        slotIndex: slotIndex + 1,
        label: "login form",
        config: {
          formId: PHI_SHARED_FORM_IDS.login,
          // Declared, unnamed: the Login's own label set says "Sign in", in the language it is read in.
          submit: {},
          /*
           * The page they were headed for travels with the submit, so the handler can answer with it.
           * A refused page sends them here as `/login?next=…`, and the hidden `next` field is where that
           * belongs -- nobody types it, and the placement is what knows it is in the address.
           */
          formConfig: { initialValuesFromQuery: { next: "next" } },
          /*
           * The two ways out, in the Widget so that they stand in the same column as the inputs above
           * them. Unnamed here as well: each takes its wording from `actions.<key>Label` of the Login's
           * own label set, and the Site's registration setting decides whether the second is offered.
           */
          links: [
            { key: "forgotPassword", href: localizeAreaPath(locale, "public", "/reset-password") },
            {
              key: "register",
              href: localizeAreaPath(locale, "public", "/register"),
              requiresFeature: `${PHI_AUTH_RUNTIME_MODULE_FEATURE_NAMESPACE}.registration`,
            },
          ],
          visibleWhen: {
            match: "all",
            conditions: [feature("password"), awaitingCredentials(stepAddress)],
          },
          signalRoutes: {
            emits: [
              ...reportResultRoute("login-result").emits,
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "auth-methods",
        id: ids.widgetMethods,
        parentLayoutNodeId,
        slotIndex: slotIndex + 2,
        label: "login methods",
        config: {
          visibleWhen: {
            match: "all",
            conditions: [feature("external"), awaitingCredentials(stepAddress)],
          },
        },
      }),
      /*
       * Only reached by coming back from a provider that recognised an address already in use here.
       * The address says so, which is why this needs nothing from the form beside it.
       */
      nodes.widget({
        typeKey: "form",
        id: ids.widgetProviderLink,
        parentLayoutNodeId,
        slotIndex: slotIndex + 3,
        label: "login provider link confirmation",
        config: {
          formId: PHI_SHARED_FORM_IDS.providerLinkConfirmation,
          submit: {},
          execution: { mode: "handler", phase: "confirm" },
          visibleWhen: {
            source: "page",
            valuePath: "query.auth",
            operator: "equals",
            value: "link_required",
          },
          signalRoutes: reportResultRoute("login-provider-link-result"),
        },
      }),
    ],
  };
}
