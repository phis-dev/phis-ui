"use client";

import { useRef, type CSSProperties, type FocusEventHandler, type SyntheticEvent } from "react";

import type { PhiControlVariant } from "../../../../types/control";
import { PhiTextControl } from "../../../../components/controls/phi-text-control";

export type PhiInlineTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onFocus?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  ariaLabel?: string;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  variant?: PhiControlVariant;
  /** Where the editor sits among its neighbours. */
  style?: CSSProperties;
  /** How the text inside it looks, so an edit in place reads like the text it edits. */
  inputStyle?: CSSProperties;
  /** Marks the editor as a collapsible's title, which the collapsible checks before it toggles. */
  collapsibleTitleControl?: boolean;
};

function stopAtEditor(event: SyntheticEvent) {
  event.stopPropagation();
}

/**
 * Text edited where it is read, inside a surface that is itself selectable.
 *
 * A press in the field must not also select the node around it or toggle the collapsible it titles, so
 * pointer and click events stop at the element wrapping the field -- the field reports only what it is
 * for, and the wrapper, which knows it sits on something that listens, decides how far a press travels.
 * The props are a closed list rather than whatever an input accepts, which is what lets the field be
 * the shared text Control.
 */
export function PhiInlineTextEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  onFocus,
  onBlur,
  ariaLabel,
  placeholder,
  autoFocus,
  readOnly,
  variant,
  style,
  inputStyle,
  collapsibleTitleControl,
}: PhiInlineTextEditorProps) {
  const cancelPendingRef = useRef(false);

  return (
    <span
      data-phi-collapsible-title-control={collapsibleTitleControl ? "true" : undefined}
      style={{ display: "inline-block", minWidth: 0, maxWidth: "100%", ...style }}
      onMouseDown={stopAtEditor}
      onPointerDown={stopAtEditor}
      onClick={stopAtEditor}
    >
      <PhiTextControl
        value={value}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        autoFocus={autoFocus}
        readOnly={readOnly}
        variant={variant}
        allowClear={false}
        style={{ width: "100%" }}
        inputStyle={inputStyle}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        onFocus={onFocus}
        onBlur={(event) => {
          const shouldCommit = !cancelPendingRef.current;
          cancelPendingRef.current = false;
          if (shouldCommit) {
            onCommit(value);
          }
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          // Typing belongs to the field: a space or an Enter must not reach a shortcut or a toggle.
          event.stopPropagation();

          if (event.nativeEvent.isComposing) {
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            return;
          }

          if (event.key === "Escape") {
            event.preventDefault();
            cancelPendingRef.current = true;
            onCancel();
            event.currentTarget.blur();
          }
        }}
      />
    </span>
  );
}
