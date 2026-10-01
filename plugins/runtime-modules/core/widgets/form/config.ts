import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import { requirePhiRuntimeFormControllerForWidget } from "../../../../../components/forms/runtime-form-controller-requirement";
import {
  parsePhiFormWidgetConfig,
  type PhiCmsFormWidgetConfig,
} from "../../../../../components/forms/form-widget-config";
import { PHI_LAYOUT } from "../../../../../theme/phi-tokens";
import { PHI_AUTHORING_OPTION_PROVIDER_KEYS } from "../../../../../constants/authoring-option-provider-keys";

export const PHI_FORM_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("form"),
  typeKey: "form",
  title: "Form",
  category: "form",
  description: "Renders a Preset Form contributed by an active Runtime module.",
  iconFamily: "form",
  slotSizePolicy: "fill-inline",
  requiredRuntimeControllers: requirePhiRuntimeFormControllerForWidget,
  runtimeSignals: {
    emits: [
      /*
       * One announcement for one event: the Form is through, and here is what came back.
       *
       * A receiver that only needs to know that it worked -- an Overlay that closes, a Table that
       * reloads -- reads nothing but the fact that the signal arrived. One that has to act on the
       * answer, because the answer says where to go next or which step follows, finds it in the same
       * message instead of in a second one it would have to correlate with the first.
       */
      {
        id: "submitSuccess",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formResult,
      },
      { id: "submitting", action: "change", valueType: "boolean" },
      {
        id: "submitError",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formError,
      },
      {
        id: "validationFailed",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValidity,
      },
      { id: "resetComplete", action: "activate", valueType: "none" },
      { id: "stateChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formState },
      {
        id: "submitValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      /*
       * The same values, while they are still being chosen rather than once they are meant.
       *
       * `submitValues` is the Form's answer and arrives once; this is the Form thinking aloud, and a
       * receiver takes it to show what a value would look like before anybody commits to it -- the
       * Effects editor draws its transparency on the node in the canvas from here. Nothing is saved on
       * it, which is the point: a value passed through on the way to somewhere else must not be written
       * anywhere that has to be undone.
       */
      {
        id: "valuesChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      {
        id: "resetValues",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
      { id: "command", action: "activate", valueType: "string" },
      { id: "cancel", action: "close", valueType: "none" },
      { id: "conditionStateRequest", action: "reload", valueType: "none" },
    ],
    listens: [
      { id: "submit", channel: "submit", action: "activate", valueType: "none" },
      { id: "reset", channel: "reset", action: "activate", valueType: "none" },
      {
        id: "recordOpen",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tableAction,
      },
      { id: "close", channel: "dialog", action: "close", valueType: "none" },
      { id: "reload", channel: "reload", action: "activate", valueType: "none" },
      { id: "conditionStateChange", channel: "condition", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState },
    ],
  },
  fields: [
    {
      key: "formId",
      type: "choice",
      label: "Form",
      required: true,
      optionsProvider: {
        providerKey: PHI_AUTHORING_OPTION_PROVIDER_KEYS.forms,
      },
    },
    { key: "submit", type: "choice", label: "Submit", options: [
      { value: "inline", label: "Inline" },
      { value: "external", label: "External" },
    ] },
    { key: "submitOnEnter", type: "boolean", label: "Submit On Enter" },
    {
      key: "card.presentation",
      type: "choice",
      label: "Box",
      emptyOption: { value: "", label: "None" },
      emptyValue: null,
      options: [
        { value: "card", label: "Card" },
        { value: "panel", label: "Panel" },
        { value: "wash", label: "Wash" },
      ],
    },
    { key: "card.title", type: "string", label: "Box Heading" },
    { key: "card.padding", type: "number", label: "Box Padding", min: 0, precision: 0, prefix: "px" },
    { key: "maxFormWidth", type: "number", label: "Max Form Width", min: 0, precision: 0, prefix: "px" },
    {
      key: "execution.mode",
      type: "choice",
      label: "Execution",
      options: [
        { value: "handler", label: "Submit handler" },
        { value: "signal", label: "Local signals" },
      ],
    },
    {
      key: "execution.phase",
      type: "choice",
      label: "Submit phase",
      options: [
        { value: "submit", label: "Submit" },
        { value: "confirm", label: "Confirm" },
      ],
    },
    {
      key: "source",
      type: "data-provider",
      providerKind: "table",
      label: "Record source",
    },
    { key: "openActionKey", type: "string", label: "Open action key" },
  ],
  defaultConfig: {
    /*
     * How wide a Form is allowed to get, answered by the house where nobody said otherwise.
     *
     * `PHI_LAYOUT.contentMax` is the measure the Theme names for exactly this -- "the one a labelled
     * form wants" -- and it is a ceiling, not a width: the Form still fills a narrower slot edge to
     * edge, and 610 is the width at which its own layout switches to `wide`, so the cap lands on the
     * threshold rather than below it and nothing is demoted by being capped.
     *
     * Stated as the Form's own field and deliberately NOT as the block's `maxSize`, which is where it
     * stood until the Widget grew a box. A block cap is drawn by the slot frame on the outermost
     * element, and everything the Widget puts inside it -- a Card's inset, a Wash's ground -- comes off
     * the width the fields are left with and off the width their container query measures. At the house
     * cap that was 568 inside a `card`, one step under the threshold the number was picked to sit on, so
     * `wide` could not be reached from inside a box at all. Measured at the fields, the Frame adds the
     * box's chrome back on and the box is the one that ends up wider than 610.
     *
     * Declared here for the two readers that read a declaration -- the Builder writes it into a node it
     * creates, the Inspector shows it under the node it edits -- while the render path is answered by
     * the parser, because only a Widget's block base is merged under a node that states nothing. Both
     * sides name `PHI_LAYOUT.contentMax`, so there is one number and two readers of it. A placement that
     * means something else writes a length of its own and wins: `contentMaxNarrow` for a column of
     * Controls with no label beside them, `100%` for a Form that really takes its slot.
     */
    maxFormWidth: PHI_LAYOUT.contentMax,
    formId: null,
    submit: "external",
    submitOnEnter: false,
    links: [],
    formConfig: {},
    execution: { mode: "handler", phase: "submit" },
    source: null,
    openActionKey: "edit",
    signalRoutes: null,
  },
  parseConfig: parsePhiFormWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsFormWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "requiredRuntimeControllers"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_FORM_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Form;
