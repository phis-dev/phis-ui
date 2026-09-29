"use client";

import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { PHI_COLOR, PHI_SPACE } from "../../theme/antd-css-var-contract";
import { PHI_THEME_BORDER_WIDTH } from "../../helpers/border-widget-style";
import {
  normalizePhiCssSize,
  PHI_LAYOUT_SURFACE_RADIUS,
  PHI_SLOT_INLINE_PLACEMENT_MARGIN_STYLE,
} from "../layouts/phi-layout-contract";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiCardControl } from "../controls/phi-card-control";
import { PhiLink } from "../navigation/phi-link";
import type { PhiCmsFormWidgetCardConfig } from "../../plugins/runtime-modules/core/widgets/form/config";
import {
  PHI_FORM_ACTIONS_COLUMNS_PROPERTY,
  PHI_FORM_RESPONSIVE_MODES,
  phiFormActionsGridColumn,
  phiFormGridColumn,
  resolvePhiFormLayout,
  resolvePhiFormResponsiveGridRange,
} from "./form-descriptor-contract";
import type {
  PhiFormLayoutDescriptor,
  PhiFormLogicalAlignment,
  PhiFormResponsiveGridRange,
} from "../../types/form-descriptor";

/**
 * What a form body offers the Widget above it, so the Widget can draw a submit for it.
 *
 * The body hands up a way to submit rather than a button: whether a button is drawn is the Widget's
 * placement, and what it says and where it stands is the descriptor's -- neither is the body's.
 */
export type PhiFormWidgetSubmitRegistration = {
  /** Asks the mounted form to submit. The same request the `submit` capability makes. */
  submit: () => void;
};

/**
 * The submit the Widget draws, already resolved: the placement said `inline`, and the descriptor's
 * `submit` said what it reads and where it stands.
 */
export type PhiFormWidgetSubmit = {
  label: string;
  align: PhiFormLogicalAlignment;
  /** The descriptor's own tracks for it, or absent for the layout's control range. */
  control?: PhiFormResponsiveGridRange;
};

type PhiFormWidgetSubmitSlot = {
  register: (registration: PhiFormWidgetSubmitRegistration | null) => void;
  setSubmitting: (submitting: boolean) => void;
};

/* Two contexts, because they change at different rates: the slot is stable for the life of the frame,
 * while the button is rebuilt whenever a submit starts or ends. A body that only registers must not
 * re-render for that. */
const PhiFormWidgetSubmitSlotContext = createContext<PhiFormWidgetSubmitSlot | null>(null);
const PhiFormWidgetSubmitNodeContext = createContext<ReactNode>(null);

/**
 * Offers this form's submit to the Form Widget around it, and returns the slot so the caller can report
 * that a submit is under way. Null where no Widget is listening, which is what a form rendered outside
 * one gets: it simply has no submit of its own to draw instead.
 */
export function usePhiFormWidgetSubmit(submit: () => void) {
  const slot = useContext(PhiFormWidgetSubmitSlotContext);
  // The call is read through a ref so a body may pass a fresh closure every render without
  // re-registering -- the registration is identity, not a value that changes with each keystroke.
  // Kept current after the render rather than during it: nothing presses the button while React is
  // still deciding what to draw.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    if (!slot) {
      return;
    }
    slot.register({ submit: () => submitRef.current() });
    return () => slot.register(null);
  }, [slot]);

  return slot;
}

/**
 * Where in a form body the Widget's submit appears.
 *
 * The Widget decides whether there is one, what it says and which column it stands in; the body decides
 * only which of its own parts it follows. The Login needs that say: its external sign-in methods stand
 * below the password form, and a submit appended to the end of the Widget would sit under them.
 */
export function PhiFormWidgetSubmitOutlet() {
  return <>{useContext(PhiFormWidgetSubmitNodeContext)}</>;
}

function resolveSubmitJustification(align: PhiFormLogicalAlignment) {
  return align === "start" ? "flex-start" : align === "center" ? "center" : "flex-end";
}

/** A resolved way out of the form: what it says and where it leads, both already decided. */
export type PhiFormWidgetLink = {
  key: string;
  label: string;
  href: string;
};

