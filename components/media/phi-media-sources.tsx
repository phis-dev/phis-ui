"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PHIS_MEDIA_SOURCE_PAGE_MAX_ITEMS,
  type PhisMediaSourceItem,
  type PhisMediaSourceKind,
  type PhisMediaSourceListInput,
  type PhisMediaSourcePage,
} from "@phis/contracts/media-source";

import { isPhiRecord } from "../../helpers/is-record";
import type { PhiMediaAssetTile } from "../../types/media";
import type { PhiMediaSourceClient, PhiMediaSourceKey } from "../../types/media-source";
import { usePhiMediaSourceClientDefinitions, loadPhiMediaSourceClient } from "../runtime/runtime-module-media-source-client-manifest";
import { usePhiIntlLocale } from "../root/phi-intl-locale";
import type { PhiMediaUploadLabels } from "./media-upload-labels";
import { readPhiMediaUploadRefusalMessage } from "./media-upload-refusals";
import { normalizePhiImagePreviewTile, readPhiMediaAssetTiles } from "./phi-image-preview-data";
import { buildPhiMediaRequestHeaders } from "./phi-media-request-headers";

/**
 * The media sources of this Area, as the Media picker holds them: somewhere other than the Site's library a
 * file can be taken from (`@phis/contracts/media-source`).
 *
 * Two suppliers answer one shape. A Module of the Site's build runs in the browser, so the picker asks it
 * directly and uploads what is chosen like any other file; an Add-on runs on the server, so Core asks it
 * and imports what is chosen. Either way the result of choosing is an ordinary Asset of the Site's Media
 * library, and nothing here ever keeps a reference into a source.
 */

/** What the picker's source switch offers: the id it names a source by, and the words for it. */
export type PhiMediaSourceOption = { id: string; label: string };

/** What a Module's file is titled and described after it was uploaded; the Add-on's import does this itself. */
export type PhiMediaSourceImportMetadata = { title: string; altText: string | null };

export type PhiMediaSourceImport = {
  asset: PhiMediaAssetTile;
  /** Present where the picker still has to write title and alt text onto the Asset it just uploaded. */
  metadata: PhiMediaSourceImportMetadata | null;
};

export type PhiMediaSource = PhiMediaSourceOption & {
  list(input: PhisMediaSourceListInput & { signal: AbortSignal }): Promise<PhisMediaSourcePage>;
  /** Always into the Site Space: an import never goes anywhere else. */
  importItem(input: {
    item: PhisMediaSourceItem;
    folderId: number | null;
    signal: AbortSignal;
  }): Promise<PhiMediaSourceImport>;
};

/** A source that answered with a refusal; `code` is the library's or the route's own, when it said one. */
export class PhiMediaSourceError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(message: string, code: string | null = null, status = 0) {
    super(message);
    this.name = "PhiMediaSourceError";
    this.code = code;
    this.status = status;
    Object.setPrototypeOf(this, PhiMediaSourceError.prototype);
  }
}

const SOURCES_PATH = "/api/site/media/sources";

/**
 * The words for an import that did not work: the upload refusals' where the code is one they have words
 * for, and one generic text for everything else -- a source's own failure included, which the reader can
 * do nothing about and the server has logged.
 */
