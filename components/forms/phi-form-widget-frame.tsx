"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import { PhiButtonControl } from "../controls/phi-button-control";
import type { PhiCmsFormWidgetSubmitConfig } from "../../plugins/runtime-modules/core/widgets/form/config";

/**
 * What a form body offers the Widget above it, so the Widget can draw a submit for it.
 *
 * A form describes fields. Whether there is a button, what it says and which column it stands in are the
 * Widget's to decide -- which is why the body hands up a way to submit rather than a button, and why the
 * label is only what this form would call it if the Widget's config says nothing.
 */
export type PhiFormWidgetSubmitRegistration = {
  /** Asks the mounted form to submit. The same request the `submit` capability makes. */
  submit: () => void;
  /** What this form calls submitting, used where the Widget's config names nothing. */
  label?: string;
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
export function usePhiFormWidgetSubmit(submit: () => void, label?: string) {
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
    slot.register({ submit: () => submitRef.current(), label });
    return () => slot.register(null);
  }, [label, slot]);

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

function resolveSubmitJustification(align: PhiCmsFormWidgetSubmitConfig["align"]) {
  return align === "start" ? "flex-start" : align === "center" ? "center" : "flex-end";
}

export type PhiFormWidgetFrameProps = {
  /** The submit the Widget carries, or null where it carries none. */
  submit?: PhiCmsFormWidgetSubmitConfig | null;
  children: ReactNode;
};

/**
 * The Form Widget's own surface: the query container its form is measured in, and the submit it carries.
 *
 * The container sits here rather than in the form because a container cannot answer a question about its
 * own width, and the submit stands beside the form rather than in it -- both have to know where the label
 * column ends to line up under the inputs, and only an element above both can tell them.
 *
 * The submit opens its own row of the same twenty-four tracks. Its own grid rather than a row inside the
 * form: the form describes fields, and a submit is not one. Sharing the track count and the label-column
 * property is all it takes for the button to line up under the inputs and move with the column the Layout
 * decides, because that column is a custom property both of them read.
 */
export function PhiFormWidgetFrame({ submit, children }: PhiFormWidgetFrameProps) {
  const [registration, setRegistration] = useState<PhiFormWidgetSubmitRegistration | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const slot = useMemo<PhiFormWidgetSubmitSlot>(
    () => ({ register: setRegistration, setSubmitting }),
    [],
  );

  const submitNode = submit && registration ? (
    <div className="phi-form-descriptor-actions">
      <div
        className="phi-form-cell phi-form-cell--control"
        style={{ display: "flex", justifyContent: resolveSubmitJustification(submit.align) }}
      >
        <PhiButtonControl
          type="primary"
          label={submit.label ?? registration.label ?? "Submit"}
          loading={submitting}
          onClick={registration.submit}
        />
      </div>
    </div>
  ) : null;

  return (
    <PhiFormWidgetSubmitSlotContext.Provider value={slot}>
      <PhiFormWidgetSubmitNodeContext.Provider value={submitNode}>
        <div
          style={{
            display: "grid",
            gap: PHI_SPACE.sm,
            width: "100%",
            minWidth: 0,
            containerType: "inline-size",
            containerName: "phi-form",
          }}
        >
          {children}
        </div>
      </PhiFormWidgetSubmitNodeContext.Provider>
    </PhiFormWidgetSubmitSlotContext.Provider>
  );
}
