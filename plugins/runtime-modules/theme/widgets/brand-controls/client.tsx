"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Button, Card, Collapse, ConfigProvider, Divider, Flex, Form, Input, Select, Space, Statistic, Switch, Tag, Typography, theme as antdTheme } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { AliasToken } from "antd/es/theme/interface";
import type { PhiColorPickerLabels } from "../../../../../components/widgets/label-types/color-picker";

import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalAddress } from "../../../../../types/signals";
import type { PhiBlockRuntime } from "../../../../../types/widget-runtime";
import { createPhiThemeControllerAddress } from "../../../../../plugins/runtime-modules/theme/controller/address";
import { PHI_THEME_SIGNAL_CHANNELS } from "../../../../../plugins/runtime-modules/theme/controller/signals";
import { createPhiCoreRuntimeControllerAddress } from "../../../../../components/runtime/core-runtime-controller-address";
import type { PhiCmsAreaKey } from "../../../../../constants/cms-areas";
import {
  PHI_DEFAULT_THEME_PRESET_KEY,
  PHI_DEFAULT_THEME_PRESET_VERSION,
  PHI_THEME_CUSTOM_COLOR_KEYS,
  isPhiThemePaletteModeSeedKey,
  mergePhiThemePalettes,
  resolvePhiThemeColorTokens,
  resolvePhiThemePresetPlugin,
  type PhiThemeMode,
  type PhiThemePalette,
  type PhiThemePaletteMode,
  type PhiThemePresetPlugin,
  type PhiThemeCustomColorKey,
  type PhiThemeCustomColorPalette,
} from "../../../../../theme/phi-theme-presets";
import {
  buildPhiThemeCustomColorPalette,
  resolvePhiThemePaletteCustomColors,
  resolvePhiThemePresetCustomColors,
} from "../../../../../theme/phi-theme-palette";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import {
  resolvePhiThemeComposition,
  resolvePhiThemeEffectiveFonts,
  resolvePhiThemeEffectiveRoot,
} from "../../../../../theme/phi-theme-composition";
import type { PhiThemeFontsBlock } from "../../../../../theme/phi-theme-blocks";
import type { PhiSiteFontSlots } from "../../../../../types/site-theme";
import { usePhiSiteFontAssets } from "../../../../../components/media/phi-site-font-assets";
import { resolvePhiThemeRuntimePayload } from "../../../../../theme/phi-theme-runtime";
import { materializePhiThemeModuleBlocks } from "../../materialize-images";
import {
  createPhiAntdThemeCssVarKey,
  resolvePhiAntdAliasTokens,
} from "../../../../../theme/phi-antd-token-resolver";
import {
  buildPhiThemeStructuralTokens,
} from "../../../../../theme/phi-theme";
import {
  buildPhiSiteThemeSelectOptions,
  createPhiSiteThemeSelectionValue,
  createPhiThemeDerivation,
  ensurePhiThemeDerivation,
  readPhiSiteThemeSelectionState,
  resolvePhiThemeSelectionValue,
} from "../../../../../theme/phi-theme-selection";
import type { PhiControlOption } from "../../../../../components/controls/phi-control-options";
import { PHI_CONTROL_HEIGHTS, PHI_PADDING, PHI_RADII } from "../../../../../theme/phi-tokens";
import {
  PHI_COLOR_PICKER_NEUTRAL_PRESETS,
  PHI_COLOR_PICKER_PRESETS,
} from "../../../../../components/widgets/config/color-picker-presets";
import { PHI_SPACING_TOKEN_KEYS } from "../../../../../components/widgets/config/spacing-options";
import { PhiColorWidget } from "../../../../../components/widgets/client/phi-color-widget";
import { PhiBrandControl } from "../../../../../components/controls/phi-brand-control";
import { PhiBackgroundControl, type PhiBackgroundControlProps } from "../../../../../components/controls/phi-background-control";
import {
  PHI_ROOT_BACKGROUND_IMAGE_SOURCE_KINDS,
  PHI_ROOT_BACKGROUND_MOTION_MODES,
  resolvePhiRootBackgroundPaintStyle,
} from "../../../../../components/root/phi-root-background";
import {
  PHI_SHELL_CHROME_OVERLAY_BASE_KINDS,
  PHI_SHELL_CHROME_OVERLAY_EFFECTS,
  PHI_SHELL_CHROME_OVERLAY_IMAGE_SOURCE_KINDS,
  PHI_SHELL_CHROME_OVERLAY_MOTION_MODES,
  resolvePhiShellChromeOverlayConfig,
  resolvePhiShellChromePaneShadow,
  resolvePhiShellChromePaneShadows,
  resolvePhiShellChromeOverlayStyle,
} from "../../../../../components/root/phi-shell-chrome-overlay";
import { normalizePhiBackgroundWidgetConfig, type PhiCmsBackgroundWidgetConfig } from "../../../../../components/widgets/config/background";
import { PhiMediaPickerBinding } from "../../../../../components/media/phi-media-picker-binding";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../../../components/media/media-widget-labels";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/search";
import { buildPhiMediaAssetContentDeliveryUrl, PhiMediaAssetFlags, PhiMediaKind } from "../../../../../constants/media";
import { createPhiMediaPickerAssetControllerRoutes } from "../../../../../components/media/asset-controller-routes";
import { PhiPresetSizeControl, type PhiPresetSizeOption } from "../../../../../components/controls/phi-preset-size-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiCascaderControl } from "../../../../../components/controls/phi-cascader-control";
import { PhiCheckboxControl } from "../../../../../components/controls/phi-checkbox-control";
import { PhiLabeledControl } from "../../../../../components/controls/phi-labeled-control";
import { PhiNumberControl } from "../../../../../components/controls/phi-number-control";
import { PhiColorControl } from "../../../../../components/controls/phi-color-control";
import { usePhiControlOptionsProvider } from "../../../../../components/controls/phi-options-provider";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../builder/ids";
import { PhiShadowControl } from "../../../../../components/controls/phi-shadow-control";
import type { PhiShadow } from "../../../../../types/layout-style";
import type {
  PhiSiteThemeBrand,
  PhiSiteThemeWordmarkPart,
} from "../../../../../types/site-theme";
import type { PhiBuilderBrandWidgetConfig } from "./config";
import { createPhiHistoryStore } from "../../../../../components/state/history-store";
import { createPhiCommandToolbarControlAddress } from "../../../../../components/widgets/signals/command-toolbar-address";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../../../../../plugins/runtime-modules/theme/ids";
import { PhiTableControl, type PhiTableControlColumn } from "../../../../../components/controls/phi-table-control";
import { PhiSegmentedControl } from "../../../../../components/controls/phi-segmented-control";
import {
  applyPhiButtonShadowComponentTokens,
  isPhiButtonShadowStep,
  type PhiButtonShadowKind,
  type PhiButtonShadowStep,
} from "../../../../../theme/phi-button-shadow";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import {
  PHI_CONTROL_SHAPES,
  applyPhiControlShapeComponentTokens,
  buildPhiControlShapeCssVars,
  createPhiControlShapeCorners,
  readPhiControlShapeCorners,
  resolvePhiControlShape,
  resolvePhiUniformControlShape,
  type PhiControlShape,
  type PhiControlShapeCorners,
} from "../../../../../theme/phi-control-shape";

type ThemePayload = NonNullable<PhiBlockRuntime["site"]["theme"]>;
const phiThemeHistory = createPhiHistoryStore<ThemePayload>(
  "@phis/ui/theme-history",
);
type ThemeReadResponse = {
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

type ThemeWriteResponse = {
  key?: string;
  revisionId?: number | null;
  theme?: {
    theme?: ThemePayload;
    key?: string;
  } | null;
  error?: string;
};

type BrandThemeState = {
  key: string;
  published: ThemePayload;
  draft: ThemePayload;
  revisionId: number | null;
  hasPublishedThemeRevision: boolean;
  publishedRevisionId: number | null;
};

const DEFAULT_THEME_KEY = "default";
const PHI_THEME_CHROME_SHADOW_EDGES = [
  { family: "header" as const, label: "Header, downwards onto the Page" },
  { family: "sider" as const, label: "Sider, outwards at its outer edge" },
  { family: "footer" as const, label: "Footer, upwards towards the Content" },
];
const BRAND_THEME_COLOR_COLLAPSE_STORAGE_KEY = "phi.builder.brand.theme.colorCollapse.activeKey";
const BRAND_THEME_STYLE_COLLAPSE_STORAGE_KEY = "phi.builder.brand.theme.styleCollapse.activeKey";
const BRAND_THEME_BACKGROUND_COLLAPSE_STORAGE_KEY = "phi.builder.brand.theme.backgroundCollapse.activeKey";
const BRAND_THEME_BACKGROUND_SECTION_KEYS = ["root", "chrome", "shadow"] as const;
const BRAND_THEME_IDENTITY_COLLAPSE_STORAGE_KEY = "phi.builder.brand.theme.identityCollapse.activeKey";
const BRAND_THEME_IDENTITY_SECTION_KEYS = ["logo", "wordmark"] as const;
const BRAND_THEME_STYLE_SECTION_KEYS = [
  "controls",
  "buttonShadow",
  "radius",
  "controlHeight",
  "fontFamily",
  "fontSize",
  "wireframe",
] as const;

/*
 * The shadow under each kind of Button (theme/phi-button-shadow.ts). "Theme" is no step at all -- the
 * shadow the Theme draws, today Ant Design's tinted line -- the same word the Controls shape uses for
 * following.
 */
const PHI_THEME_BUTTON_SHADOW_KINDS: readonly { key: PhiButtonShadowKind; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "primary", label: "Primary" },
  { key: "danger", label: "Danger" },
];
type PhiThemeButtonShadowChoice = "theme" | PhiButtonShadowStep;
const PHI_THEME_BUTTON_SHADOW_OPTIONS: readonly {
  value: PhiThemeButtonShadowChoice;
  label: string;
  description?: string;
}[] = [
  { value: "theme", label: "Theme", description: "Ant Design's tinted line" },
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "strong", label: "Strong" },
];
const PHI_STYLE_SIZE_PRESET_KEYS = PHI_SPACING_TOKEN_KEYS;
type PhiStyleSizePresetKey = (typeof PHI_STYLE_SIZE_PRESET_KEYS)[number];
type PhiStyleSizePresetMap = Record<PhiStyleSizePresetKey, number>;

const PHI_STYLE_RADIUS_PRESETS: PhiStyleSizePresetMap = {
  xxs: PHI_RADII.xxs,
  xs: PHI_RADII.xs,
  sm: PHI_RADII.sm,
  base: PHI_RADII.base,
  md: PHI_RADII.md,
  lg: PHI_RADII.lg,
  xl: PHI_RADII.xl,
  xxl: PHI_RADII.xxl,
};

const PHI_STYLE_CONTROL_HEIGHT_PRESETS: PhiStyleSizePresetMap = {
  xxs: PHI_PADDING.xxs,
  xs: PHI_PADDING.xs,
  sm: PHI_PADDING.sm,
  base: PHI_PADDING.base,
  md: PHI_PADDING.md,
  lg: PHI_PADDING.lg,
  xl: PHI_PADDING.xl,
  xxl: PHI_PADDING.xxl,
};
const PHI_STYLE_RADIUS_PRESET_OPTIONS: ReadonlyArray<PhiPresetSizeOption & { key: PhiStyleSizePresetKey }> =
  PHI_STYLE_SIZE_PRESET_KEYS.map((key) => ({
    key,
    label: key,
    value: PHI_STYLE_RADIUS_PRESETS[key],
  }));
const PHI_STYLE_CONTROL_HEIGHT_PRESET_OPTIONS: ReadonlyArray<PhiPresetSizeOption & { key: PhiStyleSizePresetKey }> =
  PHI_STYLE_SIZE_PRESET_KEYS.map((key) => ({
    key,
    label: key,
    value: PHI_STYLE_CONTROL_HEIGHT_PRESETS[key],
  }));

