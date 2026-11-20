import { isPhiRecord } from "../helpers/is-record";
import { definePhiRequestMemo } from "../server-helpers/request-memo";
import "server-only";

import type { PhiCmsReviewParams } from "../server-helpers/cms-review";
import type { PhiCmsAreaModulesSelection, PhiResolvedCmsAreaPresetPayload } from "../types/cms";
import { fetchPhiSiteApi } from "./site-api-request";
import type { PhiCmsPresetIdentity } from "../types/cms-module-descriptors";

export type GetExactSiteAreaOptions = {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  area?: string;
  path: string;
  locale?: string;
  revision?: number | null;
  review?: PhiCmsReviewParams | null;
  cookieHeader?: string | null;
  /**
   * The shell identity the structure is asked for. Without one Core answers the one structure the Area
   * stores, under whatever identity it stands on: what a page view reads, because which shell applies is
   * known only from the selection in the same answer. A revision or review read answers a structure only
   * under the identity it names.
   */
  sourcePreset?: PhiCmsPresetIdentity | null;
};

/**
 * What Core stores about an Area, as the live Area read answers it: the Module selection and the
 * structure, each apart from the other (CMS.md, "The Area's Module selection").
 */
export type PhiSiteAreaRead = {
  areaMask: number;
  /** The Module selection, published or the reviewed one; null when the Area never stored one. */
  modules: PhiCmsAreaModulesSelection | null;
  /**
   * The stored structure under the identity it stands on, `sourcePreset` included; null when none is
   * stored (or none under the identity asked for). Whether it applies is the caller's question: only
   * when its identity is the Area's effective shell.
   */
  structure: PhiResolvedCmsAreaPresetPayload | null;
  /** The revision a preview or review read answered with. */
  revisionId?: number;
};

function readAreaModulesSelection(value: unknown, context: string): PhiCmsAreaModulesSelection | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    !isPhiRecord(value) ||
    !Number.isSafeInteger(value.revisionId) ||
    (value.revisionId as number) <= 0 ||
    !isPhiRecord(value.config)
  ) {
    throw new Error(`Invalid Area Module selection in ${context}.`);
  }
  return { revisionId: value.revisionId as number, config: value.config as Record<string, unknown> };
}

function readAreaStructure(
  areaMask: number,
  sourcePreset: unknown,
  preset: unknown,
  context: string,
): PhiResolvedCmsAreaPresetPayload | null {
  if (preset === null || preset === undefined) {
    return null;
  }
  if (!isPhiRecord(preset) || !isPhiRecord(preset.preset) || !isPhiRecord(sourcePreset)) {
    throw new Error(`Missing CMS area structure in ${context}.`);
  }
  return {
    areaMask,
    sourcePreset: sourcePreset as unknown as PhiResolvedCmsAreaPresetPayload["sourcePreset"],
    preset: preset as unknown as PhiResolvedCmsAreaPresetPayload["preset"],
  };
}

function readSiteAreaRead(body: unknown, context: string): PhiSiteAreaRead {
  if (!isPhiRecord(body) || !Number.isSafeInteger(body.areaMask)) {
    throw new Error(`Missing CMS area payload in ${context}.`);
  }
  const areaMask = body.areaMask as number;
  return {
    areaMask,
    modules: readAreaModulesSelection(body.modules, context),
    structure: readAreaStructure(areaMask, body.sourcePreset, body.preset, context),
    ...(Number.isSafeInteger(body.revisionId) ? { revisionId: body.revisionId as number } : {}),
  };
}

/**
 * The Area read (`GET /api/v1/site/area`). Live it always answers; a revision or review read answers
 * `null` for a revision that is not there -- or, for a structure revision, not under the identity named.
 */
export const getExactSiteArea = definePhiRequestMemo(async function getExactSiteArea({
  apiBaseUrl,
  internalToken,
  siteKey,
  path,
  locale,
  revision,
  review,
  cookieHeader,
  sourcePreset,
}: GetExactSiteAreaOptions): Promise<PhiSiteAreaRead | null> {
  const searchParams = new URLSearchParams({ path });
  if (sourcePreset) {
    searchParams.set("ownerModuleId", sourcePreset.ownerModuleId);
    searchParams.set("presetKey", sourcePreset.presetKey);
  }
  if (Number.isInteger(revision) && (revision as number) > 0) {
    searchParams.set("revision", String(revision));
  }
  if (review?.kind === "area") {
    searchParams.set("reviewKind", review.kind);
    searchParams.set("reviewRevision", String(review.revisionId));
  }
  const payload = await fetchPhiSiteApi<unknown>({
    context: "getExactSiteArea",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/area",
    searchParams,
    locale,
    cookieHeader,
    failure: "Failed to fetch exact CMS area",
    notFoundIsNull: true,
  });
  return payload === null ? null : readSiteAreaRead(payload, "getExactSiteArea");
});

export type PhiPublishedPage = {
  path: string | null;
  ownerModuleId: string | null;
  presetKey: string | null;
  revisionId: number;
  publishedAt: string;
};

export type PhiAreaWithPublishedPages = {
  /** The live Area read without an identity: the selection and the stored structure, each or neither. */
  area: PhiSiteAreaRead;
  publishedPages: PhiPublishedPage[];
};

function readPublishedPage(entry: unknown): PhiPublishedPage {
  if (!isPhiRecord(entry)) {
    throw new Error("Invalid published Page projection.");
  }
  const value = entry as Record<string, unknown>;
  const isNullableString = (field: unknown) => field === null || typeof field === "string";
  if (
    !isNullableString(value.path) ||
    !isNullableString(value.ownerModuleId) ||
    !isNullableString(value.presetKey) ||
    !Number.isSafeInteger(value.revisionId) ||
    typeof value.publishedAt !== "string"
  ) {
    throw new Error("Invalid published Page projection.");
  }
  return {
    path: value.path as string | null,
    ownerModuleId: value.ownerModuleId as string | null,
    presetKey: value.presetKey as string | null,
    revisionId: value.revisionId as number,
    publishedAt: value.publishedAt,
  };
}

