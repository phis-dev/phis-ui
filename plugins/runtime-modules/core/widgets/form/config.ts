import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type {
  PhiCmsFormWidgetCardConfig,
  PhiCmsFormWidgetFeedbackConfig,
  PhiCmsFormWidgetLinkConfig,
  PhiCmsFormWidgetSubmitPlacement,
} from "../../../../../types/core-widget-placements";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readPhiProviderResourceSource, type PhiProviderResourceSource } from "../../../../../types/runtime-data-provider";
import { isPhiFormId, normalizePhiFormId, type PhiFormId } from "../../../../../types/form-id";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import { requirePhiRuntimeFormControllerForWidget } from "../../../../../components/forms/runtime-form-controller-requirement";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import { PHI_LAYOUT } from "../../../../../theme/phi-tokens";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../builder/ids";

export type PhiCmsFormWidgetConfig = PhiCmsWidgetConfigBase & {
  formId: PhiFormId | null;
  submit: PhiCmsFormWidgetSubmitPlacement;
  /**
   * Whether Enter in a single-line field submits. Off unless the placement says so: with a second form
   * or a search on the same page, Enter has more than one thing it could mean, and only whoever put
   * them there knows which one it should.
   */
  submitOnEnter: boolean;
  card: PhiCmsFormWidgetCardConfig | null;
  /**
   * How wide the form may get, measured where its fields stand rather than around the box.
   *
   * The Form's own measure and not block geometry, which is the whole point of it. A block's `maxSize`
   * caps the element the slot frame draws, and every box the Widget puts inside that element takes its
   * inset off the width that is left -- so a Form capped at the reading measure and standing in a `card`
   * gave its fields 568 and its container query read 568 as well, one step below the very threshold the
   * cap was chosen to land on. Stated here, the number means the fields: the Frame adds the box's inset
   * back on so the box ends up wider than the cap, and what the fields read is what was written.
   *
   * A length or a number of pixels, and always answered: `100%` is how "no ceiling" is spelled, as
   * everywhere else. A block `maxSize` an author states still caps the block -- two boxes, both of
   * which may be capped.
   */
  maxFormWidth: number | string;
  feedback: PhiCmsFormWidgetFeedbackConfig | null;
  links: readonly PhiCmsFormWidgetLinkConfig[];
  formConfig: Record<string, unknown>;
  execution: {
    mode: "handler" | "signal";
    /**
     * Which closed handler phase this Widget submits.
     *
     * `submit` for the ordinary case. A flow composed of several Form Widgets -- a request and then a
     * confirmation -- says so here, so the second stage is a placement of the same form rather than a
     * second form or a second code path.
     */
    phase: "submit" | "confirm";
  };
  source: PhiProviderResourceSource | null;
  /**
   * The Table action that opens a row in this form, for a form fed by a Table.
   *
   * Absent is an answer of its own, not a missing default: a form with a `source` and no open action is
   * a single-record form and reads its record when it mounts, the way a settings page does. Setting it
   * makes the form wait for that action to name a row. `defaultConfig` says `"edit"`, so a form placed
   * in the Builder starts as the Table-driven kind.
   */
  openActionKey?: string;
  signalRoutes: ReturnType<typeof readPhiSignalRouteSet>;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

/**
 * The placement's own cap, or null where it states none.
 *
 * Absent -- the key missing, `null`, or a field emptied in the Inspector -- leaves the cap to the house
 * measure. A cap that is stated but cannot be one is refused rather than replaced: `0` or a negative
 * number caps the fields at nothing, and a bare `"610"` is not a CSS length, so `min(100%, 610)` is
 * dropped by the browser and the Form renders uncapped with no error anywhere.
 */
function readPhiFormWidgetMaxFormWidth(value: unknown): number | string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) return value;
    throw new Error(`Invalid Form maxFormWidth ${JSON.stringify(value)}. Expected a positive number.`);
  }
  if (typeof value !== "string") {
    throw new Error(
      `Invalid Form maxFormWidth ${JSON.stringify(value)}. Expected a number or a length.`,
    );
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const leadingNumber = /^[+-]?(\d+\.?\d*|\.\d+)/.exec(trimmed);
  if (leadingNumber && leadingNumber[0] === trimmed) {
    throw new Error(`Invalid Form maxFormWidth ${JSON.stringify(value)}. A length needs a unit.`);
  }
  if (leadingNumber && Number(leadingNumber[0]) <= 0) {
    throw new Error(`Invalid Form maxFormWidth ${JSON.stringify(value)}. Expected a positive length.`);
  }
  return trimmed;
}

