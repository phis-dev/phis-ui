"use client";

import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { Input } from "antd";
import type { OTPRef } from "antd/es/input/OTP";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import { PhiLabeledControl } from "./phi-labeled-control";

/**
 * A code of known length, entered one character per cell.
 *
 * Its own Control rather than a presentation of the text Control: a code is not free text that happens
 * to be short. It has a length before anything is typed, it is complete or it is not, and a mistyped
 * character shows in the cell where it happened -- the shape people recognise from every authenticator
 * prompt, and one Ant Design ships as a component of its own.
 */

export type PhiOtpControlCharacters = "digits" | "alphanumeric";

/**
 * What a surface may ask of the cells from outside: to take focus or give it up.
 *
 * A handle of its own rather than Ant Design's ref type, so that asking for focus does not put the
 * adapter's component interface into this package's API.
 */
export type PhiOtpControlHandle = {
  focus: () => void;
  blur: () => void;
};

export type PhiOtpControlProps = {
  value?: string | null;
  label?: ReactNode;
  description?: ReactNode;
  ariaLabel?: string;
  /** How many cells; six, the length authenticator apps use, unless stated. */
  length?: number;
  /**
   * What a cell accepts. `digits` also asks a phone for its digit keypad and drops anything else as it
   * is typed or pasted, which is what a code sent by an authenticator or a text message consists of.
   */
  characters?: PhiOtpControlCharacters;
  /** Hides what was typed, for a code that should not stay readable over somebody's shoulder. */
  mask?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  /** Every edit, with what the cells hold so far -- a code that is still being typed is a value too. */
  onChange?: (value: string) => void;
  /** Once every cell holds a character, with the complete code. */
  onComplete?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  handleRef?: Ref<PhiOtpControlHandle>;
};

const DIGITS_ONLY = /\D/gu;
const NOT_ALPHANUMERIC = /[^0-9a-zA-Z]/gu;

export function PhiOtpControl({
  value,
  label,
  description,
  ariaLabel,
  length = 6,
  characters = "digits",
  mask,
  disabled = false,
  readOnly = false,
  autoFocus,
  size,
  variant,
  onChange,
  onComplete,
  onFocus,
  onBlur,
  handleRef,
}: PhiOtpControlProps) {
  const otpRef = useRef<OTPRef | null>(null);
  useImperativeHandle(handleRef, () => ({
    focus: () => otpRef.current?.focus(),
    blur: () => otpRef.current?.blur(),
  }), []);

  // Ant Design focuses the first cell only when it mounts with autoFocus; a control that is asked to
  // focus later, or re-rendered into view, asks explicitly.
  useEffect(() => {
    if (autoFocus && !disabled) otpRef.current?.focus();
  }, [autoFocus, disabled]);

  const control = (
    <Input.OTP
      ref={otpRef}
      aria-label={ariaLabel}
      length={length}
      mask={mask}
      size={size}
      variant={variant}
      disabled={disabled || (!onChange && !onComplete && !readOnly)}
      autoComplete="one-time-code"
      inputMode={characters === "digits" ? "numeric" : "text"}
      formatter={(next) => next.replace(characters === "digits" ? DIGITS_ONLY : NOT_ALPHANUMERIC, "")}
      value={value ?? ""}
      onInput={(cells) => {
        if (!readOnly) onChange?.(cells.join(""));
      }}
      onChange={(complete) => {
        if (!readOnly) onComplete?.(complete);
      }}
      onFocus={onFocus ? () => onFocus() : undefined}
      onBlur={onBlur ? () => onBlur() : undefined}
    />
  );

  return <PhiLabeledControl label={label} description={description}>{control}</PhiLabeledControl>;
}
