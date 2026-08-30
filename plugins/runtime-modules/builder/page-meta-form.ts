import type { PhiFormDescriptor } from "../../../types/form-descriptor";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { PHI_BUILDER_EFFECTS_SECTIONS } from "./effects-form-values";
import type { PhiFormLabelSetLoader } from "../../../components/forms/form-resolution";

export const PHI_BUILDER_PAGE_META_FORM_ID = createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/page-meta");
const PHI_BUILDER_PAGE_META_FORM_LABEL_SET_KEY = "@phis/ui/modules/builder/labels/page-meta" as const;
export const PHI_BUILDER_EFFECTS_FORM_IDS = {
  appearance: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/effects/appearance"),
  transitions: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/effects/transitions"),
  viewport: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/effects/viewport"),
} as const;
const literal = (value: string) => ({ kind: "literal", value } as const);
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const option = (value: string, label = value) => ({ value, label: literal(label) });

const transitionTypeOptions = ["fade", "slide", "flip", "rotate", "scale"].map((value) => option(value));
const transitionModeOptions = ["in", "out"].map((value) => option(value));
const transitionTriggerOptions = [
  option("on_mount", "On mount"),
  option("on_visible", "On visible"),
  option("on_hover", "On hover"),
  option("on_focus", "On focus"),
  option("manual", "Manual"),
];
const transitionDirectionOptions = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"].map((value) => option(value));
const transitionAxisOptions = ["x", "y", "z"].map((value) => option(value));
const transitionOriginOptions = ["top left", "top center", "top right", "center left", "center", "center right", "bottom left", "bottom center", "bottom right"].map((value) => option(value));
const easingOptions = ["linear", "ease", "ease-in", "ease-out", "ease-in-out"].map((value) => option(value));
const viewportPropertyOptions = ["translate", "opacity", "rotate", "scale"].map((value) => option(value));
const viewportAxisOptions = ["x", "y"].map((value) => option(value));
const viewportUnitOptions = [option("px"), option("%"), option("deg"), option("unitless", "none")];
const viewportRangeOptions = ["enter", "center", "exit"].map((value) => option(value));
const formEquals = (valuePath: string, value: string) => ({
  source: "form",
  valuePath,
  operator: "equals",
  value,
} as const);
const formAny = (valuePath: string, values: readonly string[]) => ({
  match: "any",
  conditions: values.map((value) => formEquals(valuePath, value)),
} as const);

const formLayout = {
  columns: { compact: 1, medium: 2, wide: 2 },
  gap: { compact: "sm", medium: "sm", wide: "sm" },
  labelPlacement: "side",
} as const;

const fullWidthPlacement = {
  cell: {
    compact: { span: 24 },
    medium: { span: 24 },
    wide: { span: 24 },
  },
  label: {
    compact: { span: 24 },
    medium: { span: 24 },
    wide: { span: 24 },
  },
  control: {
    compact: { span: 24 },
    medium: { span: 24 },
    wide: { span: 24 },
  },
} as const;

const compoundEditor = (
  type: "number" | "boolean" | "enum",
  options?: readonly { value: string; label: ReturnType<typeof literal> }[],
  constraints?: Record<string, number>,
) => ({
  type,
  ...(type === "boolean" ? { control: "checkbox" } : {}),
  ...(options ? { options: options.map((entry) => ({ value: entry.value, label: entry.label.value })) } : {}),
  ...(constraints ? { constraints } : {}),
});

const transitionColumns = [
  { key: "type", title: "Type", sizing: { mode: "fixed", width: 112 } },
  { key: "mode", title: "Mode", sizing: { mode: "fixed", width: 88 } },
  { key: "durationMs", title: "Duration", editor: compoundEditor("number", undefined, { min: 0 }), sizing: { mode: "fixed", width: 112 } },
  { key: "delayMs", title: "Delay", editor: compoundEditor("number", undefined, { min: 0 }), sizing: { mode: "fixed", width: 104 } },
  { key: "easing", title: "Easing", editor: compoundEditor("enum", easingOptions), sizing: { mode: "fixed", width: 132 } },
] as const;

const viewportColumns = [
  { key: "property", title: "Property", sizing: { mode: "fixed", width: 128 } },
  { key: "axis", title: "Axis", sizing: { mode: "fixed", width: 80 } },
  { key: "from", title: "From", editor: compoundEditor("number"), sizing: { mode: "fixed", width: 104 } },
  { key: "to", title: "To", editor: compoundEditor("number"), sizing: { mode: "fixed", width: 104 } },
  { key: "unit", title: "Unit", sizing: { mode: "fixed", width: 72 } },
  { key: "easing", title: "Easing", editor: compoundEditor("enum", easingOptions), sizing: { mode: "fixed", width: 132 } },
  { key: "clamp", title: "Clamp", editor: compoundEditor("boolean"), sizing: { mode: "fixed", width: 88 } },
] as const;

