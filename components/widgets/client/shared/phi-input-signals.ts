"use client";

import type { PhiSignalAddress, PhiSignalRouteSet, PhiSignalScope } from "../../../../types";
import {
  type PhiControlSignalCommandValue,
  type PhiControlSignalEventValue,
  usePhiControlSignalController,
} from "./phi-control-signals";

export type PhiInputSignalEventValue = PhiControlSignalEventValue;
export type PhiInputSignalCommandValue = PhiControlSignalCommandValue;

export type PhiInputSignalControllerOptions = {
  key?: string | null;
  sender?: PhiSignalAddress | null;
  signalRoutes?: PhiSignalRouteSet | null;
  typeKey?: string | null;
  signalsEnabled?: boolean;
  initialDisabled?: boolean;
  initialReadOnly?: boolean;
  onSetValue?: (nextValue: string) => void;
  onClear?: () => void;
  onFocusRequest?: () => void;
  onBlurRequest?: () => void;
};

export type PhiInputSignalController = {
  key: string;
  signalScope: PhiSignalScope;
  disabled: boolean;
  readOnly: boolean;
  emitChange: (nextValue: string) => void;
  emitSubmit: () => void;
  emitFocus: () => void;
  emitBlur: () => void;
  emitClear: () => void;
};

export function usePhiInputSignalController({
  key,
  sender,
  signalRoutes,
  typeKey,
  signalsEnabled,
  initialDisabled,
  initialReadOnly,
  onSetValue,
  onClear,
  onFocusRequest,
  onBlurRequest,
}: PhiInputSignalControllerOptions): PhiInputSignalController {
  const controller = usePhiControlSignalController<string>({
    key,
    sender,
    signalRoutes,
    valueType: "string",
    typeKey,
    signalsEnabled,
    initialDisabled,
    initialReadOnly,
    clearValue: "",
    onSetValue,
    onClear,
    onFocusRequest,
    onBlurRequest,
    coerceValue: (value) => (typeof value === "string" ? value : value == null ? "" : String(value)),
  });

  return {
    key: controller.key,
    signalScope: controller.signalScope,
    disabled: controller.disabled,
    readOnly: controller.readOnly,
    emitChange: controller.emitChange,
    emitSubmit: controller.emitSubmit,
    emitFocus: controller.emitFocus,
    emitBlur: controller.emitBlur,
    emitClear: controller.emitClear,
  };
}
