"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Card, Collapse, ConfigProvider, Divider, Flex, Form, Input, Space, Statistic, Switch, Tag, Typography, theme as antdTheme } from "antd";
import type { AliasToken } from "antd/es/theme/interface";
import type { PhiColorPickerLabels } from "../../../../../components/widgets/label-types/color-picker";

import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import type { PhiBlockRuntime } from "../../../../../types/widget-runtime";
import { createPhiThemeControllerAddress } from "../../../../../plugins/runtime-modules/theme/controller/address";
import { PHI_THEME_SIGNAL_CHANNELS } from "../../../../../plugins/runtime-modules/theme/controller/signals";
import { createPhiCoreRuntimeControllerAddress } from "../../../../../components/runtime/core-runtime-controller-address";
import type { PhiCmsAreaKey } from "../../../../../constants/cms-areas";
import {
  PHI_DEFAULT_THEME_PRESET_KEY,
  PHI_DEFAULT_THEME_PRESET_VERSION,
  PHI_THEME_CUSTOM_COLOR_KEYS,
  resolvePhiThemePresetPlugin,
  resolvePhiThemePresetTokens,
  type PhiThemeMode,
  type PhiThemePresetPlugin,
  type PhiThemeCustomColorKey,
  type PhiThemeCustomColorPalette,
} from "../../../../../theme/phi-theme-presets";
import {
  buildPhiThemeCustomColorPalette,
  resolvePhiThemePresetCustomColors,
} from "../../../../../theme/phi-theme-palette";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import {
  createPhiAntdThemeCssVarKey,
  resolvePhiAntdAliasTokens,
} from "../../../../../theme/phi-antd-token-resolver";
import {
  buildPhiThemeStructuralTokens,
} from "../../../../../theme/phi-theme";
import {
  isPhiSiteThemeSelectionValue,
  resolvePhiThemeSelectionValue,
} from "../../../../../theme/phi-theme-selection";
import { PHI_CONTROL_HEIGHTS, PHI_PADDING, PHI_RADII } from "../../../../../theme/phi-tokens";
import {
  PHI_COLOR_PICKER_NEUTRAL_PRESETS,
  PHI_COLOR_PICKER_PRESETS,
} from "../../../../../components/widgets/config/color-picker-presets";
import { PHI_SPACING_TOKEN_KEYS } from "../../../../../components/widgets/config/spacing-options";
import { PhiColorWidget } from "../../../../../components/widgets/client/phi-color-widget";
import { PhiPresetSizeControl, type PhiPresetSizeOption } from "../../../../../components/controls/phi-preset-size-control";
import type { PhiBuilderBrandWidgetConfig } from "./config";
import { createPhiHistoryStore } from "../../../../../components/state/history-store";
import { createPhiCommandToolbarControlAddress } from "../../../../../components/widgets/signals/command-toolbar-address";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../../../../../plugins/runtime-modules/theme/ids";
import { PhiTableControl, type PhiTableControlColumn } from "../../../../../components/controls/phi-table-control";
import { PhiSegmentedControl } from "../../../../../components/controls/phi-segmented-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import {
  PHI_CONTROL_SHAPES,
  applyPhiControlShapeComponentTokens,
  buildPhiControlShapeCssVars,
  readPhiControlShape,
  type PhiControlShape,
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
  hasSiteThemeRevision: boolean;
};

let sharedBrandThemeState: BrandThemeState | null = null;

const DEFAULT_THEME_KEY = "default";
const BRAND_THEME_COLOR_COLLAPSE_STORAGE_KEY = "phi.builder.brand.theme.colorCollapse.activeKeys";
const BRAND_THEME_STYLE_COLLAPSE_STORAGE_KEY = "phi.builder.brand.theme.styleCollapse.activeKeys";
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

const THEME_COLOR_SEED_KEYS = new Set<string>(THEME_COLOR_SEED_SECTIONS.map((section) => section.key));
const THEME_DERIVED_COLOR_KEYS = new Set<string>(THEME_COLOR_SEED_SECTIONS.flatMap((section) => section.derived.map((item) => item.key)));
const THEME_COLOR_TOKEN_KEYS = new Set<string>([
  ...THEME_COLOR_SEED_KEYS,
  ...THEME_DERIVED_COLOR_KEYS,
]);

type ThemeColorSeedSection = (typeof THEME_COLOR_SEED_SECTIONS)[number];

