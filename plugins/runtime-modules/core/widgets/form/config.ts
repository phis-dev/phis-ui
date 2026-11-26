import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import { requirePhiRuntimeFormControllerForWidget } from "../../../../../components/forms/runtime-form-controller-requirement";
import {
  parsePhiFormWidgetConfig,
  type PhiCmsFormWidgetConfig,
} from "../../../../../components/forms/form-widget-config";
import { PHI_FORM_RECORD_TITLE_CAPABILITY } from "../../../../../components/forms/form-record-title";
import { PHI_AUTHORING_OPTION_PROVIDER_KEYS } from "../../../../../constants/authoring-option-provider-keys";
import { PHI_COMPACT_CONTROL_SIZE_FIELD } from "../../../../../components/widgets/config/control-signal-config";

export const PHI_FORM_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("form"),
  typeKey: "form",
  title: "Form",
  category: "form",
  description: "Renders a Preset Form contributed by an active Runtime module.",
  icon: "antd:edit-outlined",
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
      /*
       * Asked once, as the Form mounts: whoever knows what it should start with answers `valuesSet`.
       * A Form in a dialog that opens afresh is not there when the choice it depends on is made, so it
       * has to ask rather than be told.
       */
      { id: "valuesRequest", action: "reload", valueType: "none" },
      // The title its record gives the dialog, after every read (`titleFromRecord`), for the Overlay's `title`.
      { id: PHI_FORM_RECORD_TITLE_CAPABILITY, action: "change", valueType: "string" },
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
      /*
       * The same open from a Collection View's item action (`{ actionKey, itemKey }`), the item's key the
       * record's: one capability, two announcers, told apart by the schema the route carries (SIGNALS.md,
       * inputs are unique by channel, action, value type and schema).
       */
      {
        id: "recordOpen",
        channel: "action",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction,
      },
      { id: "close", channel: "dialog", action: "close", valueType: "none" },
      { id: "reload", channel: "reload", action: "activate", valueType: "none" },
      /*
       * Values laid over the ones the Form holds, for the fields they name. Not a change anybody made:
       * the Form stays clean, and a reset returns to what it started with before them.
       */
      {
        id: "valuesSet",
        channel: "values",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
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
    // The Size every other Control's Inspector shows, without Large: a Form is drawn medium or small.
    PHI_COMPACT_CONTROL_SIZE_FIELD,
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
      // A Table's rows or a Collection's items, whichever resource declares `recordRead`.
      providerKind: ["table", "collection"],
      label: "Record source",
    },
    { key: "openActionKey", type: "string", label: "Open action key" },
  ],
  defaultConfig: {
    /*
     * No `maxFormWidth`: a Form is capped by the house where nobody says otherwise, and the house measure
     * depends on the Form -- the reading measure, or that for each of its columns
     * (`resolvePhiFormHouseMaxWidth`) -- which a node the Builder creates has not chosen yet. Writing 610
     * here stated a cap into every new node that a Form of columns then stood inside, a strip in a dialog
     * made wide for it (owner, 2026-11-26). The Inspector shows the field empty, which is the house's
     * answer; a length written there is the placement's and wins. The cap is the Form's own field and
     * never the block's `maxSize` (FORMS.md, "Form Widget").
     */
    formId: null,
    submit: "external",
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
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "requiredRuntimeControllers"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_FORM_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Form;
