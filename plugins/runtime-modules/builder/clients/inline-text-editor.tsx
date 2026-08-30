"use client";

import { useRef, type FocusEventHandler } from "react";

import { Input, type InputProps } from "antd";

export type PhiInlineTextEditorProps = Omit<
  InputProps,
  "value" | "onChange" | "onBlur" | "onKeyDown" | "onMouseDown" | "onPointerDown" | "onClick"
> & {
  value: string;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

export function PhiInlineTextEditor({
  value,
  onChange,
  onCommit,
  onCancel,
  onBlur,
  ...inputProps
}: PhiInlineTextEditorProps) {
  const cancelPendingRef = useRef(false);

  return (
    <Input
      {...inputProps}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => {
        const shouldCommit = !cancelPendingRef.current;
        cancelPendingRef.current = false;
        if (shouldCommit) {
          onCommit(value);
        }
        onBlur?.(event);
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
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
  );
}
