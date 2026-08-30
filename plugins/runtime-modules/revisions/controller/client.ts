"use client";

import { createElement, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PhiRuntimeControllerPlugin, PhiSignalAddress } from "../../../../types";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { readPhiTableBindingParamsSignalValue } from "../../../../types/table-widget";
import { isPhiBuilderAreaKey } from "../../../../constants/cms-areas";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalReceiverReady } from "../../../../components/runtime/runtime-signal-registry";
import { usePhiApplicationFeedback } from "../../../../components/runtime/use-phi-application-feedback";
import {
  getPhiWorkspaceCatalogSnapshot,
  usePhiWorkspaceCatalogValue,
  PHI_WORKSPACE_CATALOG_SCOPE,
} from "../../../../components/workspace/catalog-store";
import {
  PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM,
  PHI_BUILDER_PAGE_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM,
  PHI_BUILDER_THEME_KEY_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
  normalizePhiBuilderPageSearchParam,
  normalizePhiBuilderRevisionsKindSearchParam,
} from "../../../../helpers/cms-scope-search-params";
import {
  resolvePhiBuilderRevisionPagePath,
} from "../types";
import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderActivePageKey,
  resolvePhiBuilderPageKeyFromStoragePath,
} from "../../../../helpers/cms-page-catalog";
import { PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID } from "../../../../helpers/cms-page-addresses";
import {
  PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiRevisionsControllerConfig,
} from "../controller/definition";
import { resolvePhiBuilderRevisionNavScopeKey } from "../../../../helpers/cms-navigation-scope-key";

