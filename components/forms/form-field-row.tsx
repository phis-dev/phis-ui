"use client";

import { Fragment, type ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";

/*
 * The one rendering of a field's row: its label and its control, where the Form's template puts them.
 *
 * A Form is built from descriptor fields, and the Form Widget draws each one's label in the label column
 * and its control in the control column (`PhiFormControl`, LAYOUTING.md "Form grid"). A field whose value
 * is several labelled parts -- the address -- draws each part through `PhiFormFieldPart` below, so a part
 * is a row of the same template and not a label stacked over an input by the field. Nothing else draws a
 * `<label>` for a field (`scripts/validate-form-field-rows.mjs`): an address that did stood stacked in a
 * one-column dialog whose every other field had its label beside it (owner, 2026-11-26).
 */

/** A label's words with the required marker in front, wrapping as one run of text. */
export function PhiFormFieldLabelText({ required, children }: { required?: boolean; children: ReactNode }) {
  const { token } = usePhiConfig();
  return (
    <span>
      {required ? <span aria-hidden style={{ color: token.colorError, marginInlineEnd: "0.25em" }}>*</span> : null}
      {children}
    </span>
  );
}

/**
 * The rows of a field drawn in parts. The field stands on the whole row
 * (`PHI_FORM_PART_ROWS_FIELD_PROVIDER_KEYS`) and this lays the Form's twenty-four tracks over it; the
 * columns are the template's, written by the Form (`phiFormPartProperties`, `.phi-form-parts`).
 */
export function PhiFormFieldParts({ children }: { children: ReactNode }) {
  return <div className="phi-form-parts">{children}</div>;
}

/** One part of such a field: its label in the label column, its control and its sentence in the control column. */
export function PhiFormFieldPart({
  htmlFor,
  label,
  required,
  error,
  children,
}: {
  /** The id of the part's input. */
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
  /** What is wrong with the part, under its control. */
  error?: string;
  children: ReactNode;
}) {
  const { token } = usePhiConfig();
  return (
    <Fragment>
      <label htmlFor={htmlFor} className="phi-form-part phi-form-part--label" style={{ color: token.colorTextHeading }}>
        <PhiFormFieldLabelText required={required}>{label}</PhiFormFieldLabelText>
      </label>
      <div className="phi-form-part phi-form-part--control">
        {children}
        {error ? (
          <span role="alert" style={{ display: "block", color: token.colorError, fontSize: token.fontSizeSM }}>{error}</span>
        ) : null}
      </div>
    </Fragment>
  );
}