const THEME_COLOR_SEED_SECTIONS = [
  {
    key: "colorPrimary",
    label: "Primary",
    fallback: "#E05A2A",
    presets: PHI_COLOR_PICKER_PRESETS,
    derived: [
      { key: "colorPrimaryBg", label: "Bg" },
      { key: "colorPrimaryBgHover", label: "Bg Hover" },
      { key: "colorPrimaryBorder", label: "Border" },
      { key: "colorPrimaryBorderHover", label: "Border Hover" },
      { key: "colorPrimaryHover", label: "Hover" },
      { key: "colorPrimaryActive", label: "Active" },
      { key: "colorPrimaryText", label: "Text" },
      { key: "colorPrimaryTextHover", label: "Text Hover" },
      { key: "colorPrimaryTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorInfo",
    label: "Info",
    fallback: "#1677ff",
    presets: PHI_COLOR_PICKER_PRESETS,
    derived: [
      { key: "colorInfoBg", label: "Bg" },
      { key: "colorInfoBgHover", label: "Bg Hover" },
      { key: "colorInfoBorder", label: "Border" },
      { key: "colorInfoBorderHover", label: "Border Hover" },
      { key: "colorInfoHover", label: "Hover" },
      { key: "colorInfoActive", label: "Active" },
      { key: "colorInfoText", label: "Text" },
      { key: "colorInfoTextHover", label: "Text Hover" },
      { key: "colorInfoTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorSuccess",
    label: "Success",
    fallback: "#52c41a",
    presets: PHI_COLOR_PICKER_PRESETS,
    derived: [
      { key: "colorSuccessBg", label: "Bg" },
      { key: "colorSuccessBgHover", label: "Bg Hover" },
      { key: "colorSuccessBorder", label: "Border" },
      { key: "colorSuccessBorderHover", label: "Border Hover" },
      { key: "colorSuccessHover", label: "Hover" },
      { key: "colorSuccessActive", label: "Active" },
      { key: "colorSuccessText", label: "Text" },
      { key: "colorSuccessTextHover", label: "Text Hover" },
      { key: "colorSuccessTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorWarning",
    label: "Warning",
    fallback: "#faad14",
    presets: PHI_COLOR_PICKER_PRESETS,
    derived: [
      { key: "colorWarningBg", label: "Bg" },
      { key: "colorWarningBgHover", label: "Bg Hover" },
      { key: "colorWarningBorder", label: "Border" },
      { key: "colorWarningBorderHover", label: "Border Hover" },
      { key: "colorWarningHover", label: "Hover" },
      { key: "colorWarningActive", label: "Active" },
      { key: "colorWarningText", label: "Text" },
      { key: "colorWarningTextHover", label: "Text Hover" },
      { key: "colorWarningTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorError",
    label: "Error",
    fallback: "#ff4d4f",
    presets: PHI_COLOR_PICKER_PRESETS,
    derived: [
      { key: "colorErrorBg", label: "Bg" },
      { key: "colorErrorBgHover", label: "Bg Hover" },
      { key: "colorErrorBgFilledHover", label: "Bg Filled Hover" },
      { key: "colorErrorBgActive", label: "Bg Active" },
      { key: "colorErrorBorder", label: "Border" },
      { key: "colorErrorBorderHover", label: "Border Hover" },
      { key: "colorErrorHover", label: "Hover" },
      { key: "colorErrorActive", label: "Active" },
      { key: "colorErrorText", label: "Text" },
      { key: "colorErrorTextHover", label: "Text Hover" },
      { key: "colorErrorTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorLink",
    label: "Link",
    fallback: "#1677ff",
    presets: PHI_COLOR_PICKER_PRESETS,
    derived: [
      { key: "colorLinkHover", label: "Hover" },
      { key: "colorLinkActive", label: "Active" },
    ],
  },
  {
    key: "colorTextBase",
    label: "Text Base",
    fallback: "#000000",
    presets: PHI_COLOR_PICKER_NEUTRAL_PRESETS,
    derived: [
      { key: "colorText", label: "Text" },
      { key: "colorTextSecondary", label: "Secondary" },
      { key: "colorTextTertiary", label: "Tertiary" },
      { key: "colorTextQuaternary", label: "Quaternary" },
      { key: "colorTextHeading", label: "Heading" },
      { key: "colorTextLabel", label: "Label" },
      { key: "colorTextDescription", label: "Description" },
      { key: "colorTextDisabled", label: "Disabled" },
      { key: "colorTextPlaceholder", label: "Placeholder" },
      { key: "colorTextLightSolid", label: "Light Solid" },
    ],
  },
  {
    key: "colorBgBase",
    label: "Background Base",
    fallback: "#ffffff",
    presets: PHI_COLOR_PICKER_NEUTRAL_PRESETS,
    derived: [
      { key: "colorBgLayout", label: "Layout" },
      { key: "colorBgContainer", label: "Container" },
      { key: "colorBgElevated", label: "Elevated" },
      { key: "colorBgSpotlight", label: "Spotlight" },
      { key: "colorBgContainerDisabled", label: "Container Disabled" },
      { key: "colorFill", label: "Fill" },
      { key: "colorFillSecondary", label: "Fill Secondary" },
      { key: "colorFillTertiary", label: "Fill Tertiary" },
      { key: "colorFillQuaternary", label: "Fill Quaternary" },
      { key: "colorBorder", label: "Border" },
      { key: "colorBorderSecondary", label: "Border Secondary" },
      { key: "colorBorderDisabled", label: "Border Disabled" },
    ],
  },
] as const;

/** The Collapse order of the colour panel, which decides which section an author finds open. */
const BRAND_THEME_COLOR_SECTION_KEYS: readonly string[] = [
  "custom",
  ...THEME_COLOR_SEED_SECTIONS.map((section) => section.key),
];

type ThemeColorSeedSection = (typeof THEME_COLOR_SEED_SECTIONS)[number];

/** The record without the named fields, for the places where a part of the Theme is handed back to its block. */
function omitThemeFields(theme: ThemePayload, ...fields: ReadonlyArray<keyof ThemePayload>): ThemePayload {
  return Object.fromEntries(
    Object.entries(theme).filter(([key]) => !fields.includes(key as keyof ThemePayload)),
  ) as ThemePayload;
}

/**
 * The Site's palette written back with empty containers dropped, so a Theme whose author cleared their
 * last colour owns nothing again and follows its palette block outright. An absent `palette` and an
 * empty one mean the same thing to every consumer; keeping the record free of the empty one is what
 * lets "Draft colors" and a Module take-over read the truth off the shape.
 */
function withThemePalette(theme: ThemePayload, palette: PhiThemePalette): ThemePayload {
  const modes = Object.fromEntries(
    Object.entries(palette.modes ?? {}).filter(([, mode]) => mode && Object.keys(mode).length > 0),
  );
  const next: PhiThemePalette = {
    ...(Object.keys(palette.seed ?? {}).length > 0 ? { seed: palette.seed } : {}),
    ...(Object.keys(modes).length > 0 ? { modes } : {}),
  };
  return Object.keys(next).length === 0
    ? omitThemeFields(theme, "palette")
    : { ...theme, palette: next };
}

/** One mode of the Site's palette rewritten; a mode left with nothing in it disappears. */
function mergeThemePaletteMode(
  theme: ThemePayload,
  mode: PhiThemeMode,
  rewrite: (current: PhiThemePaletteMode) => PhiThemePaletteMode,
): ThemePayload {
  const palette = theme.palette ?? {};
  const written = rewrite(palette.modes?.[mode] ?? {});
  const nextMode = Object.fromEntries(
    (["seed", "overrides", "customColors"] as const)
      .filter((part) => Object.keys(written[part] ?? {}).length > 0)
      .map((part) => [part, written[part]]),
  ) as PhiThemePaletteMode;
  return withThemePalette(theme, {
    ...palette,
    modes: { ...(palette.modes ?? {}), [mode]: nextMode },
  });
}

/**
 * A seed the author set. The two base seeds belong to the mode being edited, every other seed to the
 * palette as a whole, because Ant Design derives both modes from the one value. Setting a seed takes
 * the section's derived overrides of that mode with it: they were tuned to the old seed.
 */
function mergeThemeSeedToken(
  theme: ThemePayload,
  section: ThemeColorSeedSection,
  value: string,
  mode: PhiThemeMode,
): ThemePayload {
  const derivedTokenKeys = new Set<string>(section.derived.map((item) => item.key));
  const withoutDerived = mergeThemePaletteMode(theme, mode, (current) => ({
    ...current,
    overrides: Object.fromEntries(
      Object.entries(current.overrides ?? {}).filter(([key]) => !derivedTokenKeys.has(key)),
    ),
  }));

  if (isPhiThemePaletteModeSeedKey(section.key)) {
    return mergeThemePaletteMode(withoutDerived, mode, (current) => ({
      ...current,
      seed: { ...(current.seed ?? {}), [section.key]: value },
    }));
  }
  const palette = withoutDerived.palette ?? {};
  return withThemePalette(withoutDerived, {
    ...palette,
    seed: { ...(palette.seed ?? {}), [section.key]: value },
  });
}

/** A derived colour stated outright for one mode: a hover tone that suits light is wrong in dark. */
function mergeThemeColorOverride(
  theme: ThemePayload,
  tokenKey: string,
  value: string,
  mode: PhiThemeMode,
): ThemePayload {
  return mergeThemePaletteMode(theme, mode, (current) => ({
    ...current,
    overrides: { ...(current.overrides ?? {}), [tokenKey]: value },
  }));
}

/** The override taken away again, so the palette below derives the colour as before. */
function omitThemeColorOverride(theme: ThemePayload, tokenKey: string, mode: PhiThemeMode): ThemePayload {
  return mergeThemePaletteMode(theme, mode, (current) => ({
    ...current,
    overrides: Object.fromEntries(
      Object.entries(current.overrides ?? {}).filter(([key]) => key !== tokenKey),
    ),
  }));
}

function resolveThemeKey(config?: PhiBuilderBrandWidgetConfig | null) {
  return config?.themeKey?.trim() || DEFAULT_THEME_KEY;
}

function normalizeTheme(input: unknown, fallback: ThemePayload): ThemePayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return fallback;
  }

  return input as ThemePayload;
}

/**
 * A fresh draft names its blocks and owns nothing: the proportions come from the style block at
 * resolve time, the colour from the palette block, and nothing is copied in that a reset would later
 * have to know how to take away.
 */
function resolveInitialTheme(runtime: PhiBlockRuntime): ThemePayload {
  return normalizeTheme(runtime.site.theme, {
    mode: "light",
    preset: PHI_DEFAULT_THEME_PRESET_KEY,
    presetVersion: PHI_DEFAULT_THEME_PRESET_VERSION,
  } as ThemePayload);
}

function readThemeButtonShadowChoice(
  theme: ThemePayload,
  kind: PhiButtonShadowKind,
): PhiThemeButtonShadowChoice {
  const step = theme.buttons?.shadow?.[kind];
  return isPhiButtonShadowStep(step) ? step : "theme";
}

/**
 * One Button shadow set, or handed back to the Theme by removing the step -- and with it an empty
 * `shadow` or `buttons` entry, so a Theme that sets no shadow stores none.
 */
function mergeThemeButtonShadow(
  theme: ThemePayload,
  kind: PhiButtonShadowKind,
  choice: PhiThemeButtonShadowChoice,
): ThemePayload {
  const shadow = Object.fromEntries(
    Object.entries(theme.buttons?.shadow ?? {}).filter(([key]) => key !== kind),
  ) as Partial<Record<PhiButtonShadowKind, PhiButtonShadowStep>>;
  if (choice !== "theme") {
    shadow[kind] = choice;
  }
  const withoutButtons = omitThemeFields(theme, "buttons");
  return Object.keys(shadow).length > 0
    ? { ...withoutButtons, buttons: { ...(theme.buttons ?? {}), shadow } }
    : withoutButtons;
}

/** A structural token the author set, laid over the style block under `style.token`. */
function mergeThemeToken(theme: ThemePayload, tokenPatch: Record<string, unknown>): ThemePayload {
  return {
    ...theme,
    style: {
      ...(theme.style ?? {}),
      token: {
        ...(theme.style?.token ?? {}),
        ...tokenPatch,
      },
    },
  };
}

/**
 * One slot, set or handed back.
 *
 * Handing it back means removing the key rather than writing an empty string: an absent slot follows
 * the fonts block, and a slot holding "" would be an author deciding on nothing.
 */
function mergeThemeFontSlot(
  theme: ThemePayload,
  slot: keyof PhiSiteFontSlots,
  family: string | null,
): ThemePayload {
  const fonts = { ...(theme.fonts ?? {}) };
  if (family) fonts[slot] = family;
  else delete fonts[slot];
  return Object.keys(fonts).length > 0
    ? { ...theme, fonts }
    : Object.fromEntries(Object.entries(theme).filter(([key]) => key !== "fonts")) as ThemePayload;
}

function mergeThemeControlShape(theme: ThemePayload, controls: PhiControlShapeCorners): ThemePayload {
  return {
    ...theme,
    shape: {
      ...(theme.shape ?? {}),
      controls,
    },
  };
}

/**
 * What the Style tab's shape segments decide together: the Control shape and the scale it is drawn on.
 * "Theme" hands all of it back to the style the Set brings; the other type values stay the author's.
 */
const PHI_THEME_SHAPE_SCALE_TOKEN_KEYS: readonly string[] = [
  "borderRadiusXS",
  "borderRadiusSM",
  "borderRadius",
  "borderRadiusLG",
  "controlHeightSM",
  "controlHeight",
  "controlHeightLG",
];

type PhiBrandShapeChoice = "theme" | PhiControlShape;

/**
 * Which segment the draft stands on.
 *
 * A named shape when the author picked one. "Theme" when the author decided none of the shape, the
 * radii and the Control heights. Nothing when they changed a radius or a height but picked no shape:
 * that follows the Theme no longer, and showing "Theme" would also leave it unclickable, since a
 * segment that is already selected reports no change.
 */
function resolveThemeShapeChoice(theme: ThemePayload): PhiBrandShapeChoice | null {
  const corners = readPhiControlShapeCorners(theme.shape?.controls);
  if (corners) {
    return resolvePhiUniformControlShape(corners);
  }
  const token = theme.style?.token ?? {};
  const authoredScale = PHI_THEME_SHAPE_SCALE_TOKEN_KEYS.some((key) => {
    const value = token[key];
    return value !== undefined && value !== null && value !== "";
  });
  return authoredScale ? null : "theme";
}

/** The shape, the radii and the Control heights handed back to the style block; the rest stays. */
function clearThemeShapeScale(theme: ThemePayload): ThemePayload {
  const token = Object.fromEntries(
    Object.entries(theme.style?.token ?? {}).filter(([key]) => !PHI_THEME_SHAPE_SCALE_TOKEN_KEYS.includes(key)),
  );
  return {
    ...clearThemeControlShape(theme),
    style: { ...(theme.style ?? {}), token },
  };
}

function clearThemeControlShape(theme: ThemePayload): ThemePayload {
  const shape = Object.fromEntries(
    Object.entries(theme.shape ?? {}).filter(([key]) => key !== "controls"),
  ) as NonNullable<ThemePayload["shape"]>;
  return Object.keys(shape).length > 0 ? { ...theme, shape } : omitThemeFields(theme, "shape");
}

function resolveThemePayloadPreset(
  theme: ThemePayload,
  presets: readonly PhiThemePresetPlugin[],
) {
  return resolvePhiThemePresetPlugin(presets, theme.preset);
}

function resolveThemePayloadMode(theme: ThemePayload) {
  return theme.mode === "dark" ? "dark" : "light";
}

/**
 * The ten custom colours the draft shows in one mode: the palette block with the Site's own palette on
 * top, resolved the way the Site renders them. Nothing is written into the record for reading them.
 */
function resolveThemeCustomPalette(
  theme: ThemePayload,
  preset: PhiThemePresetPlugin,
  mode: PhiThemeMode,
): PhiThemeCustomColorPalette {
  return resolvePhiThemePaletteCustomColors(mergePhiThemePalettes(preset.palette, theme.palette), mode);
}

function mergeThemeCustomColors(
  theme: ThemePayload,
  colorPatch: Partial<PhiThemeCustomColorPalette>,
  mode: PhiThemeMode,
): ThemePayload {
  return mergeThemePaletteMode(theme, mode, (current) => ({
    ...current,
    customColors: { ...(current.customColors ?? {}), ...colorPatch },
  }));
}

/**
 * Picking a palette block drops the author's own palette, exactly as picking a ground or a style drops
 * theirs: somebody choosing another palette means to see it, and their seeds laid over it would hide
 * the very thing they asked for.
 */
function applyThemePreset(theme: ThemePayload, preset: PhiThemePresetPlugin): ThemePayload {
  return {
    ...omitThemeFields(theme, "palette"),
    preset: preset.key,
    presetVersion: preset.version,
  };
}

/** Back to the blocks alone: the palette, the proportions, the Button shadows and the component overrides all go. */
function resetThemeToPreset(
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

function stripEmptyTokenValues(token: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(token).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function buildPhiNonColorThemeTokens() {
  return buildPhiThemeStructuralTokens();
}

function buildPhiEffectiveNonColorThemeTokens(theme: ThemePayload) {
  const defaults = buildPhiNonColorThemeTokens();
  const overrides = theme.style?.token ?? {};

  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      overrides[key] ?? value,
    ]),
  );
}

/** Every colour the Site owns: shared seeds, and the seeds, overrides and custom colours of each mode. */
function countThemePaletteLeaves(palette: PhiThemePalette | null | undefined) {
  return Object.values(palette?.modes ?? {}).reduce(
    (count, mode) =>
      count +
      Object.keys(mode?.seed ?? {}).length +
      Object.keys(mode?.overrides ?? {}).length +
      Object.keys(mode?.customColors ?? {}).length,
    Object.keys(palette?.seed ?? {}).length,
  );
}

function readTokenColor(token: Record<string, unknown>, key: string, fallback: string) {
  const value = token[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readComputedTokenColor(token: AliasToken, key: string, fallback: string) {
  const value = token[key as keyof AliasToken];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readEffectiveTokenString(token: Record<string, unknown>, key: string, fallback: string) {
  const value = token[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readEffectiveTokenNumber(token: Record<string, unknown>, key: string, fallback: number) {
  const value = token[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }
  return fallback;
}

function readEffectiveTokenBoolean(token: Record<string, unknown>, key: string, fallback: boolean) {
  const value = token[key];
  return typeof value === "boolean" ? value : fallback;
}

function buildThemeReviewRoutePath(area: PhiCmsAreaKey) {
  return area === "public" ? "/public" : `/${area}`;
}

function buildThemeReviewHref({
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

/*
 * One route set per purpose: the preview swatch and the image field each open their own picker.
 *
 * There used to be a set per mode as well, because the light and the dark ground were edited side by
 * side and their four pickers were mounted at once -- two senders on one route are indistinguishable
 * to anything that reads the route set. Only the mode being edited is mounted now, so the mode is a
 * property of the value and not of the route. The Control is rebuilt when the mode changes, so a
 * picker can never outlive the ground it was opened for.
 */
const PHI_THEME_ROOT_BACKGROUND_MEDIA_ROUTES = {
  preview: createPhiMediaPickerAssetControllerRoutes("theme-root-background-preview-media", "area"),
  field: createPhiMediaPickerAssetControllerRoutes("theme-root-background-field-media", "area"),
} as const;

/*
 * The renderer a Background Control asks for its media picker.
 *
 * Built once at module level rather than per render, so its identity is stable without a hook. Both
 * Theme grounds ask for the same one: the Root Background and the Chrome Overlay take their pictures
 * from the same Site library, and the picker has nothing in it that belongs to one surface.
 */
const renderPhiThemeRootBackgroundMediaPicker: NonNullable<PhiBackgroundControlProps["renderMediaPicker"]> =
  function renderPhiThemeRootBackgroundMediaPicker(props) {
    return (
      <PhiMediaPickerBinding
        config={{
          mediaType: PhiMediaKind.Image,
          presentationFlags: PhiMediaAssetFlags.Background,
          pageSize: 12,
          showPagination: true,
          showGroupFilter: true,
          showSearchBar: true,
          signalRoutes: PHI_THEME_ROOT_BACKGROUND_MEDIA_ROUTES[props.purpose],
        }}
        labels={PHI_MEDIA_WIDGET_DEFAULT_LABELS}
        searchLabels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
        value={props.value}
        open={props.open}
        trigger={props.trigger}
        onOpenChange={props.onOpenChange}
        onCommit={props.onCommit}
        onDiscard={props.onDiscard}
        onAssetSelect={props.onAssetSelect}
        onAssetClear={props.onAssetClear}
      />
    );
  };

function mergeThemeRootBackground(
  theme: ThemePayload,
  mode: "light" | "dark",
  value: PhiCmsBackgroundWidgetConfig,
): ThemePayload {
  return {
    ...theme,
    root: {
      ...(theme.root ?? {}),
      background: {
        ...(theme.root?.background ?? {}),
        [mode]: value,
      },
    },
  };
}

function mergeThemeChromeShadow(
  theme: ThemePayload,
  family: "header" | "sider" | "footer",
  value: PhiShadow,
): ThemePayload {
  return {
    ...theme,
    root: {
      ...(theme.root ?? {}),
      chrome: {
        ...(theme.root?.chrome ?? {}),
        shadow: {
          ...(theme.root?.chrome?.shadow ?? {}),
          [family]: value,
        },
      },
    },
  };
}

function mergeThemeChromeOverlay(
  theme: ThemePayload,
  mode: "light" | "dark",
  value: PhiCmsBackgroundWidgetConfig,
): ThemePayload {
  return {
    ...theme,
    root: {
      ...(theme.root ?? {}),
      chrome: {
        ...(theme.root?.chrome ?? {}),
        [mode]: value,
      },
    },
  };
}

/**
 * A patch on the Brand block, with the empties taken back out.
 *
 * An author who clears a field means the field is not set, not that it is set to "". A stored empty
 * string reads as authored everywhere downstream -- `resolvePhiBrandWordmarkText` and the Brand Widget
 * both ask whether a value is there before they ask what it says -- so clearing has to remove the key
 * rather than blank it, or the Site's own name never comes back.
 */
function mergeThemeBrand(theme: ThemePayload, patch: Partial<PhiSiteThemeBrand>): ThemePayload {
  const brand: Record<string, unknown> = { ...(theme.brand ?? {}), ...patch };
  for (const [key, value] of Object.entries(brand)) {
    if (value == null || value === "") delete brand[key];
  }
  return { ...theme, brand: brand as PhiSiteThemeBrand };
}

/**
 * The Wordmark's parts, written as a whole rather than patched one at a time.
 *
 * A part carries no identity of its own -- it is text at a position -- so there is nothing to address
 * an edit to except the position, and a list rewritten in one go cannot disagree with itself about
 * what the positions are.
 *
 * A blank part is kept, because a part that has just been added is blank and dropping it here meant
 * "Add part" wrote a list the next render could not see: the row never appeared, and the button looked
 * like it did nothing but reopen the first part. Only a list that is blank all through clears the
 * Wordmark, which is what hands the Site's own name back to the fallback.
 */
function mergeThemeWordmarkParts(
  theme: ThemePayload,
  parts: readonly PhiSiteThemeWordmarkPart[],
): ThemePayload {
  const hasText = parts.some((part) => part.text.trim());
  return mergeThemeBrand(theme, {
    wordmark: hasText
      ? { ...(theme.brand?.wordmark ?? {}), parts: parts.map((part) => ({ ...part })) }
      : null,
  });
}

/**
 * What a Widget knows before the Controller has told it anything: the theme the Site was rendered with.
 *
 * It used to consult a module variable the Widgets kept between them, because a Widget mounting late
 * had no other way to learn about an unsaved draft. That variable answered for the browser tab, while
 * the draft belongs to the Area the Controller is mounted in -- so it was right by coincidence and
 * silently wrong wherever the two differed. A Widget asks now, and this is only the starting point.
 */
function createInitialBrandThemeState(themeKey: string, fallbackTheme: ThemePayload): BrandThemeState {
  return {
    key: themeKey,
    published: fallbackTheme,
    draft: fallbackTheme,
    revisionId: null,
    hasPublishedThemeRevision: false,
    publishedRevisionId: null,
  };
}

function isSameThemePayload(left: ThemePayload, right: ThemePayload) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/*
 * `correlationId` is the exchange this state belongs to: the command that saved, published or reset,
 * or the draft another Widget asked the Controller to take. It is absent only where the Controller
 * announces the state it loaded on arrival, which begins one.
 */
function emitThemeState(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  theme: ThemePayload,
  revisionId: number | null,
  selectionValue: string,
  draftStatus: "draft" | "published" = "draft",
  correlationId?: string,
) {
  const sender = createPhiThemeControllerAddress();
  const receiver = "broadcast" as const;

  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.brandTheme,
    action: "change",
    value: {
      theme,
      revisionId,
      draftStatus,
      themeKey: DEFAULT_THEME_KEY,
    },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.brandTheme,
      sender,
      receiver,
    correlationId,
    timestamp: Date.now(),
  });

  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.draftStatus,
    action: "change",
    value: {
      status: draftStatus,
      revisionId: draftStatus === "published" ? null : revisionId,
      themeKey: DEFAULT_THEME_KEY,
    },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      sender,
      receiver,
    correlationId,
    timestamp: Date.now(),
  });

  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.presetSelect,
    action: "change",
    value: selectionValue,
    valueType: "string",
    sender,
    receiver,
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * The Set select's options, stated again for a stored Theme that changed.
 *
 * The Site Theme entry names the Set the stored Theme was derived from, and a save or a publish is a
 * new stored Theme. The whole list goes out, because that is what the select takes; the Sets come from
 * the server, where the active Modules are known.
 */
function emitThemeSelectOptions(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  options: readonly PhiControlOption[],
  correlationId?: string,
) {
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.presetOptions,
    action: "change",
    value: { options: options.map((option) => ({ ...option })) },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.controlOptions,
    sender: createPhiThemeControllerAddress(),
    receiver: "broadcast",
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * "Publish what you are holding" -- the question a Widget asks the Controller when it mounts.
 *
 * A Widget renders the draft but does not own it; the Controller does. Mounting late (a Stack slot
 * that was not open, a return to the Page) it knows only the theme the Site was rendered with, and an
 * unsaved draft would be invisible to it until something else happened to change. Nothing told it, so
 * every Widget used to leave its state in a module variable for the next one to find, which answered
 * for the Page and not for the Area the Controller lives in.
 *
 * The Controller answers by announcing its state the way it always does, so the reply is the same
 * broadcast every other listener already understands -- the shape `stackMeta` uses between a Segmented
 * and its Stack, and the reason no request/response machinery is needed for it.
 */
function emitThemeHydrateRequest(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  sender: PhiSignalAddress,
) {
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.command,
    action: "activate",
    value: "hydrate",
    valueType: "string",
    sender,
    receiver: createPhiThemeControllerAddress(),
    timestamp: Date.now(),
  });
}

/**
 * The reply, addressed to the one Widget that asked.
 *
 * Deliberately not `emitThemeState`. That one announces a change everybody is affected by, and says
 * three things -- the theme, the draft status, the selected preset -- because all three moved. Nothing
 * moved here: one Widget arrived late and needs catching up, so a broadcast would set the state of
 * Widgets that already had it, under the correlation of a mount they had no part in.
 */
function emitThemeStateTo(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  receiver: PhiSignalAddress,
  theme: ThemePayload,
  revisionId: number | null,
  draftStatus: "draft" | "published",
  correlationId: string,
) {
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.brandTheme,
    action: "change",
    value: { theme, revisionId, draftStatus, themeKey: DEFAULT_THEME_KEY },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.brandTheme,
    sender: createPhiThemeControllerAddress(),
    receiver,
    correlationId,
    timestamp: Date.now(),
  });
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
type PhiThemeDraftEdit = "live" | "commit" | "discard";

function emitThemeDraftRequest(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  theme: ThemePayload,
  revisionId: number | null,
  edit?: PhiThemeDraftEdit,
) {
  dispatchSignal({
    scope: "area",
    channel: PHI_THEME_SIGNAL_CHANNELS.brandTheme,
    action: "change",
    value: {
      theme,
      revisionId,
      draftStatus: "draft",
      themeKey: DEFAULT_THEME_KEY,
      ...(edit ? { edit } : {}),
    },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.brandTheme,
    sender: null,
    receiver: createPhiThemeControllerAddress(),
    timestamp: Date.now(),
  });
}

function emitRootThemeState(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  theme: ThemePayload,
  correlationId: string,
) {
  dispatchSignal({
    scope: "site",
    channel: "theme",
    action: "change",
    value: theme,
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme,
    sender: createPhiThemeControllerAddress(),
    receiver: createPhiCoreRuntimeControllerAddress(),
    correlationId,
    timestamp: Date.now(),
  });
}

/**
 * The draft, for a Widget that edits it but does not own it.
 *
 * Three Widgets do that -- colours, style, the root background -- and each held its own copy of this:
 * a ref for the current draft, a change that asks the Controller to take it, a listener that accepts
 * what the Controller then states, and a question asked on mount. Written out three times it had
 * already drifted; the fourth copy is the one worth not writing.
 *
 * The Controller stays the owner. Nothing here decides anything about the theme -- it asks, it renders
 * what it is told, and it reports what the author changed.
 */
function usePhiBrandThemeDraft(runtime: PhiBlockRuntime, themeKey: string) {
  const dispatchSignal = usePhiSignalDispatcher();
  const fallbackTheme = useMemo(() => resolveInitialTheme(runtime), [runtime]);
  const initialState = useMemo(
    () => createInitialBrandThemeState(themeKey, fallbackTheme),
    [fallbackTheme, themeKey],
  );
  const draftRef = useRef<ThemePayload>(initialState.draft);
  const [state, setState] = useState<BrandThemeState>(initialState);

  /*
   * The address the Controller answers a hydrate request at. A Widget the Builder mounted without one
   * cannot be told anything, so it does not ask -- it keeps the theme the Site was rendered with.
   */
  const selfAddress = usePhiSignalIdentity().receiver ?? null;

  useEffect(() => {
    if (selfAddress) {
      emitThemeHydrateRequest(dispatchSignal, selfAddress);
    }
  }, [dispatchSignal, selfAddress]);

  /* Whether a picker of this Widget is open or a slider held; every draft sent meanwhile is a step of its edit. */
  const pickerOpenRef = useRef(false);

  const publishDraft = useCallback((nextTheme: ThemePayload) => {
    draftRef.current = nextTheme;
    setState((current) => ({ ...current, draft: nextTheme }));
    emitThemeDraftRequest(dispatchSignal, nextTheme, state.revisionId, pickerOpenRef.current ? "live" : undefined);
  }, [dispatchSignal, state.revisionId]);

  /*
   * The callbacks a picker takes to make its edit one history entry. Escape first hands the original
   * value back through `onChange`, which is still a live step; `onDiscard` then ends the edit and the
   * Controller restores the Theme it held when the edit began, exactly.
   */
  const editTransaction = useMemo(() => {
    const endEdit = (edit: "commit" | "discard") => {
      if (!pickerOpenRef.current) return;
      pickerOpenRef.current = false;
      emitThemeDraftRequest(dispatchSignal, draftRef.current, state.revisionId, edit);
    };
    return {
      onBegin: () => {
        pickerOpenRef.current = true;
      },
      onCommit: () => endEdit("commit"),
      onDiscard: () => endEdit("discard"),
    };
  }, [dispatchSignal, state.revisionId]);

  /* The same edit in the shape a picker Control takes it. */
  const pickerTransaction = useMemo(() => ({
    onOpenChange: (open: boolean) => {
      if (open) editTransaction.onBegin();
    },
    onCommit: editTransaction.onCommit,
    onDiscard: editTransaction.onDiscard,
  }), [editTransaction]);

  usePhiSignalListener((signal) => {
    if (
      signal.channel !== PHI_THEME_SIGNAL_CHANNELS.brandTheme ||
      signal.action !== "change" ||
      /* A change everybody is told about, or the answer to this Widget's own hydrate request. */
      (signal.receiver !== "broadcast" && signal.receiver !== selfAddress) ||
      signal.sender !== createPhiThemeControllerAddress()
    ) {
      return;
    }
    const value = signal.value && typeof signal.value === "object"
      ? signal.value as { theme?: unknown; revisionId?: unknown }
      : null;
    const nextTheme = normalizeTheme(value?.theme, draftRef.current);
    const revisionId = typeof value?.revisionId === "number" && Number.isInteger(value.revisionId)
      ? value.revisionId
      : state.revisionId;
    draftRef.current = nextTheme;
    setState((current) => ({ ...current, draft: nextTheme, revisionId }));
  }, undefined, selfAddress);

  return { state, draftRef, publishDraft, pickerTransaction, editTransaction };
}

function usePhiBrandPreviewMode(initialMode: "light" | "dark") {
  const [mode, setMode] = useState<"light" | "dark">(initialMode);

  usePhiSignalListener((signal) => {
    if (
      signal.scope === "page" &&
      signal.receiver === "broadcast" &&
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.previewThemeMode &&
      signal.action === "change" &&
      signal.valueType === "boolean"
    ) {
      setMode(signal.value === true ? "dark" : "light");
    }
  });

  return mode;
}

export function PhiBuilderBrandThemeControllerWidgetClient({
  runtime,
  config,
  setOptions,
}: {
  runtime: PhiBlockRuntime;
  config?: PhiBuilderBrandWidgetConfig | null;
  setOptions: readonly PhiControlOption[];
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  const { showMessage } = usePhiApplicationFeedback();
  const { presets: themePresets, themeBlocks } = usePhiConfig();
  const themeKey = resolveThemeKey(config);
  const siteKey = runtime.site.key;
  const historyScope = `theme:${siteKey}:${themeKey}`;
  const reviewArea =
    config?.reviewArea ?? (runtime.area === "builder" ? "public" : runtime.area);
  const fallbackTheme = useMemo(() => resolveInitialTheme(runtime), [runtime]);
  const initialState = useMemo(() => createInitialBrandThemeState(themeKey, fallbackTheme), [fallbackTheme, themeKey]);
  const [state, setState] = useState<BrandThemeState>(initialState);
  const stateRef = useRef<BrandThemeState>(initialState);
  /*
   * The Theme being worked on -- the Draft entry of the Set select. Trying on a Set or the Published
   * Theme leaves it alone, so picking Draft again takes the try-on back; any edit moves it.
   */
  const siteThemeRef = useRef<ThemePayload>(initialState.draft);
  /* The options last sent, so a draft that changes nothing in the select does not send them again. */
  const sentSelectOptionsRef = useRef<string | null>(null);
  /* The draft a picker edit started from, while one is open; see `PhiThemeDraftEdit`. */
  const pickerEditBeforeRef = useRef<ThemePayload | null>(null);
  const [saving, setSaving] = useState(false);

  /*
   * A draft exists once one was saved, or once the Theme being worked on is no longer the published one.
   * Undoing back to the published Theme takes an unsaved draft away again.
   */
  const hasDraft = useCallback(() => {
    const current = stateRef.current;
    return current.revisionId != null || !isSameThemePayload(siteThemeRef.current, current.published);
  }, []);

  const resolveSelectionValue = useCallback(() => resolvePhiThemeSelectionValue(siteKey, {
    published: stateRef.current.hasPublishedThemeRevision,
    draft: hasDraft(),
  }), [hasDraft, siteKey]);

  const emitSelectOptions = useCallback((correlationId?: string) => {
    const current = stateRef.current;
    const options = [
      ...buildPhiSiteThemeSelectOptions({
        siteKey,
        published: current.hasPublishedThemeRevision
          ? { theme: current.published, revisionId: current.publishedRevisionId }
          : null,
        draft: hasDraft() ? { theme: siteThemeRef.current, revisionId: current.revisionId } : null,
      }),
      ...setOptions,
    ];
    const serialized = JSON.stringify(options);
    if (serialized === sentSelectOptionsRef.current) {
      return;
    }
    sentSelectOptionsRef.current = serialized;
    emitThemeSelectOptions(dispatchSignal, options, correlationId);
  }, [dispatchSignal, hasDraft, setOptions, siteKey]);

  /*
   * Every draft states the Set it was derived from. A Theme that never named one gets the core Set on
   * its first draft, so the Draft entry is never without a name.
   */
  const publishDraft = useCallback((
    draftTheme: ThemePayload,
    options?: {
      history?: boolean;
      updateSiteSnapshot?: boolean;
      correlationId?: string;
      /** What the Set select shows for this draft; a Site entry unless a Set is being tried. */
      selectionValue?: string;
    },
  ) => {
    const nextTheme = ensurePhiThemeDerivation(draftTheme);
    const current = stateRef.current;
    if (options?.history !== false && !isSameThemePayload(current.draft, nextTheme)) {
      phiThemeHistory.record(historyScope, {
        label: "Update theme",
        before: current.draft,
        after: nextTheme,
      });
    }

    const nextState = {
      ...current,
      draft: nextTheme,
    };
    stateRef.current = nextState;
    if (options?.updateSiteSnapshot !== false) {
      siteThemeRef.current = nextTheme;
    }
    setState(nextState);
    emitThemeState(
      dispatchSignal,
      nextTheme,
      nextState.revisionId,
      options?.selectionValue ?? resolveSelectionValue(),
      "draft",
      options?.correlationId,
    );
    emitSelectOptions(options?.correlationId);
  }, [dispatchSignal, emitSelectOptions, historyScope, resolveSelectionValue]);

  useEffect(() => {
    const emitAvailability = () => {
      const availability = phiThemeHistory.getAvailability(historyScope);
      for (const [controlKey, enabled] of [
        ["undo", availability.canUndo],
        ["redo", availability.canRedo],
      ] as const) {
        dispatchSignal({
          scope: "area",
          channel: "enabled",
          action: "change",
          value: enabled,
          valueType: "boolean",
          sender: createPhiThemeControllerAddress(),
          receiver: createPhiCommandToolbarControlAddress(
            PHI_THEME_RUNTIME_MODULE_ID,
            "builder-theme-page",
            controlKey,
          ),
          timestamp: Date.now(),
        });
      }
    };

    emitAvailability();
    return phiThemeHistory.subscribe(historyScope, emitAvailability);
  }, [dispatchSignal, historyScope]);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/site/cms/theme?key=${encodeURIComponent(themeKey)}`, {
      method: "GET",
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as ThemeReadResponse | null;
        if (!response.ok) {
          throw new Error((body as { error?: string } | null)?.error ?? "Failed to read theme.");
        }
        if (cancelled) {
          return;
        }

        const published = normalizeTheme(body?.published, fallbackTheme);
        const draft = normalizeTheme(body?.draft?.theme?.theme, published);
        const revisionId =
          typeof body?.draft?.revisionId === "number" && Number.isInteger(body.draft.revisionId)
            ? body.draft.revisionId
            : null;
        const publishedRevisionId =
          typeof body?.publishedRevisionId === "number" && Number.isInteger(body.publishedRevisionId)
            ? body.publishedRevisionId
            : null;
        const nextState = {
          key: body?.key?.trim() || themeKey,
          published,
          draft,
          revisionId,
          hasPublishedThemeRevision: publishedRevisionId != null,
          publishedRevisionId,
        };
        stateRef.current = nextState;
        siteThemeRef.current = draft;
        setState(nextState);
        phiThemeHistory.clear(historyScope);
        emitThemeState(
          dispatchSignal,
          draft,
          revisionId,
          resolveSelectionValue(),
          revisionId == null ? "published" : "draft",
        );
        emitSelectOptions();
      })
      .catch((error) => {
        if (!cancelled) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Failed to read theme." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatchSignal, emitSelectOptions, fallbackTheme, historyScope, resolveSelectionValue, showMessage, siteKey, themeKey]);

  async function saveTheme(
    draftTheme = stateRef.current.draft,
    options?: { notify?: boolean; correlationId?: string },
  ) {
    let nextTheme = ensurePhiThemeDerivation(draftTheme);
    setSaving(true);
    try {
      const current = stateRef.current;
      /*
       * The blocks a Module brought become the Site's here, on the way to the server and nowhere else:
       * its palette, its style tokens, and its ground -- background, Chrome and Shadow of both modes as
       * values, every picture as a Site Asset. Following a block costs nothing; saving is what says
       * somebody means to keep it, and a look somebody decided on must not depend on a package staying
       * installed.
       */
      const materialized = await materializePhiThemeModuleBlocks(
        nextTheme,
        resolvePhiThemeComposition(nextTheme, themeBlocks),
      );
      nextTheme = materialized.theme;
      const response = await fetch("/api/site/cms/theme", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          key: current.key,
          theme: nextTheme,
          message: "Brand theme draft",
        }),
      });
      const body = (await response.json().catch(() => null)) as ThemeWriteResponse | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Failed to save theme draft.");
      }
      const revisionId = typeof body?.revisionId === "number" && Number.isInteger(body.revisionId) ? body.revisionId : null;
      const savedTheme = normalizeTheme(body?.theme?.theme, nextTheme);
      const nextState = {
        ...stateRef.current,
        draft: savedTheme,
        revisionId,
      };
      stateRef.current = nextState;
      siteThemeRef.current = savedTheme;
      setState(nextState);
      emitThemeState(
        dispatchSignal,
        savedTheme,
        revisionId,
        resolveSelectionValue(),
        "draft",
        options?.correlationId,
      );
      emitSelectOptions(options?.correlationId);
      if (options?.notify !== false) {
        showMessage(
          { level: "success", content: "Saved theme draft." },
          { correlationId: options?.correlationId ?? null },
        );
      }
      return revisionId;
    } finally {
      setSaving(false);
    }
  }

  async function publishTheme(correlationId?: string) {
    const current = stateRef.current;
    if (current.revisionId == null) {
      throw new Error("No saved theme draft found to publish.");
    }

    const response = await fetch("/api/site/cms/theme/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        key: current.key,
        revisionId: current.revisionId,
      }),
    });
    const body = (await response.json().catch(() => null)) as ThemeWriteResponse | null;
    if (!response.ok) {
      throw new Error(body?.error ?? "Failed to publish theme.");
    }
    const published = normalizeTheme(body?.theme?.theme, current.draft);
    const nextState = {
      ...current,
      published,
      draft: published,
      revisionId: null,
      hasPublishedThemeRevision: true,
      publishedRevisionId: current.revisionId,
    };
    stateRef.current = nextState;
    siteThemeRef.current = published;
    setState(nextState);
    emitThemeState(
      dispatchSignal,
      published,
      null,
      resolveSelectionValue(),
      "published",
      correlationId,
    );
    emitSelectOptions(correlationId);
    showMessage({ level: "success", content: "Published theme." }, { correlationId: correlationId ?? null });
  }

  /*
   * The Controller names the address it is addressed at, or the bus has nobody to deliver to.
   *
   * A signal is held until a listener answers for its receiver, and a listener answers only for an
   * address it names. Every draft a Widget sent -- and every hydrate request -- was held here and
   * never arrived, silently: the Widget rendered its own copy, so the controls looked right while the
   * Controller knew nothing and the preview was never told.
   */
  usePhiSignalListener((signal) => {
    if (
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.brandTheme &&
      signal.action === "change" &&
      signal.receiver === createPhiThemeControllerAddress() &&
      signal.sender !== createPhiThemeControllerAddress()
    ) {
      const value = signal.value && typeof signal.value === "object"
        ? signal.value as { theme?: unknown; revisionId?: unknown; edit?: unknown }
        : null;
      const current = stateRef.current;
      const nextTheme = normalizeTheme(value?.theme, current.draft);
      const revisionId = typeof value?.revisionId === "number" && Number.isInteger(value.revisionId) ? value.revisionId : current.revisionId;
      if (revisionId !== current.revisionId) {
        stateRef.current = { ...current, revisionId };
      }
      const edit = value?.edit;
      if (edit === "live") {
        pickerEditBeforeRef.current ??= current.draft;
        publishDraft(nextTheme, { history: false, correlationId: signal.correlationId });
        return;
      }
      if (edit === "commit" || edit === "discard") {
        const before = pickerEditBeforeRef.current;
        pickerEditBeforeRef.current = null;
        if (edit === "discard") {
          publishDraft(before ?? nextTheme, { history: false, correlationId: signal.correlationId });
          return;
        }
        publishDraft(nextTheme, { history: false, correlationId: signal.correlationId });
        if (before && !isSameThemePayload(before, nextTheme)) {
          phiThemeHistory.record(historyScope, { label: "Update theme", before, after: nextTheme });
        }
        return;
      }
      pickerEditBeforeRef.current = null;
      publishDraft(nextTheme, { correlationId: signal.correlationId });
      return;
    }

	    if (
      signal.scope === "area" &&
      signal.receiver === createPhiThemeControllerAddress() &&
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.previewThemeMode &&
      signal.action === "change" &&
      signal.valueType === "boolean"
    ) {
	      const value = signal.value;
      const nextMode = typeof value === "boolean" ? value ? "dark" : "light" : null;

      if (!nextMode) {
        return;
      }
      const current = stateRef.current;
      const baseTheme = current.hasPublishedThemeRevision ? current.published : fallbackTheme;
      const nextTheme = {
        ...baseTheme,
        mode: nextMode,
      } satisfies ThemePayload;
      emitRootThemeState(dispatchSignal, nextTheme, signal.correlationId);
      return;
    }

    if (signal.channel === PHI_THEME_SIGNAL_CHANNELS.presetSelect) {
      if (
        signal.scope === "area" &&
        signal.action === "change" &&
        signal.receiver === createPhiThemeControllerAddress() &&
        typeof signal.value === "string" &&
        signal.value.trim().length > 0
      ) {
        /*
         * Draft goes back to the Theme being worked on; Published is tried on the way a Set is -- it
         * replaces what is shown, the Draft entry keeps what was there, and only a save or an edit on
         * top makes it the draft. Both are one history entry.
         */
        const siteState = readPhiSiteThemeSelectionState(signal.value, siteKey);
        if (siteState) {
          const current = stateRef.current;
          if (siteState === "published" && !current.hasPublishedThemeRevision) {
            return;
          }
          const nextTheme = siteState === "draft" ? siteThemeRef.current : current.published;
          if (!isSameThemePayload(current.draft, nextTheme)) {
            publishDraft(nextTheme, {
              updateSiteSnapshot: false,
              correlationId: signal.correlationId,
              selectionValue: createPhiSiteThemeSelectionValue(siteKey, siteState),
            });
          }
          return;
        }
        /*
         * A Set is tried on, not taken: it decides all three parts and names itself as the derivation,
         * but the Site Theme entry keeps what was there before, so choosing it again takes the Set back.
         */
        const set = themeBlocks.sets.find((candidate) => candidate.key === signal.value);
        if (!set) {
          return;
        }
        const palette = themeBlocks.palettes.find((candidate) => candidate.key === set.palette);
        const withSet = mergeThemeSetChoice(stateRef.current.draft, set);
        const nextTheme: ThemePayload = {
          ...(palette ? applyThemePreset(withSet, palette) : withSet),
          derivedFrom: createPhiThemeDerivation(set),
        };
        if (!isSameThemePayload(stateRef.current.draft, nextTheme)) {
          publishDraft(nextTheme, {
            updateSiteSnapshot: false,
            correlationId: signal.correlationId,
            selectionValue: set.key,
          });
        }
        return;
      }

      return;
    }

    if (
      signal.scope !== "area" ||
      signal.channel !== PHI_THEME_SIGNAL_CHANNELS.command ||
      signal.action !== "activate" ||
      signal.valueType !== "string" ||
      signal.receiver !== createPhiThemeControllerAddress()
    ) {
      return;
    }

    const commandValue = signal.value;

    /*
     * Answered before the saving guard: a Widget that mounts mid-save is asking what is there, which
     * is a question about state and not a command that would compete with the save.
     */
    if (commandValue === "hydrate") {
      const asker = signal.sender;
      if (asker == null) {
        return;
      }
      const current = stateRef.current;
      emitThemeStateTo(
        dispatchSignal,
        asker,
        current.draft,
        current.revisionId,
        current.revisionId == null ? "published" : "draft",
        signal.correlationId,
      );
      return;
    }

    if (saving) {
      return;
    }

    if (commandValue === "save") {
      void saveTheme(undefined, { correlationId: signal.correlationId }).catch((error) => {
        showMessage(
          { level: "error", content: error instanceof Error ? error.message : "Failed to save theme draft." },
          { correlationId: signal.correlationId },
        );
      });
      return;
    }

    if (commandValue === "publish") {
      void publishTheme(signal.correlationId).catch((error) => {
        showMessage(
          { level: "error", content: error instanceof Error ? error.message : "Failed to publish theme." },
          { correlationId: signal.correlationId },
        );
      });
      return;
    }

    if (commandValue === "preview") {
      const revisionId = stateRef.current.revisionId;
      if (!Number.isInteger(revisionId) || (revisionId as number) <= 0) {
        showMessage(
          { level: "error", content: "No saved theme draft found. Save first before opening live preview." },
          { correlationId: signal.correlationId },
        );
        return;
      }

      const href = buildThemeReviewHref({
        area: reviewArea,
        revisionId: revisionId as number,
        themeKey: stateRef.current.key,
      });
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (commandValue === "reset") {
      const preset = resolveThemePayloadPreset(stateRef.current.draft, themePresets);
      publishDraft(
        resetThemeToPreset(stateRef.current.draft, themePresets, preset),
        { correlationId: signal.correlationId },
      );
      showMessage(
        { level: "success", content: `Reset theme to ${preset.title}.` },
        { correlationId: signal.correlationId },
      );
      return;
    }

    if (commandValue === "undo") {
      pickerEditBeforeRef.current = null;
      phiThemeHistory.undo(historyScope, (previous) => {
        publishDraft(previous, { history: false, correlationId: signal.correlationId });
      });
      return;
    }

    if (commandValue === "redo") {
      pickerEditBeforeRef.current = null;
      phiThemeHistory.redo(historyScope, (next) => {
        publishDraft(next, { history: false, correlationId: signal.correlationId });
      });
    }
  }, undefined, createPhiThemeControllerAddress());

  void state;

  return null;
}

/**
 * The open section of a Theme panel, remembered for the session.
 *
 * The three panels are accordions: one section at a time, the first one open until the author opens
 * another. `sessionStorage` rather than `localStorage`, so the choice follows the working session
 * instead of deciding how the panel looks weeks later.
 *
 * The stored key is applied after mount and never read during render. The server has no storage to read
 * from, so a value read while rendering would disagree with the markup it hydrates.
 */
function readStoredAccordionSection(storageKey: string, sectionKeys: readonly string[]) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(storageKey);
    return storedValue && sectionKeys.includes(storedValue) ? storedValue : null;
  } catch {
    return null;
  }
}

function usePhiBrandAccordionSection(storageKey: string, sectionKeys: readonly string[]) {
  const [activeSection, setActiveSection] = useState<string>(sectionKeys[0] ?? "");

  useEffect(() => {
    queueMicrotask(() => {
      const storedSection = readStoredAccordionSection(storageKey, sectionKeys);
      if (storedSection) {
        setActiveSection(storedSection);
      }
    });
  }, [sectionKeys, storageKey]);

  const changeActiveSection = useCallback((keys: string | readonly string[]) => {
    const nextSection = Array.isArray(keys) ? keys[0] ?? "" : String(keys ?? "");
    setActiveSection(nextSection);

    try {
      window.sessionStorage.setItem(storageKey, nextSection);
    } catch {
      // A browser that refuses storage still gets a working accordion, it just forgets the choice.
    }
  }, [storageKey]);

  return [activeSection, changeActiveSection] as const;
}

/**
 * What each slot shows: the draft's own family over the block it follows, and the resolved stack the
 * page renders with only where neither names one. Read through the block rather than the draft alone,
 * so trying a Set on shows its typefaces before anything is saved.
 */
function resolveThemeFontSlots(
  theme: ThemePayload,
  fonts: ReturnType<typeof usePhiConfig>["fonts"],
  block: PhiThemeFontsBlock,
) {
  const effective = resolvePhiThemeEffectiveFonts(theme.fonts, block);
  const authored = theme.fonts ?? {};
  /*
   * Two answers per slot, and the control needs both: what this Theme decided, which is what the
   * select holds and what clearing gives back, and what the slot resolves to without it, which is what
   * the field shows while nothing is decided. Collapsing them would make "follows the Set" and "is set
   * to the same family the Set names" look identical, and only one of the two survives a Set change.
   */
  return [
    { key: "body", label: "Body" },
    { key: "serif", label: "Serif" },
    { key: "mono", label: "Mono" },
    { key: "accent", label: "Accent" },
    { key: "display", label: "Display" },
  ].map(({ key, label }) => ({
    key: key as keyof PhiSiteFontSlots,
    label,
    authored: authored[key as keyof PhiSiteFontSlots]?.trim() || null,
    inherited: effective[key as keyof PhiSiteFontSlots]
      ?? fonts[key as keyof typeof fonts]
      ?? "",
  }));
}

export function PhiBuilderBrandThemeControlsWidgetClient({
  runtime,
  config,
  colorPickerLabels,
}: {
  runtime: PhiBlockRuntime;
  config?: PhiBuilderBrandWidgetConfig | null;
  colorPickerLabels?: PhiColorPickerLabels;
}) {
  const { presets: themePresets, themeBlocks, token: clientToken } = usePhiConfig();
  const sectionLabelWidth = clientToken.controlHeight * 3;
  const colorControlWidth = clientToken.controlHeight * 5.5;
  const themeKey = resolveThemeKey(config);
  const { state, draftRef, publishDraft, pickerTransaction } = usePhiBrandThemeDraft(runtime, themeKey);
  const previewMode = usePhiBrandPreviewMode(resolveThemePayloadMode(state.draft));
  const loading = false;
  const saving = false;
  const [activeColorSection, changeActiveColorSection] = usePhiBrandAccordionSection(
    BRAND_THEME_COLOR_COLLAPSE_STORAGE_KEY,
    BRAND_THEME_COLOR_SECTION_KEYS,
  );

  const themeComposition = resolvePhiThemeComposition(state.draft, themeBlocks);
  const algorithm = previewMode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  const selectedPreset = resolveThemePayloadPreset(state.draft, themePresets);
  /*
   * What the tab shows is what the Site renders: the palette block with the draft's palette on top,
   * resolved for the mode being edited. The seeds the author owns are the ones present in the draft's
   * palette, shared or under this mode; the derived overrides live under this mode alone.
   */
  const colorToken = resolvePhiThemeColorTokens(selectedPreset, state.draft.palette, previewMode);
  const ownPalette = state.draft.palette ?? {};
  const ownOverrides = ownPalette.modes?.[previewMode]?.overrides ?? {};
  /*
   * The same colour without the author's derived overrides: what a derived control falls back to, and
   * what its "Reset override" hands back. Seeds stay in, so the algorithm derives from the author's seed.
   */
  const baseColorToken = resolvePhiThemeColorTokens(
    selectedPreset,
    mergeThemePaletteMode(state.draft, previewMode, (current) => ({ ...current, overrides: {} })).palette,
    previewMode,
  );
  const customPalette = resolveThemeCustomPalette(state.draft, selectedPreset, previewMode);
  const customColorOptions = PHI_THEME_CUSTOM_COLOR_KEYS.map((key, index) => ({
    key,
    label: `${colorPickerLabels?.custom ?? "Custom"} ${index + 1}`,
    value: customPalette[key],
  }));
  const computedToken = antdTheme.getDesignToken({
    algorithm,
    token: {
      ...buildPhiEffectiveNonColorThemeTokens(state.draft),
      ...baseColorToken,
    },
  });

  return (
    <Flex vertical gap={clientToken.padding} style={{ width: "100%", minWidth: 0, opacity: loading ? 0.65 : 1 }}>
      <Card size="small" styles={{ body: { padding: clientToken.paddingSM } }}>
        <Flex vertical gap={clientToken.paddingSM}>
          {/*
            The palette, over the Set chosen in the workspace header. The Set decides all three parts at
            once; picking a palette here is what somebody does who wants the Set's ground with another
            brand, and it wins over the Set from then on.
          */}
          <PhiBrandBlockPicker
            label="Palette"
            value={themeComposition.palette.key}
            unavailable={themeComposition.unavailable.palette}
            options={themeBlocks.palettes}
            onChange={(key) => {
              const palette = themeBlocks.palettes.find((candidate) => candidate.key === key);
              if (!palette) return;
              publishDraft(
                mergeThemeBlockChoice(applyThemePreset(state.draft, palette), "palette", palette),
              );
            }}
          />
          <Divider style={{ marginBlock: 0 }} />
          <Collapse
            accordion
            bordered={false}
            size="small"
            activeKey={activeColorSection}
            onChange={changeActiveColorSection}
            styles={{
              root: { background: "transparent" },
              header: { alignItems: "center", paddingInline: 0 },
              body: { paddingInline: 0 },
            }}
            items={[
              {
                key: "custom",
                label: (
                  <Flex align="center" gap={clientToken.paddingSM} wrap="wrap" style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ width: sectionLabelWidth }}>
                      {colorPickerLabels?.custom ?? "Custom"}
                    </Typography.Text>
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      style={{
                        flex: `0 1 min(100%, ${colorControlWidth}px)`,
                        minWidth: 0,
                        maxWidth: "100%",
                      }}
                    >
                      <PhiColorWidget
                        {...pickerTransaction}
                        tokenKey="custom6"
                        value={customPalette.custom6}
                        defaultValue={resolvePhiThemePresetCustomColors(selectedPreset, previewMode).custom6}
                        disabled={saving}
                        customColors={customColorOptions}
                        presets={PHI_COLOR_PICKER_PRESETS}
                        labels={colorPickerLabels}
                        onChange={(value) => {
                          publishDraft(mergeThemeCustomColors(state.draft, buildPhiThemeCustomColorPalette(value), previewMode));
                        }}
                      />
                    </div>
                  </Flex>
                ),
                children: (
                  <Flex wrap="wrap" style={{ minWidth: 0, columnGap: clientToken.paddingXXS, rowGap: clientToken.paddingSM }}>
                    {customColorOptions
                      .filter((item) => item.key !== "custom6")
                      .map((item) => (
                        <div
                          key={item.key}
                          style={{
                            flex: `1 1 calc((100% - ${clientToken.paddingXXS}) / 2)`,
                            minWidth: 0,
                            maxWidth: "100%",
                          }}
                        >
                          <PhiColorWidget
                            {...pickerTransaction}
                            label={item.label}
                            tokenKey={item.key}
                            value={item.value}
                            defaultValue={resolvePhiThemePresetCustomColors(selectedPreset, previewMode)[item.key as PhiThemeCustomColorKey]}
                            disabled={saving}
                            customColors={customColorOptions}
                            presets={PHI_COLOR_PICKER_PRESETS}
                            labels={colorPickerLabels}
                            onChange={(value, tokenKey) => {
                              if (!tokenKey || !PHI_THEME_CUSTOM_COLOR_KEYS.includes(tokenKey as PhiThemeCustomColorKey)) {
                                return;
                              }
                              publishDraft(mergeThemeCustomColors(state.draft, { [tokenKey]: value } as Partial<PhiThemeCustomColorPalette>, previewMode));
                            }}
                          />
                        </div>
                      ))}
                  </Flex>
                ),
              },
              ...THEME_COLOR_SEED_SECTIONS.map((section) => {
              const seedAuthored =
                Object.prototype.hasOwnProperty.call(ownPalette.seed ?? {}, section.key) ||
                Object.prototype.hasOwnProperty.call(ownPalette.modes?.[previewMode]?.seed ?? {}, section.key);
              const seedDefaultValue = readComputedTokenColor(computedToken, section.key, section.fallback);
              const seedValue = seedAuthored
                ? readTokenColor(colorToken, section.key, seedDefaultValue)
                : seedDefaultValue;

              return {
                key: section.key,
                label: (
                  <Flex align="center" gap={clientToken.paddingSM} wrap="wrap" style={{ minWidth: 0 }}>
                    <Typography.Text strong style={{ width: sectionLabelWidth }}>
                      {section.label}
                    </Typography.Text>
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      style={{
                        flex: `0 1 min(100%, ${colorControlWidth}px)`,
                        minWidth: 0,
                        maxWidth: "100%",
                      }}
                    >
                      <PhiColorWidget
                        {...pickerTransaction}
                        tokenKey={section.key}
                        value={seedValue}
                        defaultValue={seedDefaultValue}
                        disabled={saving}
                        customColors={customColorOptions}
                        labels={colorPickerLabels}
                        presets={section.presets}
                        onChange={(value) => {
                          publishDraft(mergeThemeSeedToken(draftRef.current, section, value, previewMode));
                        }}
                      />
                    </div>
                  </Flex>
                ),
                children: (
                  <Flex wrap="wrap" style={{ minWidth: 0, columnGap: clientToken.paddingXXS, rowGap: clientToken.paddingSM }}>
                    {section.derived.map((item) => {
                      const overridden = Object.prototype.hasOwnProperty.call(ownOverrides, item.key);
                      const fallback = readComputedTokenColor(computedToken, item.key, section.fallback);
                      return (
                        <div
                          key={item.key}
                          style={{
                            flex: `1 1 calc((100% - ${clientToken.paddingXXS}) / 2)`,
                            minWidth: 0,
                            maxWidth: "100%",
                          }}
                        >
                          <Flex vertical gap={clientToken.paddingXXS}>
                            <PhiColorWidget
                              {...pickerTransaction}
                              label={item.label}
                              tokenKey={item.key}
                              value={overridden ? readTokenColor(colorToken, item.key, fallback) : fallback}
                              defaultValue={fallback}
                              disabled={saving}
                              customColors={customColorOptions}
                              labels={colorPickerLabels}
                              onChange={(value, tokenKey) => {
                                if (!tokenKey) {
                                  return;
                                }
                                publishDraft(mergeThemeColorOverride(state.draft, tokenKey, value, previewMode));
                              }}
                            />
                            {overridden ? (
                              <Button
                                size="small"
                                type="link"
                                disabled={saving}
                                style={{ alignSelf: "flex-start", paddingInline: 0, height: clientToken.controlHeightSM }}
                                onClick={() => publishDraft(omitThemeColorOverride(state.draft, item.key, previewMode))}
                              >
                                Reset override
                              </Button>
                            ) : null}
                          </Flex>
                        </div>
                      );
                    })}
                  </Flex>
                ),
              };
            }),
            ]}
          />
        </Flex>
      </Card>
    </Flex>
  );
}

export function PhiBuilderBrandStyleControlsWidgetClient({
  runtime,
  config,
}: {
  runtime: PhiBlockRuntime;
  config?: PhiBuilderBrandWidgetConfig | null;
}) {
  const { fonts, fontFamilies, themeBlocks, token: clientToken } = usePhiConfig();
  const fieldLabelWidth = clientToken.controlHeight * 4;
  const themeKey = resolveThemeKey(config);
  const { state, publishDraft } = usePhiBrandThemeDraft(runtime, themeKey);
  const loading = false;
  const saving = false;
  const [activeStyleSection, changeActiveStyleSection] = usePhiBrandAccordionSection(
    BRAND_THEME_STYLE_COLLAPSE_STORAGE_KEY,
    BRAND_THEME_STYLE_SECTION_KEYS,
  );

  const token = stripEmptyTokenValues(state.draft.style?.token ?? {});
  const styleTokenInput = {
    ...buildPhiEffectiveNonColorThemeTokens(state.draft),
    ...token,
  };
  const radiusValues = {
    borderRadiusSM: readEffectiveTokenNumber(styleTokenInput, "borderRadiusSM", PHI_RADII.xs),
    borderRadius: readEffectiveTokenNumber(styleTokenInput, "borderRadius", PHI_RADII.sm),
    borderRadiusLG: readEffectiveTokenNumber(styleTokenInput, "borderRadiusLG", PHI_RADII.base),
  };
  const controlHeightValues = {
    controlHeightSM: readEffectiveTokenNumber(styleTokenInput, "controlHeightSM", PHI_CONTROL_HEIGHTS.sm),
    controlHeight: readEffectiveTokenNumber(styleTokenInput, "controlHeight", PHI_CONTROL_HEIGHTS.md),
    controlHeightLG: readEffectiveTokenNumber(styleTokenInput, "controlHeightLG", PHI_CONTROL_HEIGHTS.lg),
  };
  const wireframe = readEffectiveTokenBoolean(styleTokenInput, "wireframe", true);
  const remRootValue = state.draft.rem?.rootValue ?? 16;
  const baseFontSize = readEffectiveTokenNumber(styleTokenInput, "fontSize", 12);

  function updateToken(tokenPatch: Record<string, unknown>) {
    publishDraft(mergeThemeToken(state.draft, tokenPatch));
  }

  const themeComposition = resolvePhiThemeComposition(state.draft, themeBlocks);
  const fontSlots = resolveThemeFontSlots(state.draft, fonts, themeComposition.fonts);
  const siteFontAssets = usePhiSiteFontAssets();
  /*
   * Where a typeface comes from decides what happens to it, so every option says so. A catalogue
   * family is declared by this package or by an installed Module, and switching that Module off takes
   * it away; a typeface from the library belongs to the Site and stays.
   *
   * Said in the description of a flat list rather than as option groups, and with plain text labels:
   * the shared select control renders exactly that shape, and a hand-built Select with grouped,
   * node-labelled options is what left this list unreadable and unselectable in the Builder.
   */
  const fontOptions = useMemo<PhiControlOption[]>(() => [
    ...fontFamilies.map(({ family }) => ({
      value: family,
      label: family,
      description: "Installed",
    })),
    ...siteFontAssets.options.map((option) => ({
      value: option.value,
      label: option.label,
      description: "This Site",
    })),
  ], [fontFamilies, siteFontAssets.options]);

  return (
    <Flex vertical gap={clientToken.padding} style={{ width: "100%", minWidth: 0, opacity: loading ? 0.65 : 1 }}>
      <Card size="small" styles={{ body: { padding: clientToken.paddingSM } }}>
        <Collapse
          accordion
          bordered={false}
          size="small"
          activeKey={activeStyleSection}
          onChange={changeActiveStyleSection}
          styles={{
            root: { background: "transparent" },
            header: { alignItems: "center", paddingInline: 0 },
            body: { paddingInline: 0 },
          }}
          items={[
            {
              key: "controls",
              label: <Typography.Text strong>Controls</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  {/*
                    The style comes with the Set; what an author decides here is the Control shape.
                    "Theme" hands the shape, the radii and the Control heights back to that style in one
                    step, because they are one scale and handing back half of it would leave a shape
                    nobody chose.
                  */}
                  <PhiSegmentedControl<PhiBrandShapeChoice>
                    label="Shape"
                    value={resolveThemeShapeChoice(state.draft)}
                    options={[
                      {
                        value: "theme",
                        label: "Theme",
                        description: `${themeComposition.style.title}: ${formatShapeLabel(
                          resolvePhiUniformControlShape(themeComposition.style.shape.controls),
                        )}`,
                      },
                      ...PHI_CONTROL_SHAPES.map((value) => ({ value, label: formatShapeLabel(value) })),
                    ]}
                    block
                    disabled={saving}
                    onChange={(value) => publishDraft(
                      value === "theme"
                        ? clearThemeShapeScale(state.draft)
                        : mergeThemeControlShape(state.draft, createPhiControlShapeCorners(value)),
                    )}
                  />
                </Flex>
              ),
            },
            {
              key: "buttonShadow",
              label: <Typography.Text strong>Button Shadow</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingSM}>
                  <Typography.Text type="secondary">
                    Under each kind of Button. Theme keeps the tinted line; applies to both modes.
                  </Typography.Text>
                  {PHI_THEME_BUTTON_SHADOW_KINDS.map((item) => (
                    <PhiSegmentedControl<PhiThemeButtonShadowChoice>
                      key={item.key}
                      label={item.label}
                      value={readThemeButtonShadowChoice(state.draft, item.key)}
                      options={PHI_THEME_BUTTON_SHADOW_OPTIONS}
                      block
                      disabled={saving}
                      onChange={(choice) => publishDraft(mergeThemeButtonShadow(state.draft, item.key, choice))}
                    />
                  ))}
                </Flex>
              ),
            },
            {
              key: "radius",
              label: <Typography.Text strong>Border Radius</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  {[
                    { key: "borderRadiusSM", label: "Small", value: radiusValues.borderRadiusSM, fallbackPreset: "xs" },
                    { key: "borderRadius", label: "Base", value: radiusValues.borderRadius, fallbackPreset: "sm" },
                    { key: "borderRadiusLG", label: "Large", value: radiusValues.borderRadiusLG, fallbackPreset: "base" },
                  ].map((item) => (
                    <Flex key={item.key} align="center" gap={clientToken.paddingSM} wrap="nowrap">
                      <Typography.Text style={{ flex: `0 0 ${fieldLabelWidth}px` }}>{item.label}</Typography.Text>
                      <PhiPresetSizeControl<PhiStyleSizePresetKey>
                        disabled={saving}
                        value={item.value}
                        fallbackKey={item.fallbackPreset as PhiStyleSizePresetKey}
                        options={PHI_STYLE_RADIUS_PRESET_OPTIONS}
                        onChange={(value) => updateToken({ [item.key]: value })}
                      />
                    </Flex>
                  ))}
                </Flex>
              ),
            },
            {
              key: "controlHeight",
              label: <Typography.Text strong>Control Height</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  {[
                    { key: "controlHeightSM", label: "Small", value: controlHeightValues.controlHeightSM, fallbackPreset: "base" },
                    { key: "controlHeight", label: "Base", value: controlHeightValues.controlHeight, fallbackPreset: "md" },
                    { key: "controlHeightLG", label: "Large", value: controlHeightValues.controlHeightLG, fallbackPreset: "lg" },
                  ].map((item) => (
                    <Flex key={item.key} align="center" gap={clientToken.paddingSM} wrap="nowrap">
                      <Typography.Text style={{ flex: `0 0 ${fieldLabelWidth}px` }}>{item.label}</Typography.Text>
                      <PhiPresetSizeControl<PhiStyleSizePresetKey>
                        disabled={saving}
                        value={item.value}
                        fallbackKey={item.fallbackPreset as PhiStyleSizePresetKey}
                        options={PHI_STYLE_CONTROL_HEIGHT_PRESET_OPTIONS}
                        onChange={(value) => updateToken({ [item.key]: value })}
                      />
                    </Flex>
                  ))}
                </Flex>
              ),
            },
            {
              key: "fontFamily",
              label: <Typography.Text strong>Font Family</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  {fontSlots.map((item) => (
                    <Flex key={item.key} align="center" gap={clientToken.paddingSM} wrap="nowrap">
                      <Typography.Text style={{ flex: `0 0 ${fieldLabelWidth}px` }}>{item.label}</Typography.Text>
                      {/*
                        * Empty means the slot follows the Set, and the placeholder says what that
                        * currently is -- so clearing reads as handing the decision back rather than as
                        * leaving the slot blank.
                        */}
                      <PhiSelectControl
                        ariaLabel={`${item.label} font`}
                        value={item.authored ?? undefined}
                        placeholder={item.inherited || "Not installed"}
                        options={fontOptions}
                        allowClear
                        disabled={saving}
                        size="medium"
                        style={{ minWidth: 0, flex: "1 1 auto" }}
                        onChange={(value) => publishDraft(
                          // A cleared select reports nothing, which hands the slot back to the Set.
                          mergeThemeFontSlot(state.draft, item.key, (value as string | undefined) ?? null),
                        )}
                      />
                    </Flex>
                  ))}
                </Flex>
              ),
            },
            {
              key: "fontSize",
              label: <Typography.Text strong>Base Font Size</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  <Flex align="center" gap={clientToken.paddingSM} wrap="nowrap">
                    <Typography.Text style={{ flex: `0 0 ${fieldLabelWidth}px` }}>Root value</Typography.Text>
                    <Typography.Text code>{remRootValue}px</Typography.Text>
                  </Flex>
                  <Flex align="center" gap={clientToken.paddingSM} wrap="nowrap">
                    <Typography.Text style={{ flex: `0 0 ${fieldLabelWidth}px` }}>Font size</Typography.Text>
                    <Typography.Text code>{baseFontSize}px</Typography.Text>
                  </Flex>
                  <Typography.Text type="secondary">
                    Root value controls rem conversion; font size is the seed every other type size is
                    derived from.
                  </Typography.Text>
                </Flex>
              ),
            },
            {
              key: "wireframe",
              label: <Typography.Text strong>Wireframe</Typography.Text>,
              children: (
                <Flex align="center" justify="space-between" gap={clientToken.paddingSM} wrap="wrap">
                  <Typography.Text type="secondary">Dividing lines in dialogs and popovers, outlined steps and radios</Typography.Text>
                  <Switch
                    checked={wireframe}
                    disabled={saving}
                    checkedChildren="On"
                    unCheckedChildren="Off"
                    onChange={(checked) => updateToken({ wireframe: checked })}
                  />
                </Flex>
              ),
            },
          ]}
        />
      </Card>
    </Flex>
  );
}

/**
 * The Theme Root Background and the Shell Chrome Overlay (SHELL.md): the two site-owned grounds, one
 * behind the whole Site and one shared by the Header, Sider and Footer Regions, each per mode.
 *
 * Its own Stack slot rather than a section of the style controls, because it is not a token -- it is a
 * picture, and it wants the width. The mode being edited follows the preview switch, the way the
 * colour controls do: one ground at a time, and the switch says which. It used to show both at once,
 * so that an author setting the dark ground could see the light one, but the Control draws what it is
 * given, so each ground is already visible while it is being set.
 *
 * The Control is keyed by mode. Switching rebuilds it rather than handing it a different value, so an
 * open media picker cannot commit into the ground the author has just switched away from.
 */
/**
 * Choosing which block a part of the Theme follows.
 *
 * A choice is a pointer, never a copy: the block's values are worked out on every render, so a Module
 * that improves its own look reaches a Site that follows it.
 *
 * Picking a block also drops the author's values for that part, and only picking does. The rule that a
 * block stays under what somebody authored is about a block acting on its own -- a Module updating, a
 * Set filling in a part nobody decided. Reaching for the picker is not that: somebody asking for
 * another ground means to see it, and a switch that changed nothing on screen would read as broken.
 * Undo takes the whole exchange back in one step, which is what makes trying one on safe.
 */
function mergeThemeBlockChoice(
  theme: ThemePayload,
  part: "palette" | "ground",
  block: { key: string; version: number },
): ThemePayload {
  const withChoice: ThemePayload = {
    ...theme,
    blocks: {
      ...(theme.blocks ?? {}),
      [part]: { key: block.key, version: block.version },
    },
  };

  if (part === "ground") return clearThemeAuthoredGround(withChoice);
  return withChoice;
}

/**
 * A Set decides all three parts, so it clears all three: the parts picked one by one, because a Set is
 * what somebody falls back on when they stop deciding each part, and the values authored on top of
 * them, for the same reason picking a single block clears its own. The Control shape belongs to the
 * style, so it goes with the style tokens.
 */
function mergeThemeSetChoice(
  theme: ThemePayload,
  set: { key: string; version: number },
): ThemePayload {
  return clearThemeAuthoredFonts(clearThemeAuthoredGround(clearThemeControlShape(clearThemeStyleTokens({
    ...theme,
    blocks: { set: { key: set.key, version: set.version } },
  }))));
}

/** Every font slot an author set, so the Set's fonts block is what shows. */
function clearThemeAuthoredFonts(theme: ThemePayload): ThemePayload {
  return Object.fromEntries(Object.entries(theme).filter(([key]) => key !== "fonts")) as ThemePayload;
}

function formatShapeLabel(shape: PhiControlShape) {
  return shape.charAt(0).toUpperCase() + shape.slice(1);
}

/** Every ground value an author set, in both modes, so the chosen block is what shows. */
function clearThemeAuthoredGround(theme: ThemePayload): ThemePayload {
  const root = Object.fromEntries(
    Object.entries(theme.root ?? {}).filter(([key]) => key !== "background" && key !== "chrome"),
  ) as NonNullable<ThemePayload["root"]>;
  return { ...theme, root };
}

/**
 * Dropping the author's values for one surface, so the block below shows through again.
 *
 * This is what "reset" means once a Theme follows blocks: not restoring a copy, but taking the layer
 * on top away. One surface and one mode at a time, because that is the granularity an author edits in
 * -- and the Shadow goes in one piece, since it never was a per-mode value.
 */
function clearThemeRootSurface(
  theme: ThemePayload,
  surface: "background" | "chrome" | "shadow",
  mode: "light" | "dark",
): ThemePayload {
  const root = theme.root ?? {};
  const without = <T extends Record<string, unknown>>(record: T | null | undefined, key: string) =>
    Object.fromEntries(Object.entries(record ?? {}).filter(([entry]) => entry !== key)) as T;

  if (surface === "background") {
    return { ...theme, root: { ...root, background: without(root.background, mode) } };
  }
  return {
    ...theme,
    root: { ...root, chrome: without(root.chrome, surface === "shadow" ? "shadow" : mode) },
  };
}

/**
 * Handing one surface back to the block it follows.
 *
 * "Reset" here takes the author's layer away rather than restoring a copy, which is why it names the
 * block: what comes back is whatever that block says today, not what it said when somebody last
 * looked. Offered only where there is something to take away.
 */
function PhiBrandBlockResetButton({
  blockTitle,
  disabled,
  onReset,
}: {
  blockTitle: string;
  disabled: boolean;
  onReset: () => void;
}) {
  return (
    <Button size="small" type="text" disabled={disabled} onClick={onReset}>
      {`Follow ${blockTitle}`}
    </Button>
  );
}

/**
 * Dropping every structural override, so the style block shows through again.
 *
 * Colour stays: the two tabs are two decisions, and somebody resetting the proportions did not ask to
 * lose the brand colour they picked. The record keeps them apart -- `palette` and `style` -- so taking
 * the one away never touches the other.
 */
function clearThemeStyleTokens(theme: ThemePayload): ThemePayload {
  return omitThemeFields(theme, "style");
}

/**
 * The picker for one part of the Theme.
 *
 * It names what the Site follows, and it says so even when the block is not available: a Module that
 * was switched off leaves its key in the record, and showing the core block as if somebody had chosen
 * it would be a lie the author could not act on.
 */
function PhiBrandBlockPicker({
  label,
  value,
  unavailable,
  options,
  onChange,
}: {
  label: string;
  value: string;
  unavailable: string | null;
  options: ReadonlyArray<{ key: string; title: string; description?: string }>;
  onChange: (key: string) => void;
}) {
  const { token: clientToken } = usePhiConfig();
  return (
    <Flex vertical gap={clientToken.paddingXXS} style={{ minWidth: 0 }}>
      <Flex align="center" justify="space-between" gap={clientToken.paddingXS}>
        <Typography.Text strong>{label}</Typography.Text>
        <PhiSelectControl
          ariaLabel={label}
          size="medium"
          value={value}
          style={{ minWidth: clientToken.controlHeight * 5 }}
          onChange={onChange}
          options={options.map((option) => ({ value: option.key, label: option.title }))}
        />
      </Flex>
      {unavailable ? (
        <Typography.Text type="warning">
          {`Not available: ${unavailable}. Showing the built-in block until its Module is switched on again.`}
        </Typography.Text>
      ) : null}
    </Flex>
  );
}

/**
 * Carry the ground authored for one mode over to the other.
 *
 * A Site is authored in one mode first, and the other one usually wants the same picture with at most
 * a colour changed. Without this the author rebuilds it field by field in a mode that is not on
 * screen. The copy goes through the same draft change every control here makes, so Undo takes it back
 * in one step like any other edit, and it is offered only while the two modes actually differ.
 */
function PhiBrandCopyModeButton({
  mode,
  disabled,
  onCopy,
}: {
  mode: "light" | "dark";
  disabled: boolean;
  onCopy: () => void;
}) {
  return (
    <Button size="small" style={{ flexShrink: 0 }} disabled={disabled} onClick={onCopy}>
      {`Copy to ${mode === "dark" ? "light" : "dark"}`}
    </Button>
  );
}

/*
 * The Logo's picker has a route set of its own.
 *
 * Two senders on one route are indistinguishable to whatever reads it, and the Identity panel can be
 * mounted while a Background picker still holds the Theme ground routes -- they live in different Stack
 * slots today, but a route set is cheap and a crossed picker is not.
 */
const PHI_THEME_BRAND_LOGO_MEDIA_ROUTES = createPhiMediaPickerAssetControllerRoutes(
  "theme-brand-logo-media",
  "area",
);

/**
 * The stored tracking as a number the control can hold.
 *
 * Reads a bare number as well, because that is what the text field this replaced allowed somebody to
 * write -- it never rendered, so showing it as the number it was meant to be is how it starts working.
 */
function readWordmarkLetterSpacingEm(value: string | null | undefined) {
  const parsed = Number.parseFloat((value ?? "").trim().replace(/em$/i, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** The weights a Wordmark part is offered, which is the range a name is actually set in. */
const PHI_THEME_WORDMARK_WEIGHT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
] as const;

/**
 * Who the Site says it is: the Logo and the Wordmark.
 *
 * The one panel whose values are not a mode value. A Site has one name and one Logo in light and in
 * dark, so there is no mode switch here and no copy-to-other-mode button -- both would be offering to
 * duplicate something that was never two things.
 *
 * Slogan, Location and Contact are not here. They are lines of text in a Region, and a Region's text is
 * set where the Region is built; the Theme record still carries them as what a Preset seeds its Widgets
 * from, which is a different job from authoring them.
 */
export function PhiBuilderBrandIdentityControlsWidgetClient({
  runtime,
  config,
}: {
  runtime: PhiBlockRuntime;
  config?: PhiBuilderBrandWidgetConfig | null;
}) {
  const { token: clientToken } = usePhiConfig();
  const themeKey = resolveThemeKey(config);
  const { state, publishDraft } = usePhiBrandThemeDraft(runtime, themeKey);
  const [activeIdentitySection, changeActiveIdentitySection] = usePhiBrandAccordionSection(
    BRAND_THEME_IDENTITY_COLLAPSE_STORAGE_KEY,
    BRAND_THEME_IDENTITY_SECTION_KEYS,
  );

  const brand = state.draft.brand ?? {};
  const wordmarkParts: readonly PhiSiteThemeWordmarkPart[] = brand.wordmark?.parts ?? [];
  /*
   * A Site with no Wordmark yet still gets a field to type it into.
   *
   * The row is what the author came here for; offering only "Add part" made the ordinary case -- one
   * name, one colour -- start with a button whose name describes the rare case. The blank row is not
   * stored: writing in it is what creates the first part, and the placeholder says what the frame is
   * showing meanwhile.
   */
  const editableWordmarkParts: readonly PhiSiteThemeWordmarkPart[] = wordmarkParts.length > 0
    ? wordmarkParts
    : [{ text: "" }];
  /*
   * What the Site falls back to, shown rather than written. An author who has set no Wordmark should
   * see what the frame is showing instead of an empty field that looks like a missing name.
   */
  const fallbackWordmark = runtime.site.name ?? runtime.site.key;
  /*
   * The Pages of the public Area, from the same provider the Builder's own Page Cascader reads. The
   * Widget declares the provider so the Page mounts it; without that the list is simply empty, which
   * would look like a Site with one Page.
   */
  const { options: homePathOptions } = usePhiControlOptionsProvider({
    optionsProvider: { providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.builderPages },
  });

  function updateWordmarkPart(index: number, patch: Partial<PhiSiteThemeWordmarkPart>) {
    publishDraft(mergeThemeWordmarkParts(
      state.draft,
      editableWordmarkParts.map((part, at) => (at === index ? { ...part, ...patch } : part)),
    ));
  }

  return (
    <Flex vertical gap={clientToken.padding} style={{ width: "100%", minWidth: 0 }}>
      <Card size="small" styles={{ body: { padding: clientToken.paddingSM } }}>
        <Collapse
          accordion
          bordered={false}
          size="small"
          activeKey={activeIdentitySection}
          onChange={changeActiveIdentitySection}
          styles={{
            root: { background: "transparent" },
            header: { alignItems: "center", paddingInline: 0 },
            body: { paddingInline: 0 },
          }}
          items={[
            {
              key: "logo",
              label: <Typography.Text strong>Logo</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  <Typography.Text type="secondary">
                    A picture from this Site&apos;s own Media library. What it says to somebody who cannot
                    see it falls back to the asset&apos;s own alt text.
                  </Typography.Text>
                  <PhiMediaPickerBinding
                    config={{
                      mediaType: PhiMediaKind.Image,
                      pageSize: 12,
                      showPagination: true,
                      showGroupFilter: true,
                      showSearchBar: true,
                      signalRoutes: PHI_THEME_BRAND_LOGO_MEDIA_ROUTES,
                    }}
                    labels={PHI_MEDIA_WIDGET_DEFAULT_LABELS}
                    searchLabels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
                    value={brand.logoAssetId ?? null}
                    onAssetSelect={(asset) => publishDraft(mergeThemeBrand(state.draft, {
                      logoAssetId: asset.id,
                      /*
                       * The delivered address alongside the id, because the Preview and the Brand Widget
                       * both render from the draft long before the Site resolver has seen it. It is the
                       * same address the resolver writes, so the saved record says one thing either way.
                       */
                      logoUrl: buildPhiMediaAssetContentDeliveryUrl(asset.id),
                    }))}
                    onAssetClear={() => publishDraft(mergeThemeBrand(state.draft, {
                      logoAssetId: null,
                      logoUrl: null,
                    }))}
                  />
                  <Input
                    value={brand.logoAlt ?? ""}
                    placeholder="Alt text"
                    onChange={(event) => publishDraft(mergeThemeBrand(state.draft, {
                      logoAlt: event.target.value,
                    }))}
                  />
                  {/*
                    Where the Brand leads, picked from the Pages that exist rather than typed.
                    A Cascader has no empty value -- its empty is spelled `/` -- which is exactly the
                    default here, so an author who never touches it has already said the right thing.
                  */}
                  <PhiCascaderControl
                    value={brand.homeHref ?? "/"}
                    options={homePathOptions}
                    placeholder="Where the Brand leads"
                    onChange={(next) => publishDraft(mergeThemeBrand(state.draft, {
                      homeHref: next === "/" ? null : next,
                    }))}
                  />
                </Flex>
              ),
            },
            {
              key: "wordmark",
              label: <Typography.Text strong>Wordmark</Typography.Text>,
              children: (
                /*
                 * Labels in their own column, so the eye reads down one edge instead of hunting for
                 * where each field starts. `PhiLabeledControl` is already that grid; the two custom
                 * properties are what make every row agree on one label width.
                 */
                <Flex
                  vertical
                  gap={clientToken.paddingXS}
                  style={{
                    "--phi-labeled-control-label-width": "33.333333%",
                    "--phi-labeled-control-width": "100%",
                  } as CSSProperties}
                >
                  <Typography.Text type="secondary">
                    The Site name as it is set. One part per colour: a two-tone name is one word written
                    in two. With no part at all the frame shows {fallbackWordmark}.
                  </Typography.Text>
                  {editableWordmarkParts.map((part, index) => (
                    <PhiLabeledControl key={index} label={`Part #${index + 1}`} fill>
                      <Flex gap={clientToken.paddingXXS} align="center" style={{ width: "100%", minWidth: 0 }}>
                        <Input
                          value={part.text}
                          placeholder={index === 0 ? fallbackWordmark : "Part"}
                          onChange={(event) => updateWordmarkPart(index, { text: event.target.value })}
                        />
                        <PhiColorControl
                          mode="single"
                          allowClear
                          value={part.color ?? null}
                          presets={PHI_COLOR_PICKER_PRESETS}
                          onChange={(next) => updateWordmarkPart(index, { color: next })}
                        />
                        <PhiButtonControl
                          type="text"
                          size="small"
                          danger
                          disabled={wordmarkParts.length === 0}
                          icon={<DeleteOutlined />}
                          ariaLabel="Remove this part of the Wordmark"
                          onClick={() => publishDraft(mergeThemeWordmarkParts(
                            state.draft,
                            editableWordmarkParts.filter((_, at) => at !== index),
                          ))}
                        />
                      </Flex>
                    </PhiLabeledControl>
                  ))}
                  {/* No label of its own: it is an action on the rows above, not another field. */}
                  <PhiLabeledControl label=" " fill>
                    <PhiButtonControl
                      size="small"
                      label="Add part"
                      onClick={() => publishDraft(mergeThemeWordmarkParts(
                        state.draft,
                        [...editableWordmarkParts, { text: "" }],
                      ))}
                    />
                  </PhiLabeledControl>
                  <Divider style={{ marginBlock: clientToken.paddingXXS }} />
                  <PhiLabeledControl label="Weight" fill>
                    <Flex gap={clientToken.paddingXS} align="center" style={{ width: "100%", minWidth: 0 }}>
                      <Select
                        style={{ flex: "1 1 auto", minWidth: 0 }}
                        value={String(brand.wordmark?.fontWeight ?? "")}
                        options={[...PHI_THEME_WORDMARK_WEIGHT_OPTIONS]}
                        onChange={(next) => publishDraft(mergeThemeBrand(state.draft, {
                          wordmark: {
                            ...(brand.wordmark ?? {}),
                            fontWeight: next === "" ? null : Number(next),
                          },
                        }))}
                      />
                      {/*
                        Beside the weight rather than inside it: slanting and weight are two axes, and a
                        name is regularly both. A single list would make "Bold Italic" a fourth entry and
                        then a fifth the moment a third weight wants it.
                      */}
                      <PhiCheckboxControl
                        checked={brand.wordmark?.fontStyle === "italic"}
                        label="Italic"
                        onChange={(checked) => publishDraft(mergeThemeBrand(state.draft, {
                          wordmark: {
                            ...(brand.wordmark ?? {}),
                            fontStyle: checked ? "italic" : null,
                          },
                        }))}
                      />
                    </Flex>
                  </PhiLabeledControl>
                  {/*
                    Tracking in `em`, and only in `em`.

                    A free text field took "0.02" and CSS dropped it on the floor -- a bare number is
                    not a length -- so the control looked broken while the record was faithfully
                    storing what was typed. A number with the unit attached here cannot be written
                    wrongly, and `em` is the unit tracking belongs in: it scales with the size the name
                    is set at, which a pixel value does not.
                  */}
                  <PhiNumberControl
                    label="Tracking"
                    prefix="em"
                    style={{ width: "100%" }}
                    value={readWordmarkLetterSpacingEm(brand.wordmark?.letterSpacing)}
                    step={0.01}
                    precision={3}
                    min={-0.2}
                    max={1}
                    onChange={(next) => publishDraft(mergeThemeBrand(state.draft, {
                      wordmark: {
                        ...(brand.wordmark ?? {}),
                        letterSpacing: next == null ? null : `${next}em`,
                      },
                    }))}
                  />
                  <PhiLabeledControl label="Eyebrow" fill>
                    <Input
                      value={brand.eyebrow ?? ""}
                      placeholder="The small line above the name"
                      onChange={(event) => publishDraft(mergeThemeBrand(state.draft, {
                        eyebrow: event.target.value,
                      }))}
                    />
                  </PhiLabeledControl>
                </Flex>
              ),
            },
          ]}
        />
      </Card>
    </Flex>
  );
}

/**
 * Whether a copy would change anything, asked of the shape the control renders rather than of the
 * stored record: an absent field and an explicit empty one describe the same ground.
 */
function isSamePhiBackgroundConfig(
  left: PhiCmsBackgroundWidgetConfig,
  right: PhiCmsBackgroundWidgetConfig,
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function PhiBuilderBrandBackgroundControlsWidgetClient({
  runtime,
  config,
}: {
  runtime: PhiBlockRuntime;
  config?: PhiBuilderBrandWidgetConfig | null;
}) {
  const { token: clientToken, themeBlocks } = usePhiConfig();
  const themeKey = resolveThemeKey(config);
  const { state, publishDraft, editTransaction } = usePhiBrandThemeDraft(runtime, themeKey);
  const mode = usePhiBrandPreviewMode(resolveThemePayloadMode(state.draft));
  const composition = resolvePhiThemeComposition(state.draft, themeBlocks);
  const [activeBackgroundSection, changeActiveBackgroundSection] = usePhiBrandAccordionSection(
    BRAND_THEME_BACKGROUND_COLLAPSE_STORAGE_KEY,
    BRAND_THEME_BACKGROUND_SECTION_KEYS,
  );
  const modeLabel = mode === "dark" ? "Dark mode" : "Light mode";
  const otherMode = mode === "dark" ? "light" : "dark";
  /*
   * The controls show what the Site paints, which is the block wherever the author set nothing. Editing
   * one then takes it over as an authored value, which is the same move as everywhere else here: what
   * you touch becomes yours, and the reset beside it hands it back.
   */
  const effectiveRoot = resolvePhiThemeEffectiveRoot(state.draft.root, composition.ground);
  const rootBackground = normalizePhiBackgroundWidgetConfig(effectiveRoot.background?.[mode] ?? null);
  const otherRootBackground =
    normalizePhiBackgroundWidgetConfig(effectiveRoot.background?.[otherMode] ?? null);
  const chromeOverlay = resolvePhiShellChromeOverlayConfig(effectiveRoot.chrome?.[mode] ?? null);
  const otherChromeOverlay =
    resolvePhiShellChromeOverlayConfig(effectiveRoot.chrome?.[otherMode] ?? null);

  return (
    <Flex vertical gap={clientToken.padding} style={{ width: "100%", minWidth: 0 }}>
      <Card size="small" styles={{ body: { padding: clientToken.paddingSM } }}>
        {/*
          Which ground this Site follows. The block is what shows wherever the author set nothing, so
          switching it changes the untouched surfaces and leaves the edited ones alone. The reset beside
          each section is how somebody hands a surface back to the block.
        */}
        <PhiBrandBlockPicker
          label="Ground"
          value={composition.ground.key}
          unavailable={composition.unavailable.ground}
          options={themeBlocks.grounds}
          onChange={(key) => {
            const block = themeBlocks.grounds.find((candidate) => candidate.key === key);
            if (block) publishDraft(mergeThemeBlockChoice(state.draft, "ground", block));
          }}
        />
        <Divider style={{ marginBlock: clientToken.paddingXS }} />
        <Collapse
          accordion
          bordered={false}
          size="small"
          activeKey={activeBackgroundSection}
          onChange={changeActiveBackgroundSection}
          styles={{
            root: { background: "transparent" },
            header: { alignItems: "center", paddingInline: 0 },
            body: { paddingInline: 0 },
          }}
          items={[
            {
              key: "root",
              label: <Typography.Text strong>Root Background</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  <Flex align="center" justify="space-between" gap={clientToken.paddingXS}>
                    <Typography.Text type="secondary">
                      {modeLabel}. One layer behind the whole Site, fixed to the viewport.
                    </Typography.Text>
                    <Flex align="center" gap={clientToken.paddingXXS} style={{ flexShrink: 0 }}>
                      <PhiBrandBlockResetButton
                        disabled={state.draft.root?.background?.[mode] == null}
                        blockTitle={composition.ground.title}
                        onReset={() => publishDraft(clearThemeRootSurface(state.draft, "background", mode))}
                      />
                      <PhiBrandCopyModeButton
                        mode={mode}
                        disabled={isSamePhiBackgroundConfig(rootBackground, otherRootBackground)}
                        onCopy={() =>
                          publishDraft(mergeThemeRootBackground(state.draft, otherMode, rootBackground))}
                      />
                    </Flex>
                  </Flex>
                  <PhiBackgroundControl
                    key={mode}
                    value={rootBackground}
                    motionModes={PHI_ROOT_BACKGROUND_MOTION_MODES}
                    imageSourceKinds={PHI_ROOT_BACKGROUND_IMAGE_SOURCE_KINDS}
                    renderMediaPicker={renderPhiThemeRootBackgroundMediaPicker}
                    editTransaction={editTransaction}
                    onChange={(value) => publishDraft(mergeThemeRootBackground(state.draft, mode, value))}
                  />
                </Flex>
              ),
            },
            {
              key: "chrome",
              label: <Typography.Text strong>Chrome Overlay</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  <Flex align="center" justify="space-between" gap={clientToken.paddingXS}>
                    <Typography.Text type="secondary">
                      {modeLabel}. Shared by the Header, Sider and Footer Regions. Content and Hero never
                      take it, and a Region that authors its own Background or Effect paints over it.
                    </Typography.Text>
                    <Flex align="center" gap={clientToken.paddingXXS} style={{ flexShrink: 0 }}>
                      <PhiBrandBlockResetButton
                        disabled={state.draft.root?.chrome?.[mode] == null}
                        blockTitle={composition.ground.title}
                        onReset={() => publishDraft(clearThemeRootSurface(state.draft, "chrome", mode))}
                      />
                      <PhiBrandCopyModeButton
                        mode={mode}
                        disabled={isSamePhiBackgroundConfig(chromeOverlay, otherChromeOverlay)}
                        onCopy={() =>
                          publishDraft(mergeThemeChromeOverlay(state.draft, otherMode, chromeOverlay))}
                      />
                    </Flex>
                  </Flex>
                  <PhiBackgroundControl
                    key={`chrome-${mode}`}
                    value={chromeOverlay}
                    motionModes={PHI_SHELL_CHROME_OVERLAY_MOTION_MODES}
                    effects={PHI_SHELL_CHROME_OVERLAY_EFFECTS}
                    baseKinds={PHI_SHELL_CHROME_OVERLAY_BASE_KINDS}
                    imageSourceKinds={PHI_SHELL_CHROME_OVERLAY_IMAGE_SOURCE_KINDS}
                    renderMediaPicker={renderPhiThemeRootBackgroundMediaPicker}
                    editTransaction={editTransaction}
                    onChange={(value) => publishDraft(mergeThemeChromeOverlay(state.draft, mode, value))}
                  />
                </Flex>
              ),
            },
            {
              key: "shadow",
              label: <Typography.Text strong>Chrome Shadow</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  {/*
                    A section of its own rather than a tail on the Chrome Overlay: the ground above is a
                    mode value and switches with light and dark, while an edge is the same in both. One
                    entry per family, because a Shadow cannot point three ways at once, and both Siders
                    share theirs -- the same edge seen from two sides.
                  */}
                  <Flex align="center" justify="space-between" gap={clientToken.paddingXS}>
                    <Typography.Text type="secondary">
                      Cast at the outside edge of each pane, once for the whole visible stack. Applies to
                      both modes.
                    </Typography.Text>
                    <PhiBrandBlockResetButton
                      disabled={state.draft.root?.chrome?.shadow == null}
                      blockTitle={composition.ground.title}
                      onReset={() => publishDraft(clearThemeRootSurface(state.draft, "shadow", mode))}
                    />
                  </Flex>
                  {PHI_THEME_CHROME_SHADOW_EDGES.map(({ family, label }) => (
                    <Flex key={family} vertical gap={clientToken.paddingXXS}>
                      <Typography.Text>{label}</Typography.Text>
                      <PhiShadowControl
                        value={effectiveRoot.chrome?.shadow?.[family] ?? "none"}
                        resolvePreview={(shadow) =>
                          resolvePhiShellChromePaneShadow(shadow, family === "sider" ? "sider-left" : family)}
                        onChange={(value) => publishDraft(mergeThemeChromeShadow(state.draft, family, value))}
                      />
                    </Flex>
                  ))}
                </Flex>
              ),
            },
          ]}
        />
      </Card>
    </Flex>
  );
}

