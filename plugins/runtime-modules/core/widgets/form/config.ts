import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiTableSourceBinding } from "../../../../../types/table-widget";
import { isPhiFormId, normalizePhiFormId, type PhiFormId } from "../../../../../types/form-id";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import { requirePhiRuntimeFormControllerForWidget } from "../../../../../components/forms/runtime-form-controller-requirement";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import { PHI_LAYOUT } from "../../../../../theme/phi-tokens";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../builder/ids";

/**
 * A submit the form carries itself, instead of a Button Widget beside it.
 *
 * Optional, and never the only way in: a form is submitted by whoever holds its `submit` capability,
 * which is how an external Button, an Overlay footer or a toolbar drives one today. This adds a second
 * sender on the same channel, not a second path -- a form with its own submit still answers the signal,
 * and one that has none is unchanged.
 */
export type PhiCmsFormWidgetSubmitConfig = {
  /** What it says. The form's own label set decides where this is absent. */
  label: string | null;
  /**
   * Where in the control column the button sits -- not where in the form.
   *
   * The submit stands on the same twenty-four tracks as the fields, in the span the inputs occupy, so
   * `start` puts it under the first input rather than at the form's left edge and `center` centres it
   * over the inputs rather than over label and input together. `start` is the default because that is
   * where the eye already is when the last field has been filled in.
   */
  align: "start" | "center" | "end";
};

/**
 * A way out of the form, standing where its submit stands.
 *
 * "Forgot password" and "Create account" are not fields and not commands -- they are the two other
 * things a person at a sign-in might want. They belong to the Widget for the same reason the submit
 * does: whether they are offered, and in which column they sit, is the placement's decision. Being in
 * the Widget is also the only way they can line up under the inputs, because the label column is a
 * property of the form's own grid and nothing outside it can read where that column ends.
 */
export type PhiCmsFormWidgetLinkConfig = {
  /** Names the link's label in the form's label set, as `actions.<key>Label`. */
  key: string;
  href: string;
  /** A published Module fact this link depends on, such as `auth.registration`. */
  requiresFeature?: string;
};

/**
 * Whether a submit is worth saying out loud, and how.
 *
 * A Form already shows what happened where it stands: an error above the fields, and a success panel
 * where its descriptor has one. That is enough on a Page somebody came to in order to submit it. It is
 * not enough in Settings, where a panel is one of several and a switch that saves on change has nothing
 * to show at all -- the Widget that used to own the profile name reported through the application
 * feedback, and the registered Form that replaced it said nothing.
 *
 * So the placement decides, the way it decides whether there is a submit button: a Form on a Page of
 * its own stays quiet, a Form in a Settings panel reports. `successText` is what a success says where
 * the descriptor says nothing, already translated by whoever placed it.
 */
export type PhiCmsFormWidgetFeedbackConfig = {
  mode: "message" | "notification";
  successText?: string;
};

/**
 * The box the Widget draws around its Form, or none at all.
 *
 * A Form describes fields. Whether it stands in a box is the same kind of question as whether it carries
 * its own submit -- the placement's, not the Form's -- which is why it is configured here and appears in
 * no descriptor. It exists because the box was being built by hand: a client Widget with its own Card,
 * its own inset and, in one revision, its own Ant Design colour variable, standing beside a Form that
 * could not have a box at all. What draws it is `PhiCardControl`, so the Theme's surface shape reaches it
 * through the same component token every other surface reads and the ground and the frame are the
 * Theme's -- nothing here names a colour or a corner.
 *
 * `presentation` is the switch as well as the step: absent, or anything outside the three names, is no
 * box at all -- no ground and no inset -- which is what every Form placed before this one has and keeps.
 * That matters more than it sounds: the Login and its siblings stand in a Split Card slot that already
 * paints a ground, so a box there would be a plate inside a plate, and an inset would move the query
 * container the fields are measured in for nothing.
 *
 * The three names are one ladder -- how far the box separates itself from what is behind it -- and each
 * step is stated once. `card` and `panel` deliberately share a ground: the inset already says how deep
 * the box sits, and a second ground would say it again and drift the moment one of the two gains a
 * source the other has not.
 */
export type PhiCmsFormWidgetCardConfig = {
  /**
   * `card` is a box on a Page of its own; `panel` is the same box at the inset of chrome -- a Settings
   * section; `wash` is the quietest filling the Theme has with no frame at all, for a Form that already
   * stands on a container and only needs its fields set off from it.
   */
  presentation: "card" | "panel" | "wash";
  /** A heading in a bar above the fields, already translated by whoever placed the Form. */
  title: string | null;
  /** The box's own inset, where the Theme's answer for this box is not the right one. */
  padding: number | string | null;
};

export type PhiCmsFormWidgetConfig = PhiCmsWidgetConfigBase & {
  formId: PhiFormId | null;
  submit: PhiCmsFormWidgetSubmitConfig | null;
  card: PhiCmsFormWidgetCardConfig | null;
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
  source: PhiTableSourceBinding | null;
  openActionKey?: string;
  signalRoutes: ReturnType<typeof readPhiSignalRouteSet>;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
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
  const source = readRecord(rawConfig.source);
  const providerKey = typeof source.providerKey === "string" ? source.providerKey : "";
  const resourceKey = typeof source.resourceKey === "string" ? source.resourceKey.trim() : "";

  const submit = readRecord(rawConfig.submit);
  const submitAlign = submit.align;
  const card = readRecord(rawConfig.card);
  const cardPresentation =
    card.presentation === "card" || card.presentation === "panel" || card.presentation === "wash"
      ? card.presentation
      : null;
  const cardPadding = typeof card.padding === "number" || typeof card.padding === "string"
    ? card.padding
    : null;
  const feedback = readRecord(rawConfig.feedback);
  const feedbackSuccessText = typeof feedback.successText === "string" && feedback.successText.trim()
    ? feedback.successText.trim()
    : null;

  return {
    ...renderableBlockConfig,
    formId: isPhiFormId(normalizedFormId) ? normalizedFormId : null,
    submit: rawConfig.submit == null ? null : {
      label: typeof submit.label === "string" && submit.label.trim() ? submit.label.trim() : null,
      align: submitAlign === "center" || submitAlign === "end"
        ? submitAlign
        : "start",
    },
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
    source: isPhiRuntimeDataProviderKey(providerKey) && resourceKey
      ? {
          providerKey,
          resourceKey,
          params: readRecord(source.params),
        }
      : null,
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
    { key: "submit.label", type: "string", label: "Submit Label" },
    { key: "submit.align", type: "choice", label: "Submit Alignment", options: [
      { value: "start", label: "Start" },
      { value: "center", label: "Center" },
      { value: "end", label: "End" },
    ] },
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
     * threshold rather than below it and nothing is demoted by being capped. A cap is also not a size:
     * it leaves the slot policy `fill-inline` and the Layout in charge of placing the Form.
     *
     * Declared here and nowhere else. This is the one place a Widget's answer reaches all three readers
     * -- the Builder writes it into a node it creates, the Inspector shows it under the node it edits,
     * and the render path merges it under a node that states nothing, which is how a Preset placement
     * gets it. A placement that means something else writes a length into its own config and wins:
     * `contentMaxNarrow` for a column of Controls with no label beside them, `100%` for a Form that
     * really takes its slot.
     */
    maxSize: { width: PHI_LAYOUT.contentMax },
    formId: null,
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
