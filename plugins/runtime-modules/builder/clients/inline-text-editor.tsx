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
  /**
   * The field is as wide as the text in it, and grows with it while it is typed.
   *
   * A character count cannot say how wide text is: `ch` is the advance of a zero, and a proportional
   * font spends more on a capital and less on an `i`, so a counted width cuts the tail off the very text
   * it was counted from -- and a field that scrolls shows that as a word ending mid-letter. The width
   * comes from the text itself instead.
   */
  fitContent?: boolean;
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
  fitContent,
}: PhiInlineTextEditorProps) {
  const cancelPendingRef = useRef(false);

  return (
    <span
      data-phi-collapsible-title-control={collapsibleTitleControl ? "true" : undefined}
      style={{
        display: "inline-block",
        minWidth: 0,
        maxWidth: "100%",
        ...style,
        // The copy below carries the width and the field is laid over it, which needs a box to lie in.
        ...(fitContent ? { position: "relative" } : null),
      }}
      onMouseDown={stopAtEditor}
      onPointerDown={stopAtEditor}
      onClick={stopAtEditor}
    >
      {fitContent ? (
        /*
         * The same text in the same styles, hidden: the width of the field, written out.
         *
         * `pre` so that spaces count here as they count in the field, and `overflow: hidden` because
         * where the room runs out this copy is the one thing still as wide as the whole text -- its box
         * is clamped, the text in it is not, and an ancestor would find something to scroll. One space
         * when there is nothing to show, so an empty field keeps a line for the caret to stand on.
         */
        <span
          aria-hidden="true"
          style={{
            ...inputStyle,
            display: "block",
            whiteSpace: "pre",
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
        allowClear={false}
        style={fitContent
          ? { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }
          : { width: "100%" }}
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
