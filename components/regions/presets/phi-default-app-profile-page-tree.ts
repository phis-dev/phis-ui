import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/auth/ids";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { getPhiProfilePageLabels } from "./profile-label-set";

const REGION_CONTENT_ID = -286;

export async function buildPhiDefaultAppProfilePageTree({ page, runtime }: { page: PhiCmsPageNode; runtime: PhiBlockRuntime }): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiProfilePageLabels({ apiBaseUrl: runtime.phis.apiBaseUrl, internalToken: runtime.phis.internalToken, locale: runtime.locale.current });
  const layouts = createPhiPresetCmsInstanceIdMap({ domain: "page", ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, presetKey: "app-profile-page" }, ["content"]);
  const widgets = createPhiPresetCmsInstanceIdMap({ domain: "page", ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID, presetKey: "app-profile-page" }, ["overview", "name", "locale", "email", "password"]);
  const definitions = [
    [widgets.overview, "profile-overview", labels.overview],
    [widgets.name, "profile-name", labels.name],
    [widgets.locale, "profile-locale", labels.language],
    [widgets.email, "profile-email", labels.email],
    [widgets.password, "profile-password", labels.password],
  ] as const;
  return {
    page: { ...page, pageType: PhiCmsPageType.Standard, status: PhiCmsStatus.Published },
    pageMeta: { title: { msgId: 0, source: "Profile", value: labels.page }, description: null },
    overlays: [],
    regions: [{ id: REGION_CONTENT_ID, pageId: page.id, areaPresetId: null, regionType: PhiCmsRegionType.Content, rootLayoutNodeId: layouts.content, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask, sortOrder: 30, config: { maxSize: { width: 960 }, margin: "0 auto", border: false } }],
    layoutNodes: [buildPhiCmsLayoutNode({ id: layouts.content, siteId: page.siteId, parentLayoutNodeId: null, creationPreset: { layoutKind: "verticalflex", preset: "panel" }, typeKey: "flex-vertical", slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX, sortOrder: 0, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask, label: labels.page, config: { gap: PHI_SPACE.lg, padding: PHI_SPACE.base, width: "100%", border: false } })],
    contentWidgets: definitions.map(([id, typeKey, label], index) => buildPhiCmsWidgetNode({ id, siteId: page.siteId, parentLayoutNodeId: layouts.content, typeKey, slotIndex: index, sortOrder: index, status: PhiCmsStatus.Published, flags: 0, visibilityMask: page.visibilityMask, label, config: {}, contentId: null })),
  };
}