const PHI_REVISIONS_TABLE_ADDRESS = createPhiSignalAddress(
  "cms",
  PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function PhiRevisionsControllerMount({ address }: { address: PhiSignalAddress }) {
  const dispatchSignal = usePhiSignalDispatcher();
  const { showMessage } = usePhiApplicationFeedback();
  const pathname = usePathname();
  const router = useRouter();
  const tableReady = usePhiSignalReceiverReady(PHI_REVISIONS_TABLE_ADDRESS);
  const builderArea = usePhiWorkspaceCatalogValue(PHI_WORKSPACE_CATALOG_SCOPE, (state) => state.area);
  const builderPageKey = usePhiWorkspaceCatalogValue(PHI_WORKSPACE_CATALOG_SCOPE, (state) => state.pageKey);
  const modulePresetPagesByArea = usePhiWorkspaceCatalogValue(
    PHI_WORKSPACE_CATALOG_SCOPE,
    (state) => state.modulePresetPagesByArea,
  );
  const customPages = usePhiWorkspaceCatalogValue(PHI_WORKSPACE_CATALOG_SCOPE, (state) => state.customPages);
  const persistedPageCatalogByArea = usePhiWorkspaceCatalogValue(
    PHI_WORKSPACE_CATALOG_SCOPE,
    (state) => state.persistedPageCatalogByArea,
  );

  useEffect(() => {
    if (!tableReady) return;
    const state = getPhiWorkspaceCatalogSnapshot(PHI_WORKSPACE_CATALOG_SCOPE);
    const pages = resolvePhiBuilderActivePageCatalog(
      state.area,
      state.modulePresetPagesByArea,
      state.customPages,
      state.persistedPageCatalogByArea,
    );
    const search = new URLSearchParams(window.location.search);
    const pageKey = resolvePhiBuilderActivePageKey(
      normalizePhiBuilderPageSearchParam(search.get(PHI_BUILDER_PAGE_SEARCH_PARAM)) ?? state.pageKey,
      pages,
    );
    if (!pageKey) return;
    const kind = normalizePhiBuilderRevisionsKindSearchParam(
      search.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM),
    ) ?? "area";
    const requestedScope = search.get(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM)?.trim() ?? "";
    const scopeKey = kind === "page"
      ? requestedScope.startsWith("/")
        ? requestedScope
        : resolvePhiBuilderRevisionPagePath(state.area, pageKey, pages)
      : kind === "navigation"
        ? requestedScope.includes(":")
          ? requestedScope
          : resolvePhiBuilderRevisionNavScopeKey(
              state.area,
              search.get(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM),
            )
        : kind === "theme"
          ? requestedScope || search.get(PHI_BUILDER_THEME_KEY_SEARCH_PARAM) || "default"
          : normalizePhiBuilderAreaSearchParam(requestedScope) ?? state.area;
    dispatchSignal({
      scope: "area",
      channel: "bindingParams",
      action: "change",
      value: { params: { area: state.area, kind, scopeKey } },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
      sender: address,
      receiver: PHI_REVISIONS_TABLE_ADDRESS,
      timestamp: Date.now(),
    });
  }, [
    address,
    builderArea,
    builderPageKey,
    customPages,
    dispatchSignal,
    modulePresetPagesByArea,
    persistedPageCatalogByArea,
    tableReady,
  ]);

  usePhiSignalListener(useCallback((signal) => {
    if (
      signal.channel === "areaSelection" &&
      signal.action === "change" &&
      isPhiBuilderAreaKey(signal.value)
    ) {
      const search = new URLSearchParams(window.location.search);
      const kind = normalizePhiBuilderRevisionsKindSearchParam(
        search.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM),
      ) ?? "area";
      if (kind !== "area") return;
      dispatchSignal({
        scope: "area",
        channel: "bindingParams",
        action: "change",
        value: { params: { kind: "area", scopeKey: signal.value } },
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableBindingParams,
        sender: address,
        receiver: PHI_REVISIONS_TABLE_ADDRESS,
        timestamp: Date.now(),
      });
      return;
    }

    if (signal.receiver !== address) return;

    if (signal.channel === "bindingParams" && signal.action === "change") {
      const binding = readPhiTableBindingParamsSignalValue(signal.value);
      const kind = normalizePhiBuilderRevisionsKindSearchParam(binding?.params.kind);
      const scopeKey = typeof binding?.params.scopeKey === "string"
        ? binding.params.scopeKey.trim()
        : "";
      if (!kind || !pathname) return;
      const search = new URLSearchParams(window.location.search);
      const currentKind = normalizePhiBuilderRevisionsKindSearchParam(
        search.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM),
      );
      if (
        kind === "area" &&
        isPhiBuilderAreaKey(scopeKey) &&
        (currentKind == null || currentKind === "area")
      ) {
        return;
      }
      search.set(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM, kind);
      if (kind === "area" && isPhiBuilderAreaKey(scopeKey)) {
        search.delete(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM);
      } else if (kind === "page" && scopeKey.startsWith("/")) {
        search.set(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM, scopeKey);
      } else if (kind === "navigation" && scopeKey.includes(":")) {
        search.set(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM, scopeKey);
      } else if (kind === "theme" && scopeKey) {
        search.set(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM, scopeKey);
      }
      router.replace(`${pathname}?${search.toString()}`, { scroll: false });
      return;
    }
    if (signal.channel === "mutation" && signal.action === "change" && isRecord(signal.value)) {
      const payload = signal.value as Record<string, unknown>;
      const action = isRecord(payload.value) ? payload.value : null;
      const key = typeof action?.key === "string" ? action.key : "";
      if (key === "restore") {
        showMessage(
          { level: "success", content: `Restored revision #${String(action?.revisionId ?? "")}.` },
          { correlationId: signal.correlationId },
        );
        const state = getPhiWorkspaceCatalogSnapshot(PHI_WORKSPACE_CATALOG_SCOPE);
        const search = new URLSearchParams(window.location.search);
        const kind = normalizePhiBuilderRevisionsKindSearchParam(
          search.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM),
        ) ?? "area";
        const revisionScope = search.get(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM)?.trim() ?? "";
        const pages = resolvePhiBuilderActivePageCatalog(
          state.area,
          state.modulePresetPagesByArea,
          state.customPages,
          state.persistedPageCatalogByArea,
        );
        dispatchSignal({
          scope: "area",
          channel: "draftStatus",
          action: "change",
          value: {
            status: "draft",
            revisionId: typeof action?.restoredRevisionId === "number" ? action.restoredRevisionId : null,
            ...(kind === "navigation"
              ? { navKey: resolvePhiBuilderRevisionNavScopeKey(
                  state.area,
                  revisionScope.includes(":")
                    ? revisionScope
                    : search.get(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM),
                ) }
              : kind === "theme"
                ? { themeKey: revisionScope || search.get(PHI_BUILDER_THEME_KEY_SEARCH_PARAM) || "default" }
                : kind === "page"
                  ? {
                      area: state.area,
                      pageKey: revisionScope.startsWith("/")
                        ? resolvePhiBuilderPageKeyFromStoragePath(state.area, revisionScope, pages)
                        : normalizePhiBuilderPageSearchParam(
                            search.get(PHI_BUILDER_PAGE_SEARCH_PARAM),
                          ) ?? state.pageKey,
                    }
                  : {
                      area: normalizePhiBuilderAreaSearchParam(revisionScope) ?? state.area,
                    }),
          },
          valueType: "json",
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
          sender: address,
          receiver: "broadcast",
          correlationId: signal.correlationId,
          timestamp: Date.now(),
        });
      }
      else if (key === "delete") showMessage(
        { level: "success", content: `Deleted revision #${String(action?.revisionId ?? "")}.` },
        { correlationId: signal.correlationId },
      );
      else if (key === "deleteSelected") showMessage(
        { level: "success", content: `Deleted ${String(action?.deletedCount ?? 0)} revisions.` },
        { correlationId: signal.correlationId },
      );
    }
  }, [address, dispatchSignal, pathname, router, showMessage]), {
    scopes: ["area", "page"],
    channels: ["areaSelection", "bindingParams", "mutation"],
  });
  return null;
}

export const PHI_REVISIONS_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address }) => createElement(PhiRevisionsControllerMount, { key, address }),
} satisfies PhiRuntimeControllerPlugin<PhiRevisionsControllerConfig>;

export const PhiRevisionsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_REVISIONS_RUNTIME_CONTROLLER_PLUGIN,
);
