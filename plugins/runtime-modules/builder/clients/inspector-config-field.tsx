"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { readPhiDotPath } from "../../../../helpers/dot-path";
import { PhiDividerControl } from "../../../../components/controls/phi-divider-control";
import { usePhiConfig } from "../../../../components/root/phi-config-provider";

import type {
  PhiCmsConfigField,
  PhiCmsConfigFieldOptionPresets,
  PhiRuntimeModuleDataProviderDescriptor,
} from "../../../../types/cms-plugins";
import type { PhiCalendarAdapterDescriptor } from "../../../../types/calendar";
import type { PhiVideoProviderDescriptor } from "../../../../types/video";
import { readPhiLengthValue, type PhiRenderableBlockSize } from "../../../../types";
import {
  normalizePhiPaddingWidgetConfig,
  type PhiCmsBorderWidgetConfig,
  type PhiCmsPaddingWidgetConfig,
} from "../../../../types/cms-config";
import { PhiBackgroundControl } from "../../../../components/controls/phi-background-control";
import { PhiBorderControl } from "../../../../components/controls/phi-border-control";
import { PhiColorFieldControl } from "../../../../components/controls/phi-color-field-control";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import type { PhiIconPickerControlLabels } from "../../../../components/widgets/label-types/icon-picker";
import {
  PhiInspectorLinkTargetFieldControl,
  type PhiInspectorLinkTargetLabels,
} from "./inspector-link-target-field";
import { PhiInspectorImageFieldControl } from "./inspector-image-field";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import { PHI_RADIUS_CONTROL_DEFAULT_LABELS, PhiBoundRadiusControl } from "../../../../components/controls/phi-bound-radius-control";
import { PhiDimensionControl } from "../../../../components/controls/phi-dimension-control";
import { PhiLengthControl } from "../../../../components/controls/phi-length-control";
import type { PhiCmsBackgroundWidgetConfig } from "../../../../components/widgets/config/background";
import {
  parsePhiControlOptionsProviderConfig,
  type PhiControlOption,
} from "../../../../components/controls/phi-control-options";
import { usePhiControlOptionsProvider } from "../../../../components/controls/phi-options-provider";
import { PhiTextControl } from "../../../../components/controls/phi-text-control";
import { PhiNumberControl } from "../../../../components/controls/phi-number-control";
import { PhiMultiSelectControl } from "../../../../components/controls/phi-multi-select-control";
import { PhiSelectControl } from "../../../../components/controls/phi-select-control";
import { PhiSwitchControl } from "../../../../components/controls/phi-switch-control";
import { PhiButtonControl } from "../../../../components/controls/phi-button-control";
import { PhiWidgetIconPickerButton } from "../../../../components/widgets/client/shared/phi-widget-icon-picker";
import { usePhiWidgetScaffoldPopup } from "../../../../components/widgets/client/shared/phi-widget-scaffold-popup";
import { PhiDialogControl } from "../../../../components/controls/phi-dialog-control";
import { PhiIcon } from "../../../../components/shell/phi-icon";
import { PhiPaddingControl } from "../../../../components/controls/phi-padding-control";
import type { PhiPaddingWidgetLabels } from "../../../../components/widgets/label-types/padding";
import type { PhiBackgroundWidgetLabels } from "../../../../components/widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../../../../components/widgets/label-types/border";
import { PHI_INSPECTOR_FIELD_LABEL_WIDTH, PhiInspectorFieldRow } from "../../../../components/widgets/inspector-field-row";
import { PhiShadowControl } from "../../../../components/controls/phi-shadow-control";
import { readPhiShadow } from "../../../../types/layout-style";
import {
  readInspectorChoiceMultiValue,
  readInspectorChoiceSingleValue,
} from "./inspector-choice-values";
import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../components/controls/phi-typography-control";
import { PhiDescriptionHint } from "../../../../components/controls/phi-description-tooltip-icon";
import { isPhiRecord } from "../../../../helpers/is-record";

export type PhiInspectorWidgetReferenceOption = {
  value: string;
  label: string;
  widgetType: string;
};

type PhiInspectorChoiceField = Extract<PhiCmsConfigField, { type: "choice" }>;
type PhiInspectorCollectionField = Extract<PhiCmsConfigField, { type: "collection" }>;
const PHI_STATIC_OPTIONS_PROVIDER_VALUE = "__phi_static_options__";

export function renderPhiInspectorSettingsRow(label: ReactNode, control: ReactNode, key?: string) {
  return (
    <PhiInspectorFieldRow key={key} label={label}>{control}</PhiInspectorFieldRow>
  );
}

/**
 * A switch in the Inspector's two columns: its label on the left, the switch in the control column.
 *
 * Shared by the boolean field and by the switches that are not config fields -- a node flag such as
 * "Translate text". A switch drawn with its own inline label instead lands in the label column and
 * stands out of line with every switch above it.
 *
 * The row's label is one control height tall and the switch is shorter, so left to the row's top
 * alignment it sat above the text's centre line. Centred in the same height it sits where the Corner
 * radius header puts its switch, and the switches of a Widget line up.
 */
