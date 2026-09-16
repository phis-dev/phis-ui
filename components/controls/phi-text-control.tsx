"use client";

import { Input } from "antd";
import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import type {
  ChangeEvent,
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  ReactNode,
  Ref,
} from "react";
import type { InputRef } from "antd/es/input";
import type { TextAreaRef } from "antd/es/input/TextArea";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import type { PhiTextInputType } from "./phi-text-types";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiTextControlPresentation = "input" | "password" | "textarea" | "hidden";

export type PhiTextControlProps = {
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
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  tabIndex?: number;
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  inputRef?: Ref<InputRef>;
  textareaRef?: Ref<TextAreaRef>;
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
    case "one-time-code":
      return { type: "text", inputMode: "numeric" };
    case "text":
    default:
      return { type: "text", inputMode: "text" };
  }
}

export function PhiTextControl({
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
  const resolvedKind = resolveTextInputKind(inputType);
  const stableAllowClear = {
    disabled: !allowClear,
    clearIcon: (
      <CloseOutlined aria-label={clearLabel} />
    ),
  };
  const commonProps = {
    ref: inputRef,
    "aria-label": ariaLabel,
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
        styles={inputStyle ? { textarea: inputStyle } : undefined}
        ref={textareaRef}
        allowClear={stableAllowClear}
        autoSize={autoSize}
        rows={rows}
        onPressEnter={onPressEnter}
      />
    );
  } else if (presentation === "password") {
    control = (
      <Input.Password
        {...commonProps}
        styles={inputStyle ? { input: inputStyle } : undefined}
        allowClear={stableAllowClear}
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
        suffix={resolvedKind.type === "search" ? <SearchOutlined /> : undefined}
        type={resolvedKind.type}
        onClear={onClear}
        onPressEnter={onPressEnter}
      />
    );
  }

  return (
    <PhiLabeledControl label={label} description={description} fill={style?.width === "100%"}>
      {control}
    </PhiLabeledControl>
  );
}
