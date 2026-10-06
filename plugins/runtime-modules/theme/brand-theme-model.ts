/*
 * The Brand Theme as the Theme Controller and the Brand Widgets both read it: the payload, the Theme
 * history, and the few pure steps the Controller takes on a draft that the Widgets take too. It lives
 * beside both, because the Controller is not a Widget and the Widgets do not own the draft.
 */
import { isPhiRecord } from "../../../helpers/is-record";

import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import {
  PHI_DEFAULT_THEME_PRESET_KEY,
  PHI_DEFAULT_THEME_PRESET_VERSION,
  resolvePhiThemePresetPlugin,
  type PhiThemePresetPlugin,
} from "../../../theme/phi-theme-presets";
import type { PhiBuilderBrandWidgetConfig } from "./widgets/brand-controls/config";
import { createPhiHistoryStore } from "../../../components/state/history-store";

export type ThemePayload = NonNullable<PhiBlockRuntime["site"]["theme"]>;

export const phiThemeHistory = createPhiHistoryStore<ThemePayload>(
  "@phis/ui/theme-history",
);

export type ThemeReadResponse = {
  key?: string;
  published?: ThemePayload;
  publishedRevisionId?: number | null;
  workingDraftRevisionId?: number | null;
  draft?: {
    revisionId?: number | null;
    theme?: {
      theme?: ThemePayload;
      key?: string;
    } | null;
  } | null;
};

export type ThemeWriteResponse = {
  key?: string;
  revisionId?: number | null;
  theme?: {
    theme?: ThemePayload;
    key?: string;
  } | null;
  error?: string;
};

export type BrandThemeState = {
  key: string;
  published: ThemePayload;
  draft: ThemePayload;
  revisionId: number | null;
  hasPublishedThemeRevision: boolean;
  publishedRevisionId: number | null;
};

export const DEFAULT_THEME_KEY = "default";

/** The record without the named fields, for the places where a part of the Theme is handed back to its block. */
export function omitThemeFields(theme: ThemePayload, ...fields: ReadonlyArray<keyof ThemePayload>): ThemePayload {
  return Object.fromEntries(
    Object.entries(theme).filter(([key]) => !fields.includes(key as keyof ThemePayload)),
  ) as ThemePayload;
}

export function resolveThemeKey(config?: PhiBuilderBrandWidgetConfig | null) {
  return config?.themeKey?.trim() || DEFAULT_THEME_KEY;
}

export function normalizeTheme(input: unknown, fallback: ThemePayload): ThemePayload {
  if (!isPhiRecord(input)) {
    return fallback;
  }

  return input as ThemePayload;
}

/**
 * A fresh draft names its blocks and owns nothing: the proportions come from the style block at
 * resolve time, the colour from the palette block, and nothing is copied in that a reset would later
 * have to know how to take away.
 */
export function resolveInitialTheme(runtime: PhiBlockRuntime): ThemePayload {
  return normalizeTheme(runtime.site.theme, {
    mode: "light",
    preset: PHI_DEFAULT_THEME_PRESET_KEY,
    presetVersion: PHI_DEFAULT_THEME_PRESET_VERSION,
  } as ThemePayload);
}

export function clearThemeControlShape(theme: ThemePayload): ThemePayload {
  const shape = Object.fromEntries(
    Object.entries(theme.shape ?? {}).filter(([key]) => key !== "controls"),
  ) as NonNullable<ThemePayload["shape"]>;
  return Object.keys(shape).length > 0 ? { ...theme, shape } : omitThemeFields(theme, "shape");
}

export function resolveThemePayloadPreset(
  theme: ThemePayload,
  presets: readonly PhiThemePresetPlugin[],
) {
  return resolvePhiThemePresetPlugin(presets, theme.preset);
}

/**
 * Picking a palette block drops the author's own palette, exactly as picking a ground or a style drops
 * theirs: somebody choosing another palette means to see it, and their seeds laid over it would hide
 * the very thing they asked for.
 */
export function applyThemePreset(theme: ThemePayload, preset: PhiThemePresetPlugin): ThemePayload {
  return {
    ...omitThemeFields(theme, "palette"),
    preset: preset.key,
    presetVersion: preset.version,
  };
}

