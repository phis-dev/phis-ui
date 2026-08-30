import type { PhiSignalRoute } from "../../../types/signals";
import type { PhiSignalEndpoint } from "../../../components/widgets/signals/signal-endpoints";

function readSubcontrolKey(address: string) {
  const parts = address.split(":");
  return parts.length >= 3 ? parts.slice(2).join(":") : null;
}

export function ensureCommandToolbarButtonRoute(
  config: Record<string, unknown>,
  senderEndpoint: PhiSignalEndpoint,
  capabilityId: PhiSignalRoute["capabilityId"],
) {
  if (senderEndpoint.target !== "subcontrol") {
    return config;
  }

  const subcontrolKey = readSubcontrolKey(senderEndpoint.address);
  if (!subcontrolKey || !Array.isArray(config.buttons)) {
    return config;
  }

  let changed = false;
  const buttons = config.buttons.map((button) => {
    if (!button || typeof button !== "object" || Array.isArray(button)) {
      return button;
    }

    const record = button as Record<string, unknown>;
    if (record.key !== subcontrolKey) {
      return button;
    }

    const emits = Array.isArray(record.emits) ? record.emits : [];
    const hasRoute = emits.some((emit) =>
      Boolean(emit) &&
      typeof emit === "object" &&
      !Array.isArray(emit) &&
      (emit as Record<string, unknown>).capabilityId === capabilityId,
    );
    if (hasRoute) {
      return button;
    }

    changed = true;
    return {
      ...record,
      emits: [...emits, { capabilityId }],
    };
  });

  return changed ? { ...config, buttons } : config;
}
