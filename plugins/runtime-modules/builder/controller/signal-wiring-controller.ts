"use client";

import {
  createPhiSignalRouteKey,
  readPhiSignalRouteSet,
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalRoute,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import { builderWorkspaceStore , getPhiDeveloperBuilderStateSnapshot } from "../developer-workspace-store";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderWorkspaceState } from "../developer-workspace-types";
import { getPhiDeveloperSelectedSignalRoutes } from "../signal-route-selection";
import {
  phiSignalCapabilitiesMatch,
  resolvePhiBuilderReceiverSignalEndpoints,
  resolvePhiBuilderSelectedSignalEndpoints,
} from "../signal-wiring-options";

const EMPTY_SESSION: PhiDeveloperBuilderWorkspaceState["signalWiring"] = {
  senderAddress: null,
  senderCapabilityId: null,
  receiverAddress: null,
  receiverCapabilityId: null,
  fieldKey: null,
};

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function patchPhiBuilderSignalWiringSession(
  defaultArea: PhiDeveloperBuilderArea,
  values: Record<string, unknown>,
) {
  builderWorkspaceStore.patch(defaultArea, (current) => {
    const senderAddress = readOptionalString(values.senderAddress) ?? current.signalWiring.senderAddress;
    // A cascade only holds if the values below the one that moved are dropped: keeping a capability that
    // belongs to the previous endpoint would build a route the runtime silently ignores.
    const senderChanged = senderAddress !== current.signalWiring.senderAddress;
    const senderCapabilityId = senderChanged
      ? null
      : readOptionalString(values.senderCapabilityId) ?? current.signalWiring.senderCapabilityId;
    const capabilityChanged = senderCapabilityId !== current.signalWiring.senderCapabilityId;
    const receiverAddress = senderChanged || capabilityChanged
      ? null
      : readOptionalString(values.receiverAddress) ?? current.signalWiring.receiverAddress;
    const receiverChanged = receiverAddress !== current.signalWiring.receiverAddress;
    return {
      ...current,
      signalWiring: {
        senderAddress,
        senderCapabilityId,
        receiverAddress,
        receiverCapabilityId: senderChanged || capabilityChanged || receiverChanged
          ? null
          : readOptionalString(values.receiverCapabilityId) ?? current.signalWiring.receiverCapabilityId,
        // The field belongs to the receiver's input, so it falls with everything above it.
        fieldKey: senderChanged || capabilityChanged || receiverChanged
          ? null
          : readOptionalString(values.fieldKey) ?? current.signalWiring.fieldKey,
      },
    };
  });
}

export function resetPhiBuilderSignalWiringSession(defaultArea: PhiDeveloperBuilderArea) {
  builderWorkspaceStore.patch(defaultArea, (current) => ({ ...current, signalWiring: { ...EMPTY_SESSION } }));
}

function routesAreEquivalent(left: PhiSignalRoute, right: PhiSignalRoute) {
  return left.capabilityId === right.capabilityId && left.scope === right.scope &&
    left.channel === right.channel && left.action === right.action && left.valueType === right.valueType &&
    (left.valueSchema ?? null) === (right.valueSchema ?? null) && left.receiver === right.receiver &&
    // Two routes into the same Form that fill different fields are two routes, not one twice.
    (left.fieldKey ?? null) === (right.fieldKey ?? null);
}

export type PhiBuilderSignalWiringResult =
  | { kind: "applied"; routes: PhiSignalRouteSet }
  | { kind: "incomplete" }
  | { kind: "mismatched" }
  | { kind: "duplicate" };

/**
 * Builds the route the session describes and folds it into the selected block's existing set.
 *
 * The compatibility check is repeated here rather than trusted from the options: the session survives a
 * selection change, and a route whose value the receiver cannot read is worse than no route at all --
 * nothing reports it at runtime.
 */
export function resolvePhiBuilderSignalWiringRoutes(
  defaultArea: PhiDeveloperBuilderArea,
): PhiBuilderSignalWiringResult {
  const state = getPhiDeveloperBuilderStateSnapshot(defaultArea);
  const session = state.signalWiring;
  if (!session.senderAddress || !session.senderCapabilityId || !session.receiverAddress || !session.receiverCapabilityId) {
    return { kind: "incomplete" };
  }

  const sender = resolvePhiBuilderSelectedSignalEndpoints(state)
    .find((endpoint) => endpoint.address === session.senderAddress) ?? null;
  const output = sender?.emits.find((capability) => capability.id === session.senderCapabilityId) ?? null;
  const receiver = resolvePhiBuilderReceiverSignalEndpoints(state)
    .find((endpoint) => endpoint.address === session.receiverAddress) ?? null;
  const input = receiver?.listens.find((capability) => capability.id === session.receiverCapabilityId) ?? null;
  if (!output || !receiver || !input || !phiSignalCapabilitiesMatch(output, input)) {
    return { kind: "mismatched" };
  }

  /*
   * An input that takes a Form field is not wired until the field is named: the value would arrive as
   * `{ fieldKey: undefined }` and the Form would write nothing, with nobody to report it.
   */
  const wantsFieldKey = input.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formField;
  if (wantsFieldKey && !session.fieldKey) {
    return { kind: "incomplete" };
  }

  const route: PhiSignalRoute = {
    routeKey: createPhiSignalRouteKey(),
    capabilityId: output.id,
    scope: receiver.routeScope,
    channel: input.channel,
    action: input.action,
    valueType: input.valueType,
    valueSchema: input.valueSchema ?? null,
    receiver: receiver.address,
    ...(wantsFieldKey && session.fieldKey ? { fieldKey: session.fieldKey } : {}),
  };

  const current = getPhiDeveloperSelectedSignalRoutes(defaultArea) ?? {};
  if ([...(current.emits ?? []), ...(current.listens ?? [])].some((candidate) => routesAreEquivalent(candidate, route))) {
    return { kind: "duplicate" };
  }

  const routes = readPhiSignalRouteSet({
    emits: [...(current.emits ?? []), route],
    listens: current.listens ?? [],
  });
  return routes ? { kind: "applied", routes } : { kind: "mismatched" };
}

/**
 * Removes one route from the selected block by its key.
 *
 * The routes Table lists what the block actually carries -- it runs without the provider's session key,
 * so its rows come straight from the draft config rather than from a staged copy. Removing therefore
 * writes to the same place Apply does, and the Table is reloaded afterwards.
 */
export function resolvePhiBuilderSignalWiringRoutesWithout(
  defaultArea: PhiDeveloperBuilderArea,
  routeKey: string,
): PhiSignalRouteSet | null {
  const current = getPhiDeveloperSelectedSignalRoutes(defaultArea) ?? {};
  const emits = (current.emits ?? []).filter((route) => route.routeKey !== routeKey);
  const listens = (current.listens ?? []).filter((route) => route.routeKey !== routeKey);
  if (emits.length === (current.emits ?? []).length && listens.length === (current.listens ?? []).length) {
    return null;
  }
  return readPhiSignalRouteSet({ emits, listens }) ?? { emits: [], listens: [] };
}