export function renderPhiInspectorSwitchRow({
  key,
  label,
  checked,
  disabled,
  onChange,
}: {
  key: string;
  label: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return renderPhiInspectorSettingsRow(
    label,
    <PhiFlexControl align="center" style={{ minHeight: "var(--ant-control-height)" }}>
      <PhiSwitchControl checked={checked} disabled={disabled || !onChange} {...(onChange ? { onChange } : {})} />
    </PhiFlexControl>,
    key,
  );
}

function renderPhiInspectorSettingsBlock(label: ReactNode, control: ReactNode, key?: string) {
  return (
    <PhiFlexControl key={key} vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
      <PhiTypographyControl>{label}</PhiTypographyControl>
      {control}
    </PhiFlexControl>
  );
}

/** The field's label, with its description behind it as (i), the way a labelled Control carries one. */
function renderPhiInspectorConfigFieldLabel(field: PhiCmsConfigField): ReactNode {
  const label = field.required ? `${field.label} *` : field.label;
  return field.description ? (
    <>
      {label} <PhiDescriptionHint description={field.description} />
    </>
  ) : label;
}

function renderPhiInspectorConfigFieldControl(field: PhiCmsConfigField, control: ReactNode) {
  return renderPhiInspectorSettingsRow(renderPhiInspectorConfigFieldLabel(field), control, field.key);
}

function renderPhiInspectorConfigFieldBlock(field: PhiCmsConfigField, control: ReactNode) {
  /* A block under a divider that already names it says so once: the divider is its label. */
  if (field.heading != null && field.heading === field.label) {
    return <PhiFlexControl key={field.key} vertical style={{ width: "100%", minWidth: 0 }}>{control}</PhiFlexControl>;
  }
  return renderPhiInspectorSettingsBlock(renderPhiInspectorConfigFieldLabel(field), control, field.key);
}

export function isPhiInspectorConfigFieldVisible(field: PhiCmsConfigField, config: Record<string, unknown>) {
  if (field.editorPlacement === "toolbar" || field.editorPlacement === "geometry") {
    return false;
  }

  const rules = field.visibleWhen == null
    ? []
    : Array.isArray(field.visibleWhen) ? field.visibleWhen : [field.visibleWhen];
  return rules.every((rule) => {
    /* An empty list is no answer, the way an absent key is not: a Button with no routes left emits none. */
    const raw = readPhiInspectorConfigPathValue(config, rule.field);
    const value = Array.isArray(raw) && raw.length === 0 ? null : raw ?? null;
    if ("equals" in rule && value !== rule.equals) return false;
    if ("notEquals" in rule && value === rule.notEquals) return false;
    return true;
  });
}

/**
 * The value a field shows while a choice beside it answers for it, or `null` when the field is the
 * author's. See `PhiCmsConfigFieldOptionPresets`.
 */
export function resolvePhiInspectorFieldLock(
  field: PhiCmsConfigField,
  fields: readonly PhiCmsConfigField[],
  config: Record<string, unknown>,
): { value: unknown } | null {
  for (const candidate of fields) {
    if (candidate.type !== "choice" || !candidate.optionPresets?.locks.includes(field.key)) continue;
    const chosen = readPhiInspectorConfigPathValue(config, candidate.key);
    if (typeof chosen !== "string" || !chosen) continue;
    return { value: candidate.optionPresets.values[chosen]?.[field.key] };
  }
  return null;
}

/*
 * What choosing an option writes besides itself. The locked fields are dropped while an option answers
 * for them and handed back filled when none does; the prefilled ones are written once and left alone.
 */
function buildPhiInspectorOptionPresetPatch(
  presets: PhiCmsConfigFieldOptionPresets | undefined,
  previous: unknown,
  next: unknown,
): Record<string, unknown> {
  if (!presets) return {};
  if (typeof next === "string" && next) {
    const values = presets.values[next] ?? {};
    return {
      ...Object.fromEntries(presets.locks.map((key) => [key, undefined])),
      ...Object.fromEntries((presets.prefills ?? []).map((key) => [key, values[key]])),
    };
  }
  if (typeof previous === "string" && previous) {
    const values = presets.values[previous] ?? {};
    return Object.fromEntries(presets.locks.map((key) => [key, values[key]]));
  }
  return {};
}

export function readPhiInspectorConfigPathValue(
  config: Record<string, unknown> | null | undefined,
  path: string,
): unknown {
  return readPhiDotPath(config, path);
}

function writePhiInspectorConfigPathValue(
  config: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    return config;
  }
  /*
   * A numeric segment into a list stays a list -- `emits.0.value` writes the first emit's value and
   * keeps the rest, rather than turning `emits` into an object keyed "0".
   */
  const next = { ...config };
  let target: Record<string, unknown> | unknown[] = next;
  const write = (container: Record<string, unknown> | unknown[], segment: string, child: unknown) => {
    if (Array.isArray(container)) container[Number(segment)] = child;
    else container[segment] = child;
  };
  const read = (container: Record<string, unknown> | unknown[], segment: string) =>
    Array.isArray(container) ? container[Number(segment)] : container[segment];
  for (const segment of segments.slice(0, -1)) {
    const current = read(target, segment);
    const child: Record<string, unknown> | unknown[] = Array.isArray(current)
      ? [...current]
      : isPhiRecord(current)
        ? { ...(current as Record<string, unknown>) }
        : {};
    write(target, segment, child);
    target = child;
  }
  write(target, segments[segments.length - 1]!, value);
  return next;
}

export function buildPhiInspectorConfigPathPatch(
  config: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  let nextConfig = config;
  const rootKeys = new Set<string>();
  for (const [path, value] of Object.entries(patch)) {
    const rootKey = path.split(".").find(Boolean);
    if (!rootKey) {
      continue;
    }
    rootKeys.add(rootKey);
    nextConfig = writePhiInspectorConfigPathValue(nextConfig, path, value);
  }
  return Object.fromEntries([...rootKeys].map((rootKey) => [rootKey, nextConfig[rootKey]]));
}

function resolveInspectorSizeValue(value: unknown) {
  return typeof value === "number" || typeof value === "string" ? value : undefined;
}

export function resolvePhiInspectorDimensionValue(value: unknown): PhiRenderableBlockSize | null {
  if (typeof value === "number" || typeof value === "string") {
    return {
      width: value,
    };
  }

  if (!isPhiRecord(value)) {
    return null;
  }

  const width = resolveInspectorSizeValue((value as Record<string, unknown>).width);
  const height = resolveInspectorSizeValue((value as Record<string, unknown>).height);

  if (width == null && height == null) {
    return null;
  }

  return {
    ...(width == null ? {} : { width }),
    ...(height == null ? {} : { height }),
  };
}