function mergeThemeSeedToken(
  theme: ThemePayload,
  section: ThemeColorSeedSection,
  value: string,
): ThemePayload {
  const derivedTokenKeys = new Set<string>(section.derived.map((item) => item.key));
  const nextToken = Object.fromEntries(
    Object.entries(theme.antd?.token ?? {}).filter(([key]) => !derivedTokenKeys.has(key)),
  );

  return {
    ...theme,
    antd: {
      ...(theme.antd ?? {}),
      token: {
        ...nextToken,
        [section.key]: value,
      },
    },
  };
}

function resolveThemeKey(config?: PhiBuilderBrandWidgetConfig | null) {
  return config?.themeKey?.trim() || DEFAULT_THEME_KEY;
}

function normalizeTheme(
  input: unknown,
  fallback: ThemePayload,
  presets: readonly PhiThemePresetPlugin[],
): ThemePayload {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ensureThemeCustomColors(fallback, presets);
  }

  return ensureThemeCustomColors(input as ThemePayload, presets);
}

function resolveInitialTheme(
  runtime: PhiBlockRuntime,
  presets: readonly PhiThemePresetPlugin[],
): ThemePayload {
  return normalizeTheme(runtime.site.theme, {
    mode: "light",
    preset: PHI_DEFAULT_THEME_PRESET_KEY,
    presetVersion: PHI_DEFAULT_THEME_PRESET_VERSION,
    antd: {
      token: buildPhiNonColorThemeTokens(),
    },
  } as ThemePayload, presets);
}

function mergeThemeToken(theme: ThemePayload, tokenPatch: Record<string, unknown>): ThemePayload {
  return {
    ...theme,
    antd: {
      ...(theme.antd ?? {}),
      token: {
        ...(theme.antd?.token ?? {}),
        ...tokenPatch,
      },
    },
  };
}

function mergeThemeControlShape(theme: ThemePayload, controls: PhiControlShape): ThemePayload {
  return {
    ...theme,
    shape: {
      ...(theme.shape ?? {}),
      controls,
    },
  };
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

function resolveThemePresetTokenInput(
  theme: ThemePayload,
  preset: PhiThemePresetPlugin,
  mode: PhiThemeMode = resolveThemePayloadMode(theme),
) {
  return resolvePhiThemePresetTokens(preset, mode);
}

function resolveThemePresetCustomPalette(
  theme: ThemePayload,
  preset: PhiThemePresetPlugin,
  mode: PhiThemeMode = resolveThemePayloadMode(theme),
) {
  return {
    ...resolvePhiThemePresetCustomColors(preset, mode),
    ...(theme.phi?.customColors?.[mode] ?? {}),
  } satisfies PhiThemeCustomColorPalette;
}

function mergeThemeCustomColors(
  theme: ThemePayload,
  colorPatch: Partial<PhiThemeCustomColorPalette>,
  mode: PhiThemeMode = resolveThemePayloadMode(theme),
): ThemePayload {
  return {
    ...theme,
    phi: {
      ...(theme.phi ?? {}),
      customColors: {
        ...(theme.phi?.customColors ?? {}),
        [mode]: {
          ...(theme.phi?.customColors?.[mode] ?? {}),
          ...colorPatch,
        },
      },
    },
  };
}

function ensureThemeCustomColors(
  theme: ThemePayload,
  presets: readonly PhiThemePresetPlugin[],
): ThemePayload {
  const mode = resolveThemePayloadMode(theme);
  const customColors = theme.phi?.customColors?.[mode];
  if (customColors && PHI_THEME_CUSTOM_COLOR_KEYS.every((key) => typeof customColors[key] === "string" && customColors[key]?.trim())) {
    return theme;
  }

  return mergeThemeCustomColors(
    theme,
    resolveThemePresetCustomPalette(theme, resolveThemePayloadPreset(theme, presets)),
  );
}

function applyThemePreset(theme: ThemePayload, preset: PhiThemePresetPlugin): ThemePayload {
  const existingToken = theme.antd?.token ?? {};
  const nextToken = Object.fromEntries(
    Object.entries(existingToken).filter(([key]) => !THEME_COLOR_TOKEN_KEYS.has(key)),
  );

  return {
    ...theme,
    preset: preset.key,
    presetVersion: preset.version,
    antd: {
      ...(theme.antd ?? {}),
      token: nextToken,
    },
    phi: {
      ...(theme.phi ?? {}),
      customColors: {
        ...(theme.phi?.customColors ?? {}),
        [resolveThemePayloadMode(theme)]: resolvePhiThemePresetCustomColors(preset, resolveThemePayloadMode(theme)),
      },
    },
  };
}

function resetThemeToPreset(
  theme: ThemePayload,
  presets: readonly PhiThemePresetPlugin[],
  preset = resolveThemePayloadPreset(theme, presets),
): ThemePayload {
  const mode = resolveThemePayloadMode(theme);

  return ensureThemeCustomColors({
    ...theme,
    preset: preset.key,
    presetVersion: preset.version,
    antd: {
      token: buildPhiNonColorThemeTokens(),
    },
    phi: {
      ...(theme.phi ?? {}),
      customColors: {
        ...(theme.phi?.customColors ?? {}),
        [mode]: resolvePhiThemePresetCustomColors(preset, mode),
      },
    },
  }, presets);
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
  const overrides = theme.antd?.token ?? {};

  return Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      overrides[key] ?? value,
    ]),
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