/**
 * The preview surface as a small Shell: a Header, a Sider and a Footer around the Content that carries
 * the preview's own Widgets.
 *
 * The Chrome Overlay is a treatment the chrome lays over the ground, so without chrome there was nothing
 * for it to be on and an author setting a glass here saw only what the Root Background already did.
 * Content stays transparent, exactly as a Content Region does on a Site, so the ground reads through it.
 *
 * Two layers rather than one, because the two halves of the overlay clip differently. The frost is three
 * plain boxes, one per Chrome family, as three Regions filter their own boxes on a Site. The paint is a
 * single box clipped to the frame, so a gradient runs across the corner instead of restarting in each
 * strip. Putting both on one clipped box looked right until the filtered backdrop ignored the clip and
 * frosted the Content with it.
 *
 * The frame is padding, and the clip follows the same three numbers, so the paint stops exactly where
 * the Content begins and never covers a Widget.
 */
function PhiBrandChromePreviewShell({
  overlayStyle,
  paneShadows,
  rootBackgroundStyle,
  surfaceBackground,
  textColor,
  labelColor,
  radius,
  padding,
  brand,
  children,
}: {
  overlayStyle: CSSProperties | null;
  paneShadows: Record<"header" | "sider-left" | "footer", string | undefined>;
  rootBackgroundStyle: CSSProperties | null;
  surfaceBackground: string;
  textColor: string;
  labelColor: string;
  radius: number;
  padding: number;
  brand: ReactNode;
  children: ReactNode;
}) {
  /*
   * Tall enough for a Logo. The band was 34 when it carried nothing but its own name; a Brand with a
   * picture in it needs the room, and the Header of a real Site is taller than a label anyway.
   */
  const header = 44;
  const sider = 88;
  const footer = 28;
  const { backdropFilter, WebkitBackdropFilter, ...paintStyle } = overlayStyle ?? {};
  const frostStyle = backdropFilter ? { backdropFilter, WebkitBackdropFilter } : null;

  return (
    <div
      style={{
        position: "relative",
        /*
         * `isolation` is what makes the ground land where it is meant to. At `z-index: -1` without a
         * stacking context of its own here, the layer would fall behind the opaque preview Card instead
         * of this surface; at `0` it would paint over the content, because a positioned box is drawn
         * after its static siblings.
         */
        isolation: "isolate",
        background: surfaceBackground,
        color: textColor,
        borderRadius: radius,
        overflow: "hidden",
        paddingTop: header,
        paddingInlineStart: sider,
        paddingBottom: footer,
      }}
    >
      {rootBackgroundStyle ? (
        <div
          aria-hidden
          data-phi-preview-root-background="true"
          style={{ position: "absolute", inset: 0, zIndex: -1, ...rootBackgroundStyle }}
        />
      ) : null}
      {frostStyle ? (
        <>
          <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, height: header, ...frostStyle }} />
          <div aria-hidden style={{ position: "absolute", left: 0, width: sider, top: header, bottom: footer, ...frostStyle }} />
          <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: footer, ...frostStyle }} />
        </>
      ) : null}
      <div
        aria-hidden
        data-phi-preview-chrome-overlay="true"
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `polygon(0 0, 100% 0, 100% ${header}px, ${sider}px ${header}px, ${sider}px calc(100% - ${footer}px), 100% calc(100% - ${footer}px), 100% 100%, 0 100%)`,
          ...paintStyle,
        }}
      />
      {/*
        The frame's edges, each cast from the band that owns it. Absolutely positioned, so they paint
        over the Content that follows them in the flow, which is the side a Shadow falls on.
      */}
      {paneShadows.header ? (
        <div
          aria-hidden
          style={{ position: "absolute", left: 0, right: 0, top: 0, height: header, boxShadow: paneShadows.header, pointerEvents: "none" }}
        />
      ) : null}
      {paneShadows["sider-left"] ? (
        <div
          aria-hidden
          style={{ position: "absolute", left: 0, width: sider, top: header, bottom: footer, boxShadow: paneShadows["sider-left"], pointerEvents: "none" }}
        />
      ) : null}
      {paneShadows.footer ? (
        <div
          aria-hidden
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: footer, boxShadow: paneShadows.footer, pointerEvents: "none" }}
        />
      ) : null}
      {/*
        The Brand where a Site puts it: in the Header band, over whatever the Chrome Overlay paints
        there. It stands in for the band's own label, which would only repeat what the shape says.
      */}
      <div
        style={{
          position: "absolute",
          left: sider + 8,
          right: 8,
          top: 0,
          height: header,
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {brand}
      </div>
      <div aria-hidden style={{ position: "absolute", inset: 0, fontSize: 11, color: labelColor, pointerEvents: "none" }}>
        <span style={{ position: "absolute", left: 8, top: header + 8 }}>Sider</span>
        <span style={{ position: "absolute", left: sider + 8, bottom: (footer - 14) / 2 }}>Footer</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: padding, padding, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

export function PhiBuilderBrandThemePreviewWidgetClient({
  runtime,
}: {
  runtime: PhiBlockRuntime;
}) {
  const { fonts, presets: themePresets, themeBlocks, token: clientToken } = usePhiConfig();
  const fallbackTheme = useMemo(() => resolveInitialTheme(runtime), [runtime]);
  const [previewTheme, setPreviewTheme] = useState<ThemePayload>(fallbackTheme);
  /*
   * The preview shows the Site, so it shows the blocks folded in: a draft states what its author chose,
   * and the parts nobody chose are the block's. Resolving here rather than in the state keeps the draft
   * that travels back to the Controller free of anything that was only worked out for display.
   */
  const previewThemeResolved = resolvePhiThemeRuntimePayload(previewTheme, themeBlocks).theme;
  const [hoveredStatusKey, setHoveredStatusKey] = useState<string | null>(null);
  const [previewTableSearch, setPreviewTableSearch] = useState("");
  /*
   * The preview shows the draft too, and mounting late knew as little about it as the controls did --
   * it just never showed, because a broadcast happened to arrive before anyone looked. It asks now.
   * Rendered on the Builder canvas it has no address, so it does not, and shows the saved theme.
   */
  const dispatchSignal = usePhiSignalDispatcher();
  const selfAddress = usePhiSignalIdentity().receiver ?? null;

  useEffect(() => {
    if (selfAddress) {
      emitThemeHydrateRequest(dispatchSignal, selfAddress);
    }
  }, [dispatchSignal, selfAddress]);
  const mode = usePhiBrandPreviewMode(resolveThemePayloadMode(fallbackTheme));
  const previewPreset = resolveThemePayloadPreset(previewThemeResolved, themePresets);
  const previewTokenInput = {
    ...buildPhiEffectiveNonColorThemeTokens(previewThemeResolved),
    ...resolvePhiThemeColorTokens(previewPreset, previewThemeResolved.palette, mode),
    ...(previewThemeResolved.style?.token ?? {}),
  };
  const previewEffectiveToken = resolvePhiAntdAliasTokens(mode, previewTokenInput);
  type PreviewRow = { key: string; name: string; status: string } & Record<string, unknown>;
  const columns: readonly PhiTableControlColumn<PreviewRow>[] = [
    { title: "Name", key: "name", fieldPath: "name", sizing: { mode: "fill" } },
    { title: "Status", key: "status", fieldPath: "status", sizing: { mode: "content" }, render: (value) => <Tag color="processing">{String(value)}</Tag> },
  ];
  const previewTableRows: readonly PreviewRow[] = [
    { key: "1", name: "Landing page", status: "Ready" },
    { key: "2", name: "Checkout", status: "Review" },
  ].filter((row) => row.name.toLowerCase().includes(previewTableSearch.trim().toLowerCase()));

  usePhiSignalListener((signal) => {
    if (
      signal.action !== "change" ||
      (signal.receiver !== "broadcast" && signal.receiver !== selfAddress)
    ) {
      return;
    }
    if (
      signal.channel !== PHI_THEME_SIGNAL_CHANNELS.brandTheme ||
      signal.sender !== createPhiThemeControllerAddress()
    ) {
      return;
    }
    const value = signal.value && typeof signal.value === "object"
      ? signal.value as { theme?: unknown }
      : null;
    setPreviewTheme(normalizeTheme(value?.theme, fallbackTheme));
  }, undefined, selfAddress);

  /**
   * The preview has to resolve Control shape exactly as the live render does, or the Style tab's shape
   * segments move the draft and nothing visible follows. Feeding the shaped components into the CSS var
   * identity as well is part of it: two shapes with otherwise equal tokens would hash to one key and
   * serve each other from cache.
   */
  const previewShapedComponents = applyPhiControlShapeComponentTokens(
    { ...(applyPhiButtonShadowComponentTokens(previewThemeResolved.components, previewThemeResolved.buttons, mode) ?? {}) },
    resolvePhiControlShape(previewThemeResolved.shape?.controls),
    previewEffectiveToken,
  );
  const previewAntdTheme = {
    inherit: false,
    cssVar: {
      prefix: "ant",
      key: createPhiAntdThemeCssVarKey("builder-theme-preview", {
        mode,
        token: previewEffectiveToken,
        components: previewShapedComponents,
      }),
    },
    token: {
      ...previewEffectiveToken,
    },
    components: previewShapedComponents,
  };
  const previewCardBackground = readEffectiveTokenString(previewEffectiveToken, "colorBgContainer", mode === "dark" ? "#141414" : "#ffffff");
  const previewSurfaceBackground = readEffectiveTokenString(previewEffectiveToken, "colorBgLayout", mode === "dark" ? "#000000" : "#f5f5f5");
  /*
   * The Theme Root Background, on the surface the preview treats as the page ground -- the same layer
   * the Site paints behind everything, in the mode the preview switch is showing. A mode with no
   * ground configured keeps the resolved layout background, which is exactly what the Site does.
   */
  const previewRootBackground = resolvePhiRootBackgroundPaintStyle(previewThemeResolved.root, mode);
  const previewChromeOverlay = resolvePhiShellChromeOverlayStyle(previewThemeResolved.root, mode);
  /*
   * The preview's frame casts what the Theme says its frame casts. Its Sider is the left one, being the
   * only one the preview draws.
   */
  const previewPaneShadows = resolvePhiShellChromePaneShadows(previewThemeResolved.root);
  const previewTextColor = readEffectiveTokenString(previewEffectiveToken, "colorText", mode === "dark" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.88)");
  const previewTextSecondaryColor = readEffectiveTokenString(previewEffectiveToken, "colorTextSecondary", mode === "dark" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)");
  const previewTextTertiaryColor = readEffectiveTokenString(previewEffectiveToken, "colorTextTertiary", mode === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)");
  const previewLinkColor = readEffectiveTokenString(previewEffectiveToken, "colorLink", readEffectiveTokenString(previewEffectiveToken, "colorPrimary", "#1677ff"));
  const previewLinkHoverColor = readEffectiveTokenString(previewEffectiveToken, "colorLinkHover", previewLinkColor);
  const previewLinkActiveColor = readEffectiveTokenString(previewEffectiveToken, "colorLinkActive", previewLinkColor);
  const statusPreviewItems = [
    {
      key: "info",
      label: "Info",
      color: readEffectiveTokenString(previewEffectiveToken, "colorInfoText", readEffectiveTokenString(previewEffectiveToken, "colorInfo", "#1677ff")),
      background: readEffectiveTokenString(previewEffectiveToken, "colorInfoBg", previewCardBackground),
      border: readEffectiveTokenString(previewEffectiveToken, "colorInfoBorder", previewLinkColor),
      hoverColor: readEffectiveTokenString(previewEffectiveToken, "colorInfoTextHover", readEffectiveTokenString(previewEffectiveToken, "colorInfoHover", "#4096ff")),
      hoverBackground: readEffectiveTokenString(previewEffectiveToken, "colorInfoBgHover", previewCardBackground),
      hoverBorder: readEffectiveTokenString(previewEffectiveToken, "colorInfoBorderHover", readEffectiveTokenString(previewEffectiveToken, "colorInfoHover", "#4096ff")),
    },
    {
      key: "success",
      label: "Success",
      color: readEffectiveTokenString(previewEffectiveToken, "colorSuccessText", readEffectiveTokenString(previewEffectiveToken, "colorSuccess", "#52c41a")),
      background: readEffectiveTokenString(previewEffectiveToken, "colorSuccessBg", previewCardBackground),
      border: readEffectiveTokenString(previewEffectiveToken, "colorSuccessBorder", readEffectiveTokenString(previewEffectiveToken, "colorSuccess", "#52c41a")),
      hoverColor: readEffectiveTokenString(previewEffectiveToken, "colorSuccessTextHover", readEffectiveTokenString(previewEffectiveToken, "colorSuccessHover", "#73d13d")),
      hoverBackground: readEffectiveTokenString(previewEffectiveToken, "colorSuccessBgHover", previewCardBackground),
      hoverBorder: readEffectiveTokenString(previewEffectiveToken, "colorSuccessBorderHover", readEffectiveTokenString(previewEffectiveToken, "colorSuccessHover", "#73d13d")),
    },
    {
      key: "warning",
      label: "Warning",
      color: readEffectiveTokenString(previewEffectiveToken, "colorWarningText", readEffectiveTokenString(previewEffectiveToken, "colorWarning", "#faad14")),
      background: readEffectiveTokenString(previewEffectiveToken, "colorWarningBg", previewCardBackground),
      border: readEffectiveTokenString(previewEffectiveToken, "colorWarningBorder", readEffectiveTokenString(previewEffectiveToken, "colorWarning", "#faad14")),
      hoverColor: readEffectiveTokenString(previewEffectiveToken, "colorWarningTextHover", readEffectiveTokenString(previewEffectiveToken, "colorWarningHover", "#ffc53d")),
      hoverBackground: readEffectiveTokenString(previewEffectiveToken, "colorWarningBgHover", previewCardBackground),
      hoverBorder: readEffectiveTokenString(previewEffectiveToken, "colorWarningBorderHover", readEffectiveTokenString(previewEffectiveToken, "colorWarningHover", "#ffc53d")),
    },
    {
      key: "error",
      label: "Error",
      color: readEffectiveTokenString(previewEffectiveToken, "colorErrorText", readEffectiveTokenString(previewEffectiveToken, "colorError", "#ff4d4f")),
      background: readEffectiveTokenString(previewEffectiveToken, "colorErrorBg", previewCardBackground),
      border: readEffectiveTokenString(previewEffectiveToken, "colorErrorBorder", readEffectiveTokenString(previewEffectiveToken, "colorError", "#ff4d4f")),
      hoverColor: readEffectiveTokenString(previewEffectiveToken, "colorErrorTextHover", readEffectiveTokenString(previewEffectiveToken, "colorErrorHover", "#ff7875")),
      hoverBackground: readEffectiveTokenString(previewEffectiveToken, "colorErrorBgHover", previewCardBackground),
      hoverBorder: readEffectiveTokenString(previewEffectiveToken, "colorErrorBorderHover", readEffectiveTokenString(previewEffectiveToken, "colorErrorHover", "#ff7875")),
    },
  ];
  const fontPreviewItems = [
    {
      key: "body",
      label: "Body",
      family: previewTheme.fonts?.body ?? fonts.body ?? clientToken.fontFamily,
      value: previewTheme.fonts?.body,
      sample: "The quick brand text renders in the body font.",
    },
    {
      key: "serif",
      label: "Serif",
      family: previewTheme.fonts?.serif ?? fonts.serif ?? clientToken.fontFamily,
      value: previewTheme.fonts?.serif,
      sample: "A short editorial sentence renders in the serif font.",
    },
    {
      key: "mono",
      label: "Mono",
      family: previewTheme.fonts?.mono ?? fonts.mono ?? clientToken.fontFamilyCode,
      value: previewTheme.fonts?.mono,
      sample: "const brand = \"phi\";",
    },
    {
      key: "accent",
      label: "Accent",
      family: previewTheme.fonts?.accent ?? fonts.accent ?? clientToken.fontFamily,
      value: previewTheme.fonts?.accent,
      sample: "Accent copy for compact highlights.",
    },
    {
      key: "display",
      label: "Display",
      family: previewTheme.fonts?.display ?? fonts.display ?? fonts.serif ?? clientToken.fontFamily,
      value: previewTheme.fonts?.display,
      sample: "Display headline sample",
    },
  ];
  const radiusPreviewItems = [
    {
      key: "sm",
      label: "Small",
      value: readEffectiveTokenNumber(previewEffectiveToken, "borderRadiusSM", PHI_RADII.xs),
    },
    {
      key: "base",
      label: "Base",
      value: readEffectiveTokenNumber(previewEffectiveToken, "borderRadius", PHI_RADII.sm),
    },
    {
      key: "lg",
      label: "Large",
      value: readEffectiveTokenNumber(previewEffectiveToken, "borderRadiusLG", PHI_RADII.base),
    },
  ];
  const controlHeightPreviewItems = [
    {
      key: "sm",
      label: "Small",
      value: readEffectiveTokenNumber(previewEffectiveToken, "controlHeightSM", PHI_CONTROL_HEIGHTS.sm),
    },
    {
      key: "base",
      label: "Base",
      value: readEffectiveTokenNumber(previewEffectiveToken, "controlHeight", PHI_CONTROL_HEIGHTS.md),
    },
    {
      key: "lg",
      label: "Large",
      value: readEffectiveTokenNumber(previewEffectiveToken, "controlHeightLG", PHI_CONTROL_HEIGHTS.lg),
    },
  ];
  const wireframeEnabled = readEffectiveTokenBoolean(previewEffectiveToken, "wireframe", true);

  return (
    <ConfigProvider theme={previewAntdTheme}>
      <Card
        size="small"
        style={{
          width: "100%",
          background: previewCardBackground,
          color: previewTextColor,
          /*
           * Small and large Control radii are inherited custom properties, so the preview declares its
           * own here and overrides whatever the surrounding Builder shape put on the Root.
           */
          ...buildPhiControlShapeCssVars(
            resolvePhiControlShape(previewThemeResolved.shape?.controls),
            previewEffectiveToken,
          ),
        }}
      >
        <PhiBrandChromePreviewShell
          overlayStyle={previewChromeOverlay}
          paneShadows={previewPaneShadows}
          rootBackgroundStyle={previewRootBackground}
          surfaceBackground={previewSurfaceBackground}
          textColor={previewTextColor}
          labelColor={previewTextSecondaryColor}
          radius={clientToken.paddingXS}
          padding={clientToken.padding}
          brand={(
            <PhiBrandControl
              brand={previewThemeResolved.brand ?? null}
              fallbackTitle={runtime.site.name ?? runtime.site.key}
              logoYOffset={-2}
            />
          )}
        >
          <Flex align="center" justify="space-between" gap={clientToken.padding} wrap="wrap">
            <Space orientation="vertical" size={0}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Theme Preview
              </Typography.Title>
              <Typography.Text type="secondary">
                Buttons, form fields, tables and status colors use the current draft tokens.
              </Typography.Text>
            </Space>
            <Space size="middle" wrap>
              <Button type="primary">Primary</Button>
              <Button>Default</Button>
              <Button danger>Danger</Button>
            </Space>
          </Flex>
          <Divider style={{ margin: 0 }} />
          <Flex vertical gap={clientToken.paddingSM} style={{ minWidth: 0 }}>
            <Typography.Title level={5} style={{ margin: 0, color: previewTextColor }}>
              Control Height
            </Typography.Title>
            <Flex gap={clientToken.paddingXS} wrap="wrap" align="end">
              {controlHeightPreviewItems.map((item) => (
                <Button key={item.key} style={{ height: item.value }}>
                  {item.label}
                </Button>
              ))}
            </Flex>
            <Typography.Text type="secondary">Wireframe {wireframeEnabled ? "on" : "off"}</Typography.Text>
          </Flex>
          <Form layout="vertical">
            <Form.Item label="Campaign" style={{ marginBottom: 0 }}>
              <Input placeholder="Preview input" />
            </Form.Item>
          </Form>
          <Divider style={{ margin: 0 }} />
          <Flex gap={clientToken.padding} wrap="wrap">
            <Flex vertical gap={clientToken.paddingXS} style={{ flex: "1 1 260px", minWidth: 0 }}>
              <Typography.Title level={5} style={{ margin: 0, color: previewTextColor }}>
                Header
              </Typography.Title>
              <Typography.Text style={{ color: previewTextColor }}>Text</Typography.Text>
              <Typography.Text style={{ color: previewTextSecondaryColor }}>Text secondary</Typography.Text>
              <Typography.Text style={{ color: previewTextTertiaryColor }}>Text tertiary</Typography.Text>
              <span style={{ display: "inline-flex", flexWrap: "wrap", gap: clientToken.paddingSM }}>
                <Typography.Link style={{ color: previewLinkColor }}>Link</Typography.Link>
                <Typography.Link style={{ color: previewLinkHoverColor }}>Link Hover</Typography.Link>
                <Typography.Link style={{ color: previewLinkActiveColor }}>Link Active</Typography.Link>
              </span>
            </Flex>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: clientToken.paddingXS,
                flex: "1 1 260px",
                minWidth: 0,
              }}
            >
              {statusPreviewItems.map((item) => (
                <div
                  key={item.key}
                  onMouseEnter={() => setHoveredStatusKey(item.key)}
                  onMouseLeave={() => setHoveredStatusKey((current) => (current === item.key ? null : current))}
                  onFocus={() => setHoveredStatusKey(item.key)}
                  onBlur={() => setHoveredStatusKey((current) => (current === item.key ? null : current))}
                  tabIndex={0}
                  style={{
                    cursor: "default",
                    minWidth: 0,
                    border: `1px solid ${hoveredStatusKey === item.key ? item.hoverBorder : item.border}`,
                    background: hoveredStatusKey === item.key ? item.hoverBackground : item.background,
                    color: hoveredStatusKey === item.key ? item.hoverColor : item.color,
                    borderRadius: clientToken.paddingXS,
                    padding: clientToken.paddingXS,
                    transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                  }}
                >
                  <Typography.Text strong style={{ color: hoveredStatusKey === item.key ? item.hoverColor : item.color }}>
                    {item.label}
                  </Typography.Text>
                </div>
              ))}
            </div>
          </Flex>
          <Divider style={{ margin: 0 }} />
          <Flex gap={clientToken.padding} wrap="wrap">
            <Statistic title="Draft colors" value={countThemePaletteLeaves(previewTheme.palette)} />
            <Statistic title="Preset" value={previewPreset.title} />
            <Statistic title="Mode" value={mode} />
          </Flex>
          <Divider style={{ margin: 0 }} />
          <Flex vertical gap={clientToken.paddingSM}>
            <Typography.Title level={5} style={{ margin: 0, color: previewTextColor }}>
              Font Slots
            </Typography.Title>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
                gap: clientToken.paddingXS,
                minWidth: 0,
              }}
            >
              {fontPreviewItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    minWidth: 0,
                    border: `1px solid ${readEffectiveTokenString(previewEffectiveToken, "colorBorderSecondary", "rgba(0,0,0,0.06)")}`,
                    borderRadius: `${readEffectiveTokenNumber(previewEffectiveToken, "borderRadius", PHI_RADII.sm)}px`,
                    background: previewCardBackground,
                    padding: clientToken.paddingXS,
                  }}
                >
                  <Typography.Text type="secondary" style={{ display: "block" }}>
                    {item.label}
                  </Typography.Text>
                  <Typography.Text style={{ display: "block", color: previewTextColor, fontFamily: item.family }}>
                    {item.sample}
                  </Typography.Text>
                  {item.value ? (
                    <Typography.Text type="secondary" style={{ display: "block", fontFamily: item.family }}>
                      {item.value}
                    </Typography.Text>
                  ) : null}
                </div>
              ))}
            </div>
          </Flex>
          <Flex gap={clientToken.padding} wrap="wrap">
            <Flex vertical gap={clientToken.paddingSM} style={{ flex: "1 1 260px", minWidth: 0 }}>
              <Typography.Title level={5} style={{ margin: 0, color: previewTextColor }}>
                Border Radius
              </Typography.Title>
              <Flex gap={clientToken.paddingXS} wrap="wrap">
                {radiusPreviewItems.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      width: `calc(${clientToken.controlHeightLG} * 2)`,
                      minHeight: `calc(${clientToken.controlHeight} * 1.25)`,
                      border: `1px solid ${readEffectiveTokenString(previewEffectiveToken, "colorBorder", "rgba(0,0,0,0.15)")}`,
                      borderRadius: item.value,
                      background: previewCardBackground,
                      padding: clientToken.paddingXS,
                    }}
                  >
                    <Typography.Text strong style={{ display: "block", color: previewTextColor }}>
                      {item.label}
                    </Typography.Text>
                    <Typography.Text type="secondary">{item.value}px</Typography.Text>
                  </div>
                ))}
              </Flex>
            </Flex>
          </Flex>
          {/* The search field and footer the Table Widget draws around its Control, so both follow the draft too. */}
          <Flex vertical gap={clientToken.paddingXS} style={{ minWidth: 0 }}>
            <Flex justify="end">
              <PhiTextControl
                inputType="search"
                allowClear
                size="small"
                placeholder="Search"
                value={previewTableSearch}
                onChange={(value) => setPreviewTableSearch(value ?? "")}
                style={{ width: 260, maxWidth: "100%" }}
              />
            </Flex>
            <PhiTableControl<PreviewRow>
              size="small"
              pagination={false}
              rowIdentityPath="key"
              sortingMode="none"
              sorts={[]}
              columnOrder={["name", "status"]}
              layout={{ mode: "auto", overflowX: "auto" }}
              columns={columns}
              rows={previewTableRows}
              footer={{ content: `${previewTableRows.length} of 2 rows`, align: "start" }}
            />
          </Flex>
        </PhiBrandChromePreviewShell>
      </Card>
    </ConfigProvider>
  );
}
