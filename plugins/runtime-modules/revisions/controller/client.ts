"use client";

import { createElement, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PhiRuntimeControllerPlugin, PhiSignalAddress } from "../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalValue } from "../../../../types/signals";
import { readPhiTableBindingParamsSignalValue } from "../../../../types/table-signal-values";
import { isPhiBuilderAreaKey, type PhiBuilderAreaKey } from "../../../../constants/cms-areas";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { dispatchPhiSignalCapability } from "../../../../components/runtime/runtime-signal-identity";
import { usePhiApplicationFeedback } from "../../../../components/runtime/use-phi-application-feedback";
import {
  getPhiWorkspaceCatalogSnapshot,
  usePhiWorkspaceCatalogValue,
} from "../../../../components/workspace/catalog-store";
import {
  PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM,
  normalizePhiBuilderRevisionsKindSearchParam,
} from "../../../../helpers/cms-scope-search-params";
import {
  isPhiRevisionsCatalogReady,
  readPhiRevisionsAddressKind,
  readPhiRevisionsTableBinding,
  resolvePhiRevisionsControllerBinding,
  type PhiRevisionsTableBinding,
} from "./binding";
import {
  PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION,
  type PhiRevisionsControllerConfig,
} from "../controller/definition";
import { resolvePhiRevisionsDraftContextTarget } from "./draft-context-target";
import { deleteCmsDraft } from "../../../../helpers/cms-draft-delete";
import { isPhiRecord } from "../../../../helpers/is-record";
import { matchesPhiTypedConfirmation } from "../../../../helpers/typed-confirmation";
import { usePhiPathname } from "../../../../components/runtime/use-phi-pathname";

