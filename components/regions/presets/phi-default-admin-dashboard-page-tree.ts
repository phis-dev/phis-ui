import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/dashboard/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { getResolvedSiteStats } from "../../../gateway/site-stats";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { formatPhiTranslation } from "../../../helpers/translation-format";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { getPhiAdminDashboardPageLabels } from "./admin-dashboard-label-set";

const SYNTHETIC_ADMIN_DASHBOARD_REGION_IDS = {
  regionContent: -410,
} as const;

const SYNTHETIC_ADMIN_DASHBOARD_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "admin-dashboard-page",
}, [
  "layoutGrid",
]);

const SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "admin-dashboard-page",
}, [
  "widgetUptime",
  "widgetUsers",
  "widgetDefaultLocale",
  "widgetLocales",
]);

function formatDashboardUptime(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatLocaleCodes(
  locales: Array<{
    code: string;
    label: string;
  }>,
) {
  return locales
    .map((locale) => locale.code.trim())
    .filter(Boolean)
    .join(", ");
}

export async function buildPhiDefaultAdminDashboardPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const availableLocales = runtime.site.availableLocales ?? [];
  const currentLocale = runtime.locale.current;
  const availableLocaleCodes = formatLocaleCodes(availableLocales);
  const labels = await getPhiAdminDashboardPageLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const userCount = (await getResolvedSiteStats({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
  })).userCount;
  const availableLocaleCount = availableLocales.length;
  const uptimeText = formatDashboardUptime(process.uptime());
  const availableLocaleMeta = formatPhiTranslation(labels.localesMeta, availableLocaleCount);

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    pageMeta: {
      title: { msgId: 0, source: "Dashboard", value: labels.pageTitle },
      description: { msgId: 0, source: "Review the current site status and core runtime counters at a glance.", value: labels.pageDescription },
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_ADMIN_DASHBOARD_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_ADMIN_DASHBOARD_LAYOUT_IDS.layoutGrid,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 1120 },
          margin: "0 auto",
          border: false,
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        id: SYNTHETIC_ADMIN_DASHBOARD_LAYOUT_IDS.layoutGrid,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "grid", preset: "panel" },
        typeKey: "grid",
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "admin dashboard grid",
        config: {
          align: "stretch",
          justify: "start",
          wrap: false,
          columnGap: PHI_SPACE.base,
          slotPlacements: [
            { slotIndex: 0, span: { compact: 24, medium: 12, wide: 12 } },
            { slotIndex: 1, span: { compact: 24, medium: 12, wide: 12 } },
            { slotIndex: 2, span: { compact: 24, medium: 12, wide: 12 } },
            { slotIndex: 3, span: { compact: 24, medium: 12, wide: 12 } },
          ],
        },
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS.widgetUptime,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_DASHBOARD_LAYOUT_IDS.layoutGrid,
        typeKey: "card",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.uptimeTitle,
        config: {
          eyebrow: labels.runtimeEyebrow,
          title: uptimeText,
          description: labels.uptimeDescription,
          meta: labels.uptimeMeta,
          highlight: true,
          variant: "compact",
          translate: false,
        },
      }),
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS.widgetUsers,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_DASHBOARD_LAYOUT_IDS.layoutGrid,
        typeKey: "card",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.accountsTitle,
        config: {
          eyebrow: labels.accountsEyebrow,
          title: String(userCount),
          description: labels.accountsDescription,
          meta: labels.accountsMeta,
          variant: "compact",
          translate: false,
        },
      }),
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS.widgetDefaultLocale,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_DASHBOARD_LAYOUT_IDS.layoutGrid,
        typeKey: "card",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[2].slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.localeTitle,
        config: {
          eyebrow: labels.localeEyebrow,
          title: currentLocale,
          description: labels.localeDescription,
          meta: labels.localeMeta,
          variant: "compact",
          translate: false,
        },
      }),
      buildPhiCmsWidgetNode({
        id: SYNTHETIC_ADMIN_DASHBOARD_WIDGET_IDS.widgetLocales,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_ADMIN_DASHBOARD_LAYOUT_IDS.layoutGrid,
        typeKey: "card",
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[3].slotIndex,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: labels.localesTitle,
        config: {
          eyebrow: labels.localesEyebrow,
          title: availableLocaleCodes || currentLocale,
          description: labels.localesDescription,
          meta: availableLocaleMeta,
          variant: "compact",
          translate: false,
        },
      }),
    ],
  };
}
