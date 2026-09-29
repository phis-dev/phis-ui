import { PHI_MOTION_EASINGS, PHI_SEQUENCE_TRANSITION_STEP_MS } from "../../../helpers/motion";
import {
  PHI_FORM_STACKED_FULL,
  phiFormFlowHalfColumns,
} from "../../../components/forms/form-descriptor-contract";
import type { PhiFormDescriptor } from "../../../types/form-descriptor";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { PHI_BUILDER_EFFECTS_SECTIONS } from "./effects-form-values";
import type { PhiFormLabelSetLoader } from "../../../components/forms/form-resolution";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

export const PHI_BUILDER_PAGE_META_FORM_ID = createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/page-meta");
const PHI_BUILDER_PAGE_META_FORM_LABEL_SET_KEY = "@phis/ui/modules/builder/labels/page-meta" as const;
const PHI_BUILDER_EFFECTS_FORM_LABEL_SET_KEY = "@phis/ui/modules/builder/labels/effects" as const;
export const PHI_BUILDER_EFFECTS_FORM_IDS = {
  appearance: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/effects/appearance"),
  transitions: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/effects/transitions"),
  viewport: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "builder/effects/viewport"),
} as const;
const literal = (value: string) => ({ kind: "literal", value } as const);
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const option = (value: string, label = value) => ({ value, label: literal(label) });
/*
 * An option whose caption comes from the Effects label set, named by the path it has there.
 *
 * `flattenPhiFormLabels` flattens that set to exactly these dotted paths, so the key here and the
 * property there are one lookup. The fallback is the set's own English, written out the way every other
 * descriptor in this house writes one.
 */
const labelledOption = <TValue extends string>(value: TValue, key: string, fallback: string) => (
  { value, label: label(key, fallback) }
);
/*
 * The plain string a compound editor needs for the same option.
 *
 * A table cell's enum editor takes its captions as strings in `config`, not as text descriptors, so it
 * cannot be translated the way a field label is -- it gets the fallback. See `compoundEditor` below.
 */
const optionText = (entry: { label: ReturnType<typeof literal> | ReturnType<typeof label> }) =>
  entry.label.kind === "literal" ? entry.label.value : entry.label.fallback;

const transitionTypeOptions = [
  labelledOption("fade", "transitions.fade", "Fade"),
  labelledOption("slide", "transitions.slide", "Slide"),
  labelledOption("flip", "transitions.flip", "Flip"),
  labelledOption("rotate", "transitions.rotate", "Rotate"),
  labelledOption("scale", "transitions.scale", "Scale"),
];
const transitionModeOptions = [
  labelledOption("in", "transitions.in", "In"),
  labelledOption("out", "transitions.out", "Out"),
];
const transitionTriggerOptions = [
  labelledOption("on_mount", "transitions.onMount", "On mount"),
  labelledOption("on_ready", "transitions.onReady", "On ready"),
  labelledOption("on_visible", "transitions.onVisible", "On visible"),
  labelledOption("on_hover", "transitions.onHover", "On hover"),
  labelledOption("on_focus", "transitions.onFocus", "On focus"),
  labelledOption("manual", "transitions.manual", "Manual"),
];
const transitionDirectionOptions = [
  labelledOption("top", "directions.top", "Top"),
  labelledOption("top-right", "directions.topRight", "Top right"),
  labelledOption("right", "directions.right", "Right"),
  labelledOption("bottom-right", "directions.bottomRight", "Bottom right"),
  labelledOption("bottom", "directions.bottom", "Bottom"),
  labelledOption("bottom-left", "directions.bottomLeft", "Bottom left"),
  labelledOption("left", "directions.left", "Left"),
  labelledOption("top-left", "directions.topLeft", "Top left"),
];
/* An axis is named x, y and z in every language, so these three stay the letters they are. */
const transitionAxisOptions = ["x", "y", "z"].map((value) => option(value));
const transitionOriginOptions = [
  labelledOption("top left", "origins.topLeft", "Top left"),
  labelledOption("top center", "origins.topCenter", "Top center"),
  labelledOption("top right", "origins.topRight", "Top right"),
  labelledOption("center left", "origins.centerLeft", "Center left"),
  labelledOption("center", "origins.center", "Center"),
  labelledOption("center right", "origins.centerRight", "Center right"),
  labelledOption("bottom left", "origins.bottomLeft", "Bottom left"),
  labelledOption("bottom center", "origins.bottomCenter", "Bottom center"),
  labelledOption("bottom right", "origins.bottomRight", "Bottom right"),
];
const easingOptions = [
  labelledOption("linear", "easing.linear", "Linear"),
  labelledOption("ease", "easing.ease", "Ease"),
  labelledOption("ease-in", "easing.easeIn", "Ease in"),
  labelledOption("ease-out", "easing.easeOut", "Ease out"),
  labelledOption("ease-in-out", "easing.easeInOut", "Ease in out"),
] satisfies readonly { value: (typeof PHI_MOTION_EASINGS)[number] }[];
const viewportPropertyOptions = [
  labelledOption("translate", "viewport.translate", "Translate"),
  labelledOption("opacity", "viewport.opacity", "Opacity"),
  labelledOption("rotate", "viewport.rotate", "Rotate"),
  labelledOption("scale", "viewport.scale", "Scale"),
];
const viewportAxisOptions = [
  labelledOption("x", "viewport.x", "X"),
  labelledOption("y", "viewport.y", "Y"),
];
/* px, % and deg are the units themselves; only "no unit" is a word. */
const viewportUnitOptions = [
  option("px"),
  option("%"),
  option("deg"),
  labelledOption("unitless", "viewport.unitNone", "none"),
];
const viewportRangeOptions = [
  labelledOption("enter", "viewport.enter", "Enter"),
  labelledOption("center", "viewport.center", "Center"),
  labelledOption("exit", "viewport.exit", "Exit"),
];
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