/** Back to the blocks alone: the palette, the proportions, the Button shadows and the component overrides all go. */
export function resetThemeToPreset(
  theme: ThemePayload,
  presets: readonly PhiThemePresetPlugin[],
  preset = resolveThemePayloadPreset(theme, presets),
): ThemePayload {
  return {
    ...omitThemeFields(theme, "palette", "style", "buttons", "components"),
    preset: preset.key,
    presetVersion: preset.version,
  };
}

export function buildThemeReviewRoutePath(area: PhiCmsAreaKey) {
  return area === "public" ? "/public" : `/${area}`;
}

export function buildThemeReviewHref({
  area,
  revisionId,
  themeKey,
}: {
  area: PhiCmsAreaKey;
  revisionId: number;
  themeKey: string;
}) {
  const url = new URL(buildThemeReviewRoutePath(area), window.location.origin);
  url.searchParams.set("reviewKind", "theme");
  url.searchParams.set("reviewRevision", String(revisionId));
  url.searchParams.set("reviewArea", area);
  url.searchParams.set("reviewPage", "/");
  url.searchParams.set("reviewThemeKey", themeKey);

  return `${url.pathname}${url.search}`;
}

/**
 * What a Widget knows before the Controller has told it anything: the theme the Site was rendered with.
 *
 * It used to consult a module variable the Widgets kept between them, because a Widget mounting late
 * had no other way to learn about an unsaved draft. That variable answered for the browser tab, while
 * the draft belongs to the Area the Controller is mounted in -- so it was right by coincidence and
 * silently wrong wherever the two differed. A Widget asks now, and this is only the starting point.
 */
export function createInitialBrandThemeState(themeKey: string, fallbackTheme: ThemePayload): BrandThemeState {
  return {
    key: themeKey,
    published: fallbackTheme,
    draft: fallbackTheme,
    revisionId: null,
    hasPublishedThemeRevision: false,
    publishedRevisionId: null,
  };
}

export function isSameThemePayload(left: ThemePayload, right: ThemePayload) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Where a draft stands in a continuous edit.
 *
 * A colour picker or a slider sends a draft for every value it passes over, and none of those is a
 * decision: the decision is taking the value -- closing the picker, letting go of the slider -- or
 * putting it back with Escape.
 * `live` is a step shown in the preview and kept out of the history; `commit` ends the edit with one
 * entry from where it started; `discard` ends it with none and the Theme as it was before it opened.
 */
export type PhiThemeDraftEdit = "live" | "commit" | "discard";

/**
 * A Set decides all three parts, so it clears all three: the parts picked one by one, because a Set is
 * what somebody falls back on when they stop deciding each part, and the values authored on top of
 * them, for the same reason picking a single block clears its own. The Control shape belongs to the
 * style, so it goes with the style tokens.
 */
export function mergeThemeSetChoice(
  theme: ThemePayload,
  set: { key: string; version: number },
): ThemePayload {
  return clearThemeAuthoredFonts(clearThemeAuthoredGround(clearThemeControlShape(clearThemeStyleTokens({
    ...theme,
    blocks: { set: { key: set.key, version: set.version } },
  }))));
}

/** Every font slot an author set, so the Set's fonts block is what shows. */
export function clearThemeAuthoredFonts(theme: ThemePayload): ThemePayload {
  return omitThemeFields(theme, "fonts");
}

/** Every ground value an author set, in both modes, so the chosen block is what shows. */
export function clearThemeAuthoredGround(theme: ThemePayload): ThemePayload {
  const root = Object.fromEntries(
    Object.entries(theme.root ?? {}).filter(([key]) => key !== "background" && key !== "chrome"),
  ) as NonNullable<ThemePayload["root"]>;
  return { ...theme, root };
}

/**
 * Dropping every structural override, so the style block shows through again.
 *
 * Colour stays: the two tabs are two decisions, and somebody resetting the proportions did not ask to
 * lose the brand colour they picked. The record keeps them apart -- `palette` and `style` -- so taking
 * the one away never touches the other.
 */
export function clearThemeStyleTokens(theme: ThemePayload): ThemePayload {
  return omitThemeFields(theme, "style");
}