function omitThemeToken(theme: ThemePayload, tokenKey: string): ThemePayload {
  const nextToken = { ...(theme.antd?.token ?? {}) };
  delete nextToken[tokenKey];

  return {
    ...theme,
    antd: {
      ...(theme.antd ?? {}),
      token: nextToken,
    },
  };
}

function writeSharedBrandThemeState(state: BrandThemeState) {
  sharedBrandThemeState = state;
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

function createInitialBrandThemeState(themeKey: string, fallbackTheme: ThemePayload): BrandThemeState {
  return sharedBrandThemeState?.key === themeKey ? sharedBrandThemeState : {
    key: themeKey,
    published: fallbackTheme,
    draft: fallbackTheme,
    revisionId: null,
    hasPublishedThemeRevision: false,
    hasSiteThemeRevision: false,
  };
}

function isSameThemePayload(left: ThemePayload, right: ThemePayload) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function emitThemeState(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  theme: ThemePayload,
  revisionId: number | null,
  selectionValue: string,
  draftStatus: "draft" | "published" = "draft",
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
    timestamp: Date.now(),
  });
}

function emitThemeDraftRequest(
  dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>,
  theme: ThemePayload,
  revisionId: number | null,
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
    },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.brandTheme,
    sender: null,
    receiver: createPhiThemeControllerAddress(),
    timestamp: Date.now(),
  });
}

