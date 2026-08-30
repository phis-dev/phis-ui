"use client";

import { useEffect, useState } from "react";

import { Flex, Space, Tag, Typography } from "antd";
import { usePathname, useSearchParams } from "next/navigation";

import { resolvePhiBuilderCmsStoragePath } from "../../../../../helpers/cms-paths";
import { usePhiDeveloperBuilderStateValue } from "../../../../../plugins/runtime-modules/builder/developer-workspace-store";
import { resolvePhiBuilderActivePageCatalog } from "../../../../../helpers/cms-page-catalog";
import {
  PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM,
  normalizePhiBuilderRevisionsKindSearchParam,
} from "../../../../../helpers/cms-scope-search-params";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import {
  type PhiBuilderChromeWidgetLabels,
} from "../../../../../components/widgets/label-types/builder-chrome";
import { PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/builder-chrome";
import { formatPhiBuilderDraftRevisionLabel } from "../../../../../components/widgets/label-types/builder-chrome";
import { resolvePhiBuilderRevisionNavScopeKey } from "../../../../../helpers/cms-navigation-scope-key";

type PhiBuilderDraftStatusState = {
  requestKey: string;
  loading: boolean;
  status: "draft" | "published" | "error";
  revisionId: number | null;
  error: string | null;
};

type PhiBuilderDraftStatusWorkspaceKind =
  | "structure"
  | "pages"
  | "navigation"
  | "brand"
  | "revisions-area"
  | "revisions-page"
  | "revisions-navigation"
  | "revisions-theme";

function resolveWorkspaceKind(
  pathname: string | null,
  revisionKind: "area" | "page" | "navigation" | "theme" | null,
): PhiBuilderDraftStatusWorkspaceKind {
  if (pathname?.includes("/builder/shells")) {
    return "structure";
  }

  if (pathname?.includes("/builder/navigation")) {
    return "navigation";
  }

  if (pathname?.includes("/builder/theme")) {
    return "brand";
  }

  if (pathname?.includes("/builder/revisions")) {
    if (revisionKind === "navigation") {
      return "revisions-navigation";
    }
    if (revisionKind === "page") {
      return "revisions-page";
    }
    if (revisionKind === "theme") {
      return "revisions-theme";
    }
    return "revisions-area";
  }

  return "pages";
}

function resolveStatusPath(
  area: string,
  navKey: string,
  workspaceKind: PhiBuilderDraftStatusWorkspaceKind,
  pageStoragePath: string | null,
) {
  if (workspaceKind === "brand" || workspaceKind === "revisions-theme") {
    return "theme/default";
  }

  if (workspaceKind === "navigation" || workspaceKind === "revisions-navigation") {
    return navKey;
  }

  if (workspaceKind === "structure" || workspaceKind === "revisions-area") {
    return area === "public" ? "/" : `${area}/`;
  }

  if (pageStoragePath === null) {
    return null;
  }
  const storagePath = pageStoragePath;
  return area === "public" ? storagePath : `${area}${storagePath}`;
}

function buildStatusLabel(state: PhiBuilderDraftStatusState, labels: PhiBuilderChromeWidgetLabels["draftStatus"]) {
  if (state.loading) {
    return labels.checking;
  }

  if (state.status === "draft") {
    return state.revisionId != null ? formatPhiBuilderDraftRevisionLabel(labels.draftWithRevision, state.revisionId) : labels.draft;
  }

  if (state.status === "published") {
    return labels.published;
  }

  return labels.unavailable;
}

export function PhiDeveloperBuilderDraftStatusWidgetClient({
  labels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
}: {
  labels?: PhiBuilderChromeWidgetLabels;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const areaPresetSourcesByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.areaPresetSourcesByArea,
  );
  const catalogHydrated = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.catalogHydrated,
  );
  const customPages = usePhiDeveloperBuilderStateValue("public", (state) => state.customPages);
  const modulePresetPagesByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.modulePresetPagesByArea,
  );
  const pageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const persistedPageCatalogByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.persistedPageCatalogByArea,
  );
  const pageCatalogHydratedByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.pageCatalogHydratedByArea,
  );
  const pages = resolvePhiBuilderActivePageCatalog(
    area,
    modulePresetPagesByArea,
    customPages,
    persistedPageCatalogByArea,
  );
  const revisionKind = normalizePhiBuilderRevisionsKindSearchParam(
    searchParams.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM),
  );
  const workspaceKind = resolveWorkspaceKind(pathname, revisionKind);
  const navKey = resolvePhiBuilderRevisionNavScopeKey(
    area,
    searchParams.get(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM),
  );
  const isPageWorkspace = workspaceKind === "pages" || workspaceKind === "revisions-page";
  const isAreaWorkspace = workspaceKind === "structure" || workspaceKind === "revisions-area";
  const pageStoragePath = isPageWorkspace && catalogHydrated && pageCatalogHydratedByArea[area] && pageKey
    ? resolvePhiBuilderCmsStoragePath(area, pageKey, pages)
    : null;
  const areaSourcePreset = catalogHydrated
    ? areaPresetSourcesByArea[area] ?? null
    : null;
  if (isAreaWorkspace && catalogHydrated && !areaSourcePreset) {
    throw new Error(`Builder target Area "${area}" has no source preset identity.`);
  }
  const areaDraftUrl = areaSourcePreset
    ? `/api/site/cms/area/draft?${new URLSearchParams({
        area,
        ownerModuleId: areaSourcePreset.ownerModuleId,
        presetKey: areaSourcePreset.presetKey,
      }).toString()}`
    : null;
  const baseUrl =
    workspaceKind === "brand" || workspaceKind === "revisions-theme"
      ? "/api/site/cms/theme/draft?key=default"
      : isAreaWorkspace
      ? areaDraftUrl
      : isPageWorkspace
        ? pageStoragePath === null
          ? null
          : `/api/site/cms/page/draft?area=${encodeURIComponent(area)}&path=${encodeURIComponent(pageStoragePath)}`
        : `/api/site/cms/navigation/draft?key=${encodeURIComponent(navKey)}`;
  const readFailedLabel = labels.draftStatus.readFailed;
  const [draftState, setDraftState] = useState<PhiBuilderDraftStatusState>({
    requestKey: "",
    loading: true,
    status: "published",
    revisionId: null,
    error: null,
  });

  useEffect(() => {
    if (baseUrl === null) {
      return;
    }
    let cancelled = false;

    void fetch(baseUrl, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        if (cancelled) {
          return;
        }

        if (response.status === 404) {
          setDraftState({
            requestKey: baseUrl,
            loading: false,
            status: "published",
            revisionId: null,
            error: null,
          });
          return;
        }

        const body = (await response.json().catch(() => null)) as { revisionId?: number | null; error?: string } | null;
        if (!response.ok) {
          throw new Error(body?.error ?? readFailedLabel);
        }

        const revisionId = Number.isInteger(body?.revisionId) ? (body?.revisionId as number) : null;
        setDraftState({
          requestKey: baseUrl,
          loading: false,
          status: revisionId != null ? "draft" : "published",
          revisionId,
          error: null,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setDraftState({
          requestKey: baseUrl,
          loading: false,
          status: "error",
          revisionId: null,
          error: error instanceof Error ? error.message : readFailedLabel,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, readFailedLabel]);

  usePhiSignalListener((signal) => {
    if (baseUrl === null) {
      return;
    }
    if (signal.channel !== "draftStatus" || signal.action !== "change") {
      return;
    }
    const draftStatusValue = signal.value && typeof signal.value === "object"
      ? signal.value as {
          status?: unknown;
          revisionId?: unknown;
          themeKey?: unknown;
          navKey?: unknown;
          area?: unknown;
          pageKey?: unknown;
        }
      : null;

    const matchesScope =
      workspaceKind === "brand" || workspaceKind === "revisions-theme"
        ? draftStatusValue?.themeKey === "default"
        : workspaceKind === "navigation" || workspaceKind === "revisions-navigation"
        ? draftStatusValue?.navKey === navKey
        : workspaceKind === "structure" || workspaceKind === "revisions-area"
          ? draftStatusValue?.area === area
          : draftStatusValue?.area === area && draftStatusValue?.pageKey === pageKey;
    if (!matchesScope) {
      return;
    }

    if (draftStatusValue?.status !== "draft" && draftStatusValue?.status !== "published") {
      return;
    }

    setDraftState({
      requestKey: baseUrl,
      loading: false,
      status: draftStatusValue.status,
      revisionId:
        typeof draftStatusValue.revisionId === "number" && Number.isInteger(draftStatusValue.revisionId) ? draftStatusValue.revisionId : null,
      error: null,
    });
  });

  const scopePath = baseUrl === null
    ? null
    : resolveStatusPath(area, navKey, workspaceKind, pageStoragePath);
  if (baseUrl === null || scopePath === null) {
    return null;
  }
  const effectiveDraftState = draftState.requestKey === baseUrl
    ? draftState
    : { ...draftState, loading: true, error: null };
  const statusColor =
    effectiveDraftState.status === "draft" ? "gold" : effectiveDraftState.status === "published" ? "green" : "red";

  return (
    <Flex align="center" justify="space-between" gap={12} wrap="wrap" style={{ width: "100%" }}>
      <Space size={8} wrap>
        <Tag color={statusColor}>{buildStatusLabel(effectiveDraftState, labels.draftStatus)}</Tag>
        <Typography.Text code style={{ fontSize: 12 }}>
          {scopePath}
        </Typography.Text>
      </Space>
      {effectiveDraftState.error ? (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          {effectiveDraftState.error}
        </Typography.Text>
      ) : null}
    </Flex>
  );
}
