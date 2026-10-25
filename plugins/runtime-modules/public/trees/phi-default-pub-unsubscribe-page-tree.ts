import { PHI_TEXT_SOURCE_PRESET } from "../../../../helpers/text-source";
import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../ids";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import { buildPhiBasePageColumnFrame } from "../../../../components/regions/presets/phi-base-page-column";
import { PHI_LAYOUT } from "../../../../theme/phi-tokens";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import { PHI_SHARED_FORM_IDS } from "../../../../components/forms/shared-form-ids";

const SYNTHETIC_UNSUBSCRIBE_REGION_IDS = {
  regionContent: -260,
} as const;

/**
 * Where a circular's footer leads: one sentence and one button.
 *
 * Deliberately plain. This is not a page anybody came to read, and everything put in front of the button --
 * a marketing column, an offer to stay, a confirmation step -- is something between a person and leaving.
 *
 * The token comes out of the address and is never shown, which is why the Form carries a hidden field and
 * the placement maps the query into it. Pressing is a `POST`, and that is the whole reason this is a Form
 * rather than a link: mail clients and scanners fetch the links in a message before anybody has seen them,
 * so an address that acted on being fetched would unsubscribe people who never pressed anything.
 */
export async function buildPhiDefaultPubUnsubscribePageTree({
  page,
  presetKey,
}: {
  page: PhiCmsPageNode;
  presetKey: string;
}): Promise<PhiResolvedCmsPageTree> {
  const layoutIds = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey,
  }, ["layoutContent"]);
  const widgetIds = createPhiPresetCmsInstanceIdMap({
    domain: "page",
    ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey,
  }, ["widgetIntro", "widgetIncomplete", "widgetUnsubscribe"]);

  /*
   * Whether this visit carries a link at all, settled before anything renders -- so the two cases are two
   * placements with a condition on them rather than a branch inside a component that would have to know
   * about both. The same shape the password reset's two stages use.
   */
  const withToken = { source: "page", valuePath: "query.token", operator: "truthy" } as const;
  const withoutToken = { source: "page", valuePath: "query.token", operator: "falsy" } as const;

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    // On the base scaffold, in a column on the wash that stops at the reading measure.
    ...buildPhiBasePageColumnFrame({
      page,
      regionId: SYNTHETIC_UNSUBSCRIBE_REGION_IDS.regionContent,
      columnId: layoutIds.layoutContent,
      label: "pub unsubscribe page",
      maxWidth: PHI_LAYOUT.readingMax,
    }),
    contentWidgets: [
      nodes.widget({
        typeKey: "description",
        id: widgetIds.widgetIntro,
        parentLayoutNodeId: layoutIds.layoutContent,
        slotIndex: 0,
        sortOrder: 0,
        label: "pub unsubscribe intro widget",
        config: {
          textSource: PHI_TEXT_SOURCE_PRESET,
          title: "Stop receiving updates",
          description: "Press the button below and this site will send you no further updates.",
          visibleWhen: withToken,
        },
      }),
      /*
       * A link that arrived without its token is not an error to hide: somebody copied half an address out
       * of a mail, and the honest answer says where the working one is.
       */
      nodes.widget({
        typeKey: "description",
        id: widgetIds.widgetIncomplete,
        parentLayoutNodeId: layoutIds.layoutContent,
        slotIndex: 1,
        sortOrder: 0,
        label: "pub unsubscribe incomplete widget",
        config: {
          textSource: PHI_TEXT_SOURCE_PRESET,
          title: "This link is incomplete",
          description: "Open the unsubscribe link from the message itself, or use the most recent one you received.",
          tone: "secondary",
          visibleWhen: withoutToken,
        },
      }),
      nodes.widget({
        typeKey: "form",
        id: widgetIds.widgetUnsubscribe,
        parentLayoutNodeId: layoutIds.layoutContent,
        slotIndex: 2,
        sortOrder: 0,
        label: "pub unsubscribe widget",
        config: {
          formId: PHI_SHARED_FORM_IDS.unsubscribe,
          submit: "inline",
          submitOnEnter: false,
          formConfig: { initialValuesFromQuery: { token: "token" } },
          visibleWhen: withToken,
        },
      }),
    ],
  };
}