const fullWidthPlacement = PHI_FORM_STACKED_FULL;

const compoundEditor = (
  type: "number" | "boolean" | "enum",
  options?: readonly { value: string; label: ReturnType<typeof literal> | ReturnType<typeof label> }[],
  constraints?: Record<string, number>,
) => ({
  type,
  ...(type === "boolean" ? { control: "checkbox" } : {}),
  ...(options ? { options: options.map((entry) => ({ value: entry.value, label: optionText(entry) })) } : {}),
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
    labelSetKey: PHI_BUILDER_EFFECTS_FORM_LABEL_SET_KEY,
    fields: phiFormFlowHalfColumns([{
      key: "transparency",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.slider,
      label: label("fields.amount", "Amount"),
      initialValue: 0,
      config: { min: 0, max: 100, step: 1, precision: 0, tooltipSuffix: "%", showInput: true },
      placement: fullWidthPlacement,
    }]),
  },
  transitions: {
    schemaVersion: 1,
    key: PHI_BUILDER_EFFECTS_FORM_IDS.transitions,
    labelSetKey: PHI_BUILDER_EFFECTS_FORM_LABEL_SET_KEY,
    fields: phiFormFlowHalfColumns([
      {
        key: "transitionTrigger",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.trigger", "Trigger"),
        initialValue: "on_mount",
        options: transitionTriggerOptions,
      },
      {
        key: "transitionOnce",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
        label: label("fields.once", "Once"),
        initialValue: true,
      },
      {
        key: "transitionType",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.type", "Type"),
        initialValue: "fade",
        options: transitionTypeOptions,
      },
      {
        key: "transitionMode",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.mode", "Mode"),
        initialValue: "in",
        options: transitionModeOptions,
      },
      {
        key: "transitionDirection",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.direction", "Direction"),
        initialValue: "bottom",
        options: transitionDirectionOptions,
        visibleWhen: formEquals("transitionType", "slide"),
      },
      {
        key: "transitionDistance",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.distance", "Distance"),
        initialValue: 200,
        config: { min: 0 },
        visibleWhen: formEquals("transitionType", "slide"),
      },
      {
        key: "transitionAxis",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.axis", "Axis"),
        initialValue: "z",
        options: transitionAxisOptions,
        visibleWhen: formAny("transitionType", ["flip", "rotate"]),
      },
      {
        key: "transitionAngleDeg",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.angle", "Angle"),
        initialValue: 90,
        visibleWhen: formAny("transitionType", ["flip", "rotate"]),
      },
      {
        key: "transitionScale",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.scale", "Scale"),
        initialValue: 0.96,
        config: { min: 0, max: 10, step: 0.01, precision: 2 },
        visibleWhen: formEquals("transitionType", "scale"),
      },
      {
        key: "transitionOrigin",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.origin", "Origin"),
        initialValue: "center",
        options: transitionOriginOptions,
        visibleWhen: formAny("transitionType", ["flip", "rotate", "scale"]),
      },
      {
        key: "transitionPerspectivePx",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.perspective", "Perspective"),
        initialValue: 800,
        config: { min: 0 },
        visibleWhen: formAny("transitionType", ["flip", "rotate"]),
      },
      {
        key: "transitionDurationMs",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.duration", "Duration"),
        initialValue: 1000,
        config: { min: 0, max: 10000, precision: 0, step: PHI_SEQUENCE_TRANSITION_STEP_MS, prefix: "ms" },
      },
      {
        key: "transitionDelayMs",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.delay", "Delay"),
        initialValue: 0,
        config: { min: 0, max: 10000, precision: 0, step: PHI_SEQUENCE_TRANSITION_STEP_MS, prefix: "ms" },
      },
      {
        key: "transitionEasing",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.easing", "Easing"),
        initialValue: "ease-out",
        options: easingOptions,
      },
      {
        key: "transitions",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.table,
        label: label("sections.transitions", "Transitions"),
        description: label("descriptions.transitions", "Ordered transition steps applied by the selected trigger."),
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
    ]),
  },
  viewport: {
    schemaVersion: 1,
    key: PHI_BUILDER_EFFECTS_FORM_IDS.viewport,
    labelSetKey: PHI_BUILDER_EFFECTS_FORM_LABEL_SET_KEY,
    fields: phiFormFlowHalfColumns([
      {
        key: "viewportProperty",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.property", "Property"),
        initialValue: "translate",
        options: viewportPropertyOptions,
      },
      {
        key: "viewportAxis",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.axis", "Axis"),
        initialValue: "y",
        options: viewportAxisOptions,
      },
      {
        key: "viewportFrom",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.from", "From"),
        initialValue: 0,
      },
      {
        key: "viewportTo",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
        label: label("fields.to", "To"),
        initialValue: 200,
      },
      {
        key: "viewportUnit",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.unit", "Unit"),
        initialValue: "px",
        options: viewportUnitOptions,
      },
      {
        key: "viewportRangeStart",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.rangeStart", "Range start"),
        initialValue: "enter",
        options: viewportRangeOptions,
      },
      {
        key: "viewportRangeEnd",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.rangeEnd", "Range end"),
        initialValue: "exit",
        options: viewportRangeOptions,
      },
      {
        key: "viewportEasing",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
        label: label("fields.easing", "Easing"),
        initialValue: "linear",
        options: easingOptions,
      },
      {
        key: "viewportClamp",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
        label: label("fields.clamp", "Clamp"),
        initialValue: true,
      },
      {
        key: "viewportEffects",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.table,
        label: label("sections.viewportEffects", "Viewport Effects"),
        description: label("descriptions.viewportEffects", "Effects driven by the element position within the viewport."),
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
    ]),
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
    /*
     * Whether this Page may be found, asked of every Page rather than only the ones a Module shipped.
     *
     * It is disabled rather than hidden outside Public, the way the path field already is: the answer
     * is still true there -- an authenticated Area is never indexed -- and a field that vanishes reads
     * as a question nobody thought to ask.
     */
    {
      key: "index",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      label: label("fields.index.label", "Allow indexing"),
      description: label(
        "fields.index.description",
        "Only Public pages can be indexed, and only while the Area allows it.",
      ),
      disabledWhen: { source: "form", valuePath: "indexLocked", operator: "equals", value: "true" },
    },
    {
      key: "indexLocked",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
      initialValue: "false",
    },
  ],
};

const loadPhiBuilderPageMetaFormLabels: PhiFormLabelSetLoader = async ({ runtime }) => {
  const { getPhiBuilderChromeWidgetLabels } = await import("../../../components/widgets/label-sets/builder-chrome");
  const labels = await getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  return {
    "fields.title.label": labels.pages.form.title,
    "fields.title.required": labels.pages.form.titleRequired,
    "fields.path.label": labels.pages.form.path,
    "fields.path.required": labels.pages.form.pathRequired,
    "fields.path.description": "Module-owned Page paths are read-only.",
    "fields.description.label": labels.pages.form.description,
    "fields.index.label": labels.pages.form.index,
    "fields.index.description": labels.pages.form.indexDescription,
  };
};

export const PHI_BUILDER_PAGE_META_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  areas: ["builder"],
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
});