function resolveInspectorColorMode(
  mode: Extract<PhiCmsConfigField, { type: "color" }>["mode"],
): "single" | "gradient" | "both" {
  if (mode === "gradient") {
    return "gradient";
  }

  if (mode === "both") {
    return "both";
  }

  return "single";
}

function normalizeInspectorBorderValue(value: unknown): PhiCmsBorderWidgetConfig | null {
  if (!isPhiRecord(value)) {
    return null;
  }

  return value as PhiCmsBorderWidgetConfig;
}

function readPhiInspectorCollectionItems(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(isPhiRecord)
    : [];
}

function createPhiInspectorCollectionItem(
  field: PhiInspectorCollectionField,
  items: readonly Record<string, unknown>[],
) {
  const next = { ...(field.defaultItem ?? {}) };
  const initialKey = next[field.itemKeyField];
  const baseKey = typeof initialKey === "string" && initialKey.trim()
    ? initialKey.trim()
    : "item";
  const currentKeys = new Set(items.map((item) => item[field.itemKeyField]).filter((value): value is string =>
    typeof value === "string" && value.length > 0));
  let candidate = baseKey;
  let suffix = 2;
  while (currentKeys.has(candidate)) {
    candidate = `${baseKey}-${suffix}`;
    suffix += 1;
  }
  next[field.itemKeyField] = candidate;
  return next;
}

function resolveInspectorPaddingFieldConfig(
  field: Extract<PhiCmsConfigField, { type: "padding" }>,
  source: Record<string, unknown> | null | undefined,
) {
  return normalizePhiPaddingWidgetConfig({
    padding: source?.[field.paddingKey ?? "padding"],
    gap: source?.[field.gapKey ?? "gap"],
    paddingTop: source?.[field.paddingTopKey ?? "paddingTop"],
    paddingRight: source?.[field.paddingRightKey ?? "paddingRight"],
    paddingBottom: source?.[field.paddingBottomKey ?? "paddingBottom"],
    paddingLeft: source?.[field.paddingLeftKey ?? "paddingLeft"],
  });
}

function buildInspectorPaddingFieldPatch(
  field: Extract<PhiCmsConfigField, { type: "padding" }>,
  nextPadding: PhiCmsPaddingWidgetConfig | null,
) {
  return {
    [field.paddingKey ?? "padding"]: nextPadding?.padding,
    [field.gapKey ?? "gap"]: nextPadding?.gap,
    [field.paddingTopKey ?? "paddingTop"]: nextPadding?.paddingTop,
    [field.paddingRightKey ?? "paddingRight"]: nextPadding?.paddingRight,
    [field.paddingBottomKey ?? "paddingBottom"]: nextPadding?.paddingBottom,
    [field.paddingLeftKey ?? "paddingLeft"]: nextPadding?.paddingLeft,
  };
}

export function renderPhiInspectorPaddingConfigControl({
  field,
  config,
  defaultConfig,
  disabled,
  labels,
  onChange,
}: {
  field: Extract<PhiCmsConfigField, { type: "padding" }>;
  config: Record<string, unknown>;
  defaultConfig?: Record<string, unknown> | null;
  disabled: boolean;
  labels?: PhiPaddingWidgetLabels;
  onChange?: (nextPadding: PhiCmsPaddingWidgetConfig | null, patch: Record<string, unknown>) => void;
}) {
  return (
    <PhiPaddingControl
      mode="control"
      disabled={disabled || !onChange}
      value={resolveInspectorPaddingFieldConfig(field, config)}
      config={resolveInspectorPaddingFieldConfig(field, defaultConfig)}
      labels={labels}
      onChange={(nextPadding) => onChange?.(nextPadding, buildInspectorPaddingFieldPatch(field, nextPadding))}
    />
  );
}

function ensureInspectorChoiceOption(
  options: readonly PhiControlOption[],
  candidate: string | null | undefined,
): PhiControlOption[] {
  if (!candidate) {
    return [...options];
  }

  return options.some((option) => option.value === candidate)
    ? [...options]
    : [...options, { value: candidate, label: candidate }];
}

function resolveInspectorChoiceOptions(
  field: PhiInspectorChoiceField,
  widgetReferenceOptions: PhiInspectorWidgetReferenceOption[],
  resolvedOptions: PhiControlOption[],
): PhiControlOption[] {
  if (field.filter?.widgetType) {
    return widgetReferenceOptions
      .filter((option) => option.widgetType === field.filter?.widgetType)
      .map((option) => ({ value: option.value, label: option.label }));
  }

  return resolvedOptions;
}