/**
 * A published Area together with its published Pages, as the sitemap and the search index read them.
 *
 * One request for both: the sitemap needs the Area's `index` and `sitemap` switches and the Pages it
 * may list, and the server adds the second to the first on `include=publishedPages`. The Pages are
 * candidates, not answers -- whether one is listed the caller finds out by resolving it. Live and
 * anonymous only, so no cookie is sent and no draft can be asked for. Core answers it for the Public
 * and the App Area, the two anything indexes (SEARCH.md).
 */
export async function getSiteAreaWithPublishedPages({
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  area = "public",
}: Pick<GetExactSiteAreaOptions, "apiBaseUrl" | "internalToken" | "siteKey" | "locale"> & {
  area?: "public" | "app";
}): Promise<PhiAreaWithPublishedPages> {
  const payload = await fetchPhiSiteApi<unknown>({
    context: "getSiteAreaWithPublishedPages",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/v1/site/area",
    searchParams: {
      // Core reads the Area off the path's first segment; Public has none.
      path: area === "public" ? "/" : `/${area}`,
      include: "publishedPages",
    },
    locale,
    failure: `Failed to fetch the ${area} Area with its Pages`,
    userAgent: "phis-ui-sitemap/1.0",
  });
  if (!isPhiRecord(payload) || !Array.isArray(payload.publishedPages)) {
    throw new Error("Missing published Page projection.");
  }
  return {
    area: readSiteAreaRead(payload, "getSiteAreaWithPublishedPages"),
    publishedPages: payload.publishedPages.map(readPublishedPage),
  };
}

type PhiSiteAreaStructureRequest = {
  area: string;
  ownerModuleId: string;
  presetKey: string;
};

type PhiSiteAreaStructure = {
  area: string;
  /** The open draft; when there is one, `published` is not read. */
  draft: PhiResolvedCmsAreaPresetPayload | null;
  published: PhiResolvedCmsAreaPresetPayload | null;
  /** The Area's Module selection, whatever identity was asked: the open Module draft, else what is published. */
  modules: {
    draft: (PhiCmsAreaModulesSelection & { version: number; nextNodeSequence: number }) | null;
    published: PhiCmsAreaModulesSelection | null;
  };
};

function readAreaModulesStructure(value: unknown, area: string): PhiSiteAreaStructure["modules"] {
  if (!isPhiRecord(value)) {
    throw new Error(`Missing CMS area Module selection for "${area}".`);
  }
  const context = `the structures read of "${area}"`;
  const draft = readAreaModulesSelection(value.draft ?? null, context);
  const draftRecord = isPhiRecord(value.draft) ? value.draft : null;
  if (draft && (!Number.isSafeInteger(draftRecord?.version) || !Number.isSafeInteger(draftRecord?.nextNodeSequence))) {
    throw new Error(`Invalid Area Module draft in ${context}.`);
  }
  return {
    draft: draft
      ? { ...draft, version: draftRecord!.version as number, nextNodeSequence: draftRecord!.nextNodeSequence as number }
      : null,
    published: draft ? null : readAreaModulesSelection(value.published ?? null, context),
  };
}

function readAreaStructurePayload(value: unknown, area: string, kind: string) {
  if (value === null) {
    return null;
  }
  if (!isPhiRecord(value) || !isPhiRecord(value.preset) || !value.preset.preset) {
    throw new Error(`Missing CMS area ${kind} payload for "${area}".`);
  }
  return value as PhiResolvedCmsAreaPresetPayload;
}

/**
 * What several Areas store about their structure, in one request: per Area its open draft, else what is
 * published, else nothing -- for each the answer of the draft read (`GET /api/site/cms/area/draft`) or of
 * `getExactSiteArea`, without a request per Area and read (phis-server `POST /api/site/cms/area/structures`).
 * Each entry also carries the Area's Module selection, which names no identity. An Area may be asked more
 * than once, under each shell identity it could stand on: the structure answers only under its own.
 */
export const getSiteAreaStructures = definePhiRequestMemo(async function getSiteAreaStructures({
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  cookieHeader,
  areas,
}: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  locale?: string;
  cookieHeader?: string | null;
  areas: readonly PhiSiteAreaStructureRequest[];
}): Promise<PhiSiteAreaStructure[]> {
  const payload = await fetchPhiSiteApi<{ areas?: unknown }>({
    context: "getSiteAreaStructures",
    apiBaseUrl,
    internalToken,
    siteKey,
    path: "/api/site/cms/area/structures",
    method: "POST",
    body: { areas },
    locale,
    cookieHeader,
    failure: "Failed to fetch CMS area structures",
  });
  const answers = payload?.areas;
  if (!Array.isArray(answers) || answers.length !== areas.length) {
    throw new Error("Invalid CMS area structures payload.");
  }
  return areas.map((request, index) => {
    const answer = answers[index] as Record<string, unknown> | undefined;
    if (!isPhiRecord(answer) || answer.area !== request.area) {
      throw new Error(`CMS area structures answered out of order at "${request.area}".`);
    }
    return {
      area: request.area,
      draft: readAreaStructurePayload(answer.draft ?? null, request.area, "draft"),
      published: readAreaStructurePayload(answer.published ?? null, request.area, "published"),
      modules: readAreaModulesStructure(answer.modules, request.area),
    };
  });
});
