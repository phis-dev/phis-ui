"use client";

import { Input, theme } from "antd";
import type {
  ChangeEvent,
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  ReactNode,
  Ref,
} from "react";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import type {
  PhiTextControlInputRef,
  PhiTextControlTextAreaRef,
  PhiTextInputType,
} from "./phi-text-types";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";
import { PhiIcon } from "../shell/phi-icon";

export type PhiTextControlPresentation = "input" | "password" | "textarea" | "hidden";

export type PhiTextControlProps = {
  /** The DOM id of the input, so a `<label for>` outside the control can name it. */
  id?: string;
  /**
   * The field's name in a form that submits the browser's way -- a `GET` form the page answers by its
   * query. Only such a form has a use for it; a controlled field in a Form host reads its value.
   */
  name?: string;
  value?: string | null;
  label?: ReactNode;
  description?: ReactNode;
  inputType?: PhiTextInputType;
  presentation?: PhiTextControlPresentation;
  disabled?: boolean;
  readOnly?: boolean;
  allowClear?: boolean;
  clearLabel?: string;
  placeholder?: string;
  ariaLabel?: string;
  prefix?: ReactNode;
  autoFocus?: boolean;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  /** How many characters wide a text area is where nothing else states a width. */
  cols?: number;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  tabIndex?: number;
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  inputRef?: Ref<PhiTextControlInputRef>;
  textareaRef?: Ref<PhiTextControlTextAreaRef>;
  onChange?: (nextValue: string | null) => void;
  onPressEnter?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onFocus?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onBlur?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  onClear?: () => void;
  style?: CSSProperties;
  /**
   * The style of the field's own text, where `style` places the control as a whole.
   *
   * Text that is edited where it is read -- a heading typed into in place -- has to look like the text
   * it replaces, in its size, weight and colour. That styling belongs to the field and not to the box
   * around it, and an Ant Design input draws those as two elements once it has a clear button.
   */
  inputStyle?: CSSProperties;
};

type ResolvedTextInputKind = {
  type: "text" | "url" | "tel" | "email" | "password" | "search";
  inputMode?: "text" | "url" | "tel" | "email" | "search" | "numeric";
};

function resolveTextInputKind(inputType: PhiTextInputType | null | undefined): ResolvedTextInputKind {
  switch (inputType) {
    case "url":
      return { type: "url", inputMode: "url" };
    case "phone":
      return { type: "tel", inputMode: "tel" };
    case "email":
      return { type: "email", inputMode: "email" };
    case "password":
      return { type: "password", inputMode: "text" };
    case "search":
      return { type: "search", inputMode: "search" };
    case "digits":
      return { type: "text", inputMode: "numeric" };
    case "text":
    default:
      return { type: "text", inputMode: "text" };
  }
}

/*
 * The first line of a text area, where its clear button belongs.
 *
 * Ant Design hangs the button absolutely from the box's top at `paddingXS`, which is the middle of the
 * first line only for a text area at its own padding. A field restyled to stand in its text -- no
 * padding, the text's own type, as the inline editors are -- had the cross half a line below its line.
 * Where the field states its own top padding, the button is given one line of the field from there,
 * with the cross in its middle: `1lh` in the field's type. A field at Ant Design's padding keeps
 * Ant Design's place.
 */
function readBlockStartPadding(style: CSSProperties | undefined): string | null {
  const value = style?.paddingBlockStart ?? style?.paddingTop ?? style?.paddingBlock ?? style?.padding;
  if (value == null) return null;
  if (typeof value === "number") return `${value}px`;
  // The first value of a shorthand, read past the spaces inside a `calc()`.
  const text = String(value).trim();
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (depth === 0 && /\s/u.test(character ?? "")) return text.slice(0, index);
  }
  return text || null;
}

function resolveTextAreaClearStyle(
  style: CSSProperties | undefined,
  inputStyle: CSSProperties | undefined,
): CSSProperties | null {
  const fieldPadding = readBlockStartPadding(inputStyle);
  if (fieldPadding == null) return null;
  const boxPadding = readBlockStartPadding(style) ?? "0px";
  const type: CSSProperties = inputStyle?.font != null
    ? { font: inputStyle.font }
    : {
        fontSize: inputStyle?.fontSize ?? "inherit",
        lineHeight: inputStyle?.lineHeight ?? "inherit",
        fontFamily: inputStyle?.fontFamily ?? "inherit",
      };
  return {
    ...type,
    insetBlockStart: `calc(${boxPadding} + ${fieldPadding})`,
    height: "1lh",
    display: "flex",
    alignItems: "center",
  };
}

export function PhiTextControl({
  id,
  name,
  value,
  label,
  description,
  inputType = "text",
  presentation = "input",
  disabled = false,
  readOnly = false,
  allowClear = true,
  clearLabel,
  placeholder,
  ariaLabel,
  prefix,
  autoFocus,
  autoComplete,
  minLength,
  maxLength,
  rows,
  cols,
  autoSize,
  tabIndex,
  size,
  variant,
  inputRef,
  textareaRef,
  onChange,
  onPressEnter,
  onKeyDown,
  onFocus,
  onBlur,
  onClear,
  style,
  inputStyle,
}: PhiTextControlProps) {
  const { labelId, labelledBy } = usePhiControlLabel(label, ariaLabel);
  const resolvedKind = resolveTextInputKind(inputType);
  const { token } = theme.useToken();
  const stableAllowClear = {
    disabled: !allowClear,
    clearIcon: (
      <PhiIcon name="close" size={token.fontSizeIcon} ariaLabel={clearLabel} />
    ),
  };
  const commonProps = {
    ref: inputRef,
    id,
    name,
    "aria-label": ariaLabel,
    "aria-labelledby": labelledBy,
    autoFocus,
    autoComplete,
    minLength,
    maxLength,
    disabled: disabled || (!onChange && !readOnly),
    placeholder,
    readOnly,
    size,
    variant,
    tabIndex,
    value: value ?? "",
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange?.(event.target.value),
    onFocus,
    onBlur,
    onKeyDown,
    style,
  };

  if (presentation === "hidden") {
    return <Input {...commonProps} type="hidden" />;
  }

  let control: ReactNode;
  if (presentation === "textarea") {
    control = (
      <Input.TextArea
        {...commonProps}
        styles={{
          ...(inputStyle ? { textarea: inputStyle } : {}),
          ...(allowClear ? { clear: resolveTextAreaClearStyle(style, inputStyle) ?? undefined } : {}),
        }}
        ref={textareaRef}
        allowClear={stableAllowClear}
        onClear={onClear}
        autoSize={autoSize}
        rows={rows}
        cols={cols}
        onPressEnter={onPressEnter}
      />
    );
  } else if (presentation === "password") {
    control = (
      <Input.Password
        {...commonProps}
        styles={inputStyle ? { input: inputStyle } : undefined}
        allowClear={stableAllowClear}
        onClear={onClear}
        prefix={prefix}
        onPressEnter={onPressEnter}
      />
    );
  } else {
    control = (
      <Input
        {...commonProps}
        styles={inputStyle ? { input: inputStyle } : undefined}
        allowClear={stableAllowClear}
        inputMode={resolvedKind.inputMode}
        prefix={prefix}
        suffix={resolvedKind.type === "search" ? <PhiIcon name="search" size="inherit" /> : undefined}
        type={resolvedKind.type}
        onClear={onClear}
        onPressEnter={onPressEnter}
      />
    );
  }

  return (
    <PhiLabeledControl label={label} labelId={labelId} description={description} fill={style?.width === "100%"}>
      {control}
    </PhiLabeledControl>
  );
}
