"use client";

import { useCallback, useMemo, useRef, type ReactNode } from "react";

import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderQueryResult,
  type PhiTableQuery,
} from "../../../../types/table-widget";
import { usePhiSignalEmitter } from "../../../../components/runtime/runtime-signal-identity";
import {
  PhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import { createPhiLocalizationControllerAddress } from "../controller/address";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/localization/data-providers";

const ADMIN_LOCALES_API_PATH = "/api/site/admin/locales";
const EDITOR_TRANSLATIONS_API_PATH = "/api/site/editor/translations";

type ApiResponse = {
  error?: unknown;
  site?: unknown;
  platformLocales?: unknown;
  sourceLocale?: unknown;
  selectedLocale?: unknown;
  contexts?: unknown;
  translations?: unknown;
  translation?: unknown;
  updatedAt?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRows(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readStringFilter(query: PhiTableQuery, key: string) {
  const value = query.filters?.[key];
  return typeof value === "string" ? value.trim() : "";
}

async function readApiResponse(response: Response) {
  const payload = await response.json().catch(() => null) as ApiResponse | null;
  if (!response.ok) {
    throw new PhiTableProviderError(
      "request-failed",
      typeof payload?.error === "string"
        ? payload.error
        : `Localization request failed with status ${response.status}.`,
    );
  }
  return payload;
}

function buildQueryParams(query: PhiTableQuery) {
  const params = new URLSearchParams({
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : 25),
  });
  const search = query.search?.trim() ?? "";
  if (search) params.set("search", search);
  return params;
}

async function loadSiteTranslations({
  query,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const params = buildQueryParams(query);
  const locale = readStringFilter(query, "locale");
  if (locale) params.set("locale", locale);
  const result = await readApiResponse(await fetch(`${ADMIN_LOCALES_API_PATH}?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  }));
  const translations = isRecord(result?.translations) ? result.translations : {};
  const selectedLocale = typeof result?.selectedLocale === "string" ? result.selectedLocale : "";
  const rows = readRows(translations.rows).map((row) => ({
    ...row,
    sourceContext:
      typeof row.sourceContext === "string" && row.sourceContext.trim()
        ? row.sourceContext
        : "default",
  }));
  return {
    rows,
    total: typeof translations.total === "number" ? translations.total : rows.length,
    summary: {
      localeTotal: typeof translations.localeTotal === "number"
        ? translations.localeTotal
        : rows.length,
    },
    resolvedQuery: selectedLocale
      ? { filters: { locale: selectedLocale } }
      : undefined,
    facets: {
      site: isRecord(result?.site) ? result.site : {},
      platformLocales: readRows(result?.platformLocales),
      selectedLocale,
    },
  };
}

async function loadEditorTranslations({
  query,
  signal,
}: PhiTableProviderQueryRequest): Promise<PhiTableProviderQueryResult> {
  const params = buildQueryParams(query);
  const locale = readStringFilter(query, "locale");
  const context = readStringFilter(query, "context");
  const status = readStringFilter(query, "status");
  if (locale) params.set("locale", locale);
  if (context && context !== "all") params.set("ctx", context);
  if (status) params.set("status", status);
  const result = await readApiResponse(await fetch(`${EDITOR_TRANSLATIONS_API_PATH}?${params.toString()}`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  }));
  const translations = isRecord(result?.translations) ? result.translations : {};
  const selectedLocale = typeof result?.selectedLocale === "string" ? result.selectedLocale : "";
  const rows = readRows(translations.rows).map((row) => ({
    ...row,
    status: row.hasTranslation === true ? "translated" : "missing",
  }));
  const site = isRecord(result?.site) ? result.site : {};
  return {
    rows,
    total: typeof translations.total === "number" ? translations.total : rows.length,
    resolvedQuery: selectedLocale
      ? { filters: { locale: selectedLocale } }
      : undefined,
    facets: {
      sourceLocale: typeof result?.sourceLocale === "string" ? result.sourceLocale : "",
      selectedLocale,
      availableLocales: readRows(site.availableLocales),
      contexts: readRows(result?.contexts),
    },
  };
}

async function loadSiteLocaleSettings(signal: AbortSignal) {
  const result = await readApiResponse(await fetch(`${ADMIN_LOCALES_API_PATH}?page=1&pageSize=1`, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  }));
  const site = isRecord(result?.site) ? result.site : {};
  return {
    id: "site",
    sourceLocale: typeof site.sourceLocale === "string" ? site.sourceLocale : "",
    defaultLocale: typeof site.defaultLocale === "string" ? site.defaultLocale : "",
    availableLocales: readRows(site.availableLocales).flatMap((entry) =>
      typeof entry.code === "string" ? [entry.code] : []),
  };
}

export function PhiLocalizationTableProviderClient({ children }: { children: ReactNode }) {
  const emitSignal = usePhiSignalEmitter(createPhiLocalizationControllerAddress());
  const recordsRef = useRef(new Map<string, Record<string, unknown>>());

  const query = useCallback(async (request: PhiTableProviderQueryRequest) => {
    if (request.resourceKey === "siteTranslations") {
      const data = await loadSiteTranslations(request);
      for (const row of data.rows) recordsRef.current.set(`siteTranslations:${String(row.id)}`, row);
      return data;
    }
    if (request.resourceKey === "editorTranslations") {
      const data = await loadEditorTranslations(request);
      for (const row of data.rows) recordsRef.current.set(`editorTranslations:${String(row.id)}`, row);
        emitSignal({
          scope: "area",
          channel: "localizationWorkspace",
          action: "change",
          valueType: "json",
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.localizationWorkspace,
          value: {
            workspaceKey: "editorTranslations",
            ...(data.facets ?? {}),
            query: {
              locale: typeof data.facets?.selectedLocale === "string" ? data.facets.selectedLocale : "",
              context: readStringFilter(request.query, "context"),
              status: readStringFilter(request.query, "status") || "all",
              search: request.query.search?.trim() ?? "",
            },
          },
          receiver: "broadcast",
        });
      return data;
    }
    throw new PhiTableProviderError("resource-not-found", `Unknown Localization resource "${request.resourceKey}".`);
  }, [emitSignal]);

  const readRecord = useCallback(async ({
    resourceKey,
    rowIdentity,
    signal,
  }: {
    resourceKey: string;
    rowIdentity: string | number | null;
    signal: AbortSignal;
  }) => {
    if (resourceKey === "siteLocaleSettings" && rowIdentity == null) {
      return loadSiteLocaleSettings(signal);
    }
    if (rowIdentity == null) {
      throw new PhiTableProviderError("record-identity-required", "A translation row identity is required.");
    }
    const record = recordsRef.current.get(`${resourceKey}:${String(rowIdentity)}`);
    if (!record) {
      throw new PhiTableProviderError(
        "record-not-loaded",
        "The selected translation is no longer present in the current Table view. Reload the Table and try again.",
      );
    }
    return record;
  }, []);

  const mutate = useCallback(async (request: PhiTableProviderMutationRequest) => {
    if (request.kind === "field") {
      if (request.resourceKey !== "siteTranslations" || request.fieldKey !== "translation") {
        throw new PhiTableProviderError("mutation-not-supported", "Localization field mutation is not supported.");
      }
      const [msgId = "", locale = ""] = String(request.rowIdentity).split(":", 2);
      const record = recordsRef.current.get(`siteTranslations:${String(request.rowIdentity)}`);
      if (record?.protected === true) {
        return {
          status: "rejected" as const,
          invalidation: "none" as const,
          errorCode: "protected-external-source",
          message: "External source variants are read-only.",
        };
      }
      const translation = typeof request.proposedValue === "string" ? request.proposedValue.trim() : "";
      if (!/^\d+$/.test(msgId) || !locale || !translation) {
        return {
          status: "rejected" as const,
          invalidation: "none" as const,
          errorCode: "invalid-translation",
          message: "A valid translation is required.",
        };
      }
      const payload = await readApiResponse(await fetch(ADMIN_LOCALES_API_PATH, {
        cache: "no-store",
        credentials: "include",
        headers: { accept: "application/json", "content-type": "application/json" },
        method: "PATCH",
        body: JSON.stringify({ action: "translation", msgId: Number(msgId), locale, translation }),
        signal: request.signal,
      }));
      return {
        status: "accepted" as const,
        invalidation: "none" as const,
        canonicalValue: typeof payload?.translation === "string" ? payload.translation : translation,
        rowPatch: typeof payload?.updatedAt === "string" ? { updatedAt: payload.updatedAt } : undefined,
      };
    }
    if (request.kind !== "action") {
      throw new PhiTableProviderError("mutation-not-supported", "Localization mutation is not supported.");
    }
    if (request.resourceKey !== "siteTranslations" && request.resourceKey !== "editorTranslations") {
      throw new PhiTableProviderError("invalid-resource", "Invalid Localization resource action.");
    }
    const apiPath = request.resourceKey === "siteTranslations"
      ? ADMIN_LOCALES_API_PATH
      : EDITOR_TRANSLATIONS_API_PATH;
    const init: RequestInit = {
      cache: "no-store",
      credentials: "include",
      headers: { accept: "application/json" },
      signal: request.signal,
    };
    let url = apiPath;
    if (request.actionKey === "deleteSelected" && request.resourceKey === "siteTranslations") {
      const identities = request.selectedRowIdentities ?? [];
      if (identities.length === 0) {
        throw new PhiTableProviderError("selection-required", "Select at least one translation.");
      }
      if (identities.some((identity) =>
        recordsRef.current.get(`siteTranslations:${String(identity)}`)?.protected === true)) {
        throw new PhiTableProviderError(
          "protected-external-source",
          "External source variants cannot be deleted with ordinary translation actions.",
        );
      }
      const params = new URLSearchParams();
      for (const identity of identities) params.append("id", String(identity));
      url = `${apiPath}?${params.toString()}`;
      init.method = "DELETE";
    } else if (request.actionKey === "saveTranslation") {
      if (!isRecord(request.actionValue)) {
        throw new PhiTableProviderError("invalid-action-value", "Save translation requires values.");
      }
      init.method = "PATCH";
      init.headers = { ...init.headers, "content-type": "application/json" };
      init.body = JSON.stringify({ action: "translation", ...request.actionValue });
    } else if (request.actionKey === "delete") {
      const [msgId = "", locale = ""] = String(request.rowIdentity ?? "").split(":", 2);
      if (!/^\d+$/.test(msgId) || !locale) {
        throw new PhiTableProviderError("invalid-row-identity", "Delete translation requires a valid row identity.");
      }
      const record = recordsRef.current.get(`${request.resourceKey}:${String(request.rowIdentity)}`);
      if (record?.protected === true) {
        throw new PhiTableProviderError(
          "protected-external-source",
          "External source variants require an explicit unit purge.",
        );
      }
      url = `${apiPath}?${new URLSearchParams({ msgId: String(msgId), locale }).toString()}`;
      init.method = "DELETE";
    } else if (request.resourceKey === "siteTranslations" && request.actionKey === "saveLocales") {
      if (!isRecord(request.actionValue)) {
        throw new PhiTableProviderError("invalid-action-value", "Save locales requires values.");
      }
      init.method = "PATCH";
      init.headers = { ...init.headers, "content-type": "application/json" };
      init.body = JSON.stringify({ action: "site-locales", ...request.actionValue });
    } else if (request.actionKey !== "refresh") {
      throw new PhiTableProviderError("action-not-supported", `Unsupported Localization action "${request.actionKey}".`);
    }

    if (request.actionKey !== "refresh") await readApiResponse(await fetch(url, init));
    return { status: "accepted" as const, invalidation: "view" as const };
  }, []);

  const registration = useMemo<PhiTableProviderRegistration>(() => ({
    key: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.table,
    resources: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find(
      (descriptor) => descriptor.key === PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS.table,
    )?.resources ?? [],
    query,
    readRecord,
    mutate,
  }), [mutate, query, readRecord]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
