import "server-only";

import { notFound } from "next/navigation";

import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import type { PhiContentEntryKind } from "../../../constants/content-entry-kinds";
import { PhiCmsPageType, PhiCmsRegionType } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { fetchPhiSiteContentEntry } from "../../../gateway/content-entries";
import { phiRuntime } from "../../../server-helpers/phi-runtime";
import { createPhiPageReference } from "../../../types/references";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime, PhiRuntimeModuleId } from "../../../types";

const SYNTHETIC_LIST_REGION_IDS = { regionContent: -320 } as const;
const SYNTHETIC_DETAIL_REGION_IDS = { regionContent: -321 } as const;

/**
 * A kind's Public list Page: a heading and the list, inside the frame every Public page wears
 * (`CONTENT_ENTRIES.md`).
 *
 * Two Widgets rather than one, because the heading is the Site's to change and the list is not: what the
 * list shows is whatever Core answers. A Site that wants an introduction above its entries adds it here in
 * the Builder without touching the part that reads. The heading is carried inline for the same reason the
 * other Public presets carry theirs: a Module cannot put a file into the Site's `public/` directory.
 *
 * The list links each title to the kind's detail route, named by its Module Page reference; the slug is
 * filled per entry.
 */
export async function buildPhiContentEntryListPageTree({
  page,
  kind,
  ownerModuleId,
  presetKey,
  detailPresetKey,
  heading,
}: {
  page: PhiCmsPageNode;
  kind: PhiContentEntryKind;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  /** The preset key of the kind's detail route, which the titles link to. */
  detailPresetKey: string;
  /** The heading's source text, "News". */
  heading: string;
}): Promise<PhiResolvedCmsPageTree> {
  const identity = { domain: "page" as const, ownerModuleId, presetKey };
  const layouts = createPhiPresetCmsInstanceIdMap(identity, ["layoutContent"]);
  // The node keys are part of every stored placement; the list keeps the one it had before it was shared.
  const widgets = createPhiPresetCmsInstanceIdMap(identity, ["widgetHeading", "widgetNewsList"]);
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [
      nodes.region({
        id: SYNTHETIC_LIST_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: layouts.layoutContent,
        sortOrder: 30,
      }),
    ],
    layoutNodes: [
      /*
       * A vertical Flex, not the `content` Layout the one-Widget presets use: `content` has a single slot,
       * so a second Widget placed in it is dropped without a word. `flex-vertical` carries a sequence,
       * which is what a heading above a list is.
       */
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: layouts.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: `pub ${kind} page`,
      }),
    ],
    // `stack` rather than two `widget` calls: it counts the slots, so the list sits under the heading
    // rather than in the same one.
    contentWidgets: nodes.stack(layouts.layoutContent, [
      {
        typeKey: "markdown",
        id: widgets.widgetHeading,
        label: `pub ${kind} heading widget`,
        config: {
          sourceMode: "inline",
          markdown: `# ${heading}\n`,
        },
      },
      {
        typeKey: "entry-list",
        id: widgets.widgetNewsList,
        label: `pub ${kind} list widget`,
        config: {
          kind,
          detailLinkTarget: {
            kind: "page",
            reference: createPhiPageReference({ kind: "module", ownerModuleId, presetKey: detailPresetKey }),
          },
        },
      },
    ]),
  };
}

/**
 * A kind's Public detail Page, `/<kind>/:slug`: the entry's title as the Page's own, and the entry.
 *
 * The entry is read here, before anything is drawn, because two answers depend on it that the body cannot
 * give: the Page's title and description, and its status. A slug that names no published entry answers
 * 404 -- `notFound()` raised during the request resolution, which the Area Layout runs before the shell
 * flushes, so the status line says so rather than a 200 carrying "not found".
 */
export async function buildPhiContentEntryDetailPageTree({
  page,
  runtime,
  params,
  kind,
  ownerModuleId,
  presetKey,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  params: Readonly<Record<string, string>>;
  kind: PhiContentEntryKind;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
}): Promise<PhiResolvedCmsPageTree> {
  const slug = params.slug?.trim() ?? "";
  const rt = phiRuntime(runtime);
  const entry = slug
    ? await fetchPhiSiteContentEntry({
      kind,
      slug,
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      locale: runtime.locale.current,
    })
    : null;
  if (!entry) {
    notFound();
  }

  const identity = { domain: "page" as const, ownerModuleId, presetKey };
  const layouts = createPhiPresetCmsInstanceIdMap(identity, ["layoutContent"]);
  const widgets = createPhiPresetCmsInstanceIdMap(identity, ["widgetTitle", "widgetEntry"]);
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    /*
     * The entry's words, already in the page's language: Core answers them translated. `msgId: 0`, because
     * they are no Site message of their own -- the entry's versions hold them.
     */
    pageMeta: {
      title: { msgId: 0, source: entry.title, value: entry.title },
      description: entry.subtitle
        ? { msgId: 0, source: entry.subtitle, value: entry.subtitle }
        : null,
    },
    overlays: [],
    regions: [
      nodes.region({
        id: SYNTHETIC_DETAIL_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: layouts.layoutContent,
        sortOrder: 30,
      }),
    ],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: layouts.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: `pub ${kind} detail page`,
      }),
    ],
    contentWidgets: nodes.stack(layouts.layoutContent, [
      { typeKey: "page-title", id: widgets.widgetTitle, label: `pub ${kind} detail title widget`, config: {} },
      {
        typeKey: "entry-detail",
        id: widgets.widgetEntry,
        label: `pub ${kind} detail widget`,
        config: { kind, slug },
      },
    ]),
  };
}