function PhiInspectorChoiceFieldControl({
  field,
  config,
  value,
  defaultValue,
  disabled,
  widgetReferenceOptions,
  onChange,
}: {
  field: PhiInspectorChoiceField;
  config: Record<string, unknown>;
  value: unknown;
  defaultValue: unknown;
  disabled: boolean;
  widgetReferenceOptions: PhiInspectorWidgetReferenceOption[];
  onChange?: (next: Record<string, unknown>) => void;
}) {
  const staticOptions = useMemo(
    () =>
      field.filter?.widgetType
        ? widgetReferenceOptions
            .filter((option) => option.widgetType === field.filter?.widgetType)
            .map((option) => ({ value: option.value, label: option.label }))
        : field.options,
    [field.filter?.widgetType, field.options, widgetReferenceOptions],
  );
  // The Inspector's own fields declare searchability too -- the navigation pickers have said
  // `search: { enabled: true }` for a while -- so the raw text goes to the hook here as well.
  const [searchDraft, setSearchDraft] = useState("");
  const providerResult = usePhiControlOptionsProvider({
    options: staticOptions,
    optionsProvider: field.filter?.widgetType ? null : field.optionsProvider,
    sourceConfig: field.filter?.widgetType ? null : config,
    searchDraft,
  });

  const renderChoiceRow = (control: ReactNode) => renderPhiInspectorConfigFieldControl(
    field,
    <PhiFlexControl vertical gap={4} style={{ minWidth: 0, width: "100%" }}>
      {control}
      {providerResult.warning ? (
        <PhiTypographyControl type="warning">{providerResult.warning}</PhiTypographyControl>
      ) : null}
    </PhiFlexControl>,
  );

  const resolvedOptions = useMemo(
    () => resolveInspectorChoiceOptions(field, widgetReferenceOptions, providerResult.options),
    [field, providerResult.options, widgetReferenceOptions],
  );

  if (field.mode === "multiple" || field.valueType === "string[]") {
    const selectedValues = readInspectorChoiceMultiValue(value, defaultValue);
    const options = selectedValues.reduce<PhiControlOption[]>(
      (items, entry) => ensureInspectorChoiceOption(items, entry),
      resolvedOptions,
    );

    return renderChoiceRow(
      <PhiMultiSelectControl
        value={selectedValues}
        options={options}
        placeholder={field.placeholder}
        allowCustom={field.allowCustom}
        disabled={disabled || !onChange}
        style={{ width: "100%" }}
        onChange={(nextValues) => onChange?.({
          [field.key]: nextValues,
          ...(field.patchOnChange ?? {}),
        })}
      />,
    );
  }

  const emptyOptionValue = field.emptyOption?.value;
  const selectedValue =
    value == null
      ? emptyOptionValue ?? readInspectorChoiceSingleValue(undefined, defaultValue)
      : readInspectorChoiceSingleValue(value, defaultValue);
  const options = ensureInspectorChoiceOption(
    field.emptyOption ? [field.emptyOption, ...resolvedOptions] : resolvedOptions,
    field.allowCustom ? selectedValue : null,
  );

  return renderChoiceRow(
    <PhiSelectControl
      options={options}
      onSearch={providerResult.search.enabled ? setSearchDraft : undefined}
      filterOptionsLocally={providerResult.search.filterLocally}
      placeholder={
          field.placeholder
          ?? (field.presentation === "autocomplete" || field.allowCustom
            ? "Type or select value"
            : options.length === 0
              ? "No matching options"
              : undefined)
      }
      presentation={field.presentation === "autocomplete" ? "autocomplete" : "select"}
      allowCustom={field.allowCustom}
      value={selectedValue ?? ""}
      disabled={disabled || !onChange}
      style={{ width: "100%" }}
      onChange={(nextValue) => {
        const next = field.presentation === "autocomplete" || field.allowCustom
          ? nextValue.trim().length > 0 ? nextValue : field.emptyValue
          : emptyOptionValue != null && nextValue === emptyOptionValue
            ? field.emptyValue
            : nextValue;
        onChange?.({
          [field.key]: next,
          ...buildPhiInspectorOptionPresetPatch(field.optionPresets, value, next),
          ...(field.patchOnChange ?? {}),
        });
      }}
    />,
  );
}

