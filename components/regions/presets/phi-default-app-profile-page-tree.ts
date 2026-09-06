import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { buildPhiBasePageContentScaffold, PHI_BASE_PAGE_LAYOUT_NODE_ID } from "./phi-base-page-layout";
import { getPhiProfilePageLabels } from "./profile-label-set";

const REGION_CONTENT_ID = -286;

export async function buildPhiDefaultAppProfilePageTree({ page, runtime }: { page: PhiCmsPageNode; runtime: PhiBlockRuntime }): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiProfilePageLabels({ apiBaseUrl: runtime.phis.apiBaseUrl, internalToken: runtime.phis.internalToken, locale: runtime.locale.current });
  const widgets = createPhiPresetCmsInstanceIdMap({ domain: "page", ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, presetKey: "app-profile-page" }, ["overview", "name", "locale", "email", "password"]);
  const definitions = [
    [widgets.overview, "profile-overview", labels.overview],
    [widgets.name, "profile-name", labels.name],
    [widgets.locale, "profile-locale", labels.language],
    [widgets.email, "profile-email", labels.email],
    [widgets.password, "profile-password", labels.password],
  ] as const;
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: REGION_CONTENT_ID, regionConfig: { maxSize: { width: 960 }, margin: "0 auto", border: false } });
  return {
    page: { ...page, pageType: PhiCmsPageType.Standard, status: PhiCmsStatus.Published },
    pageMeta: { title: { msgId: 0, source: "Profile", value: labels.page }, description: null },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [scaffold.layoutNode],
    contentWidgets: definitions.map(([id, typeKey, label], index) => buildPhiCmsWidgetNode({ id, siteId: page.siteId, parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID, typeKey, slotIndex: index, sortOrder: index, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask, label, config: {}, contentId: null })),
  };
}