/*
 * The Effects Widget's label set, flattened to the paths its descriptors name.
 *
 * The set existed all along -- it is what the Widget's own tool button and the Builder scaffold read --
 * and only the three Forms in the Effects Modal had never been hooked to it, so every caption in them
 * was the English written into the descriptor. Imported here rather than at the top of the file because
 * the set is `server-only` and this file is reached from the client too.
 */
const loadPhiBuilderEffectsFormLabels: PhiFormLabelSetLoader = async ({ runtime }) => {
  const [{ flattenPhiFormLabels }, { getPhiEffectsWidgetLabels }] = await Promise.all([
    import("../../../components/forms/form-labels"),
    import("../../../components/widgets/label-sets/effects"),
  ]);
  return flattenPhiFormLabels(await getPhiEffectsWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  }));
};

export const PHI_BUILDER_EFFECTS_FORMS = PHI_BUILDER_EFFECTS_SECTIONS.map(
  (section) => definePhiRuntimeModuleForm({
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    areas: ["builder"],
    formId: PHI_BUILDER_EFFECTS_FORM_IDS[section],
    version: 1,
    flags: 0,
    title: `Builder effects ${section}`,
    description: `Edit the ${section} section of one renderable block effects transaction.`,
    category: "forms",
    tags: ["builder", "effects", section],
    descriptor: effectsDescriptors[section],
    loadLabels: loadPhiBuilderEffectsFormLabels,
    submitHandlerKey: null,
  }),
);