const effectsDescriptors = {
  appearance: {
    schemaVersion: 1,
    key: PHI_BUILDER_EFFECTS_FORM_IDS.appearance,
    fields: [{
      key: "transparency",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.slider,
      label: literal("Amount"),
      initialValue: 0,
      config: { min: 0, max: 100, step: 1, precision: 0, tooltipSuffix: "%", showInput: true },
      placement: fullWidthPlacement,
    }],
    layout: formLayout,
  },
  transitions: {
    schemaVersion: 1,
    key: PHI_BUILDER_EFFECTS_FORM_IDS.transitions,
    fields: [
      {
        key: "transitionTrigger",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Trigger"),
        initialValue: "on_mount",
        options: transitionTriggerOptions,
      },
      {
        key: "transitionOnce",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
        label: literal("Once"),
        initialValue: true,
      },
      {
        key: "transitionType",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Type"),
        initialValue: "fade",
        options: transitionTypeOptions,
      },
      {
        key: "transitionMode",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Mode"),
        initialValue: "in",
        options: transitionModeOptions,
      },
      {
        key: "transitionDirection",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Direction"),
        initialValue: "bottom",
        options: transitionDirectionOptions,
        visibleWhen: formEquals("transitionType", "slide"),
      },
      {
        key: "transitionDistance",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("Distance"),
        initialValue: 200,
        config: { min: 0 },
        visibleWhen: formEquals("transitionType", "slide"),
      },
      {
        key: "transitionAxis",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Axis"),
        initialValue: "z",
        options: transitionAxisOptions,
        visibleWhen: formAny("transitionType", ["flip", "rotate"]),
      },
      {
        key: "transitionAngleDeg",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("Angle"),
        initialValue: 90,
        visibleWhen: formAny("transitionType", ["flip", "rotate"]),
      },
      {
        key: "transitionScale",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("Scale"),
        initialValue: 0.96,
        config: { min: 0, max: 10, step: 0.01, precision: 2 },
        visibleWhen: formEquals("transitionType", "scale"),
      },
      {
        key: "transitionOrigin",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Origin"),
        initialValue: "center",
        options: transitionOriginOptions,
        visibleWhen: formAny("transitionType", ["flip", "rotate", "scale"]),
      },
      {
        key: "transitionPerspectivePx",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("Perspective"),
        initialValue: 800,
        config: { min: 0 },
        visibleWhen: formAny("transitionType", ["flip", "rotate"]),
      },
      {
        key: "transitionDurationMs",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("Duration (ms)"),
        initialValue: 1000,
        config: { min: 0, max: 10000, precision: 0 },
      },
      {
        key: "transitionDelayMs",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("Delay (ms)"),
        initialValue: 0,
        config: { min: 0, max: 10000, precision: 0 },
      },
      {
        key: "transitionEasing",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Easing"),
        initialValue: "ease-out",
        options: easingOptions,
      },
      {
        key: "transitions",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.table,
        label: literal("Transitions"),
        description: literal("Ordered transition steps applied by the selected trigger."),
        initialValue: [],
        placement: fullWidthPlacement,
        config: {
          rowIdentityPath: "__rowKey",
          columns: transitionColumns,
          add: {
            enabled: true,
            label: "Add",
            defaultRow: {
              type: "fade",
              mode: "in",
              axis: "z",
              direction: "bottom",
              distance: 200,
              angleDeg: 90,
              scale: 0.96,
              origin: "center",
              perspectivePx: 800,
              durationMs: 1000,
              delayMs: 0,
              easing: "ease-out",
            },
            sourceFields: {
              type: "transitionType",
              mode: "transitionMode",
              axis: "transitionAxis",
              direction: "transitionDirection",
              distance: "transitionDistance",
              angleDeg: "transitionAngleDeg",
              scale: "transitionScale",
              origin: "transitionOrigin",
              perspectivePx: "transitionPerspectivePx",
              durationMs: "transitionDurationMs",
              delayMs: "transitionDelayMs",
              easing: "transitionEasing",
            },
            resetFields: {
              transitionType: "fade",
              transitionMode: "in",
              transitionAxis: "z",
              transitionDirection: "bottom",
              transitionDistance: 200,
              transitionAngleDeg: 90,
              transitionScale: 0.96,
              transitionOrigin: "center",
              transitionPerspectivePx: 800,
              transitionDurationMs: 1000,
              transitionDelayMs: 0,
              transitionEasing: "ease-out",
            },
          },
          remove: { enabled: true, label: "Remove transition" },
          reorder: true,
          bordered: true,
          emptyText: "No transitions configured.",
          layout: { mode: "auto", overflowX: "auto" },
        },
      },
    ],
    layout: formLayout,
  },
  viewport: {
    schemaVersion: 1,
    key: PHI_BUILDER_EFFECTS_FORM_IDS.viewport,
    fields: [
      {
        key: "viewportProperty",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Property"),
        initialValue: "translate",
        options: viewportPropertyOptions,
      },
      {
        key: "viewportAxis",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Axis"),
        initialValue: "y",
        options: viewportAxisOptions,
      },
      {
        key: "viewportFrom",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("From"),
        initialValue: 0,
      },
      {
        key: "viewportTo",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: literal("To"),
        initialValue: 200,
      },
      {
        key: "viewportUnit",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Unit"),
        initialValue: "px",
        options: viewportUnitOptions,
      },
      {
        key: "viewportRangeStart",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Range start"),
        initialValue: "enter",
        options: viewportRangeOptions,
      },
      {
        key: "viewportRangeEnd",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Range end"),
        initialValue: "exit",
        options: viewportRangeOptions,
      },
      {
        key: "viewportEasing",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: literal("Easing"),
        initialValue: "linear",
        options: easingOptions,
      },
      {
        key: "viewportClamp",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
        label: literal("Clamp"),
        initialValue: true,
      },
      {
        key: "viewportEffects",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.table,
        label: literal("Viewport effects"),
        description: literal("Effects driven by the element position within the viewport."),
        initialValue: [],
        placement: fullWidthPlacement,
        config: {
          rowIdentityPath: "__rowKey",
          columns: viewportColumns,
          add: {
            enabled: true,
            label: "Add",
            defaultRow: {
              property: "translate",
              axis: "y",
              from: 0,
              to: 200,
              unit: "px",
              rangeStart: "enter",
              rangeEnd: "exit",
              easing: "linear",
              clamp: true,
            },
            sourceFields: {
              property: "viewportProperty",
              axis: "viewportAxis",
              from: "viewportFrom",
              to: "viewportTo",
              unit: "viewportUnit",
              rangeStart: "viewportRangeStart",
              rangeEnd: "viewportRangeEnd",
              easing: "viewportEasing",
              clamp: "viewportClamp",
            },
            resetFields: {
              viewportProperty: "translate",
              viewportAxis: "y",
              viewportFrom: 0,
              viewportTo: 200,
              viewportUnit: "px",
              viewportRangeStart: "enter",
              viewportRangeEnd: "exit",
              viewportEasing: "linear",
              viewportClamp: true,
            },
          },
          remove: { enabled: true, label: "Remove viewport effect" },
          reorder: true,
          bordered: true,
          emptyText: "No viewport effects configured.",
          layout: { mode: "auto", overflowX: "auto" },
        },
      },
    ],
    layout: formLayout,
  },
} as const satisfies Record<(typeof PHI_BUILDER_EFFECTS_SECTIONS)[number], PhiFormDescriptor>;

const descriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_BUILDER_PAGE_META_FORM_ID,
  labelSetKey: PHI_BUILDER_PAGE_META_FORM_LABEL_SET_KEY,
  fields: [
    {
      key: "title",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("fields.title.label", "Title"),
      validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: label("fields.title.required", "Title is required.") }],
      config: { maxLength: 160 },
    },
    {
      key: "path",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("fields.path.label", "Path"),
      validation: [{ providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: label("fields.path.required", "Path is required.") }],
      description: label("fields.path.description", "Module-owned Page paths are read-only."),
      disabledWhen: { source: "form", valuePath: "pathLocked", operator: "equals", value: "true" },
      config: { maxLength: 512 },
    },
    {
      key: "pathLocked",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
      initialValue: "false",
    },
    {
      key: "description",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.textarea,
      label: label("fields.description.label", "Description"),
      config: { rows: 4, maxLength: 500 },
    },
  ],
};

const loadPhiBuilderPageMetaFormLabels: PhiFormLabelSetLoader = async ({ runtime }) => {
  const { getPhiBuilderChromeWidgetLabels } = await import("../../../components/widgets/label-sets/builder-chrome");
  const labels = await getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  return {
    "fields.title.label": labels.pages.form.title,
    "fields.title.required": labels.pages.form.titleRequired,
    "fields.path.label": labels.pages.form.path,
    "fields.path.required": labels.pages.form.pathRequired,
    "fields.path.description": "Module-owned Page paths are read-only.",
    "fields.description.label": labels.pages.form.description,
  };
};

export const PHI_BUILDER_PAGE_META_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  formId: PHI_BUILDER_PAGE_META_FORM_ID,
  version: 1,
  flags: 0,
  title: "Builder page metadata",
  description: "Create or edit Builder page metadata.",
  category: "forms",
  tags: ["builder", "page"],
  descriptor,
  loadLabels: loadPhiBuilderPageMetaFormLabels,
  submitHandlerKey: null,
  confirmHandlerKey: null,
  previewHandlerKey: null,
  defaultConfig: {},
  variant: "default",
  config: {},
  previewUpstreamPath: null,
});

export const PHI_BUILDER_EFFECTS_FORMS = PHI_BUILDER_EFFECTS_SECTIONS.map(
  (section) => definePhiRuntimeModuleForm({
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    formId: PHI_BUILDER_EFFECTS_FORM_IDS[section],
    version: 1,
    flags: 0,
    title: `Builder effects ${section}`,
    description: `Edit the ${section} section of one renderable block effects transaction.`,
    category: "forms",
    tags: ["builder", "effects", section],
    descriptor: effectsDescriptors[section],
    submitHandlerKey: null,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
  }),
);
