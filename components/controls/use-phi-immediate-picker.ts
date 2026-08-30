"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PhiPickerTransactionCallbacks } from "./phi-picker-control-contract";

export function usePhiImmediatePicker<TValue>({
  value,
  open: controlledOpen,
  disabled = false,
  onChange,
  onCommit,
  onDiscard,
  onOpenChange,
}: PhiPickerTransactionCallbacks<TValue> & {
  value: TValue;
  open?: boolean;
  disabled?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const transactionOpenRef = useRef(false);
  const snapshotRef = useRef(value);
  const latestValueRef = useRef(value);
  const visibleOpen = disabled ? false : controlledOpen ?? internalOpen;

  useEffect(() => {
    latestValueRef.current = value;
    if (!transactionOpenRef.current) {
      snapshotRef.current = value;
    }
  }, [value]);

  const setVisibleOpen = useCallback((nextOpen: boolean) => {
    if (controlledOpen == null) {
      setInternalOpen(nextOpen);
    }
  }, [controlledOpen]);

  const openPicker = useCallback(() => {
    if (disabled || transactionOpenRef.current) {
      return;
    }
    snapshotRef.current = latestValueRef.current;
    transactionOpenRef.current = true;
    setVisibleOpen(true);
    onOpenChange?.(true);
  }, [disabled, onOpenChange, setVisibleOpen]);

  const closePicker = useCallback((intent: "commit" | "discard") => {
    if (!transactionOpenRef.current) {
      setVisibleOpen(false);
      return;
    }

    transactionOpenRef.current = false;
    setVisibleOpen(false);
    if (intent === "discard") {
      const originalValue = snapshotRef.current;
      latestValueRef.current = originalValue;
      onChange?.(originalValue);
      onDiscard?.(originalValue);
    } else {
      onCommit?.(latestValueRef.current, snapshotRef.current);
    }
    onOpenChange?.(false);
  }, [onChange, onCommit, onDiscard, onOpenChange, setVisibleOpen]);

  const changeValue = useCallback((nextValue: TValue) => {
    latestValueRef.current = nextValue;
    onChange?.(nextValue);
  }, [onChange]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      openPicker();
      return;
    }
    closePicker("commit");
  }, [closePicker, openPicker]);

  useEffect(() => {
    if (visibleOpen && !transactionOpenRef.current) {
      openPicker();
      return;
    }
    if (!visibleOpen && transactionOpenRef.current) {
      closePicker("commit");
    }
  }, [closePicker, openPicker, visibleOpen]);

  useEffect(() => {
    if (!visibleOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      closePicker("discard");
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [closePicker, visibleOpen]);

  return {
    open: visibleOpen,
    value,
    changeValue,
    closePicker,
    handleOpenChange,
    openPicker,
  };
}
