"use client";

import { useRef, type CSSProperties, type FocusEventHandler, type SyntheticEvent } from "react";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import { PhiTextControl } from "./phi-text-control";

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
  /** How much room the field takes around its text, where the text is not the only thing that decides. */
  size?: PhiControlSize;
  /** Where the editor sits among its neighbours. */
  style?: CSSProperties;
  /** How the text inside it looks, so an edit in place reads like the text it edits. */
  inputStyle?: CSSProperties;
  /** Marks the editor as a collapsible's title, which the collapsible checks before it toggles. */
  collapsibleTitleControl?: boolean;
  /**
   * The field has the shape of its text: as wide as the text, and wrapped where the room ends.
   *
   * Text read on the page wraps; a one-line field can only scroll, so the part that does not fit is
   * simply not there once the field is left -- which is how an edit in place shows a text the page shows
   * whole. The field is a text area here, and its width comes from the text itself rather than from a
   * character count: `ch` is the advance of a zero, and a proportional font spends more on a capital and
   * less on an `i`, so a counted width cuts the tail off the very text it was counted from.
   */
  fitContent?: boolean;
  /**
   * An × at the end that empties the text. Emptied is written at once: the × can be pressed without the
   * field having the focus, and then no blur would ever come to write it.
   */
  allowClear?: boolean;
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
  size,
  style,
  inputStyle,
  collapsibleTitleControl,
  fitContent,
  allowClear = false,
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
      {fitContent ? (
        /*
         * The same text in the same styles, hidden and flat: the width of the field, written out.
         *
         * A text area cannot be asked to be as wide as its text -- `cols` counts characters, which is the
         * thing that does not measure -- so this copy is asked instead, and the field is given all of it.
         * Of no height, so it says nothing about how tall the field is: that is the text area's own
         * `autoSize`, which measures the text where it wraps and needs no box metrics copied here. `pre-wrap`
         * so the copy breaks where the field breaks, and `overflow: hidden` because a box of no height still
         * has its text in it, and text hanging out of its box is something an ancestor can be made to
         * scroll. One space when there is nothing to show, so an empty field keeps a place for the caret.
         */
        <span
          aria-hidden="true"
          style={{
            ...inputStyle,
            display: "block",
            height: 0,
            paddingBlock: 0,
            borderBlockWidth: 0,
            whiteSpace: "pre-wrap",
            visibility: "hidden",
            overflow: "hidden",
          }}
        >
          {value || placeholder || " "}
        </span>
      ) : null}
      <PhiTextControl
        value={value}
        ariaLabel={ariaLabel}
        placeholder={placeholder}
        autoFocus={autoFocus}
        readOnly={readOnly}
        variant={variant}
        size={size}
        allowClear={allowClear}
        {...(allowClear ? { onClear: () => onCommit("") } : {})}
        presentation={fitContent ? "textarea" : "input"}
        autoSize={fitContent ? true : undefined}
        /*
         * One column, because the text decides.
         *
         * A text area's own width is `cols` characters wide -- twenty by default -- and in a box that
         * shrinks to fit its contents that guess is what the box would be, whatever the copy above says.
         * At one column it is the smallest thing in the box and the text is the widest, which is the
         * order this field is built on; it is also the width an empty field keeps.
         */
        cols={fitContent ? 1 : undefined}
        style={fitContent ? { width: "100%", overflow: "hidden" } : { width: "100%" }}
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
