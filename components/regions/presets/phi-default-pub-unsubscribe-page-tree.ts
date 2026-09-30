import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";

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
    regions: [
      nodes.region({
        id: SYNTHETIC_UNSUBSCRIBE_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: layoutIds.layoutContent,
        sortOrder: 30,
      }),
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: layoutIds.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: "pub unsubscribe page",
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "description",
        id: widgetIds.widgetIntro,
        parentLayoutNodeId: layoutIds.layoutContent,
        slotIndex: 0,
        sortOrder: 0,
        label: "pub unsubscribe intro widget",
        config: {
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
          title: "This link is incomplete",
          description: "Open the unsubscribe link from the message itself, or use the most recent one you received.",
          type: "secondary",
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