export function readPhiMediaSourceImportErrorMessage(
  error: unknown,
  refusals: PhiMediaUploadLabels,
  genericText: string,
) {
  const code = (error as { code?: unknown } | null)?.code;
  return readPhiMediaUploadRefusalMessage(code, refusals) ?? genericText;
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNullableDimension(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function isHttpsAddress(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * One page of a source, read field by field whoever supplied it.
 *
 * A thumbnail is loaded by the reader's browser from wherever it points, so an address that is not an
 * absolute `https:` one is a source that does not hold the contract, not an item to leave out.
 */
export function readPhiMediaSourcePage(value: unknown): PhisMediaSourcePage {
  if (!isPhiRecord(value) || !Array.isArray(value.items)) {
    throw new PhiMediaSourceError("A media source answered no list.");
  }
  if (value.items.length > PHIS_MEDIA_SOURCE_PAGE_MAX_ITEMS) {
    throw new PhiMediaSourceError("A media source answered more items than were asked for.");
  }
  const items = value.items.map((entry): PhisMediaSourceItem => {
    if (
      !isPhiRecord(entry) ||
      typeof entry.id !== "string" || !entry.id ||
      typeof entry.kind !== "string" || !entry.kind ||
      typeof entry.title !== "string" ||
      typeof entry.thumbnailUrl !== "string" || !isHttpsAddress(entry.thumbnailUrl)
    ) {
      throw new PhiMediaSourceError("A media source answered an item that holds no contract.");
    }
    return {
      id: entry.id,
      kind: entry.kind as PhisMediaSourceKind,
      title: entry.title,
      thumbnailUrl: entry.thumbnailUrl,
      width: readNullableDimension(entry.width),
      height: readNullableDimension(entry.height),
      credit: readNullableString(entry.credit),
    };
  });
  const nextCursor = value.nextCursor;
  if (nextCursor != null && typeof nextCursor !== "string") {
    throw new PhiMediaSourceError("A media source answered a cursor that is not text.");
  }
  return { items, nextCursor: nextCursor ?? null };
}

async function readErrorResponse(response: Response): Promise<never> {
  const payload = await response.json().catch(() => null) as { error?: unknown; message?: unknown } | null;
  throw new PhiMediaSourceError(
    typeof payload?.message === "string" ? payload.message : `Media source request failed (${response.status}).`,
    typeof payload?.error === "string" ? payload.error : null,
    response.status,
  );
}

type PhiMediaAddonSourceRow = { source: string; label: string };

/**
 * Asked once per page lifetime, and only when a picker first opens: most Sites have no Add-on that offers
 * a source, and a page that never opens a picker should not find that out. A refused or failed request is
 * "no Add-on sources", not an error -- somebody who may not manage Media gets the picker they always had.
 */
let addonSourceRows: Promise<readonly PhiMediaAddonSourceRow[]> | null = null;

function loadPhiMediaAddonSourceRows() {
  addonSourceRows ??= (async () => {
    try {
      const response = await fetch(SOURCES_PATH, {
        method: "GET",
        headers: buildPhiMediaRequestHeaders({ Accept: "application/json" }),
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) return [];
      const payload = await response.json().catch(() => null) as { rows?: unknown } | null;
      if (!Array.isArray(payload?.rows)) return [];
      return payload.rows.flatMap((row): PhiMediaAddonSourceRow[] =>
        isPhiRecord(row) && typeof row.source === "string" && row.source && typeof row.label === "string"
          ? [{ source: row.source, label: row.label }]
          : []);
    } catch {
      return [];
    }
  })();
  return addonSourceRows;
}

/** For tests: forgets the one request a page makes. */
export function resetPhiMediaAddonSourcesForTests() {
  addonSourceRows = null;
}

function createPhiMediaAddonSource(row: PhiMediaAddonSourceRow): PhiMediaSource {
  return {
    id: `addon:${row.source}`,
    label: row.label,
    async list({ signal, ...input }) {
      const search = new URLSearchParams({
        source: row.source,
        q: input.query,
        limit: String(input.limit),
        locale: input.locale,
      });
      if (input.cursor) search.set("cursor", input.cursor);
      for (const kind of input.kinds ?? []) search.append("kind", kind);
      const response = await fetch(`${SOURCES_PATH}/items?${search.toString()}`, {
        method: "GET",
        headers: buildPhiMediaRequestHeaders({ Accept: "application/json" }),
        cache: "no-store",
        credentials: "include",
        signal,
      });
      if (!response.ok) return readErrorResponse(response);
      return readPhiMediaSourcePage(await response.json().catch(() => null));
    },
    async importItem({ item, folderId, signal }) {
      const response = await fetch(`${SOURCES_PATH}/import`, {
        method: "POST",
        headers: buildPhiMediaRequestHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        cache: "no-store",
        credentials: "include",
        signal,
        body: JSON.stringify({ source: row.source, itemId: item.id, ...(folderId != null ? { folderId } : {}) }),
      });
      if (!response.ok) return readErrorResponse(response);
      const payload = await response.json().catch(() => null) as { asset?: unknown } | null;
      // The Asset exactly as the Media listing serialises a tile, read the way the listing is read.
      const [asset] = readPhiMediaAssetTiles(payload?.asset == null ? [] : [payload.asset]);
      if (!asset) throw new PhiMediaSourceError("The import answered no Asset.");
      return { asset, metadata: null };
    },
  };
}

function createPhiMediaModuleSource(
  key: PhiMediaSourceKey,
  label: string,
  client: PhiMediaSourceClient,
): PhiMediaSource {
  return {
    id: `module:${key}`,
    label,
    async list({ signal, ...input }) {
      return readPhiMediaSourcePage(await client.list({ ...input, signal }));
    },
    async importItem({ item, folderId, signal }) {
      const taken = await client.take({ itemId: item.id, signal });
      const file = new File([taken.file], taken.fileName, { type: taken.file.type });
      /*
       * The picker uploads, through the transport every upload takes: init, bytes, finalize, into the Site
       * Space (no Space named) and the Folder the picker shows. `meta` is a record of where the file came
       * from and nothing reads it to find the file again. The Module never writes an Asset itself.
       *
       * The transport is loaded here and not with the picker: a picker is opened far more often than a
       * Module's source is imported from, and an Add-on's source never needs it.
       */
      const { runPhiMediaUploadSession } = await import("./media-upload-flow");
      const { asset } = await runPhiMediaUploadSession(
        file,
        undefined,
        {
          folderId,
          spaceAddress: null,
          meta: {
            source: "media-source",
            sourceKey: key,
            itemId: item.id,
            credit: taken.credit ?? item.credit ?? null,
          },
        },
        signal,
      );
      return {
        asset: normalizePhiImagePreviewTile(asset, []),
        metadata: { title: taken.title, altText: taken.altText ?? null },
      };
    },
  };
}

/**
 * The sources this Area's picker offers: its Modules' (those active in the Area, named in the reader's
 * language by their own `describe`) and the Add-ons' (`GET /api/site/media/sources`).
 *
 * Nothing is asked until `enabled` -- a picker that is open -- and the Add-on request is made once per
 * page. A Module source whose `describe` fails is left out rather than shown nameless.
 */
export function usePhiMediaSources({ enabled }: { enabled: boolean }): readonly PhiMediaSource[] {
  const definitions = usePhiMediaSourceClientDefinitions();
  const locale = usePhiIntlLocale();
  const [addonSources, setAddonSources] = useState<readonly PhiMediaSource[]>([]);
  const [moduleSources, setModuleSources] = useState<readonly PhiMediaSource[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void loadPhiMediaAddonSourceRows().then((rows) => {
      if (current) setAddonSources(rows.map(createPhiMediaAddonSource));
    });
    return () => { current = false; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || definitions.length === 0) return;
    let current = true;
    void Promise.all(definitions.map(async (definition) => {
      try {
        const client = await loadPhiMediaSourceClient(definition);
        const { label } = await client.describe({ locale });
        return typeof label === "string" && label.trim()
          ? createPhiMediaModuleSource(definition.key, label, client)
          : null;
      } catch (error) {
        console.error(`Media source "${definition.key}" could not be described.`, error);
        return null;
      }
    })).then((sources) => {
      if (current) setModuleSources(sources.filter((source): source is PhiMediaSource => source != null));
    });
    return () => { current = false; };
  }, [definitions, enabled, locale]);

  return useMemo(() => {
    const offered = new Set<string>(definitions.map((definition) => `module:${definition.key}`));
    return [...moduleSources.filter((source) => offered.has(source.id)), ...addonSources];
  }, [addonSources, definitions, moduleSources]);
}