function PhiInspectorCollectionFieldControl({
  field,
  value,
  defaultValue,
  disabled,
  widgetReferenceOptions,
  paddingLabels,
  backgroundLabels,
  borderLabels,
  colorPickerLabels,
  iconPickerLabels,
  dataProviderDescriptors,
  calendarAdapterDescriptors,
  videoProviderDescriptors,
  onChange,
}: {
  field: PhiInspectorCollectionField;
  value: unknown;
  defaultValue: unknown;
  disabled: boolean;
  widgetReferenceOptions: PhiInspectorWidgetReferenceOption[];
  paddingLabels?: PhiPaddingWidgetLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  iconPickerLabels?: PhiIconPickerControlLabels;
  dataProviderDescriptors: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors: readonly PhiCalendarAdapterDescriptor[];
  videoProviderDescriptors: readonly PhiVideoProviderDescriptor[];
  onChange?: (next: Record<string, unknown>) => void;
}) {
  const { token } = usePhiConfig();
  const popup = usePhiWidgetScaffoldPopup();
  const [overlayOpen, setOverlayOpen] = useState(false);
  /* The entry a `select` collection shows; held to the list when entries go. */
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const configuredItems = readPhiInspectorCollectionItems(value);
  const defaultItems = readPhiInspectorCollectionItems(defaultValue);
  const items = value == null ? defaultItems : configuredItems;
  const minItems = Math.max(0, field.minItems ?? 0);
  const maxItems = field.maxItems == null ? Number.POSITIVE_INFINITY : Math.max(minItems, field.maxItems);

  const publish = (nextItems: readonly Record<string, unknown>[]) => {
    onChange?.({ [field.key]: nextItems });
  };

  /* What the entry is called, read as its fields show it: a locked label is the chosen action's. */
  const readItemLabel = (item: Record<string, unknown>, index: number) => {
    const labelKey = field.itemLabelField ?? field.itemKeyField;
    const labelField = field.itemFields.find((itemField) => itemField.key === labelKey);
    const lock = labelField ? resolvePhiInspectorFieldLock(labelField, field.itemFields, item) : null;
    const itemLabelValue = lock ? lock.value : item[labelKey];
    return typeof itemLabelValue === "string" && itemLabelValue.trim()
      ? itemLabelValue
      : `${field.label} ${index + 1}`;
  };

  /* One entry's own fields, edited in place; the same for every presentation. */
  const renderItemFields = (item: Record<string, unknown>, index: number) => {
    const defaultItem = defaultItems[index] ?? field.defaultItem ?? {};
    return (
      <PhiFlexControl vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
        {field.itemFields
          .filter((itemField) => isPhiInspectorConfigFieldVisible(itemField, item))
          .map((itemField) => {
            const lock = resolvePhiInspectorFieldLock(itemField, field.itemFields, item);
            return renderPhiInspectorConfigField({
              field: itemField,
              value: lock ? lock.value : readPhiInspectorConfigPathValue(item, itemField.key),
              defaultValue: readPhiInspectorConfigPathValue(defaultItem, itemField.key),
              config: item,
              defaultConfig: defaultItem,
              disabled: disabled || lock != null,
              widgetReferenceOptions,
              paddingLabels,
              backgroundLabels,
              borderLabels,
              colorPickerLabels,
              iconPickerLabels,
              dataProviderDescriptors,
              calendarAdapterDescriptors,
              videoProviderDescriptors,
              onChange: (patch) => {
                const nextItems = [...items];
                nextItems[index] = {
                  ...item,
                  ...buildPhiInspectorConfigPathPatch(item, patch),
                };
                publish(nextItems);
              },
            });
          })}
      </PhiFlexControl>
    );
  };

  const editor = (
    <PhiFlexControl vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
      {items.length === 0 ? (
        <PhiTypographyControl type="secondary">{field.emptyLabel ?? "No items"}</PhiTypographyControl>
      ) : null}
      {items.map((item, index) => {
        const itemIdentity = item[field.itemKeyField];
        const itemLabel = readItemLabel(item, index);

        return (
          <PhiFlexControl
            key={typeof itemIdentity === "string" && itemIdentity ? itemIdentity : `${field.key}-${index}`}
            vertical
            gap={8}
            style={{
              width: "100%",
              minWidth: 0,
              padding: "var(--ant-padding-xs)",
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadius,
              background: token.colorBgContainer,
            }}
          >
            <PhiFlexControl align="center" justify="space-between" gap={4} style={{ width: "100%" }}>
              <PhiTypographyControl strong ellipsis style={{ minWidth: 0 }} title={itemLabel}>
                {itemLabel}
              </PhiTypographyControl>
              <PhiFlexControl align="center" gap={2}>
                {field.reorderable !== false ? (
                  <>
                    <PhiButtonControl
                      label="↑"
                      type="text"
                      disabled={disabled || index === 0}
                      onClick={() => {
                        const nextItems = [...items];
                        [nextItems[index - 1], nextItems[index]] = [nextItems[index]!, nextItems[index - 1]!];
                        publish(nextItems);
                      }}
                    />
                    <PhiButtonControl
                      label="↓"
                      type="text"
                      disabled={disabled || index === items.length - 1}
                      onClick={() => {
                        const nextItems = [...items];
                        [nextItems[index], nextItems[index + 1]] = [nextItems[index + 1]!, nextItems[index]!];
                        publish(nextItems);
                      }}
                    />
                  </>
                ) : null}
                <PhiButtonControl
                  ariaLabel="Remove"
                  tooltip="Remove"
                  icon={<PhiIcon name="delete" />}
                  type="text"
                  danger
                  disabled={disabled || items.length <= minItems}
                  onClick={() => publish(items.filter((_, itemIndex) => itemIndex !== index))}
                />
              </PhiFlexControl>
            </PhiFlexControl>
            {renderItemFields(item, index)}
          </PhiFlexControl>
        );
      })}
      <PhiButtonControl
        label={field.addLabel ?? "Add item"}
        icon={<PhiIcon name="plus" />}
        disabled={disabled || items.length >= maxItems}
        onClick={() => publish([...items, createPhiInspectorCollectionItem(field, items)])}
      />
    </PhiFlexControl>
  );

  /*
   * The select is the field's row -- labelled with the field, "Button" -- and the chosen entry's fields
   * follow as rows of their own, so the entry reads as part of the settings and not as a card in them.
   */
  if (field.presentation === "select") {
    const selectedIndex = Math.min(selectedItemIndex, Math.max(0, items.length - 1));
    const selectedItem = items[selectedIndex];
    if (!selectedItem) {
      return renderPhiInspectorConfigFieldControl(
        field,
        <PhiTypographyControl type="secondary">{field.emptyLabel ?? "No items"}</PhiTypographyControl>,
      );
    }
    return (
      <Fragment key={field.key}>
        {renderPhiInspectorConfigFieldControl(
          field,
          <PhiSelectControl
            options={items.map((item, index) => ({ value: String(index), label: readItemLabel(item, index) }))}
            value={String(selectedIndex)}
            disabled={disabled}
            style={{ width: "100%" }}
            onChange={(next) => setSelectedItemIndex(Number(next))}
          />,
        )}
        {renderItemFields(selectedItem, selectedIndex)}
      </Fragment>
    );
  }

  if (field.presentation !== "overlay") {
    return renderPhiInspectorConfigFieldBlock(field, editor);
  }

  /*
   * The same editor in a wider box, and deliberately without a draft: every change publishes as it is
   * made, exactly as it does inline, so closing the Overlay decides nothing. The static options picker
   * has its Cancel and Apply because it edits rows with identities and a validity rule of their own and
   * has something to hold back; here a second copy of the value would only be a second truth, and the
   * Builder's undo is already the way back. No actions, therefore, and so no Footer either.
   */
  return renderPhiInspectorConfigFieldBlock(
    field,
    <>
      <PhiFlexControl align="center" justify="space-between" gap={8} style={{ width: "100%", minWidth: 0 }}>
        <PhiTypographyControl type="secondary" ellipsis style={{ minWidth: 0 }}>
          {items.length === 0
            ? field.emptyLabel ?? "No items"
            : items.map(readItemLabel).join(", ")}
        </PhiTypographyControl>
        <PhiButtonControl
          label={field.editLabel ?? "Edit"}
          icon={<PhiIcon name="edit" />}
          size="small"
          disabled={disabled}
          onClick={() => setOverlayOpen(true)}
        />
      </PhiFlexControl>
      <PhiDialogControl
        open={overlayOpen}
        title={field.label}
        controlSize="medium"
        mountPolicy="remount"
        rootClassName={popup.rootClassName}
        onDismiss={() => setOverlayOpen(false)}
      >
        {editor}
      </PhiDialogControl>
    </>,
  );
}

