import "server-only";

import { notFound } from "next/navigation";

import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import type { PhiContentEntryKind } from "../../../constants/content-entry-kinds";
import { PhiCmsPageType } from "../../../constants/phi-cms";
import { buildPhiBasePageColumnFrame } from "./phi-base-page-column";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { createPhiContentEntryRecordBinding } from "../../../helpers/content-entry-record-binding";
import { loadPhiContentEntryPage } from "../../../server-helpers/content-entry-page";
import { createPhiPageReference } from "../../../types/references";
import { PHI_CONTENT_ENTRY_RELATED_LIMIT } from "../../../gateway/content-entries";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime, PhiRuntimeModuleId } from "../../../types";
import { PHI_LAYOUT } from "../../../theme/phi-tokens";

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
  presentation,
}: {
  page: PhiCmsPageNode;
  kind: PhiContentEntryKind;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  /** The preset key of the kind's detail route, which the titles link to. */
  detailPresetKey: string;
  /** The heading's source text, "News". */
  heading: string;
  /** How the list stands: whole entries for News, cards for a Blog (the `entry-list` Widget's setting). */
  presentation: "stack" | "cards" | "compact";
}): Promise<PhiResolvedCmsPageTree> {
  const identity = { domain: "page" as const, ownerModuleId, presetKey };
  const layouts = createPhiPresetCmsInstanceIdMap(identity, ["layoutContent"]);
  // The node keys are part of every stored placement; the list keeps the one it had before it was shared.
  const widgets = createPhiPresetCmsInstanceIdMap(identity, ["widgetHeading", "widgetNewsList"]);
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    // The column of prose every entry Page stands in (`CONTENT_ENTRIES.md`, The frame).
    ...buildPhiBasePageColumnFrame({
      page,
      regionId: SYNTHETIC_LIST_REGION_IDS.regionContent,
      columnId: layouts.layoutContent,
      label: `pub ${kind} page`,
      maxWidth: PHI_LAYOUT.readingMax,
    }),
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
          presentation,
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
 * A kind's Public detail Page, `/<kind>/:slug`: the entry's header, its text, and the entries related to it.
 *
 * The entry is read here, before anything is drawn, because two answers depend on it that the body cannot
 * give: the Page's title and description, and its status. A slug that names no published entry answers
 * 404 -- `notFound()` raised during the request resolution, which the Area Layout runs before the shell
 * flushes, so the status line says so rather than a 200 carrying "not found". The three Widgets are bound to
 * the entry's record (`types/record-provider.ts`), whose Provider asks the same question
 * (`loadPhiContentEntryPage`), so it is answered once.
 *
 * Three Widgets rather than one article, because each is the Site's to rearrange: a header that shows the
 * author or not, a body, and a "more like this" list that draws nothing where nothing is related.
 */
export async function buildPhiContentEntryDetailPageTree({
  page,
  runtime,
  params,
  kind,
  ownerModuleId,
  presetKey,
  headerParts,
  related,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  params: Readonly<Record<string, string>>;
  kind: PhiContentEntryKind;
  ownerModuleId: PhiRuntimeModuleId;
  presetKey: string;
  /** What the header shows (`constants/content-entry-parts.ts`): a byline for a Blog, the date for News. */
  headerParts: number;
  /** The list under the entry: its presentation, its heading's source text, and its detail route. */
  related: { presentation: "stack" | "cards" | "compact"; title: string };
}): Promise<PhiResolvedCmsPageTree> {
  const slug = params.slug?.trim() ?? "";
  const found = slug ? (await loadPhiContentEntryPage(runtime, { kind, slug }))?.entry ?? null : null;
  if (!found) {
    notFound();
  }
  // What the three Widgets are bound to. The content entry Provider asks the question just asked, so
  // drawing them costs Core nothing more.
  const entry = createPhiContentEntryRecordBinding(kind, slug);

  const identity = { domain: "page" as const, ownerModuleId, presetKey };
  const layouts = createPhiPresetCmsInstanceIdMap(identity, ["layoutContent"]);
  const widgets = createPhiPresetCmsInstanceIdMap(identity, ["widgetHeader", "widgetEntry", "widgetRelated"]);
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    /*
     * The entry's words, already in the page's language: Core answers them translated. `msgId: 0`, because
     * they are no Site message of their own -- the entry's versions hold them.
     */
    pageMeta: {
      title: { msgId: 0, source: found.title, value: found.title },
      description: found.subtitle
        ? { msgId: 0, source: found.subtitle, value: found.subtitle }
        : null,
    },
    overlays: [],
    // The column of prose every entry Page stands in (`CONTENT_ENTRIES.md`, The frame).
    ...buildPhiBasePageColumnFrame({
      page,
      regionId: SYNTHETIC_DETAIL_REGION_IDS.regionContent,
      columnId: layouts.layoutContent,
      label: `pub ${kind} detail page`,
      maxWidth: PHI_LAYOUT.readingMax,
    }),
    contentWidgets: nodes.stack(layouts.layoutContent, [
      {
        typeKey: "entry-header",
        id: widgets.widgetHeader,
        label: `pub ${kind} detail header widget`,
        config: { entry, show: headerParts },
      },
      {
        typeKey: "entry-detail",
        id: widgets.widgetEntry,
        label: `pub ${kind} detail widget`,
        config: { entry },
      },
      {
        typeKey: "entry-list",
        id: widgets.widgetRelated,
        label: `pub ${kind} related widget`,
        config: {
          kind,
          source: "related",
          relatedTo: entry,
          presentation: related.presentation,
          title: related.title,
          limit: PHI_CONTENT_ENTRY_RELATED_LIMIT,
          // Each entry links to its own detail Page -- this one's route, filled with the related entry's slug.
          detailLinkTarget: {
            kind: "page",
            reference: createPhiPageReference({ kind: "module", ownerModuleId, presetKey }),
          },
        },
      },
    ]),
  };
}