function emitRootThemeState(dispatchSignal: ReturnType<typeof usePhiSignalDispatcher>, theme: ThemePayload) {
  dispatchSignal({
    scope: "site",
    channel: "theme",
    action: "change",
    value: theme,
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeTheme,
    sender: createPhiThemeControllerAddress(),
    receiver: createPhiCoreRuntimeControllerAddress(),
    timestamp: Date.now(),
  });
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
}: {
  runtime: PhiBlockRuntime;
  config?: PhiBuilderBrandWidgetConfig | null;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  const { showMessage } = usePhiApplicationFeedback();
  const { presets: themePresets } = usePhiConfig();
  const themeKey = resolveThemeKey(config);
  const siteKey = runtime.site.key;
  const historyScope = `theme:${siteKey}:${themeKey}`;
  const reviewArea =
    config?.reviewArea ?? (runtime.area === "builder" ? "public" : runtime.area);
  const fallbackTheme = useMemo(
    () => resolveInitialTheme(runtime, themePresets),
    [runtime, themePresets],
  );
  const initialState = useMemo(() => createInitialBrandThemeState(themeKey, fallbackTheme), [fallbackTheme, themeKey]);
  const [state, setState] = useState<BrandThemeState>(initialState);
  const stateRef = useRef<BrandThemeState>(initialState);
  const siteThemeRef = useRef<ThemePayload>(initialState.draft);
  const [saving, setSaving] = useState(false);

  const publishDraft = useCallback((
    nextTheme: ThemePayload,
    options?: { history?: boolean; updateSiteSnapshot?: boolean },
  ) => {
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
    writeSharedBrandThemeState(nextState);
    setState(nextState);
    emitThemeState(
      dispatchSignal,
      nextTheme,
      nextState.revisionId,
      resolvePhiThemeSelectionValue(siteKey, nextState.hasSiteThemeRevision),
      "draft",
    );
  }, [dispatchSignal, historyScope, siteKey]);

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

        const published = normalizeTheme(body?.published, fallbackTheme, themePresets);
        const draft = normalizeTheme(body?.draft?.theme?.theme, published, themePresets);
        const revisionId =
          typeof body?.draft?.revisionId === "number" && Number.isInteger(body.draft.revisionId)
            ? body.draft.revisionId
            : null;
        const publishedRevisionId =
          typeof body?.publishedRevisionId === "number" && Number.isInteger(body.publishedRevisionId)
            ? body.publishedRevisionId
            : null;
        const workingDraftRevisionId =
          typeof body?.workingDraftRevisionId === "number" && Number.isInteger(body.workingDraftRevisionId)
            ? body.workingDraftRevisionId
            : null;
        const nextState = {
          key: body?.key?.trim() || themeKey,
          published,
          draft,
          revisionId,
          hasPublishedThemeRevision: publishedRevisionId != null,
          hasSiteThemeRevision: publishedRevisionId != null || workingDraftRevisionId != null,
        };
        stateRef.current = nextState;
        siteThemeRef.current = draft;
        writeSharedBrandThemeState(nextState);
        setState(nextState);
        phiThemeHistory.clear(historyScope);
        emitThemeState(
          dispatchSignal,
          draft,
          revisionId,
          resolvePhiThemeSelectionValue(siteKey, nextState.hasSiteThemeRevision),
          revisionId == null ? "published" : "draft",
        );
      })
      .catch((error) => {
        if (!cancelled) {
          showMessage({ level: "error", content: error instanceof Error ? error.message : "Failed to read theme." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatchSignal, fallbackTheme, historyScope, showMessage, siteKey, themeKey, themePresets]);

  async function saveTheme(nextTheme = stateRef.current.draft, options?: { notify?: boolean }) {
    setSaving(true);
    try {
      const current = stateRef.current;
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
      const savedTheme = normalizeTheme(body?.theme?.theme, nextTheme, themePresets);
      const nextState = {
        ...stateRef.current,
        draft: savedTheme,
        revisionId,
        hasPublishedThemeRevision: stateRef.current.hasPublishedThemeRevision,
        hasSiteThemeRevision: true,
      };
      stateRef.current = nextState;
      siteThemeRef.current = savedTheme;
      writeSharedBrandThemeState(nextState);
      setState(nextState);
      emitThemeState(
        dispatchSignal,
        savedTheme,
        revisionId,
        resolvePhiThemeSelectionValue(siteKey, true),
        "draft",
      );
      if (options?.notify !== false) {
        showMessage({ level: "success", content: "Saved theme draft." });
      }
      return revisionId;
    } finally {
      setSaving(false);
    }
  }

  async function publishTheme() {
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
    const published = normalizeTheme(body?.theme?.theme, current.draft, themePresets);
    const nextState = {
      ...current,
      published,
      draft: published,
      revisionId: null,
      hasPublishedThemeRevision: true,
      hasSiteThemeRevision: true,
    };
    stateRef.current = nextState;
    siteThemeRef.current = published;
    writeSharedBrandThemeState(nextState);
    setState(nextState);
    emitThemeState(
      dispatchSignal,
      published,
      null,
      resolvePhiThemeSelectionValue(siteKey, true),
      "published",
    );
    showMessage({ level: "success", content: "Published theme." });
  }

  usePhiSignalListener((signal) => {
    if (
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.brandTheme &&
      signal.action === "change" &&
      signal.receiver === createPhiThemeControllerAddress() &&
      signal.sender !== createPhiThemeControllerAddress()
    ) {
      const value = signal.value && typeof signal.value === "object"
        ? signal.value as { theme?: unknown; revisionId?: unknown }
        : null;
      const current = stateRef.current;
      const nextTheme = normalizeTheme(value?.theme, current.draft, themePresets);
      const revisionId = typeof value?.revisionId === "number" && Number.isInteger(value.revisionId) ? value.revisionId : current.revisionId;
      if (revisionId !== current.revisionId) {
        stateRef.current = { ...current, revisionId };
      }
      publishDraft(nextTheme);
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
      const nextTheme = ensureThemeCustomColors({
        ...baseTheme,
        mode: nextMode,
      } satisfies ThemePayload, themePresets);
      emitRootThemeState(dispatchSignal, nextTheme);
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
        if (isPhiSiteThemeSelectionValue(signal.value, siteKey)) {
          const nextTheme = siteThemeRef.current;
          if (!isSameThemePayload(stateRef.current.draft, nextTheme)) {
            publishDraft(nextTheme, { updateSiteSnapshot: false });
          }
          return;
        }
        const selectedPreset = themePresets.find((preset) => preset.key === signal.value);
        if (!selectedPreset) {
          return;
        }
        const nextTheme = applyThemePreset(
          stateRef.current.draft,
          selectedPreset,
        );
        if (!isSameThemePayload(stateRef.current.draft, nextTheme)) {
          publishDraft(nextTheme, { updateSiteSnapshot: false });
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

    if (saving) {
      return;
    }

    const commandValue = signal.value;

    if (commandValue === "save") {
      void saveTheme().catch((error) => {
        showMessage({ level: "error", content: error instanceof Error ? error.message : "Failed to save theme draft." });
      });
      return;
    }

    if (commandValue === "publish") {
      void publishTheme().catch((error) => {
        showMessage({ level: "error", content: error instanceof Error ? error.message : "Failed to publish theme." });
      });
      return;
    }

    if (commandValue === "preview") {
      const revisionId = stateRef.current.revisionId;
      if (!Number.isInteger(revisionId) || (revisionId as number) <= 0) {
        showMessage({ level: "error", content: "No saved theme draft found. Save first before opening live preview." });
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
      publishDraft(resetThemeToPreset(stateRef.current.draft, themePresets, preset));
      showMessage({ level: "success", content: `Reset theme to ${preset.title}.` });
      return;
    }

    if (commandValue === "undo") {
      phiThemeHistory.undo(historyScope, (previous) => {
        publishDraft(previous, { history: false });
      });
      return;
    }

    if (commandValue === "redo") {
      phiThemeHistory.redo(historyScope, (next) => {
        publishDraft(next, { history: false });
      });
    }
  });

  void state;

  return null;
}

function readStoredActiveColorSections() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(BRAND_THEME_COLOR_COLLAPSE_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : null;
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const validKeys = new Set<string>(["custom", ...THEME_COLOR_SEED_SECTIONS.map((section) => section.key)]);
    return parsedValue.filter((value): value is string => typeof value === "string" && validKeys.has(value));
  } catch {
    return [];
  }
}

function readStoredActiveStyleSections() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(BRAND_THEME_STYLE_COLLAPSE_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : null;
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const validKeys = new Set<string>(["radius", "controlHeight", "fontFamily", "fontSize", "wireframe"]);
    return parsedValue.filter((value): value is string => typeof value === "string" && validKeys.has(value));
  } catch {
    return [];
  }
}

function resolveThemeFontSlots(
  theme: ThemePayload,
  fonts: ReturnType<typeof usePhiConfig>["fonts"],
) {
  return [
    { key: "body", label: "Body", value: theme.fonts?.body ?? fonts.body ?? "" },
    { key: "serif", label: "Serif", value: theme.fonts?.serif ?? fonts.serif ?? "" },
    { key: "mono", label: "Mono", value: theme.fonts?.mono ?? fonts.mono ?? "" },
    { key: "accent", label: "Accent", value: theme.fonts?.accent ?? fonts.accent ?? "" },
    { key: "display", label: "Display", value: theme.fonts?.display ?? fonts.display ?? "" },
  ] as const;
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
  const dispatchSignal = usePhiSignalDispatcher();
  const { presets: themePresets, token: clientToken } = usePhiConfig();
  const sectionLabelWidth = clientToken.controlHeight * 3;
  const colorControlWidth = clientToken.controlHeight * 5.5;
  const themeKey = resolveThemeKey(config);
  const fallbackTheme = useMemo(
    () => resolveInitialTheme(runtime, themePresets),
    [runtime, themePresets],
  );
  const initialState = useMemo(() => createInitialBrandThemeState(themeKey, fallbackTheme), [fallbackTheme, themeKey]);
  const previewMode = usePhiBrandPreviewMode(resolveThemePayloadMode(initialState.draft));
  const draftRef = useRef<ThemePayload>(initialState.draft);
  const [state, setState] = useState<BrandThemeState>(initialState);
  const loading = false;
  const saving = false;
  const [activeColorSections, setActiveColorSections] = useState<string[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setActiveColorSections(readStoredActiveColorSections());
    });
  }, []);

  const publishDraft = useCallback((nextTheme: ThemePayload) => {
    draftRef.current = nextTheme;
    setState((current) => {
      const nextState = {
        ...current,
        draft: nextTheme,
      };
      writeSharedBrandThemeState(nextState);
      return nextState;
    });
    emitThemeDraftRequest(dispatchSignal, nextTheme, state.revisionId);
  }, [dispatchSignal, state.revisionId]);

  usePhiSignalListener((signal) => {
    if (
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.brandTheme &&
      signal.action === "change" &&
      signal.receiver === "broadcast" &&
      signal.sender === createPhiThemeControllerAddress()
    ) {
      const value = signal.value && typeof signal.value === "object"
        ? signal.value as { theme?: unknown; revisionId?: unknown }
        : null;
      const nextTheme = normalizeTheme(value?.theme, draftRef.current, themePresets);
      const revisionId = typeof value?.revisionId === "number" && Number.isInteger(value.revisionId) ? value.revisionId : state.revisionId;
      draftRef.current = nextTheme;
      setState((current) => {
        const nextState = {
          ...current,
          draft: nextTheme,
          revisionId,
        };
        writeSharedBrandThemeState(nextState);
        return nextState;
      });
      return;
    }

  });

  const token = stripEmptyTokenValues(state.draft.antd?.token ?? {});
  const algorithm = previewMode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  const selectedPreset = resolveThemePayloadPreset(state.draft, themePresets);
  const presetToken = resolveThemePresetTokenInput(state.draft, selectedPreset, previewMode);
  const customPalette = resolveThemePresetCustomPalette(state.draft, selectedPreset, previewMode);
  const customColorOptions = PHI_THEME_CUSTOM_COLOR_KEYS.map((key, index) => ({
    key,
    label: `${colorPickerLabels?.custom ?? "Custom"} ${index + 1}`,
    value: customPalette[key],
  }));
  const seedTokenOverrides = Object.fromEntries(
    Object.entries(token).filter(([key]) => THEME_COLOR_SEED_KEYS.has(key)),
  );
  const computedToken = antdTheme.getDesignToken({
    algorithm,
    token: {
      ...buildPhiEffectiveNonColorThemeTokens(state.draft),
      ...presetToken,
      ...seedTokenOverrides,
    },
  });

  return (
    <Flex vertical gap={clientToken.padding} style={{ width: "100%", minWidth: 0, opacity: loading ? 0.65 : 1 }}>
      <Card size="small" styles={{ body: { padding: clientToken.paddingSM } }}>
        <Flex vertical gap={clientToken.paddingSM}>
          <Collapse
            bordered={false}
            size="small"
            activeKey={activeColorSections}
            onChange={(keys) => {
              const nextKeys = Array.isArray(keys) ? keys.map(String) : [String(keys)];
              setActiveColorSections(nextKeys);
              window.localStorage.setItem(BRAND_THEME_COLOR_COLLAPSE_STORAGE_KEY, JSON.stringify(nextKeys));
            }}
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
              const seedValue = Object.prototype.hasOwnProperty.call(token, section.key)
                ? readTokenColor(token, section.key, section.fallback)
                : readComputedTokenColor(computedToken, section.key, section.fallback);
              const seedDefaultValue = readComputedTokenColor(computedToken, section.key, section.fallback);

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
                        tokenKey={section.key}
                        value={seedValue}
                        defaultValue={seedDefaultValue}
                        disabled={saving}
                        customColors={customColorOptions}
                        labels={colorPickerLabels}
                        presets={section.presets}
                        onChange={(value) => {
                          publishDraft(mergeThemeSeedToken(draftRef.current, section, value));
                        }}
                      />
                    </div>
                  </Flex>
                ),
                children: (
                  <Flex wrap="wrap" style={{ minWidth: 0, columnGap: clientToken.paddingXXS, rowGap: clientToken.paddingSM }}>
                    {section.derived.map((item) => {
                      const overridden = Object.prototype.hasOwnProperty.call(token, item.key);
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
                              label={item.label}
                              tokenKey={item.key}
                              value={overridden ? readTokenColor(token, item.key, fallback) : fallback}
                              defaultValue={fallback}
                              disabled={saving}
                              customColors={customColorOptions}
                              labels={colorPickerLabels}
                              onChange={(value, tokenKey) => {
                                if (!tokenKey) {
                                  return;
                                }
                                publishDraft(mergeThemeToken(state.draft, { [tokenKey]: value }));
                              }}
                            />
                            {overridden ? (
                              <Button
                                size="small"
                                type="link"
                                disabled={saving}
                                style={{ alignSelf: "flex-start", paddingInline: 0, height: clientToken.controlHeightSM }}
                                onClick={() => publishDraft(omitThemeToken(state.draft, item.key))}
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
  const dispatchSignal = usePhiSignalDispatcher();
  const { fonts, presets: themePresets, token: clientToken } = usePhiConfig();
  const fieldLabelWidth = clientToken.controlHeight * 4;
  const themeKey = resolveThemeKey(config);
  const fallbackTheme = useMemo(
    () => resolveInitialTheme(runtime, themePresets),
    [runtime, themePresets],
  );
  const initialState = useMemo(() => createInitialBrandThemeState(themeKey, fallbackTheme), [fallbackTheme, themeKey]);
  const draftRef = useRef<ThemePayload>(initialState.draft);
  const [state, setState] = useState<BrandThemeState>(initialState);
  const loading = false;
  const saving = false;
  const [activeStyleSections, setActiveStyleSections] = useState<string[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setActiveStyleSections(readStoredActiveStyleSections());
    });
  }, []);

  const publishDraft = useCallback((nextTheme: ThemePayload) => {
    draftRef.current = nextTheme;
    setState((current) => {
      const nextState = {
        ...current,
        draft: nextTheme,
      };
      writeSharedBrandThemeState(nextState);
      return nextState;
    });
    emitThemeDraftRequest(dispatchSignal, nextTheme, state.revisionId);
  }, [dispatchSignal, state.revisionId]);

  usePhiSignalListener((signal) => {
    if (
      signal.channel === PHI_THEME_SIGNAL_CHANNELS.brandTheme &&
      signal.action === "change" &&
      signal.receiver === "broadcast" &&
      signal.sender === createPhiThemeControllerAddress()
    ) {
      const value = signal.value && typeof signal.value === "object"
        ? signal.value as { theme?: unknown; revisionId?: unknown }
        : null;
      const nextTheme = normalizeTheme(value?.theme, draftRef.current, themePresets);
      const revisionId = typeof value?.revisionId === "number" && Number.isInteger(value.revisionId) ? value.revisionId : state.revisionId;
      draftRef.current = nextTheme;
      setState((current) => {
        const nextState = {
          ...current,
          draft: nextTheme,
          revisionId,
        };
        writeSharedBrandThemeState(nextState);
        return nextState;
      });
      return;
    }

  });

  const token = stripEmptyTokenValues(state.draft.antd?.token ?? {});
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
  const fontSlots = resolveThemeFontSlots(state.draft, fonts);
  const remRootValue = state.draft.rem?.rootValue ?? 16;
  const baseFontSize = readEffectiveTokenNumber(styleTokenInput, "fontSize", 12);

  function updateToken(tokenPatch: Record<string, unknown>) {
    publishDraft(mergeThemeToken(state.draft, tokenPatch));
  }

  return (
    <Flex vertical gap={clientToken.padding} style={{ width: "100%", minWidth: 0, opacity: loading ? 0.65 : 1 }}>
      <Card size="small" styles={{ body: { padding: clientToken.paddingSM } }}>
        <Collapse
          bordered={false}
          size="small"
          activeKey={activeStyleSections}
          onChange={(keys) => {
            const nextKeys = Array.isArray(keys) ? keys.map(String) : [String(keys)];
            setActiveStyleSections(nextKeys);
            window.localStorage.setItem(BRAND_THEME_STYLE_COLLAPSE_STORAGE_KEY, JSON.stringify(nextKeys));
          }}
          styles={{
            root: { background: "transparent" },
            header: { alignItems: "center", paddingInline: 0 },
            body: { paddingInline: 0 },
          }}
          items={[
            {
              key: "radius",
              label: <Typography.Text strong>Border Radius</Typography.Text>,
              children: (
                <Flex vertical gap={clientToken.paddingXS}>
                  <PhiSegmentedControl<PhiControlShape>
                    label="Controls"
                    value={readPhiControlShape(state.draft.shape?.controls)}
                    options={PHI_CONTROL_SHAPES.map((value) => ({
                      value,
                      label: value.charAt(0).toUpperCase() + value.slice(1),
                    }))}
                    block
                    disabled={saving}
                    onChange={(value) => publishDraft(mergeThemeControlShape(state.draft, value))}
                  />
                  {/*
                    * The row that sits under the shape segments is the one an author watches while
                    * switching, so it renders through the draft's own shape rather than the Builder's
                    * ambient theme. Without this the segments moved the draft and nothing here changed.
                    */}
                  <ConfigProvider
                    theme={{
                      token: { ...radiusValues, ...controlHeightValues },
                      components: applyPhiControlShapeComponentTokens(
                        {},
                        readPhiControlShape(state.draft.shape?.controls),
                        radiusValues,
                      ),
                    }}
                  >
                    {/*
                      * The small and large radii travel as custom properties rather than component
                      * tokens, so the preview row has to declare them the same way the live Root does
                      * -- otherwise the two outer Buttons keep the Builder's own shape.
                      */}
                    <Flex
                      align="center"
                      gap={clientToken.paddingXS}
                      wrap
                      style={buildPhiControlShapeCssVars(
                        readPhiControlShape(state.draft.shape?.controls),
                        radiusValues,
                      )}
                    >
                      {(["small", "medium", "large"] as const).map((size) => (
                        <PhiButtonControl key={size} size={size} label={size} />
                      ))}
                      <PhiTextControl value="Control preview" readOnly size="medium" />
                      {/*
                        * A Select follows the shape like any other Control body, but the row showed only
                        * a Button and a text field, so an author had no way to see it and could
                        * reasonably conclude Selects were left out.
                        */}
                      <PhiSelectControl
                        value="preview"
                        size="medium"
                        options={[{ value: "preview", label: "Select preview" }]}
                        ariaLabel="Select shape preview"
                        readOnly
                        onChange={() => undefined}
                      />
                    </Flex>
                  </ConfigProvider>
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
                      <Typography.Text
                        code
                        ellipsis
                        style={{ minWidth: 0, flex: "1 1 auto", fontFamily: item.value || undefined }}
                      >
                        {item.value || "Not installed"}
                      </Typography.Text>
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
                    Root value controls rem conversion; font size is the Ant Design typography seed.
                  </Typography.Text>
                </Flex>
              ),
            },
            {
              key: "wireframe",
              label: <Typography.Text strong>Wireframe</Typography.Text>,
              children: (
                <Flex align="center" justify="space-between" gap={clientToken.paddingSM} wrap="wrap">
                  <Typography.Text type="secondary">Ant Design wireframe token</Typography.Text>
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

export function PhiBuilderBrandThemePreviewWidgetClient({
  runtime,
}: {
  runtime: PhiBlockRuntime;
}) {
  const { fonts, presets: themePresets, token: clientToken } = usePhiConfig();
  const fallbackTheme = useMemo(
    () => resolveInitialTheme(runtime, themePresets),
    [runtime, themePresets],
  );
  const [previewTheme, setPreviewTheme] = useState<ThemePayload>(fallbackTheme);
  const [hoveredStatusKey, setHoveredStatusKey] = useState<string | null>(null);
  const mode = usePhiBrandPreviewMode(resolveThemePayloadMode(fallbackTheme));
  const previewPreset = resolveThemePayloadPreset(previewTheme, themePresets);
  const previewPresetToken = resolveThemePresetTokenInput(previewTheme, previewPreset, mode);
  const previewTokenInput = {
    ...buildPhiEffectiveNonColorThemeTokens(previewTheme),
    ...previewPresetToken,
    ...(previewTheme.antd?.token ?? {}),
  };
  const previewEffectiveToken = resolvePhiAntdAliasTokens(mode, previewTokenInput);
  type PreviewRow = { key: string; name: string; status: string } & Record<string, unknown>;
  const columns: readonly PhiTableControlColumn<PreviewRow>[] = [
    { title: "Name", key: "name", fieldPath: "name", sizing: { mode: "fill" } },
    { title: "Status", key: "status", fieldPath: "status", sizing: { mode: "content" }, render: (value) => <Tag color="processing">{String(value)}</Tag> },
  ];

  usePhiSignalListener((signal) => {
    if (signal.action !== "change" || signal.receiver !== "broadcast") {
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
    setPreviewTheme(normalizeTheme(value?.theme, fallbackTheme, themePresets));
  });

  /**
   * The preview has to resolve Control shape exactly as the live render does, or the Style tab's shape
   * segments move the draft and nothing visible follows. Feeding the shaped components into the CSS var
   * identity as well is part of it: two shapes with otherwise equal tokens would hash to one key and
   * serve each other from cache.
   */
  const previewShapedComponents = applyPhiControlShapeComponentTokens(
    { ...(previewTheme.antd?.components ?? {}) },
    readPhiControlShape(previewTheme.shape?.controls),
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
            readPhiControlShape(previewTheme.shape?.controls),
            previewEffectiveToken,
          ),
        }}
      >
        <Flex
          vertical
          gap={clientToken.padding}
          style={{
            background: previewSurfaceBackground,
            color: previewTextColor,
            padding: clientToken.paddingSM,
            borderRadius: clientToken.paddingXS,
          }}
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
            <Statistic title="Draft colors" value={Object.keys(previewTheme.antd?.token ?? {}).length} />
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
            <Flex vertical gap={clientToken.paddingSM} style={{ flex: "1 1 260px", minWidth: 0 }}>
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
          </Flex>
          <Form layout="vertical">
            <Form.Item label="Campaign">
              <Input placeholder="Preview input" />
            </Form.Item>
          </Form>
          <PhiTableControl<PreviewRow>
            size="small"
            pagination={false}
            rowIdentityPath="key"
            sortingMode="none"
            sorts={[]}
            columnOrder={["name", "status"]}
            layout={{ mode: "auto", overflowX: "auto" }}
            columns={columns}
            rows={[
              { key: "1", name: "Landing page", status: "Ready" },
              { key: "2", name: "Checkout", status: "Review" },
            ]}
          />
        </Flex>
      </Card>
    </ConfigProvider>
  );
}