export type PhiFormWidgetFrameProps = {
  /** The submit the Widget draws, or null where the placement keeps it external. */
  submit?: PhiFormWidgetSubmit | null;
  /**
   * The box around the whole of it, or null for no box.
   *
   * It stands outside the grid rather than around the fields, because the submit and the ways out belong
   * in it too -- a button outside the box it submits reads as something else's button. Its inset is the
   * Card's, so the query container is measured inside the padding, which is the width the fields have --
   * and `wash`, which draws no Card, takes the same inset a Collapsible's body takes, so its ground does
   * not run flush into the labels. Null draws nothing and insets nothing, which is what a Form in a slot
   * that already paints a ground wants: there the query container is the block itself, so the width the
   * fields read is the width the placement capped.
   */
  card?: PhiCmsFormWidgetCardConfig | null;
  /**
   * How wide the form may get, measured at the fields rather than around the box.
   *
   * The cap belongs to the form, so the box grows outwards to carry it: a Form capped at 610 in a `card`
   * is a 610 form in a 652 card, and its container query reads the 610 it was given. Capping the block
   * instead -- which is where this number used to live -- put the inset inside the cap, so the fields
   * read 568 and stood one layout step below the threshold the cap was chosen to land on.
   *
   * Null caps nothing. A block `maxSize` still caps the block; that is the other box, and it is drawn
   * by the slot frame, above everything here.
   */
  maxFormWidth?: number | string | null;
  /** The ways out it offers, drawn in the same column as the submit. */
  links?: readonly PhiFormWidgetLink[];
  /**
   * The form's own layout, read for one thing only: which tracks its inputs stand on, so the submit
   * can stand on the same ones. The body is rendered on the Client and cannot tell the frame, and the
   * frame is the element both are inside, so this is where the answer has to arrive.
   */
  layout?: PhiFormLayoutDescriptor;
  children: ReactNode;
};

/**
 * What one side of a box costs, so the cap can be stated at the fields and the box grown to carry it.
 *
 * The inset is the box's own -- the Theme's `padding` for a Card and for a Wash, `paddingSM` for the
 * chrome-sized Panel, or whatever the placement named instead -- and the two that have a frame pay for
 * the Theme's line as well. Null where there is no box: then the fields are the outermost thing here and
 * nothing stands between them and the cap.
 */
function resolvePhiFormBoxChrome(card: PhiCmsFormWidgetCardConfig | null | undefined) {
  if (card == null) {
    return null;
  }
  const inset = normalizePhiCssSize(card.padding ?? undefined)
    ?? (card.presentation === "panel" ? PHI_SPACE.sm : PHI_SPACE.base);
  return card.presentation === "wash" ? inset : `(${inset} + ${PHI_THEME_BORDER_WIDTH})`;
}

/**
 * The Form Widget's own surface: the query container its form is measured in, and the submit it carries.
 *
 * The container sits here rather than in the form because a container cannot answer a question about its
 * own width, and the submit stands beside the form rather than in it -- both have to know where the label
 * column ends to line up under the inputs, and only an element above both can tell them.
 *
 * The submit opens its own row of the same twenty-four tracks. Its own grid rather than a row inside the
 * form: the form describes fields, and a submit is not one. Which of those tracks it takes is written
 * here, from the form's layout, so it lines up under the inputs at each width and still moves with the
 * column a Form Layout decides -- that column is a custom property both of them read.
 */
