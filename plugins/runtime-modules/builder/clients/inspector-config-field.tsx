"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Flex, Typography, theme } from "antd";

import type {
  PhiCmsConfigField,
  PhiRuntimeModuleDataProviderDescriptor,
} from "../../../../types/cms-plugins";
import type { PhiCalendarAdapterDescriptor } from "../../../../types/calendar";
import { readPhiLengthValue, type PhiRenderableBlockSize } from "../../../../types";
import {
  normalizePhiPaddingWidgetConfig,
  type PhiCmsBorderWidgetConfig,
  type PhiCmsPaddingWidgetConfig,
} from "../../../../types/cms-config";
import { PhiBackgroundControl } from "../../../../components/controls/phi-background-control";
import { PhiBorderControl } from "../../../../components/controls/phi-border-control";
import { PhiColorWidget } from "../../../../components/widgets/client/phi-color-widget";
import type { PhiColorPickerLabels } from "../../../../components/widgets/label-types/color-picker";
import { PhiBoundRadiusControl } from "../../../../components/controls/phi-bound-radius-control";
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
import { PhiIcon } from "../../../../components/shell/phi-icon";
import { PhiPaddingControl } from "../../../../components/controls/phi-padding-control";
import type { PhiPaddingWidgetLabels } from "../../../../components/widgets/label-types/padding";
import type { PhiBackgroundWidgetLabels } from "../../../../components/widgets/label-types/background";
import type { PhiBorderWidgetLabels } from "../../../../components/widgets/label-types/border";
import { PhiInspectorFieldRow } from "../../../../components/widgets/inspector-field-row";
import { PhiShadowControl } from "../../../../components/controls/phi-shadow-control";
import { readPhiShadow } from "../../../../types/layout-style";
import {
  readInspectorChoiceMultiValue,
  readInspectorChoiceSingleValue,
} from "./inspector-choice-values";

export type PhiInspectorWidgetReferenceOption = {
  value: string;
  label: string;
  widgetType: string;
};

type PhiInspectorChoiceField = Extract<PhiCmsConfigField, { type: "choice" }>;
type PhiInspectorCollectionField = Extract<PhiCmsConfigField, { type: "collection" }>;
const PHI_STATIC_OPTIONS_PROVIDER_VALUE = "__phi_static_options__";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function renderPhiInspectorSettingsRow(label: string, control: ReactNode, key?: string) {
  return (
    <PhiInspectorFieldRow key={key} label={label}>{control}</PhiInspectorFieldRow>
  );
}

function renderPhiInspectorSettingsBlock(label: string, control: ReactNode, key?: string) {
  return (
    <Flex key={key} vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
      <Typography.Text>{label}</Typography.Text>
      {control}
    </Flex>
  );
}

function renderPhiInspectorConfigFieldControl(field: PhiCmsConfigField, control: ReactNode) {
  const resolvedControl = field.description ? (
    <Flex vertical gap={2} style={{ minWidth: 0, width: "100%" }}>
      {control}
      <Typography.Text type="secondary">{field.description}</Typography.Text>
    </Flex>
  ) : control;

  return renderPhiInspectorSettingsRow(
    field.required ? `${field.label} *` : field.label,
    resolvedControl,
    field.key,
  );
}

function renderPhiInspectorConfigFieldBlock(field: PhiCmsConfigField, control: ReactNode) {
  return renderPhiInspectorSettingsBlock(
    field.required ? `${field.label} *` : field.label,
    field.description ? (
      <Flex vertical gap={2} style={{ minWidth: 0, width: "100%" }}>
        <Typography.Text type="secondary">{field.description}</Typography.Text>
        {control}
      </Flex>
    ) : control,
    field.key,
  );
}

export function isPhiInspectorConfigFieldVisible(field: PhiCmsConfigField, config: Record<string, unknown>) {
  if (field.editorPlacement === "toolbar" || field.editorPlacement === "geometry") {
    return false;
  }

  const rule = field.visibleWhen;
  if (!rule) {
    return true;
  }

  const value = readPhiInspectorConfigPathValue(config, rule.field) ?? null;
  if ("equals" in rule && value !== rule.equals) {
    return false;
  }
  if ("notEquals" in rule && value === rule.notEquals) {
    return false;
  }

  return true;
}

