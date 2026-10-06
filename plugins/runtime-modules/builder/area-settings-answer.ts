import {
  PHI_AREA_META_PUBLIC_DEFAULTS,
  type PhiAreaMeta,
  type PhiAreaRootRoute,
} from "../../../helpers/cms-area-config";
import { isPhiRecord } from "../../../helpers/is-record";
import {
  builderWorkspaceStore,
  readPhiBuilderEffectiveAreaMeta,
  readPhiBuilderEffectiveAreaRootRoute,
  restorePhiDeveloperBuilderAreaMeta,
  setPhiDeveloperBuilderAreaRootRoute,
} from "./developer-workspace-store";
import { phiBuilderHistory, type PhiBuilderHistorySnapshot } from "./history";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";

/**
 * What the Area settings dialog says about being found, as the whole answer the Area is left with.
 *
 * The dialog answers every field at once, so the answer replaces what stood rather than merging into
 * it: a title the author emptied is a title taken away, and leaving the old key in place -- or writing
 * `""` over it, as the merging setter did -- kept a value nobody chose. The switches are only read where
 * the dialog asked them (`index`/`sitemap` given), so an Area that was never asked keeps its silence.
 */
export function resolvePhiBuilderAreaSettingsMeta(
  effective: PhiAreaMeta | null,
  answer: {
    titleTemplate: unknown;
    defaultTitle: unknown;
    index?: boolean;
    sitemap?: boolean;
  },
): PhiAreaMeta {
  const next: PhiAreaMeta = { ...(effective ?? {}) };
  delete next.titleTemplate;
  delete next.defaultTitle;
  const titleTemplate = typeof answer.titleTemplate === "string" ? answer.titleTemplate.trim() : "";
  const defaultTitle = typeof answer.defaultTitle === "string" ? answer.defaultTitle.trim() : "";
  if (titleTemplate) next.titleTemplate = titleTemplate;
  if (defaultTitle) next.defaultTitle = defaultTitle;
  if (answer.index !== undefined) next.index = answer.index;
  if (answer.sitemap !== undefined) next.sitemap = answer.sitemap;
  return next;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPhiRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

/**
 * Whether two answers say the same thing, whatever order their keys were written in. The dialog builds
 * its answer afresh, so comparing it by `JSON.stringify` against the stored one would call a reordered
 * copy a change.
 */
export function isSamePhiBuilderAreaAnswer(left: unknown, right: unknown) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

type PhiBuilderAreaSettingsPart = Extract<PhiBuilderHistorySnapshot, { kind: "composite" }>["parts"][number];

/**
 * Writes what the Area settings dialog answered, as one step of the Area's history.
 *
 * One press of OK, one step: the root route and the SEO answers live in two places, but the author
 * answered one dialog, and two entries made that press two undos -- the first of them leaving a state
 * the author never saw. A part that says what already stood is neither written nor recorded, and an OK
 * that changed nothing leaves no step at all, which would otherwise have marked an unchanged Area
 * unsaved. `rootRoute` is `undefined` when the dialog did not ask it.
 */
export function applyPhiBuilderAreaSettingsAnswer({
  area,
  historyContext,
  rootRoute,
  meta,
}: {
  area: PhiDeveloperBuilderArea;
  historyContext: string;
  rootRoute: PhiAreaRootRoute | null | undefined;
  meta: Parameters<typeof resolvePhiBuilderAreaSettingsMeta>[1];
}) {
  const current = builderWorkspaceStore.getSnapshot("public");
  const before: PhiBuilderAreaSettingsPart[] = [];
  const after: PhiBuilderAreaSettingsPart[] = [];

  if (rootRoute !== undefined && !isSamePhiBuilderAreaAnswer(readPhiBuilderEffectiveAreaRootRoute(current, area), rootRoute)) {
    before.push({ kind: "areaRootRoute", area, rootRoute: current.areaRootRouteDrafts?.[area] });
    after.push({ kind: "areaRootRoute", area, rootRoute });
    setPhiDeveloperBuilderAreaRootRoute(area, rootRoute);
  }

  const effectiveMeta = readPhiBuilderEffectiveAreaMeta(current, area);
  const nextMeta = resolvePhiBuilderAreaSettingsMeta(effectiveMeta, meta);
  // An Area that was never asked about indexing means the defaults, so answering them is no change.
  const defaults = area === "public" ? PHI_AREA_META_PUBLIC_DEFAULTS : {};
  if (!isSamePhiBuilderAreaAnswer({ ...defaults, ...effectiveMeta }, { ...defaults, ...nextMeta })) {
    before.push({ kind: "areaMeta", area, meta: current.areaMetaDrafts?.[area] });
    after.push({ kind: "areaMeta", area, meta: nextMeta });
    restorePhiDeveloperBuilderAreaMeta(area, nextMeta);
  }

  if (before.length > 0) {
    phiBuilderHistory.record(historyContext, {
      action: { key: "changeAreaSettings" },
      before: { kind: "composite", parts: before },
      after: { kind: "composite", parts: after },
    });
  }
}