/**
 * A list of whole numbers typed as "10, 20, 50".
 *
 * The text is a draft until the field is left or Enter is pressed: reading it on every keystroke would
 * turn "10, " back into "10" and take the comma away from under the cursor.
 */
function PhiInspectorNumberListField({
  value,
  min,
  disabled,
  onChange,
}: {
  value: readonly unknown[];
  min?: number;
  disabled: boolean;
  onChange: (next: number[]) => void;
}) {
  const committed = value.filter((item): item is number => typeof item === "number").join(", ");
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft == null) return;
    const next = draft
      .split(/[\s,;]+/u)
      .map((part) => Number(part))
      .filter((item) => Number.isInteger(item) && (min === undefined || item >= min));
    setDraft(null);
    onChange(next);
  };
  return (
    <PhiTextControl
      value={draft ?? committed}
      disabled={disabled}
      style={{ width: "100%" }}
      onChange={setDraft}
      onBlur={commit}
      onPressEnter={commit}
    />
  );
}

export function renderPhiInspectorConfigField(
  args: Parameters<typeof renderPhiInspectorConfigFieldBody>[0],
) {
  const body = renderPhiInspectorConfigFieldBody(args);
  if (!args.field.heading || body == null) return body;
  return (
    <Fragment key={args.field.key}>
      <PhiDividerControl titlePlacement="start" style={{ marginBlock: 0 }}>{args.field.heading}</PhiDividerControl>
      {body}
    </Fragment>
  );
}

