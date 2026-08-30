"use client";

import { useState } from "react";

import { Flex, Typography } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  resolvePhiBuilderPageKeyFromStoragePath,
  resolvePhiBuilderCmsStoragePathForCatalog,
  resolvePhiBuilderActivePageCatalog,
  type PhiBuilderPageCatalogArea,
  type PhiPresetPageNode,
} from "../../../../helpers/cms-page-catalog";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  PHI_BUILDER_PAGE_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
  normalizePhiBuilderPageSearchParam,
} from "../../../../helpers/cms-scope-search-params";
import {
  dispatchPhiDeveloperBuilderState,
  usePhiDeveloperBuilderStateValue,
} from "../developer-workspace-store";
import { PhiTextControl } from "../../../../components/controls/phi-text-control";
import {
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "../../../../components/runtime/runtime-signal-bus";
import {
  emitPhiPageTitleMetaSignal,
} from "../../../../components/widgets/signals/page-title-signals";
import {
  PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS,
  type PhiPageTitleWidgetLabels,
} from "../../../../components/widgets/label-types/page-title";
import { emitPhiPageTitleInputSignal } from "../page-title-signal";

function findPageNodePath(
  nodes: PhiPresetPageNode[],
  targetKey: string,
  prefix: PhiPresetPageNode[] = [],
): PhiPresetPageNode[] | null {
  for (const node of nodes) {
    const currentPath = [...prefix, node];
    if (node.key === targetKey) {
      return currentPath;
    }

    const childPath = node.children
      ? findPageNodePath(node.children, targetKey, currentPath)
      : null;
    if (childPath) {
      return childPath;
    }
  }

  return null;
}

function PhiDeveloperBuilderPagesHeaderTitleField({
  area,
  path,
  disabled,
  initialTitle,
  labels,
}: {
  area: PhiBuilderPageCatalogArea;
  path: string;
  disabled: boolean;
  initialTitle: string;
  labels: PhiPageTitleWidgetLabels;
}) {
  const emitSignal = usePhiSignalDispatcher();
  const [pageTitleState, setPageTitleState] = useState(() => ({
    source: initialTitle,
    draft: initialTitle,
  }));
  const pageTitleDraft = pageTitleState.source === initialTitle ? pageTitleState.draft : initialTitle;

  return (
    <div style={{ minWidth: 260, flex: "1 1 260px", maxWidth: "100%" }}>
      <Flex align="center" gap={8} wrap={false} style={{ width: "100%", minWidth: 0 }}>
        <Typography.Text style={{ whiteSpace: "nowrap" }}>{labels.editorPlaceholder}</Typography.Text>
        <PhiTextControl
          value={pageTitleDraft}
          disabled={disabled}
          placeholder={labels.editorPlaceholder}
          onChange={(nextValue) => {
            const value = nextValue ?? "";
            setPageTitleState({
              source: initialTitle,
              draft: value,
            });
            emitPhiPageTitleInputSignal({
              emitSignal,
              area,
              pageKey: path,
              title: value,
            });
          }}
          style={{ width: "100%" }}
        />
      </Flex>
    </div>
  );
}

export function PhiDeveloperBuilderPagesHeaderWidgetClient() {
  return <PhiDeveloperBuilderPagesHeaderSection mode="full" />;
}

export type PhiDeveloperBuilderPagesHeaderSectionMode = "full" | "title" | "selector";

export function PhiDeveloperBuilderPagesHeaderSection({
  mode,
  pageTitle,
  disabled = false,
  labels = PHI_PAGE_TITLE_WIDGET_DEFAULT_LABELS,
}: {
  mode: PhiDeveloperBuilderPagesHeaderSectionMode;
  pageTitle?: string | null;
  disabled?: boolean;
  labels?: PhiPageTitleWidgetLabels;
}) {
  const emitSignal = usePhiSignalDispatcher();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentArea = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const currentPageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const builderMode = usePhiDeveloperBuilderStateValue("public", (state) => state.builderMode);
  const customPages = usePhiDeveloperBuilderStateValue("public", (state) => state.customPages);
  const modulePresetPagesByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.modulePresetPagesByArea,
  );
  const catalogHydrated = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.catalogHydrated,
  );
  const persistedPageCatalogByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.persistedPageCatalogByArea,
  );
  const pageCatalogHydratedByArea = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.pageCatalogHydratedByArea,
  );
  const resolvedCustomPages = customPages ?? {};
  const titleModeEnabled = mode === "full" || mode === "title";
  const searchArea = normalizePhiBuilderAreaSearchParam(
    searchParams.get(PHI_BUILDER_AREA_SEARCH_PARAM),
  ) as PhiBuilderPageCatalogArea | null;
  const searchPageKey = normalizePhiBuilderPageSearchParam(
    searchParams.get(PHI_BUILDER_PAGE_SEARCH_PARAM),
  );
  const area = (searchArea ?? currentArea) as PhiBuilderPageCatalogArea;
  const pageKey =
    searchPageKey ??
    (searchArea != null && searchArea !== currentArea
      ? (modulePresetPagesByArea[searchArea][0]?.key ?? "")
      : currentPageKey);
  const pageTree = resolvePhiBuilderActivePageCatalog(
    area,
    modulePresetPagesByArea,
    resolvedCustomPages,
    persistedPageCatalogByArea,
  );
  const pageSelectionReady = catalogHydrated && pageCatalogHydratedByArea[area] === true && pageKey.length > 0;
  const selectedPath = pageSelectionReady
    ? findPageNodePath(pageTree, pageKey) ?? [{ key: pageKey, title: pageKey }]
    : [];
  const selectedPageTitle = selectedPath.at(-1)?.title ?? pageKey;
  const storagePath = pageSelectionReady
    ? resolvePhiBuilderCmsStoragePathForCatalog(area, pageKey, pageTree)
    : null;
  const resolvedInitialPageTitle = (pageTitle?.trim() ?? "") || selectedPageTitle;
  const isPreviewMode = builderMode === "preview";

  function navigateToPage(nextPageKey: string, nextTitle?: string | null) {
    const nextPagePath = findPageNodePath(pageTree, nextPageKey);
    const nextPageTitle = nextTitle?.trim() || nextPagePath?.at(-1)?.title || nextPageKey;
    dispatchPhiDeveloperBuilderState(emitSignal, "public", {
      area,
      pageKey: nextPageKey,
      nodeKey: `page:${nextPageKey}`,
      nodeKind: "page",
      sidebarKey: "pages",
    });
    emitPhiPageTitleMetaSignal({
      emitSignal,
      area,
      pageKey: nextPageKey,
      title: nextPageTitle,
    });

    if (typeof pathname === "string") {
      const nextSearchParams = new URLSearchParams(searchParams.toString());
      nextSearchParams.set(PHI_BUILDER_AREA_SEARCH_PARAM, area);
      nextSearchParams.set(PHI_BUILDER_PAGE_SEARCH_PARAM, nextPageKey);
      router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
    }
  }

  const titleInput = (
    titleModeEnabled && storagePath !== null ? (
      <PhiDeveloperBuilderPagesHeaderTitleField
        key={storagePath}
        area={area}
        path={storagePath}
        disabled={disabled}
        initialTitle={resolvedInitialPageTitle}
        labels={labels}
      />
    ) : null
  );

  usePhiSignalListener((signal) => {
    if (disabled || !pageSelectionReady) {
      return;
    }

	    if (titleModeEnabled && signal.channel === "page" && signal.action === "change") {
      const signalValue = signal.value;
      const nextPageKey =
        typeof signalValue === "string"
          ? resolvePhiBuilderPageKeyFromStoragePath(area, signalValue, pageTree)
          : null;
      if (nextPageKey && nextPageKey !== pageKey) {
        navigateToPage(nextPageKey);
      }
      return;
    }

  });

  if (!pageSelectionReady) {
    return null;
  }

  if (isPreviewMode && !disabled) {
    return null;
  }

  if (mode === "selector") {
    return null;
  }

  if (mode === "title") {
    return titleInput;
  }

  return (
    <Flex align="center" gap={12} wrap={false} style={{ width: "100%", minWidth: 0 }}>
      {titleInput}
    </Flex>
  );
}
