"use client";

import { createElement, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { PhiRuntimeControllerPlugin, PhiSignalAddress } from "../../../../types";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import { readPhiTableBindingParamsSignalValue } from "../../../../types/table-widget";
import { isPhiBuilderAreaKey, type PhiBuilderAreaKey } from "../../../../constants/cms-areas";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
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
  resolvePhiBuilderPageKeyFromCatalogPath,
} from "../../../../helpers/cms-page-catalog";
import { PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID } from "../../../../helpers/cms-page-addresses";
import {
  PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiRevisionsControllerConfig,
} from "../controller/definition";
import { resolvePhiBuilderRevisionNavScopeKey } from "../../../../helpers/cms-navigation-scope-key";
import { deleteCmsDraft } from "../../builder/persistence";
import {
  PHI_BUILDER_DELETE_AREA_OVERLAY_IDS,
  PHI_BUILDER_DELETE_AREA_WIDGET_IDS,
} from "../../../../helpers/cms-page-addresses";

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
  ]);

  /*
   * Deletes the Area's own shell, then asks the workspace for everything again.
   *
   * What stands afterwards is the Module preset, and this client holds none of it -- not the Regions,
   * not the root route, not the SEO answers. Every one of them is now a value only the server knows.
   */
  const deleteAreaShell = useCallback(async (area: PhiBuilderAreaKey, correlationId?: string) => {
    const source = getPhiWorkspaceCatalogSnapshot(PHI_WORKSPACE_CATALOG_SCOPE)
      .areaPresetSourcesByArea?.[area] ?? null;
    try {
      await deleteCmsDraft("/api/site/cms/area/override", {
        area,
        ownerModuleId: source?.ownerModuleId,
        presetKey: source?.presetKey,
      });
      dispatchSignal({
        scope: "area",
        channel: "dialog",
        action: "close",
        value: null,
        valueType: "none",
        sender: address,
        receiver: createPhiSignalAddress("cms", PHI_BUILDER_DELETE_AREA_OVERLAY_IDS.overlayDeleteArea),
        ...(correlationId ? { correlationId } : {}),
        timestamp: Date.now(),
      });
      showMessage({ level: "success", content: `Deleted the ${area} shell.` });
      router.refresh();
    } catch (error) {
      showMessage({
        level: "error",
        content: error instanceof Error ? error.message : "Deleting the shell failed.",
      });
    }
  }, [address, dispatchSignal, router, showMessage]);

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
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      return;
    }

    if (signal.receiver !== address) return;

    if (
      signal.channel === "command" &&
      signal.action === "activate" &&
      signal.value === "deleteArea"
    ) {
      /*
       * Two signals, as the Overlay contract requires: the Body's Widget is addressed directly with what
       * it has to say, and the Overlay is told to open. The Area comes from the workspace rather than
       * from the signal -- the button names a command, and what it acts on is whatever the Builder is
       * pointed at when it is pressed.
       */
      const area = getPhiWorkspaceCatalogSnapshot(PHI_WORKSPACE_CATALOG_SCOPE).area;
      dispatchSignal({
        scope: "area",
        channel: "text",
        action: "change",
        value: `Everything this Site stored for ${area} is deleted, drafts and published alike. What is live changes at once, the Module preset takes the Area back, and no revision is left to restore it from. It cannot be undone.`,
        valueType: "string",
        sender: address,
        receiver: createPhiSignalAddress("cms", PHI_BUILDER_DELETE_AREA_WIDGET_IDS.deleteAreaWarning),
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      dispatchSignal({
        scope: "area",
        channel: "dialog",
        action: "activate",
        value: null,
        valueType: "none",
        sender: address,
        receiver: createPhiSignalAddress("cms", PHI_BUILDER_DELETE_AREA_OVERLAY_IDS.overlayDeleteArea),
        correlationId: signal.correlationId,
        timestamp: Date.now(),
      });
      return;
    }

    if (signal.channel === "formValues" && signal.action === "change") {
      const payload = isRecord(signal.value) ? signal.value as Record<string, unknown> : null;
      const values = isRecord(payload?.values) ? payload.values : null;
      const typed = typeof values?.areaKey === "string" ? values.areaKey.trim() : "";
      const area = getPhiWorkspaceCatalogSnapshot(PHI_WORKSPACE_CATALOG_SCOPE).area;
      if (typed !== area) {
        // The Overlay stays open: what is wrong is the answer, not the question.
        showMessage(
          { level: "error", content: "That is not the Area key." },
          { correlationId: signal.correlationId },
        );
        return;
      }
      void deleteAreaShell(area, signal.correlationId);
      return;
    }

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
                        ? resolvePhiBuilderPageKeyFromCatalogPath(state.area, revisionScope, pages)
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
  }, [address, deleteAreaShell, dispatchSignal, pathname, router, showMessage]), {
    scopes: ["area", "page"],
    channels: ["areaSelection", "bindingParams", "command", "formValues", "mutation"],
  },
  /*
   * The address this listener answers for.
   *
   * An instance with no listener counted for it is "not ready yet" rather than wrong, so the bus holds
   * every signal addressed here -- silently, and forever, when the count never arrives. A Controller is
   * its own listener, and this is where it says so.
   */
  address);

  return null;
}

export const PHI_REVISIONS_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address }) => createElement(PhiRevisionsControllerMount, { key, address }),
} satisfies PhiRuntimeControllerPlugin<PhiRevisionsControllerConfig>;

export const PhiRevisionsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_REVISIONS_RUNTIME_CONTROLLER_PLUGIN,
);
