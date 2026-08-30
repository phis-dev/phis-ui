"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button, Divider, Flex, Input, InputNumber, Select, Space, Typography, theme } from "antd";
import type { DefaultOptionType } from "antd/es/select";

import type {
  PhiBackgroundDirection,
  PhiBackgroundMotionDirection,
  PhiBackgroundMotionTravel,
  PhiBackgroundMotionMode,
  PhiBackgroundNoiseGrain,
  PhiCmsBackgroundWidgetConfig,
} from "../widgets/config/background";
import {
  PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH,
  resolvePhiBackgroundParallaxDefaultStrength,
  normalizePhiBackgroundWidgetConfig,
  resolvePhiBackgroundWidgetStyle,
  serializePhiBackgroundBaseCss,
} from "../widgets/config/background";
import {
  PHI_CORE_BACKGROUND_PATTERN_PROVIDERS,
  resolvePhiBackgroundPatternDefaultValues,
  resolvePhiBackgroundPatternProvider,
} from "../widgets/config/background-pattern-authoring";
import {
  PHI_DEFAULT_BACKGROUND_PATTERN_KEY,
  type PhiBackgroundPatternKey,
} from "../widgets/config/background-pattern-contract";
import { resolvePhiBackgroundPatternLiveLayer } from "../widgets/config/background-pattern-live";
import { PhiImageAssetVariantKeyName } from "../../constants/media";
import type { PhiImageAssetVariantKeyValue, PhiMediaAssetTile } from "../../types/media";
import { normalizeMediaFocalRect } from "../media/focal-rect";
import {
  PHI_BACKGROUND_WIDGET_DEFAULT_LABELS,
  type PhiBackgroundWidgetLabels,
} from "../widgets/label-types/background";
import type { PhiColorPickerLabels } from "../widgets/label-types/color-picker";
import type { PhiWidgetControlMode } from "../../types/widget-ui";
import { ConfigPreviewShell } from "./config-preview-shell";
import { PhiColorControl } from "./phi-color-control";
import type { PhiPickerPlacement } from "./phi-picker-control-contract";
import { PhiSegmentedControl } from "./phi-segmented-control";
import { PhiSliderControl } from "./phi-slider-control";
import { PhiSelectControl } from "./phi-select-control";
import { PHI_COLOR_PICKER_DEFAULT_LABELS } from "../widgets/label-types/color-picker";
import { usePhiColorControlPresets } from "./use-phi-color-control-presets";

export type PhiBackgroundControlProps = {
  value?: PhiCmsBackgroundWidgetConfig | null;
  config?: PhiCmsBackgroundWidgetConfig | null;
  disabled?: boolean;
  mode?: PhiWidgetControlMode;
  labels?: PhiBackgroundWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  colorPickerPlacement?: PhiPickerPlacement;
  renderMediaPicker?: (props: {
    purpose: "preview" | "field";
    value?: number | null;
    open?: boolean;
    trigger?: ReactNode;
    onOpenChange?: (open: boolean) => void;
    onCommit?: (assetId: number | null, originalAssetId: number | null) => void;
    onDiscard?: (originalAssetId: number | null) => void;
    onAssetSelect: (asset: PhiMediaAssetTile) => void;
    onAssetClear: () => void;
  }) => ReactNode;
  onChange?: (value: PhiCmsBackgroundWidgetConfig) => void;
};

const BACKGROUND_DIRECTION_OPTIONS: Array<{ value: PhiBackgroundDirection; label: string }> = [
  { value: "0deg", label: "↑" },
  { value: "45deg", label: "↗" },
  { value: "90deg", label: "→" },
  { value: "135deg", label: "↘" },
  { value: "180deg", label: "↓" },
  { value: "225deg", label: "↙" },
  { value: "270deg", label: "←" },
  { value: "315deg", label: "↖" },
];

function directionToDegrees(direction: PhiBackgroundDirection) {
  if (direction.endsWith("deg")) {
    return Number(direction.replace(/deg$/, ""));
  }

  switch (direction) {
    case "to right":
      return 90;
    case "to left":
      return 270;
    case "to bottom":
      return 180;
    case "to top":
      return 0;
  }

  return 90;
}

function degreesToDirection(value: number) {
  const rounded = Math.max(0, Math.min(360, Math.round(value)));
  return `${rounded}deg` as PhiBackgroundDirection;
}

type PhiBackgroundImageVariantSelectValue = "__original__" | PhiImageAssetVariantKeyValue;

function withoutPhiBackgroundImageSource(
  base: Extract<PhiCmsBackgroundWidgetConfig["base"], { kind: "image" }>,
) {
  if (base.sourceKind === "asset") {
    const {
      sourceKind: _sourceKind,
      assetId: _assetId,
      variantKey: _variantKey,
      variantVersion: _variantVersion,
      ...common
    } = base;
    return common;
  }

  const {
    sourceKind: _sourceKind,
    sourceUrl: _sourceUrl,
    ...common
  } = base;
  return common;
}