function renderPhiInspectorConfigFieldBody({
  field,
  value,
  defaultValue,
  config,
  defaultConfig,
  disabled,
  onChange,
  widgetReferenceOptions,
  paddingLabels,
  backgroundLabels,
  borderLabels,
  colorPickerLabels,
  iconPickerLabels,
  linkTargetLabels,
  dataProviderDescriptors = [],
  calendarAdapterDescriptors = [],
  videoProviderDescriptors = [],
  blockId,
}: {
  field: PhiCmsConfigField;
  value: unknown;
  defaultValue: unknown;
  config: Record<string, unknown>;
  defaultConfig?: Record<string, unknown> | null;
  disabled: boolean;
  /** The edited node, for a field that opens something addressed by it -- the image field's picker. */
  blockId?: PhiCmsInstanceId | null;
  widgetReferenceOptions?: PhiInspectorWidgetReferenceOption[];
  paddingLabels?: PhiPaddingWidgetLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  iconPickerLabels?: PhiIconPickerControlLabels;
  linkTargetLabels?: PhiInspectorLinkTargetLabels;
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
  videoProviderDescriptors?: readonly PhiVideoProviderDescriptor[];
  onChange?: (next: Record<string, unknown>) => void;
}) {
  if (field.type === "readonly") {
    const displayValue = value ?? defaultValue;

    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiTextControl
        value={displayValue == null ? "" : String(displayValue)}
        readOnly
        allowClear={false}
        style={{ width: "100%" }}
      />,
    );
  }

  if (field.type === "data-provider") {
    const providerConfig = parsePhiControlOptionsProviderConfig(value)
      ?? parsePhiControlOptionsProviderConfig(defaultValue);
    const rawProviderConfig = isPhiRecord(value)
      ? value
      : isPhiRecord(defaultValue)
        ? defaultValue
        : {};
    const supportsStaticOptions = !field.providerKind || field.providerKind === "options";
    const selectedProvider = dataProviderDescriptors.find((descriptor) =>
      descriptor.key === providerConfig?.providerKey) ?? null;
    const options = [
      ...(supportsStaticOptions
        ? [{ value: PHI_STATIC_OPTIONS_PROVIDER_VALUE, label: "Static options" }]
        : []),
      ...dataProviderDescriptors
        .filter((descriptor) => !field.providerKind || descriptor.kind === field.providerKind)
        .map((descriptor) => ({
          value: descriptor.key,
          label: descriptor.title,
          description: descriptor.description,
        })),
    ];

    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiFlexControl vertical gap={8} style={{ width: "100%" }}>
        <PhiSelectControl
          options={options}
          placeholder="Select a data provider"
          value={providerConfig?.providerKey ?? (supportsStaticOptions ? PHI_STATIC_OPTIONS_PROVIDER_VALUE : undefined)}
          disabled={disabled || !onChange}
          style={{ width: "100%" }}
          onChange={(providerKey) => onChange?.({
            [field.key]: providerKey === PHI_STATIC_OPTIONS_PROVIDER_VALUE
              ? null
              : field.providerKind === "table" || field.providerKind === "tree" || field.providerKind === "collection"
                ? {
                    providerKey,
                    resourceKey: (() => {
                      const resources = dataProviderDescriptors.find((descriptor) =>
                        descriptor.key === providerKey)?.resources ?? [];
                      if (field.providerKind !== "collection") return resources[0]?.resourceKey ?? "";
                      return resources.find((resource) =>
                        "defaultForWidget" in resource && resource.defaultForWidget === true)?.resourceKey ??
                        (resources.length === 1 ? resources[0]?.resourceKey : "") ?? "";
                    })(),
                    params: isPhiRecord(rawProviderConfig.params) ? rawProviderConfig.params : undefined,
                  }
                : { ...providerConfig, providerKey },
          })}
        />
        {(field.providerKind === "table" || field.providerKind === "tree" || field.providerKind === "collection") && selectedProvider ? (
          <PhiSelectControl
            options={(selectedProvider.resources ?? []).map((resource) => ({
              value: resource.resourceKey,
              label: resource.title,
              description: resource.description,
            }))}
            placeholder={`Select a ${field.providerKind === "tree" ? "Tree" : field.providerKind === "collection" ? "Collection" : "Table"} resource`}
            value={typeof rawProviderConfig.resourceKey === "string" ? rawProviderConfig.resourceKey : undefined}
            disabled={disabled || !onChange}
            style={{ width: "100%" }}
            onChange={(resourceKey) => onChange?.({
              [field.key]: {
                providerKey: selectedProvider.key,
                resourceKey,
                params: isPhiRecord(rawProviderConfig.params) ? rawProviderConfig.params : undefined,
              },
            })}
          />
        ) : null}
      </PhiFlexControl>,
    );
  }

  if (field.type === "calendar-adapter") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiSelectControl
        options={calendarAdapterDescriptors.map((descriptor) => ({
          value: descriptor.key,
          label: descriptor.title,
          description: descriptor.description,
        }))}
        placeholder="Select a calendar"
        value={typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : undefined}
        disabled={disabled || !onChange}
        style={{ width: "100%" }}
        onChange={(calendarAdapterKey) => onChange?.({ [field.key]: calendarAdapterKey })}
      />,
    );
  }

  if (field.type === "video-provider") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiSelectControl
        /*
         * The recipient is in the option, not only the provider's name, because choosing here is choosing
         * who a visitor will be asked about -- and the placeholder will name that company either way.
         */
        options={videoProviderDescriptors.map((descriptor) => ({
          value: descriptor.key,
          label: descriptor.title,
          description: descriptor.recipient,
        }))}
        placeholder="Select a video provider"
        value={typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : undefined}
        disabled={disabled || !onChange}
        style={{ width: "100%" }}
        onChange={(videoProviderKey) => onChange?.({ [field.key]: videoProviderKey })}
      />,
    );
  }

  if (field.type === "dimension") {
    const sizeValue: PhiRenderableBlockSize | null =
      typeof field.widthKey === "string" && typeof field.heightKey === "string"
        ? (() => {
            const widthValue = config[field.widthKey] ?? defaultConfig?.[field.widthKey];
            const heightValue = config[field.heightKey] ?? defaultConfig?.[field.heightKey];

            return widthValue == null && heightValue == null
              ? null
              : {
                  width: typeof widthValue === "number" || typeof widthValue === "string" ? widthValue : undefined,
                  height: typeof heightValue === "number" || typeof heightValue === "string" ? heightValue : undefined,
                };
          })()
        : resolvePhiInspectorDimensionValue(value ?? defaultValue);

    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiDimensionControl
        value={sizeValue}
        disabled={disabled || !onChange}
        widthPlaceholder={field.widthPlaceholder ?? "Width"}
        heightPlaceholder={field.heightPlaceholder ?? "Height"}
        onChange={(nextSize) => {
          if (typeof field.widthKey === "string" && typeof field.heightKey === "string") {
            onChange?.({
              [field.widthKey]: nextSize?.width,
              [field.heightKey]: nextSize?.height,
              ...(field.patchOnChange ?? {}),
            });
            return;
          }

          onChange?.({
            [field.key]: nextSize ?? undefined,
            ...(field.patchOnChange ?? {}),
          });
        }}
      />,
    );
  }

  if (field.type === "length") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiLengthControl
        value={readPhiLengthValue(value ?? defaultValue)}
        min={field.min}
        max={field.max}
        step={field.step}
        precision={field.precision}
        disabled={disabled || !onChange}
        onChange={(nextValue) => onChange?.({ [field.key]: nextValue ?? undefined })}
      />,
    );
  }

  if (field.type === "radius") {
    /*
     * Four corners do not fit beside a label: squeezed into the control column they truncate to
     * three letters each. The Control draws its own header in the label column -- name and switch
     * where every other row has them -- and the corner grid takes the full width beneath, top-left
     * over bottom-left on the left and top-right over bottom-right on the right.
     */
    return (
      <PhiBoundRadiusControl
        key={field.key}
        labels={{
          ...(borderLabels ?? PHI_RADIUS_CONTROL_DEFAULT_LABELS),
          sections: { radius: field.required ? `${field.label} *` : field.label },
        }}
        labelWidth={PHI_INSPECTOR_FIELD_LABEL_WIDTH}
        value={{
          borderTopLeftRadius: resolveInspectorSizeValue(config[field.topLeftKey]),
          borderTopRightRadius: resolveInspectorSizeValue(config[field.topRightKey]),
          borderBottomLeftRadius: resolveInspectorSizeValue(config[field.bottomLeftKey]),
          borderBottomRightRadius: resolveInspectorSizeValue(config[field.bottomRightKey]),
        }}
        disabled={disabled || !onChange}
        onChange={(nextRadius) =>
          onChange?.({
            [field.topLeftKey]: nextRadius.borderTopLeftRadius,
            [field.topRightKey]: nextRadius.borderTopRightRadius,
            [field.bottomLeftKey]: nextRadius.borderBottomLeftRadius,
            [field.bottomRightKey]: nextRadius.borderBottomRightRadius,
          })
        }
      />
    );
  }

  if (field.type === "padding") {
    return renderPhiInspectorConfigFieldControl(
      field,
      renderPhiInspectorPaddingConfigControl({
        field,
        config,
        defaultConfig,
        disabled,
        labels: paddingLabels,
        onChange: (_nextPadding, patch) => onChange?.(patch),
      }),
    );
  }

  if (field.type === "boolean") {
    return renderPhiInspectorSwitchRow({
      key: field.key,
      label: renderPhiInspectorConfigFieldLabel(field),
      checked: typeof value === "boolean"
        ? value
        : typeof defaultValue === "boolean"
          ? defaultValue
          : false,
      disabled,
      ...(onChange ? { onChange: (checked: boolean) => onChange({ [field.key]: checked }) } : {}),
    });
  }

  if (field.type === "choice") {
    return (
      <PhiInspectorChoiceFieldControl
        key={field.key}
        field={field}
        config={config}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled || !onChange}
        widgetReferenceOptions={widgetReferenceOptions ?? []}
        onChange={onChange}
      />
    );
  }

  if (field.type === "collection") {
    return (
      <PhiInspectorCollectionFieldControl
        key={field.key}
        field={field}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled || !onChange}
        widgetReferenceOptions={widgetReferenceOptions ?? []}
        paddingLabels={paddingLabels}
        backgroundLabels={backgroundLabels}
        borderLabels={borderLabels}
        colorPickerLabels={colorPickerLabels}
        iconPickerLabels={iconPickerLabels}
        dataProviderDescriptors={dataProviderDescriptors}
        calendarAdapterDescriptors={calendarAdapterDescriptors}
        videoProviderDescriptors={videoProviderDescriptors}
        onChange={onChange}
      />
    );
  }

  if (field.type === "color") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiColorFieldControl
        value={value as string | null | undefined}
        defaultValue={defaultValue as string | undefined}
        {...(field.defaultToken ? { defaultToken: field.defaultToken } : {})}
        disabled={disabled || !onChange}
        mode={resolveInspectorColorMode(field.mode)}
        placement="left"
        labels={colorPickerLabels}
        onChange={(nextValue) => onChange?.({ [field.key]: nextValue || undefined })}
      />,
    );
  }

  if (field.type === "background") {
    const usesSelfStorage = field.storage === "self";
    const currentValue = (usesSelfStorage ? config : value) as PhiCmsBackgroundWidgetConfig | null | undefined;
    const currentDefaultValue = (usesSelfStorage ? defaultConfig : defaultValue) as PhiCmsBackgroundWidgetConfig | null | undefined;

    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiBackgroundControl
        mode="control"
        disabled={disabled || !onChange}
        value={currentValue ?? null}
        config={currentDefaultValue ?? null}
        labels={backgroundLabels}
        colorPickerLabels={colorPickerLabels}
        colorPickerPlacement="left"
        onChange={(nextValue) =>
          usesSelfStorage
            ? onChange?.(nextValue as Record<string, unknown>)
            : onChange?.({ [field.key]: nextValue })
        }
      />,
    );
  }

  if (field.type === "border") {
    const usesSelfStorage = field.storage === "self";
    const currentValue = normalizeInspectorBorderValue(usesSelfStorage ? config : value);
    const currentDefaultValue = normalizeInspectorBorderValue(usesSelfStorage ? defaultConfig : defaultValue);

    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiBorderControl
        mode="control"
        disabled={disabled || !onChange}
        value={currentValue}
        config={currentDefaultValue}
        labels={borderLabels}
        colorPickerLabels={colorPickerLabels}
        colorPickerPlacement="left"
        onChange={(nextValue) =>
          usesSelfStorage
            ? onChange?.(nextValue as Record<string, unknown>)
            : onChange?.({ [field.key]: nextValue })
        }
      />,
    );
  }

  if (field.type === "shadow") {
    const currentValue = readPhiShadow(value) ?? readPhiShadow(defaultValue) ?? null;

    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiShadowControl
        mode="control"
        disabled={disabled || !onChange}
        value={currentValue}
        onChange={(nextValue) => onChange?.({ [field.key]: nextValue })}
      />,
    );
  }

  if (field.type === "icon") {
    const iconValue =
      typeof value === "string"
        ? value
        : typeof defaultValue === "string"
          ? defaultValue
          : null;

    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiWidgetIconPickerButton
        labels={iconPickerLabels}
        value={iconValue}
        disabled={disabled || !onChange}
        buttonBlock
        buttonType="default"
        buttonSize="medium"
        buttonIcon={iconValue ? <PhiIcon name={iconValue} /> : undefined}
        buttonLabel={iconValue ?? field.label}
        buttonAriaLabel={field.label}
        /* Beside the field, toward the canvas, as the colour picker opens: below, it covers the fields under it. */
        placement="left"
        onChange={(nextValue) => onChange?.({ [field.key]: nextValue ?? undefined })}
      />,
    );
  }

  if (field.type === "string" || field.type === "url") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiTextControl
        value={
          typeof value === "string" || typeof value === "number"
            ? String(value)
            : typeof defaultValue === "string" || typeof defaultValue === "number"
              ? String(defaultValue)
              : ""
        }
        disabled={disabled || !onChange}
        inputType={field.type === "url" ? "url" : "text"}
        style={{ width: "100%" }}
        onChange={(nextValue) => onChange?.({
          [field.key]: nextValue || ("emptyValue" in field ? field.emptyValue : undefined),
        })}
      />,
    );
  }

  /*
   * A block rather than a row: the control is a choice plus whichever answer that choice asks for, and
   * squeezing three stacked parts into the label column's other half leaves none of them usable.
   */
  if (field.type === "image") {
    return renderPhiInspectorConfigFieldBlock(
      field,
      <PhiInspectorImageFieldControl
        config={config}
        blockId={blockId}
        disabled={disabled}
        {...(onChange ? { onChange } : {})}
      />,
    );
  }

  if (field.type === "link-target") {
    return renderPhiInspectorConfigFieldBlock(
      field,
      <PhiInspectorLinkTargetFieldControl
        value={value ?? defaultValue}
        disabled={disabled || !onChange}
        {...(linkTargetLabels ? { labels: linkTargetLabels } : {})}
        onChange={(next) => onChange?.({ [field.key]: next })}
      />,
    );
  }

  if (field.type === "number-list") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiInspectorNumberListField
        value={Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : []}
        min={field.min}
        disabled={disabled || !onChange}
        onChange={(next) => onChange?.({ [field.key]: next.length > 0 ? next : undefined })}
      />,
    );
  }

  if (field.type === "number") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiNumberControl
        value={typeof value === "number" ? value : typeof defaultValue === "number" ? defaultValue : null}
        min={field.min}
        max={field.max}
        step={field.step}
        precision={field.precision}
        prefix={field.prefix}
        disabled={disabled || !onChange}
        style={{ width: "100%" }}
        onChange={(nextValue) =>
          onChange?.({
            [field.key]: typeof nextValue === "number" && Number.isFinite(nextValue)
              ? nextValue
              : undefined,
          })
        }
      />,
    );
  }

  return null;
}
