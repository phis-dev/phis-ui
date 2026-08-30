import type { PhiSignal } from "../../types";
import { readPhiCmsInstanceId } from "../../types/cms-instance-id";

export const PHI_STACK_SIGNAL_CHANNEL = "stack";
export const PHI_STACK_META_SIGNAL_CHANNEL = "stackMeta";
export const PHI_STACK_ACTIVE_SLOT_SIGNAL_CHANNEL = "activeSlotIndex";
export const PHI_STACK_ACTIVE_SLOT_KEY_SIGNAL_CHANNEL = "activeSlotKey";

export type PhiStackSignalSlotMeta = {
  index: number;
  key: string;
  label: string;
  hasContent: boolean;
};

export type PhiStackSignalValue =
  | {
      activeSlotIndex: number;
      slots: PhiStackSignalSlotMeta[];
    };

export type PhiStackSignalMessage = {
  key: string;
  value: PhiStackSignalValue;
};

export function isPhiStackSignalMessage(value: unknown): value is PhiStackSignalMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<PhiStackSignalMessage>;
  const messageValue = message.value as Partial<PhiStackSignalValue> | null | undefined;
  return (
    typeof message.key === "string" &&
    message.key.trim().length > 0 &&
    !!messageValue &&
    typeof messageValue.activeSlotIndex === "number"
  );
}

export function resolvePhiStackSignalMessage(signal: PhiSignal): PhiStackSignalMessage | null {
  const value = signal.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  if (typeof (value as Partial<PhiStackSignalValue>).activeSlotIndex !== "number") {
    return null;
  }

  const address = signal.receiver === "broadcast" ? signal.sender ?? null : signal.receiver ?? signal.sender ?? null;
  const key = address?.startsWith("cms:")
    ? readPhiCmsInstanceId(address.slice("cms:".length).split(":", 1)[0])
    : null;
  if (!key) {
    return null;
  }

  return {
    key,
    value: value as PhiStackSignalValue,
  };
}