const BACKGROUND_IMAGE_VARIANT_OPTIONS: DefaultOptionType[] = [
  { value: "__original__", label: "original" },
  ...Object.entries(PhiImageAssetVariantKeyName).map(([value, label]) => ({
    value: Number(value) as PhiImageAssetVariantKeyValue,
    label,
  })),
];

function toPickerValue(background: PhiCmsBackgroundWidgetConfig | null | undefined): string {
  const normalized = normalizePhiBackgroundWidgetConfig(background ?? null);
  if (normalized.base.kind === "none") {
    return "rgba(255, 255, 255, 0)";
  }

  if (normalized.base.kind === "image") {
    return "#ffffff";
  }

  return serializePhiBackgroundBaseCss(normalized.base);
}

function resolveStoredSolidColor(color: string) {
  return color;
}

export function PhiBackgroundControl({
  value,
  config,
  disabled = false,
  mode = "control",
  labels = PHI_BACKGROUND_WIDGET_DEFAULT_LABELS,
  colorPickerLabels = PHI_COLOR_PICKER_DEFAULT_LABELS,
  colorPickerPlacement,
  renderMediaPicker,
  onChange,
}: PhiBackgroundControlProps) {
  const { token } = theme.useToken();
  const colorPickerPresets = usePhiColorControlPresets({ labels: colorPickerLabels });
  const currentValue = useMemo(() => normalizePhiBackgroundWidgetConfig(value ?? config ?? null), [value, config]);
  const isDisabled = disabled || !onChange;
  // Motion modes render the original asset and steer the crop through the focal rect, so a
  // variant selection would have no effect and is locked out while motion is active.
  const hasActiveMotion = currentValue.motion != null && currentValue.motion.mode !== "static";
  const [previewOpenTarget, setPreviewOpenTarget] = useState<"image" | null>(null);
  const derivedPickerValue = useMemo<string>(() => {
    if (currentValue.base.kind === "color") {
      return currentValue.base.color;
    }

    return toPickerValue(currentValue);
  }, [currentValue]);
  const lastColorBaseRef = useRef<PhiCmsBackgroundWidgetConfig["base"] | null>(
    currentValue.base.kind === "color" ? currentValue.base : null,
  );
  const lastGradientBaseRef = useRef<PhiCmsBackgroundWidgetConfig["base"] | null>(
    currentValue.base.kind === "gradient" ? currentValue.base : null,
  );
  const lastImageBaseRef = useRef<PhiCmsBackgroundWidgetConfig["base"] | null>(
    currentValue.base.kind === "image" ? currentValue.base : null,
  );
  // `strength` means something different in each travel mode, so each one keeps its own dial.
  const rememberedStrength = useRef<Partial<Record<PhiBackgroundMotionTravel, number>>>(
    currentValue.motion?.mode === "parallax" && currentValue.motion.strength != null
      ? { [currentValue.motion.travel ?? "rate"]: currentValue.motion.strength }
      : {},
  );
  const [mediaPickerSnapshots, setMediaPickerSnapshots] = useState<Partial<Record<"preview" | "field", PhiCmsBackgroundWidgetConfig>>>({});
  const previewStyle = resolvePhiBackgroundWidgetStyle(currentValue);
  const previewMinHeight = token.controlHeight * 3;
  const fieldControlWidth = token.controlHeight * 4;
  const baseKindOptions = [
    { value: "none", label: labels.base.none },
    { value: "color", label: labels.base.color },
    { value: "gradient", label: labels.base.gradient },
    { value: "image", label: labels.base.image },
  ];
  const backgroundPositionOptions = [
    { value: "center", label: labels.position.center },
    { value: "top", label: labels.position.top },
    { value: "bottom", label: labels.position.bottom },
    { value: "left", label: labels.position.left },
    { value: "right", label: labels.position.right },
    { value: "top left", label: labels.position.topLeft },
    { value: "top right", label: labels.position.topRight },
    { value: "bottom left", label: labels.position.bottomLeft },
    { value: "bottom right", label: labels.position.bottomRight },
  ];
  const backgroundSizeOptions = [
    { value: "cover", label: labels.size.cover },
    { value: "contain", label: labels.size.contain },
    { value: "auto", label: labels.size.auto },
  ];
  const backgroundRepeatOptions = [
    { value: "no-repeat", label: labels.repeat.noRepeat },
    { value: "repeat", label: labels.repeat.repeat },
    { value: "repeat-x", label: labels.repeat.repeatX },
    { value: "repeat-y", label: labels.repeat.repeatY },
  ];
  const backgroundMotionOptions: Array<{ value: PhiBackgroundMotionMode; label: string }> = [
    { value: "static", label: labels.motion.static },
    { value: "fixed", label: labels.motion.fixed },
    { value: "parallax", label: labels.motion.parallax },
  ];
  const backgroundMotionDirectionOptions: Array<{ value: PhiBackgroundMotionDirection; label: string }> = [
    { value: "natural", label: labels.motion.natural },
    { value: "reverse", label: labels.motion.reverse },
  ];
  const backgroundMotionTravelOptions: Array<{ value: PhiBackgroundMotionTravel; label: string }> = [
    { value: "rate", label: labels.motion.rate },
    { value: "range", label: labels.motion.range },
  ];
  const overlayKindOptions = [
    { value: "none", label: labels.common.none },
    { value: "pattern", label: labels.overlay.pattern },
    { value: "noise", label: labels.overlay.noise },
  ];
  const patternOptions = PHI_CORE_BACKGROUND_PATTERN_PROVIDERS.map((provider) => {
    const layer = resolvePhiBackgroundPatternLiveLayer(
      provider.patternKey,
      resolvePhiBackgroundPatternDefaultValues(provider),
      0.55,
    );
    if (!layer) {
      return { value: provider.patternKey, label: labels.overlay.patterns[provider.labelKey] };
    }
    return {
      value: provider.patternKey,
      label: labels.overlay.patterns[provider.labelKey],
      preview: {
        kind: "background" as const,
        backgroundColor: "#5f6368",
        backgroundImage: layer.images.join(", "),
        backgroundSize: layer.images.map((_, index) => layer.sizes?.[index] ?? "auto").join(", "),
        backgroundPosition: layer.images.map((_, index) => layer.positions?.[index] ?? "0 0").join(", "),
        backgroundRepeat: layer.images.map((_, index) => layer.repeats?.[index] ?? "repeat").join(", "),
      },
    };
  });
  const selectedPatternProvider = currentValue.overlay?.kind === "pattern"
    ? resolvePhiBackgroundPatternProvider(currentValue.overlay.patternKey)
    : null;
  const resolvedPatternOptions = currentValue.overlay?.kind === "pattern" && !selectedPatternProvider
    ? [
        ...patternOptions,
        {
          value: currentValue.overlay.patternKey,
          label: currentValue.overlay.patternKey,
          disabled: true,
        },
      ]
    : patternOptions;
  const noiseGrainOptions: Array<{ value: PhiBackgroundNoiseGrain; label: string }> = [
    { value: "fine", label: labels.overlay.grains.fine },
    { value: "medium", label: labels.overlay.grains.medium },
    { value: "coarse", label: labels.overlay.grains.coarse },
  ];
  const effectKindOptions = [
    { value: "none", label: labels.common.none },
    { value: "glass", label: labels.effect.glass },
    { value: "blur", label: labels.effect.blur },
    { value: "dim", label: labels.effect.dim },
    { value: "tint", label: labels.effect.tint },
  ];
  const canOpenPreview = currentValue.base.kind !== "none";
  useEffect(() => {
    if (currentValue.base.kind === "color") {
      lastColorBaseRef.current = currentValue.base;
    }
    if (currentValue.base.kind === "gradient") {
      lastGradientBaseRef.current = currentValue.base;
    }
    if (currentValue.base.kind === "image") {
      lastImageBaseRef.current = currentValue.base;
    }
  }, [currentValue]);

  function emit(nextValue: PhiCmsBackgroundWidgetConfig) {
    onChange?.(nextValue);
  }

  function handleMediaPickerOpenChange(purpose: "preview" | "field", nextOpen: boolean) {
    if (nextOpen) {
      setMediaPickerSnapshots((current) => ({ ...current, [purpose]: currentValue }));
    }
    if (purpose === "preview") {
      setPreviewOpenTarget(nextOpen ? "image" : null);
    }
  }

  function commitMediaPicker(purpose: "preview" | "field") {
    setMediaPickerSnapshots((current) => {
      const next = { ...current };
      delete next[purpose];
      return next;
    });
  }

  function discardMediaPicker(purpose: "preview" | "field") {
    const snapshot = mediaPickerSnapshots[purpose];
    setMediaPickerSnapshots((current) => {
      const next = { ...current };
      delete next[purpose];
      return next;
    });
    if (snapshot) emit(snapshot);
  }

  function updateBaseFromCss(css: string) {
    const nextBase = normalizePhiBackgroundWidgetConfig({
      background: resolveStoredSolidColor(css),
    }).base;
    if (currentValue.base.kind === "gradient" && nextBase.kind === "color") {
      emit({
        ...currentValue,
        base: {
          ...currentValue.base,
          stops: currentValue.base.stops.map((stop) => ({
            ...stop,
            color: nextBase.color,
          })),
        },
      });
      return;
    }

    emit({
      ...currentValue,
      base:
        currentValue.base.kind === "gradient" && nextBase.kind === "gradient"
          ? {
              ...nextBase,
              direction: currentValue.base.direction,
            }
          : nextBase,
    });
  }

  function updateBaseKind(kind: "none" | "color" | "gradient" | "image") {
    if (kind === currentValue.base.kind) {
      return;
    }

    if (kind === "none") {
      emit({
        ...currentValue,
        base: {
          kind: "none",
        },
        motion: null,
      });
      return;
    }

    if (kind === "image") {
      if (currentValue.base.kind === "image") {
        lastImageBaseRef.current = currentValue.base;
      }
      if (currentValue.base.kind === "color") {
        lastColorBaseRef.current = currentValue.base;
      }
      if (currentValue.base.kind === "gradient") {
        lastGradientBaseRef.current = currentValue.base;
      }
      emit({
        ...currentValue,
        base:
          lastImageBaseRef.current?.kind === "image"
            ? lastImageBaseRef.current
            : {
                kind: "image",
                sourceKind: "url",
                sourceUrl: "",
              },
      });
      return;
    }

    if (kind === "gradient") {
      if (currentValue.base.kind === "color") {
        lastColorBaseRef.current = currentValue.base;
      }
      if (currentValue.base.kind === "image") {
        lastImageBaseRef.current = currentValue.base;
      }
      const base =
        currentValue.base.kind === "gradient"
          ? currentValue.base
          : lastGradientBaseRef.current?.kind === "gradient"
            ? lastGradientBaseRef.current
            : {
                kind: "gradient" as const,
                direction: "to right" as PhiBackgroundDirection,
                stops:
                  currentValue.base.kind === "color"
                    ? [
                        { color: currentValue.base.color, percent: 0 },
                        { color: currentValue.base.color, percent: 100 },
                      ]
                    : [
                        { color: "#ffffff", percent: 0 },
                        { color: "#ffffff", percent: 100 },
                      ],
              };

      emit({
        ...currentValue,
        base,
        motion: null,
      });
      return;
    }

    emit({
      ...currentValue,
      base:
        currentValue.base.kind === "color"
          ? currentValue.base
          : lastColorBaseRef.current?.kind === "color"
            ? lastColorBaseRef.current
          : {
              kind: "color",
              color:
                currentValue.base.kind === "gradient"
                  ? currentValue.base.stops[0]?.color ?? "#ffffff"
                  : "#ffffff",
            },
      motion: null,
    });
    if (currentValue.base.kind === "image") {
      lastImageBaseRef.current = currentValue.base;
    }
  }

  function updateGradientDirection(direction: PhiBackgroundDirection) {
    if (currentValue.base.kind !== "gradient") {
      return;
    }

    emit({
      ...currentValue,
      base: {
        ...currentValue.base,
        direction,
      },
    });
  }

  function renderDirectionButtons(
    value: PhiBackgroundDirection,
    onDirectionChange: (direction: PhiBackgroundDirection) => void,
  ) {
    const resolvedDegrees = directionToDegrees(value) % 360;
    return (
      <>
        {BACKGROUND_DIRECTION_OPTIONS.map((option) => (
          <Button
            key={option.value}
            aria-label={option.value}
            type={directionToDegrees(option.value) === resolvedDegrees ? "primary" : "default"}
            disabled={isDisabled}
            onClick={() => onDirectionChange(option.value)}
            style={{ minWidth: token.controlHeight, paddingInline: 0 }}
          >
            {option.label}
          </Button>
        ))}
      </>
    );
  }

  function renderDirectionEditor(
    label: string,
    value: PhiBackgroundDirection,
    onDirectionChange: (direction: PhiBackgroundDirection) => void,
    key?: string,
  ) {
    return (
      <Flex key={key} vertical gap={token.paddingXS} style={{ width: "100%" }}>
        <Typography.Text>{label}</Typography.Text>
        <Space.Compact block style={{ width: "100%" }}>
          {renderDirectionButtons(value, onDirectionChange)}
          <InputNumber
            min={0}
            max={360}
            step={1}
            value={directionToDegrees(value)}
            disabled={isDisabled}
            suffix="°"
            onChange={(next) => onDirectionChange(degreesToDirection(typeof next === "number" ? next : 90))}
            styles={{ input: { textAlign: "right" } }}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              width: 0,
            }}
          />
        </Space.Compact>
      </Flex>
    );
  }

  function updateImageField(
    field: "sourceUrl" | "alt" | "position" | "size" | "repeat",
    next: string,
  ) {
    if (currentValue.base.kind !== "image") {
      return;
    }

    if (field === "sourceUrl") {
      emit({
        ...currentValue,
        base: {
          ...withoutPhiBackgroundImageSource(currentValue.base),
          sourceKind: "url",
          sourceUrl: next,
          trusted: false,
          focalRect: undefined,
          resolvedAsset: null,
        },
      });
      return;
    }

    emit({
      ...currentValue,
      base: { ...currentValue.base, [field]: next },
    });
  }

  function updateImageVariant(nextVariantKey: PhiImageAssetVariantKeyValue | null) {
    if (currentValue.base.kind !== "image" || currentValue.base.sourceKind !== "asset") {
      return;
    }

    emit({
      ...currentValue,
      base: {
        ...currentValue.base,
        variantKey: nextVariantKey,
      },
    });
  }

  function updateMotionMode(mode: PhiBackgroundMotionMode) {
    emit({
      ...currentValue,
      motion: mode === "static"
        ? { mode }
        : mode === "fixed"
          ? { mode }
          : {
              mode,
              strength: currentValue.motion?.mode === "parallax"
                ? currentValue.motion.strength
                : PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH,
              direction: currentValue.motion?.mode === "parallax" ? currentValue.motion.direction : "natural",
              travel: currentValue.motion?.mode === "parallax" ? currentValue.motion.travel : "rate",
            },
    });
  }

  function updateParallaxMotion(patch: {
    strength?: number;
    direction?: PhiBackgroundMotionDirection;
    travel?: PhiBackgroundMotionTravel;
  }) {
    if (currentValue.base.kind !== "image") return;
    const parallax = currentValue.motion?.mode === "parallax" ? currentValue.motion : null;
    const travel = parallax?.travel ?? "rate";
    const strength = parallax?.strength ?? resolvePhiBackgroundParallaxDefaultStrength(travel);
    if (patch.strength != null) rememberedStrength.current[travel] = patch.strength;

    /*
     * The same number means a speed under `rate` and a share of the surplus under `range`, and the
     * Control cannot convert between them: that needs the viewport, the host box, and how much material
     * the original has beyond the crop, none of which it can see. So each travel mode keeps its own
     * value instead -- switch away, adjust, switch back, and the dial you set is still where you left it.
     */
    const nextTravel = patch.travel ?? travel;
    if (patch.travel != null && patch.travel !== travel) rememberedStrength.current[travel] = strength;
    const nextStrength = patch.strength ?? (
      nextTravel === travel
        ? strength
        : rememberedStrength.current[nextTravel] ?? resolvePhiBackgroundParallaxDefaultStrength(nextTravel)
    );

    emit({
      ...currentValue,
      motion: {
        mode: "parallax",
        strength: nextStrength,
        direction: patch.direction ?? parallax?.direction ?? "natural",
        travel: nextTravel,
      },
    });
  }

  function applyPickedImage(asset: {
    altText: string | null;
    id: number;
    variantVersion?: number | null;
    deliveryUrl?: string | null;
    deliveryRevision?: number | null;
    width?: number | null;
    height?: number | null;
    thumbnailUrl?: string | null;
    meta?: Record<string, unknown> | null;
  }) {
    /**
     * The Picker already holds the delivery facts the live render resolves on the server, so the
     * draft carries them as a render-time projection. `builder-persistence` strips it before saving:
     * a delivery revision or focal rectangle in stored content would go stale on the next edit.
     */
    const resolvedAsset = {
      deliveryUrl: asset.deliveryUrl ?? null,
      deliveryRevision: asset.deliveryRevision ?? null,
      variantVersion: asset.variantVersion ?? null,
      focalRect: normalizeMediaFocalRect(asset.meta?.focalRect ?? null),
      width: asset.width ?? null,
      height: asset.height ?? null,
    };
    if (currentValue.base.kind !== "image") {
      emit({
        ...currentValue,
        base: {
          kind: "image",
          sourceKind: "asset",
          assetId: asset.id,
          variantKey: null,
          variantVersion: asset.variantVersion ?? null,
          trusted: true,
          alt: asset.altText ?? undefined,
          blurDataUrl: undefined,
          resolvedAsset,
          position: undefined,
          size: "cover",
          repeat: "no-repeat",
        },
      });
      return;
    }

    const selectedVariantKey = currentValue.base.sourceKind === "asset"
      ? currentValue.base.variantKey ?? null
      : null;
    emit({
      ...currentValue,
      base: {
        ...withoutPhiBackgroundImageSource(currentValue.base),
        sourceKind: "asset",
        assetId: asset.id,
        variantKey: selectedVariantKey,
        variantVersion: asset.variantVersion ?? null,
        trusted: true,
        alt: asset.altText ?? currentValue.base.alt ?? undefined,
        blurDataUrl: undefined,
        resolvedAsset,
        position: undefined,
      },
    });
  }

  function clearPickedImage() {
    if (currentValue.base.kind !== "image") {
      return;
    }

    emit({
      ...currentValue,
      base: {
        ...withoutPhiBackgroundImageSource(currentValue.base),
        sourceKind: "url",
        sourceUrl: "",
        trusted: false,
        blurDataUrl: undefined,
        focalRect: undefined,
        resolvedAsset: null,
      },
    });
  }

  function updateOverlayKind(nextKind: "pattern" | "noise" | "none") {
    if (nextKind === "none") {
      emit({ ...currentValue, overlay: null });
      return;
    }

    if (nextKind === "noise") {
      emit({
        ...currentValue,
        overlay: currentValue.overlay?.kind === "noise"
          ? currentValue.overlay
          : { kind: "noise", opacity: currentValue.overlay?.opacity ?? 0.14, grain: "fine" },
      });
      return;
    }

    const provider = resolvePhiBackgroundPatternProvider(PHI_DEFAULT_BACKGROUND_PATTERN_KEY)!;
    emit({
      ...currentValue,
      overlay: currentValue.overlay?.kind === "pattern"
        ? currentValue.overlay
        : {
            kind: "pattern",
            patternKey: PHI_DEFAULT_BACKGROUND_PATTERN_KEY,
            opacity: currentValue.overlay?.opacity ?? 0.14,
            values: resolvePhiBackgroundPatternDefaultValues(provider),
          },
    });
  }

  function updateEffectKind(nextKind: "glass" | "blur" | "dim" | "tint" | "none") {
    if (nextKind === "none") {
      emit({ ...currentValue, effect: null });
      return;
    }

    emit({ ...currentValue, effect: nextKind });
  }

  function renderPreviewChrome() {
    return (
      <div
        style={{
          ...previewStyle,
          width: "100%",
          minHeight: previewMinHeight,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          cursor: canOpenPreview ? "pointer" : "default",
        }}
      />
    );
  }

  function renderPreviewPicker() {
    if (currentValue.base.kind === "color") {
      return (
        <PhiColorControl
          mode="single"
          value={derivedPickerValue}
          disabled={isDisabled}
          presets={colorPickerPresets}
          placement={colorPickerPlacement}
          onChange={(nextValue) => {
            if (nextValue != null) updateBaseFromCss(nextValue);
          }}
        >
          {renderPreviewChrome()}
        </PhiColorControl>
      );
    }

    if (currentValue.base.kind === "gradient") {
      return (
        <PhiColorControl
          mode="gradient"
          value={derivedPickerValue}
          disabled={isDisabled}
          presets={colorPickerPresets}
          placement={colorPickerPlacement}
          onChange={(nextValue) => {
            if (nextValue != null) updateBaseFromCss(nextValue);
          }}
        >
          {renderPreviewChrome()}
        </PhiColorControl>
      );
    }

    if (currentValue.base.kind === "image") {
      return renderMediaPicker?.({
        purpose: "preview",
        value: currentValue.base.sourceKind === "asset" ? currentValue.base.assetId ?? null : null,
        open: previewOpenTarget === "image",
        onOpenChange: (nextOpen) => handleMediaPickerOpenChange("preview", nextOpen),
        onCommit: () => commitMediaPicker("preview"),
        onDiscard: () => discardMediaPicker("preview"),
        trigger: renderPreviewChrome(),
        onAssetSelect: applyPickedImage,
        onAssetClear: clearPickedImage,
      }) ?? renderPreviewChrome();
    }

    return renderPreviewChrome();
  }

  if (mode === "preview") {
    return (
      <ConfigPreviewShell expanded={canOpenPreview}>
        {renderPreviewPicker()}
      </ConfigPreviewShell>
    );
  }

  const showPreview = mode !== "config";

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {showPreview ? (
        <ConfigPreviewShell expanded={canOpenPreview}>
          {renderPreviewPicker()}
        </ConfigPreviewShell>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: token.paddingXS, width: "100%" }}>
        <Typography.Text>{labels.sections.base}</Typography.Text>
        <PhiSegmentedControl
          block
          value={currentValue.base.kind}
          options={baseKindOptions}
          onChange={(next) => updateBaseKind(next as "none" | "color" | "gradient" | "image")}
        />
      </div>

      {currentValue.base.kind === "image" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: token.paddingSM, width: "100%" }}>
          <Flex align="center" justify="space-between" gap={token.paddingXS} wrap={false} style={{ width: "100%" }}>
            <Typography.Text>{labels.sections.image}</Typography.Text>
            {currentValue.base.sourceKind === "asset" && currentValue.base.assetId != null ? (
              <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, textAlign: "right" }}>
                {currentValue.base.assetId}
              </Typography.Text>
            ) : null}
          </Flex>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: token.paddingSM,
              width: "100%",
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              {renderMediaPicker?.({
                purpose: "field",
                value: currentValue.base.sourceKind === "asset" ? currentValue.base.assetId ?? null : null,
                onOpenChange: (nextOpen) => handleMediaPickerOpenChange("field", nextOpen),
                onCommit: () => commitMediaPicker("field"),
                onDiscard: () => discardMediaPicker("field"),
                onAssetSelect: applyPickedImage,
                onAssetClear: clearPickedImage,
              }) ?? null}
            </div>
            <div style={{ minWidth: 0 }}>
              <Select<PhiBackgroundImageVariantSelectValue>
                value={hasActiveMotion || currentValue.base.sourceKind !== "asset"
                  ? "__original__"
                  : currentValue.base.variantKey ?? "__original__"}
                disabled={isDisabled || hasActiveMotion || currentValue.base.sourceKind !== "asset"}
                options={BACKGROUND_IMAGE_VARIANT_OPTIONS}
                style={{ width: "100%" }}
                onChange={(next) => {
                  updateImageVariant(next === "__original__" ? null : next);
                }}
              />
            </div>
          </div>
          {hasActiveMotion ? (
            <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
              {labels.motion.usesOriginal}
            </Typography.Text>
          ) : null}
          {currentValue.base.sourceKind === "url" ? (
            <Input
              value={currentValue.base.sourceUrl ?? ""}
              disabled={isDisabled}
              placeholder={labels.placeholders.sourceUrl}
              onChange={(event) => updateImageField("sourceUrl", event.target.value)}
            />
          ) : null}
          <Input
            value={currentValue.base.alt ?? ""}
            disabled={isDisabled}
            placeholder={labels.placeholders.sourceAlt}
            onChange={(event) => updateImageField("alt", event.target.value)}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: token.paddingSM,
              width: "100%",
            }}
          >
            <Select
              value={currentValue.base.position ?? "center"}
              disabled={isDisabled}
              style={{ width: "100%" }}
              options={backgroundPositionOptions}
              onChange={(next) => updateImageField("position", next)}
            />
            <Select
              value={currentValue.base.size ?? "cover"}
              disabled={isDisabled}
              style={{ width: "100%" }}
              options={backgroundSizeOptions}
              onChange={(next) => updateImageField("size", next)}
            />
            <Select
              value={currentValue.base.repeat ?? "no-repeat"}
              disabled={isDisabled}
              style={{ width: "100%" }}
              options={backgroundRepeatOptions}
              onChange={(next) => updateImageField("repeat", next)}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: token.paddingXS, width: "100%" }}>
            <Typography.Text>{labels.sections.motion}</Typography.Text>
            <PhiSegmentedControl<PhiBackgroundMotionMode>
              block
              value={currentValue.motion?.mode ?? "static"}
              options={backgroundMotionOptions}
              disabled={isDisabled}
              onChange={updateMotionMode}
            />
            {currentValue.motion?.mode === "parallax" ? (
              <>
                <PhiSliderControl
                  label={labels.motion.strength}
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentValue.motion.strength ?? resolvePhiBackgroundParallaxDefaultStrength(currentValue.motion.travel)}
                  disabled={isDisabled}
                  tooltipSuffix="×"
                  style={{ width: "100%" }}
                  onChange={(strength) => updateParallaxMotion({ strength })}
                />
                <PhiSegmentedControl<PhiBackgroundMotionDirection>
                  label={labels.motion.direction}
                  block
                  value={currentValue.motion.direction ?? "natural"}
                  options={backgroundMotionDirectionOptions}
                  disabled={isDisabled}
                  onChange={(direction) => updateParallaxMotion({ direction })}
                />
                <PhiSegmentedControl<PhiBackgroundMotionTravel>
                  label={labels.motion.travel}
                  block
                  value={currentValue.motion.travel ?? "rate"}
                  options={backgroundMotionTravelOptions}
                  disabled={isDisabled}
                  onChange={(travel) => updateParallaxMotion({ travel })}
                />
              </>
            ) : null}
          </div>
        </div>
      ) : currentValue.base.kind !== "none" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: token.paddingSM, width: "100%" }}>
          {currentValue.base.kind === "color" ? (
            <Flex align="center" gap={token.paddingSM} wrap={false} style={{ width: "100%" }}>
              <Typography.Text style={{ flex: "0 0 140px", minWidth: 140 }}>{labels.base.color}</Typography.Text>
              <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                <PhiColorControl
                  value={currentValue.base.color}
                  disabled={isDisabled}
                  presets={colorPickerPresets}
                  placement={colorPickerPlacement}
                  onChange={(value) => {
                    if (value != null) updateBaseFromCss(value);
                  }}
                />
              </div>
            </Flex>
          ) : (
            <Flex align="center" justify="space-between" gap={token.paddingSM} wrap="wrap">
              <Typography.Text>{labels.base.gradient}</Typography.Text>
              <PhiColorControl
                mode="gradient"
                value={derivedPickerValue}
                disabled={isDisabled}
                presets={colorPickerPresets}
                placement={colorPickerPlacement}
                onChange={(value) => {
                  if (value != null) updateBaseFromCss(value);
                }}
              />
            </Flex>
          )}

          {currentValue.base.kind === "gradient" ? (
            renderDirectionEditor(
              labels.gradient.direction,
              currentValue.base.direction,
              updateGradientDirection,
            )
          ) : null}
        </div>
      ) : null}

      <Divider dashed size="small" />

      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Typography.Text>{labels.sections.overlay}</Typography.Text>
        <PhiSegmentedControl
          block
          value={currentValue.overlay?.kind ?? "none"}
          options={overlayKindOptions}
          onChange={(next) => updateOverlayKind(next as "pattern" | "noise" | "none")}
        />

        {currentValue.overlay ? (
          <Space orientation="vertical" size={8} style={{ width: "100%" }}>
            {currentValue.overlay.kind === "pattern" ? (
              <Flex align="center" justify="space-between" gap={token.paddingSM} wrap="wrap">
                <Typography.Text>{labels.overlay.pattern}</Typography.Text>
                <PhiSelectControl<PhiBackgroundPatternKey>
                  value={currentValue.overlay.patternKey}
                  options={resolvedPatternOptions}
                  disabled={isDisabled}
                  style={{ width: fieldControlWidth }}
                  onChange={(patternKey) => {
                    const provider = resolvePhiBackgroundPatternProvider(patternKey);
                    if (!provider) return;
                    emit({
                      ...currentValue,
                      overlay: {
                        kind: "pattern",
                        patternKey,
                        opacity: currentValue.overlay?.opacity ?? 0.14,
                        values: resolvePhiBackgroundPatternDefaultValues(provider),
                      },
                    });
                  }}
                />
              </Flex>
            ) : (
              <PhiSegmentedControl<PhiBackgroundNoiseGrain>
                label={labels.overlay.grain}
                block
                value={currentValue.overlay.grain}
                options={noiseGrainOptions}
                disabled={isDisabled}
                onChange={(grain) =>
                  emit({
                    ...currentValue,
                    overlay: {
                      ...currentValue.overlay!,
                      kind: "noise",
                      grain,
                    },
                  })
                }
              />
            )}

            <Flex align="center" justify="space-between" gap={token.paddingSM} wrap="wrap">
              <Typography.Text>{labels.common.opacity}</Typography.Text>
              <InputNumber
                min={0}
                max={1}
                step={0.01}
                value={currentValue.overlay.opacity ?? 0.14}
                disabled={isDisabled}
                onChange={(next) =>
                  emit({
                    ...currentValue,
                    overlay: {
                      ...currentValue.overlay!,
                      opacity: typeof next === "number" ? next : 0.14,
                    },
                  })
                }
                style={{ width: fieldControlWidth }}
              />
            </Flex>

            {currentValue.overlay.kind === "pattern" && selectedPatternProvider
              ? selectedPatternProvider.fields.map((field) => {
                  if (field.type === "direction") {
                    const direction = currentValue.overlay?.kind === "pattern" &&
                      typeof currentValue.overlay.values[field.key] === "string"
                      ? currentValue.overlay.values[field.key] as PhiBackgroundDirection
                      : field.defaultValue;
                    return renderDirectionEditor(
                      labels.common.direction,
                      direction,
                      (nextDirection) => {
                          if (currentValue.overlay?.kind !== "pattern") return;
                          emit({
                            ...currentValue,
                            overlay: {
                              ...currentValue.overlay,
                              values: { ...currentValue.overlay.values, [field.key]: nextDirection },
                            },
                          });
                        },
                      field.key,
                    );
                  }

                  const numberValue = currentValue.overlay?.kind === "pattern" &&
                    typeof currentValue.overlay.values[field.key] === "number"
                    ? currentValue.overlay.values[field.key] as number
                    : field.defaultValue;
                  return (
                    <Flex key={field.key} align="center" justify="space-between" gap={token.paddingSM} wrap="wrap">
                      <Typography.Text>{labels.common.scale}</Typography.Text>
                      <InputNumber
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={numberValue}
                        disabled={isDisabled}
                        onChange={(next) => {
                          if (currentValue.overlay?.kind !== "pattern") return;
                          emit({
                            ...currentValue,
                            overlay: {
                              ...currentValue.overlay,
                              values: {
                                ...currentValue.overlay.values,
                                [field.key]: typeof next === "number" ? next : field.defaultValue,
                              },
                            },
                          });
                        }}
                        style={{ width: fieldControlWidth }}
                      />
                    </Flex>
                  );
                })
              : null}
          </Space>
        ) : null}
      </Space>

      <Divider dashed size="small" />

      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <Typography.Text>{labels.sections.effect}</Typography.Text>
        <PhiSegmentedControl
          block
          value={currentValue.effect ?? "none"}
          options={effectKindOptions}
          onChange={(next) => updateEffectKind(next as "glass" | "blur" | "dim" | "tint" | "none")}
        />

      </Space>
    </Space>
  );
}
