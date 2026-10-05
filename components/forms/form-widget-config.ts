import { isPhiRecord } from "../../helpers/is-record";
import type {
  PhiCmsFormWidgetCardConfig,
  PhiCmsFormWidgetFeedbackConfig,
  PhiCmsFormWidgetLinkConfig,
  PhiCmsFormWidgetSubmitPlacement,
} from "../../types/core-widget-placements";
import {
  readPhiProviderResourceSource,
  type PhiProviderResourceSource,
} from "../../types/runtime-data-provider";
import { isPhiFormId, normalizePhiFormId, type PhiFormId } from "../../types/form-id";
import { readPhiSignalRouteSet } from "../../types/signals";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../widgets/config/parser-primitives";
import { PHI_LAYOUT } from "../../theme/phi-tokens";

/*
 * The parsed placement of a Form, and the parser that answers it.
 *
 * The Foundation's, because a Form is rendered from it in more places than the Core Form Widget: the
 * page renderer puts the password change an administrator asked for in front of a Page, and the form
 * runtime reads which Controller a placement needs. The Widget's definition -- its Inspector fields and
 * defaults -- stays with the Widget.
 */

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
  return isPhiRecord(value)
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