export function readPhiInspectorConfigPathValue(
  config: Record<string, unknown> | null | undefined,
  path: string,
): unknown {
  return path.split(".").filter(Boolean).reduce<unknown>((current, segment) =>
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)[segment]
      : undefined, config);
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
  const next = { ...config };
  let target = next;
  for (const segment of segments.slice(0, -1)) {
    const current = target[segment];
    const child = current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};
    target[segment] = child;
    target = child;
  }
  target[segments[segments.length - 1]!] = value;
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

  if (!value || typeof value !== "object" || Array.isArray(value)) {
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as PhiCmsBorderWidgetConfig;
}

function readPhiInspectorCollectionItems(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item))
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
    <Flex vertical gap={4} style={{ minWidth: 0, width: "100%" }}>
      {control}
      {providerResult.warning ? (
        <Typography.Text type="warning">{providerResult.warning}</Typography.Text>
      ) : null}
    </Flex>,
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
      onChange={(nextValue) =>
        onChange?.({
          [field.key]: field.presentation === "autocomplete" || field.allowCustom
            ? nextValue.trim().length > 0 ? nextValue : field.emptyValue
            : emptyOptionValue != null && nextValue === emptyOptionValue
              ? field.emptyValue
              : nextValue,
          ...(field.patchOnChange ?? {}),
        })
      }
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
  dataProviderDescriptors,
  calendarAdapterDescriptors,
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
  dataProviderDescriptors: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors: readonly PhiCalendarAdapterDescriptor[];
  onChange?: (next: Record<string, unknown>) => void;
}) {
  const { token } = theme.useToken();
  const configuredItems = readPhiInspectorCollectionItems(value);
  const defaultItems = readPhiInspectorCollectionItems(defaultValue);
  const items = value == null ? defaultItems : configuredItems;
  const minItems = Math.max(0, field.minItems ?? 0);
  const maxItems = field.maxItems == null ? Number.POSITIVE_INFINITY : Math.max(minItems, field.maxItems);

  const publish = (nextItems: readonly Record<string, unknown>[]) => {
    onChange?.({ [field.key]: nextItems });
  };

  return renderPhiInspectorConfigFieldBlock(
    field,
    <Flex vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
      {items.length === 0 ? (
        <Typography.Text type="secondary">{field.emptyLabel ?? "No items"}</Typography.Text>
      ) : null}
      {items.map((item, index) => {
        const itemIdentity = item[field.itemKeyField];
        const itemLabelValue = item[field.itemLabelField ?? field.itemKeyField];
        const itemLabel = typeof itemLabelValue === "string" && itemLabelValue.trim()
          ? itemLabelValue
          : `${field.label} ${index + 1}`;
        const defaultItem = defaultItems[index] ?? field.defaultItem ?? {};

        return (
          <Flex
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
            <Flex align="center" justify="space-between" gap={4} style={{ width: "100%" }}>
              <Typography.Text strong ellipsis style={{ minWidth: 0 }} title={itemLabel}>
                {itemLabel}
              </Typography.Text>
              <Flex align="center" gap={2}>
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
                  icon={<PhiIcon name="trash" />}
                  type="text"
                  danger
                  disabled={disabled || items.length <= minItems}
                  onClick={() => publish(items.filter((_, itemIndex) => itemIndex !== index))}
                />
              </Flex>
            </Flex>
            <Flex vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
              {field.itemFields
                .filter((itemField) => isPhiInspectorConfigFieldVisible(itemField, item))
                .map((itemField) => renderPhiInspectorConfigField({
                  field: itemField,
                  value: readPhiInspectorConfigPathValue(item, itemField.key),
                  defaultValue: readPhiInspectorConfigPathValue(defaultItem, itemField.key),
                  config: item,
                  defaultConfig: defaultItem,
                  disabled,
                  widgetReferenceOptions,
                  paddingLabels,
                  backgroundLabels,
                  borderLabels,
                  colorPickerLabels,
                  dataProviderDescriptors,
                  calendarAdapterDescriptors,
                  onChange: (patch) => {
                    const nextItems = [...items];
                    nextItems[index] = {
                      ...item,
                      ...buildPhiInspectorConfigPathPatch(item, patch),
                    };
                    publish(nextItems);
                  },
                }))}
            </Flex>
          </Flex>
        );
      })}
      <PhiButtonControl
        label={field.addLabel ?? "Add item"}
        icon={<PhiIcon name="plus" />}
        disabled={disabled || items.length >= maxItems}
        onClick={() => publish([...items, createPhiInspectorCollectionItem(field, items)])}
      />
    </Flex>,
  );
}