function PhiRevisionsControllerMount({
  address,
  config,
}: {
  address: PhiSignalAddress;
  config: PhiRevisionsControllerConfig;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  /*
   * One declared output, delivered through every route the Revisions Page wrote for it.
   *
   * The history Table and the delete-Area dialog were preset ids written into this file, and the Area
   * runs this Controller on every Builder Page: away from Revisions it kept sending binding params to a
   * Table that was not there, and the bus held each one for a listener that never came.
   */
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId?: string | null,
  ) => dispatchPhiSignalCapability(dispatchSignal, address, emitRoutes, capabilityId, value, correlationId), [address, dispatchSignal, emitRoutes]);
  const reportDraftStatus = useCallback((value: PhiSignalValue, correlationId?: string) => {
    dispatchSignal({
      scope: "area",
      channel: "draftStatus",
      action: "change",
      value,
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      sender: address,
      receiver: "broadcast",
      correlationId,
      timestamp: Date.now(),
    });
  }, [address, dispatchSignal]);
  const { showMessage } = usePhiApplicationFeedback();
  const pathname = usePhiPathname();
  const router = useRouter();
  const builderArea = usePhiWorkspaceCatalogValue((state) => state.area);
  const builderPageKey = usePhiWorkspaceCatalogValue((state) => state.pageKey);
  const modulePresetPagesByArea = usePhiWorkspaceCatalogValue((state) => state.modulePresetPagesByArea,
  );
  const customPages = usePhiWorkspaceCatalogValue((state) => state.customPages);
  const persistedPageCatalogByArea = usePhiWorkspaceCatalogValue((state) => state.persistedPageCatalogByArea,
  );
  const catalogHydrated = usePhiWorkspaceCatalogValue((state) => state.catalogHydrated);
  const pageCatalogHydratedByArea = usePhiWorkspaceCatalogValue((state) => state.pageCatalogHydratedByArea);

  /*
   * The scope the address names, handed to the Table once the catalog stands for that address.
   *
   * Before, it was resolved on the catalog's first answer, which names the default Area (`public`)
   * until the Builder has read the address: a Module Page of the App was handed as a Public Page,
   * then again as the App's, each a history read. The catalog changes many times more while the
   * Builder opens, and after every Page action, and each change hands the scope again; the Table
   * takes the same scope as no change (`updateBindingParams`), so only another scope is read.
   */
  /*
   * The last scope handed, to know it when the Table hands it back: the Table announces every change
   * of its binding, this Controller's own among them, and written into the address the scope that was
   * read off the address (or the open Page standing in for it) is one more fetch of the Page for nothing.
   */
  const handedBindingKey = useRef<string | null>(null);
  const handBinding = useCallback((binding: PhiRevisionsTableBinding, correlationId?: string | null) => {
    handedBindingKey.current = JSON.stringify(binding);
    emitCapability("bindingParamsChange", { params: binding }, correlationId);
  }, [emitCapability]);
  useEffect(() => {
    const binding = resolvePhiRevisionsControllerBinding(
      getPhiWorkspaceCatalogSnapshot(),
      new URLSearchParams(window.location.search),
    );
    if (binding) handBinding(binding);
  }, [
    builderArea,
    builderPageKey,
    catalogHydrated,
    customPages,
    handBinding,
    modulePresetPagesByArea,
    pageCatalogHydratedByArea,
    persistedPageCatalogByArea,
  ]);

  /*
   * Deletes the Area's own structure, then asks the workspace for everything again. Its Module selection
   * is stored apart and stays.
   *
   * What stands afterwards is the preset of the shell the Area takes, and this client holds none of it
   * -- not the Regions, not the root route, not the SEO answers. Every one of them is now a value only the
   * server knows. The identity named is the one the stored structure stands on, which need not be the
   * shell the Area takes now: a structure of the base shell outlives switching on a Module that brings
   * its own.
   */
  const deleteAreaShell = useCallback(async (area: PhiBuilderAreaKey, correlationId?: string) => {
    const catalog = getPhiWorkspaceCatalogSnapshot();
    const source = catalog.areaShellsByArea?.[area]?.storedSource
      ?? catalog.areaPresetSourcesByArea?.[area]
      ?? null;
    try {
      await deleteCmsDraft("/api/site/cms/area/override", {
        area,
        ownerModuleId: source?.ownerModuleId,
        presetKey: source?.presetKey,
      });
      reportDraftStatus({ status: "published", revisionId: null, area }, correlationId);
      emitCapability("deleteAreaClose", null, correlationId);
      emitCapability("historyReload", null, correlationId);
      showMessage({ level: "success", content: `Cleared the ${area} structure back to its preset. Its Modules are kept.` });
      router.refresh();
    } catch (error) {
      showMessage({
        level: "error",
        content: error instanceof Error ? error.message : "Clearing the Area failed.",
      });
    }
  }, [emitCapability, reportDraftStatus, router, showMessage]);

  usePhiSignalListener(useCallback((signal) => {
    if (
      signal.channel === "areaSelection" &&
      signal.action === "change" &&
      isPhiBuilderAreaKey(signal.value)
    ) {
      const search = new URLSearchParams(window.location.search);
      /*
       * Not before the catalog stands for the address: the Area select says which Area it shows when it
       * mounts, which is the catalog's default until the Builder has read the address -- the App's
       * Revisions read the Public Area's history first.
       */
      if (
        readPhiRevisionsAddressKind(search) !== "area" ||
        !isPhiRevisionsCatalogReady(getPhiWorkspaceCatalogSnapshot(), search)
      ) {
        return;
      }
      handBinding({ area: signal.value, kind: "area", scopeKey: signal.value }, signal.correlationId);
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
      const area = getPhiWorkspaceCatalogSnapshot().area;
      emitCapability(
        "deleteAreaWarning",
        `The structure this Site stored for ${area} is cleared -- its Shell, drafts and published alike. What is live changes at once, the shell's preset takes the Area back, and no revision is left to restore it from. It cannot be undone. The Module selection is kept.`,
        signal.correlationId,
      );
      emitCapability("deleteAreaKey", area, signal.correlationId);
      emitCapability("deleteAreaConfirmEnabled", false, signal.correlationId);
      emitCapability("deleteAreaOpen", null, signal.correlationId);
      return;
    }

    /*
     * The key as it is typed: the confirm button wakes the moment it matches and sleeps again when it
     * no longer does, so pressing it is never answered with "that is not the key".
     */
    if (signal.channel === "deleteAreaTyped" && signal.action === "change") {
      const payload = isPhiRecord(signal.value) ? signal.value as Record<string, unknown> : null;
      const values = isPhiRecord(payload?.values) ? payload.values : null;
      emitCapability(
        "deleteAreaConfirmEnabled",
        matchesPhiTypedConfirmation(values?.areaKey, getPhiWorkspaceCatalogSnapshot().area),
        signal.correlationId,
      );
      return;
    }

    if (signal.channel === "formValues" && signal.action === "change") {
      const payload = isPhiRecord(signal.value) ? signal.value as Record<string, unknown> : null;
      const values = isPhiRecord(payload?.values) ? payload.values : null;
      const area = getPhiWorkspaceCatalogSnapshot().area;
      if (!matchesPhiTypedConfirmation(values?.areaKey, area)) {
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
      /*
       * A whole scope only. The Table's kind select answers before its scope select does, and the kind
       * beside the scope of the kind before it names nothing; written into the address it was a
       * navigation, and the scope's answer a second one.
       */
      const binding = readPhiRevisionsTableBinding({
        area: getPhiWorkspaceCatalogSnapshot().area,
        ...readPhiTableBindingParamsSignalValue(signal.value)?.params,
      });
      if (!binding || !pathname || JSON.stringify(binding) === handedBindingKey.current) return;
      const { kind, scopeKey } = binding;
      const search = new URLSearchParams(window.location.search);
      const currentKind = normalizePhiBuilderRevisionsKindSearchParam(
        search.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM),
      );
      /*
       * An Area's history is not written into the address beyond its kind, and an absent kind is the
       * Area: nothing to navigate to. Asked to write `revisionKind=area` the Controller fetched the Page
       * anew for an address that meant the same.
       */
      if (kind === "area" && (currentKind == null || currentKind === "area")) {
        return;
      }
      search.set(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM, kind);
      if (kind === "area") {
        search.delete(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM);
      } else {
        search.set(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM, scopeKey);
      }
      /*
       * Only a changed address is a navigation. The Table hands every scope it is given back to this
       * Controller, and replacing the address with itself still fetches the Page from the server, whose
       * answer refreshes the workspace catalog, which makes this Controller hand the scope to the Table
       * again: a page scope asked for its history and the Page about once a second for as long as it
       * stood open.
       */
      if (search.toString() === window.location.search.replace(/^\?/, "")) return;
      router.replace(`${pathname}?${search.toString()}`, { scroll: false });
      return;
    }
    if (signal.channel === "mutation" && signal.action === "change" && isPhiRecord(signal.value)) {
      const payload = signal.value as Record<string, unknown>;
      const action = isPhiRecord(payload.value) ? payload.value : null;
      const key = typeof action?.key === "string" ? action.key : "";
      const scope = isPhiRecord(action?.scope) ? action.scope : null;
      const kind = normalizePhiBuilderRevisionsKindSearchParam(scope?.kind);
      const area = scope?.area;
      if (key === "restore" || key === "resetPage") {
        const structural = (kind === "area" || kind === "page") && isPhiBuilderAreaKey(area);
        const target = resolvePhiRevisionsDraftContextTarget(
          scope,
          action?.areaModules === true,
          getPhiWorkspaceCatalogSnapshot(),
        );
        reportDraftStatus({
          status: key === "restore" ? "draft" : "published",
          revisionId: typeof action?.restoredRevisionId === "number" ? action.restoredRevisionId : null,
          ...(kind === "navigation" ? { navKey: scope?.navKey } : {}),
          ...(kind === "theme" ? { themeKey: scope?.themeKey } : {}),
          ...(target ?? {}),
        }, signal.correlationId);
        if (structural) {
          router.refresh();
        }
        showMessage(
          {
            level: "success",
            content: key === "restore"
              ? `Restored revision #${String(action?.revisionId ?? "")}.`
              : "The Page is back to its Module's preset.",
          },
          { correlationId: signal.correlationId },
        );
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
  }, [address, deleteAreaShell, emitCapability, handBinding, pathname, reportDraftStatus, router, showMessage]), {
    scopes: ["area", "page"],
    channels: ["areaSelection", "bindingParams", "command", "deleteAreaTyped", "formValues", "mutation"],
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
  renderController: ({ key, address, config }) => createElement(PhiRevisionsControllerMount, { key, address, config }),
} satisfies PhiRuntimeControllerPlugin<PhiRevisionsControllerConfig>;

export const PhiRevisionsRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_REVISIONS_RUNTIME_CONTROLLER_PLUGIN,
);