export function PhiFormWidgetFrame(
  { submit, card, maxFormWidth, links, layout, children }: PhiFormWidgetFrameProps,
) {
  const [registration, setRegistration] = useState<PhiFormWidgetSubmitRegistration | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const slot = useMemo<PhiFormWidgetSubmitSlot>(
    () => ({ register: setRegistration, setSubmitting }),
    [],
  );
  const resolvedLayout = useMemo(() => resolvePhiFormLayout(layout), [layout]);
  const actionsColumns = useMemo(() => Object.fromEntries(PHI_FORM_RESPONSIVE_MODES.map((mode) => [
    `${PHI_FORM_ACTIONS_COLUMNS_PROPERTY}-${mode}`,
    phiFormActionsGridColumn(resolvedLayout, mode),
  ])), [resolvedLayout]);
  /*
   * Tracks the descriptor names for its submit replace the actions row's columns for that row alone;
   * the links keep the layout's control range, which is where they line up with the inputs.
   */
  const submitControl = submit?.control;
  const submitColumns = useMemo(() => {
    if (!submitControl) return undefined;
    const ranges = resolvePhiFormResponsiveGridRange(
      submitControl,
      resolvedLayout.control,
      "submit.control",
    );
    return Object.fromEntries(PHI_FORM_RESPONSIVE_MODES.map((mode) => [
      `${PHI_FORM_ACTIONS_COLUMNS_PROPERTY}-${mode}`,
      phiFormGridColumn(ranges[mode]),
    ]));
  }, [resolvedLayout, submitControl]);

  const submitButton = submit && registration ? (
    <div className="phi-form-descriptor-actions" style={submitColumns as CSSProperties | undefined}>
      <div
        className="phi-form-cell phi-form-cell--control"
        style={{ display: "flex", justifyContent: resolveSubmitJustification(submit.align) }}
      >
        <PhiButtonControl
          type="primary"
          label={submit.label}
          loading={submitting}
          onClick={registration.submit}
        />
      </div>
    </div>
  ) : null;

  /*
   * A row of its own on the same tracks, directly under the submit.
   *
   * It reads the label column the way the submit does, which is the whole reason these live in the
   * Widget rather than beside it: a Widget in the next slot stands in the Layout's box, not on the
   * form's grid, and no percentage of the outer width lands on that column once the grid has gaps.
   */
  const linksRow = links && links.length > 0 ? (
    <div className="phi-form-descriptor-actions">
      <div
        className="phi-form-cell phi-form-cell--control"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: PHI_SPACE.sm }}
      >
        {links.map((link, index) => (
          <Fragment key={link.key}>
            {index > 0 ? <span aria-hidden style={{ color: PHI_COLOR.textTertiary }}>|</span> : null}
            <PhiLink href={link.href}>{link.label}</PhiLink>
          </Fragment>
        ))}
      </div>
    </div>
  ) : null;

  /*
   * The ways out come first, then the button.
   *
   * Both belong to the Widget and both stand in the control column, so the only question left is the
   * order, and it is the reading order: what else there is to do, and then the thing this form is for.
   * The submit last also keeps it next to the fields it submits.
   *
   * They travel together through the outlet rather than being appended here, because the body decides
   * which of its own parts they follow -- the Login's external methods stand below the password form,
   * and anything appended to the end of the frame would sit under those.
   */
  const actionsNode = linksRow || submitButton ? (
    <>
      {linksRow}
      {submitButton}
    </>
  ) : null;

  /*
   * The cap lands on the outermost box this Frame owns, and it lands there grown by that box's chrome.
   *
   * One box, one cap: the grid where there is no box, the box where there is, never both -- a cap inside
   * an inset would take the inset off twice. `min(100%, ...)` because a cap is not a size and must never
   * push out of the slot: a Form told to take `100%` and then grown by two insets would do exactly that.
   */
  const capLength = normalizePhiCssSize(maxFormWidth ?? undefined);
  const boxChrome = resolvePhiFormBoxChrome(card);
  const capStyle = capLength == null
    ? undefined
    : boxChrome == null
      ? `min(100%, ${capLength})`
      : `min(100%, calc(${capLength} + 2 * ${boxChrome}))`;

  /*
   * And where the cap leaves room over, the Layout says which side of it the Form stands on.
   *
   * The slot's placement margins are handed down as custom properties and the slot child frame reads
   * them, but the frame around a Form fills the slot: the cap is one box further in, so the frame has no
   * room left over and its auto margins come to nothing. The box that does have the room is this one,
   * and it reads the same answer -- centred under a Layout anchored to the centre, at the start edge
   * under one anchored to the start, which is what it did unasked before.
   */
  const placedBoxStyle: CSSProperties = {
    ...(capStyle == null ? {} : { maxWidth: capStyle }),
    ...PHI_SLOT_INLINE_PLACEMENT_MARGIN_STYLE,
  };

  const measured = (
    <div
      style={{
        display: "grid",
        gap: PHI_SPACE.sm,
        width: "100%",
        minWidth: 0,
        containerType: "inline-size",
        containerName: "phi-form",
        ...(card ? {} : placedBoxStyle),
        ...actionsColumns,
      } as CSSProperties}
    >
      {children}
    </div>
  );

  return (
    <PhiFormWidgetSubmitSlotContext.Provider value={slot}>
      <PhiFormWidgetSubmitNodeContext.Provider value={actionsNode}>
        {card?.presentation === "wash" ? (
          /*
           * The quietest step of the ladder: a ground and nothing else.
           *
           * No Card, because a Card brings the Theme's container ground and its frame, and both are too
           * much for a Form that already stands on one -- what is wanted there is only that the fields
           * are set off, which `colorFillQuaternary` does. The corner is the surface step every surface
           * takes where nobody stated one, and the inset is the base one, the same step a Collapsible's
           * body takes: a ground running flush into the labels reads as a mistake, and a filled area
           * holding fields is a body rather than chrome -- the chrome inset belongs to `panel`, which
           * has the frame that goes with it.
           */
          <div
            style={{
              background: PHI_COLOR.fillQuaternary,
              borderRadius: PHI_LAYOUT_SURFACE_RADIUS,
              padding: card.padding ?? PHI_SPACE.base,
              ...placedBoxStyle,
            }}
          >
            {measured}
          </div>
        ) : card ? (
          <PhiCardControl
            size={card.presentation === "panel" ? "small" : "medium"}
            {...(card.title ? { title: card.title } : {})}
            {...(card.padding == null ? {} : { padding: card.padding })}
            style={placedBoxStyle}
          >
            {measured}
          </PhiCardControl>
        ) : measured}
      </PhiFormWidgetSubmitNodeContext.Provider>
    </PhiFormWidgetSubmitSlotContext.Provider>
  );
}