export function renderPhiInspectorConfigField({
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
  dataProviderDescriptors = [],
  calendarAdapterDescriptors = [],
}: {
  field: PhiCmsConfigField;
  value: unknown;
  defaultValue: unknown;
  config: Record<string, unknown>;
  defaultConfig?: Record<string, unknown> | null;
  disabled: boolean;
  widgetReferenceOptions?: PhiInspectorWidgetReferenceOption[];
  paddingLabels?: PhiPaddingWidgetLabels;
  backgroundLabels?: PhiBackgroundWidgetLabels;
  borderLabels?: PhiBorderWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  dataProviderDescriptors?: readonly PhiRuntimeModuleDataProviderDescriptor[];
  calendarAdapterDescriptors?: readonly PhiCalendarAdapterDescriptor[];
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
    const rawProviderConfig = isRecord(value)
      ? value
      : isRecord(defaultValue)
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
      <Flex vertical gap={8} style={{ width: "100%" }}>
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
                    params: isRecord(rawProviderConfig.params) ? rawProviderConfig.params : undefined,
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
                params: isRecord(rawProviderConfig.params) ? rawProviderConfig.params : undefined,
              },
            })}
          />
        ) : null}
      </Flex>,
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
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiBoundRadiusControl
        value={{
          borderTopLeftRadius: resolveInspectorSizeValue(config[field.topLeftKey]),
          borderTopRightRadius: resolveInspectorSizeValue(config[field.topRightKey]),
          borderBottomLeftRadius: resolveInspectorSizeValue(config[field.bottomLeftKey]),
          borderBottomRightRadius: resolveInspectorSizeValue(config[field.bottomRightKey]),
        }}
        disabled={disabled || !onChange}
        showLabel={false}
        onChange={(nextRadius) =>
          onChange?.({
            [field.topLeftKey]: nextRadius.borderTopLeftRadius,
            [field.topRightKey]: nextRadius.borderTopRightRadius,
            [field.bottomLeftKey]: nextRadius.borderBottomLeftRadius,
            [field.bottomRightKey]: nextRadius.borderBottomRightRadius,
          })
        }
      />,
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
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiSwitchControl
        checked={
          typeof value === "boolean"
            ? value
            : typeof defaultValue === "boolean"
              ? defaultValue
              : false
        }
        disabled={disabled || !onChange}
        onChange={(checked) => onChange?.({ [field.key]: checked })}
      />,
    );
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
        dataProviderDescriptors={dataProviderDescriptors}
        calendarAdapterDescriptors={calendarAdapterDescriptors}
        onChange={onChange}
      />
    );
  }

  if (field.type === "color") {
    return renderPhiInspectorConfigFieldControl(
      field,
      <PhiColorWidget
        value={value as string | null | undefined}
        defaultValue={defaultValue as string | undefined}
        disabled={disabled || !onChange}
        signalsEnabled={false}
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
        value={iconValue}
        disabled={disabled || !onChange}
        buttonBlock
        buttonType="default"
        buttonSize="medium"
        buttonIcon={iconValue ? <PhiIcon name={iconValue} /> : undefined}
        buttonLabel={iconValue ?? field.label}
        buttonAriaLabel={field.label}
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
        onChange={(nextValue) => onChange?.({ [field.key]: nextValue || undefined })}
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