export function parsePhiFormWidgetConfig(rawConfig: Record<string, unknown>): PhiCmsFormWidgetConfig {
  /*
   * The block's own geometry, which this Widget used to drop on the floor.
   *
   * A parser that returns only its own fields discards everything an author set in the Style tab, and
   * the Form's parsed config is what the Widget renders from. Where the Form's *cap* comes from is a
   * different question, answered in `defaultConfig` below rather than here.
   */
  const renderableBlockConfig = readRenderableBlockConfig(rawConfig);
  const normalizedFormId = typeof rawConfig.formId === "string"
    ? normalizePhiFormId(rawConfig.formId)
    : "";

  const execution = readRecord(rawConfig.execution);

  const card = readRecord(rawConfig.card);
  const cardPresentation =
    card.presentation === "card" || card.presentation === "panel" || card.presentation === "wash"
      ? card.presentation
      : null;
  const cardPadding = typeof card.padding === "number" || typeof card.padding === "string"
    ? card.padding
    : null;
  const maxFormWidth = readPhiFormWidgetMaxFormWidth(rawConfig.maxFormWidth);
  const feedback = readRecord(rawConfig.feedback);
  const feedbackSuccessText = typeof feedback.successText === "string" && feedback.successText.trim()
    ? feedback.successText.trim()
    : null;

  return {
    ...renderableBlockConfig,
    formId: isPhiFormId(normalizedFormId) ? normalizedFormId : null,
    submit: rawConfig.submit === "inline" ? "inline" : "external",
    submitOnEnter: rawConfig.submitOnEnter === true,
    /*
     * The house measure where the placement names none, and answered HERE as well as declared.
     *
     * `defaultConfig` reaches the Builder and the Inspector, but the render path merges only a Widget's
     * block base under a node (`widgetBlockDefaultsByType`) -- so a Preset placement that says nothing
     * arrives with no cap at all, which is exactly how every Preset-placed Form once rendered uncapped.
     * A Widget field has to be answered by its parser. Both sides read the one constant.
     */
    maxFormWidth: maxFormWidth ?? PHI_LAYOUT.contentMax,
    /*
     * No box unless one is named, and the name is read rather than the block's presence: an author who
     * takes the box off again leaves an empty `card` behind, and an empty block is not a box.
     */
    card: cardPresentation == null ? null : {
      presentation: cardPresentation,
      title: typeof card.title === "string" && card.title.trim() ? card.title.trim() : null,
      padding: cardPadding,
    },
    // Absent means silent, so a Form that says nothing about feedback keeps reporting where it stands.
    feedback: rawConfig.feedback == null ? null : {
      mode: feedback.mode === "notification" ? "notification" : "message",
      ...(feedbackSuccessText ? { successText: feedbackSuccessText } : {}),
    },
    links: Array.isArray(rawConfig.links)
      ? rawConfig.links.flatMap((entry) => {
          const link = readRecord(entry);
          const key = typeof link.key === "string" ? link.key.trim() : "";
          const href = typeof link.href === "string" ? link.href.trim() : "";
          if (!key || !href) return [];
          return [{
            key,
            href,
            ...(typeof link.requiresFeature === "string" && link.requiresFeature.trim()
              ? { requiresFeature: link.requiresFeature.trim() }
              : {}),
          }];
        })
      : [],
    formConfig: readRecord(rawConfig.formConfig),
    execution: {
      mode: execution.mode === "signal" ? "signal" : "handler",
      phase: execution.phase === "confirm" ? "confirm" : "submit",
    },
    source: readPhiProviderResourceSource(rawConfig.source),
    openActionKey: typeof rawConfig.openActionKey === "string" && rawConfig.openActionKey.trim()
      ? rawConfig.openActionKey.trim()
      : undefined,
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}

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
        providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.forms,
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
