"use client";

import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
  type PhiResolvedControlOptions,
} from "../../../components/controls/phi-options-provider";
import type {
  PhiSignalInputCapability,
  PhiSignalOutputCapability,
} from "../../../types/signals";
import {
  resolvePhiLayoutSignalEndpoints,
  resolvePhiRegionSignalEndpoints,
  resolvePhiWidgetSignalEndpoints,
  type PhiSignalEndpoint,
} from "../../../components/widgets/signals/signal-endpoints";
import { getPhiBuilderModuleMetasSnapshot } from "./plugin-meta-store";
import { getPhiBuilderDemandControllerSettingsSnapshot } from "./demand-controller-store";
import {
  collectPhiBuilderControllerSignalEndpoints,
  collectPhiBuilderSignalEndpointsFromDrafts,
} from "./signal-endpoints";
import {
  findPhiBuilderLayoutNodeById,
  findPhiBuilderWidgetNodeByIdInLayouts,
  findPhiBuilderWidgetNodeByIdInWidgets,
} from "./node-finders";
import { resolveRegionDraftKey } from "./developer-region-drafts";
import { builderWorkspaceStore, getPhiDeveloperRegionDraftsSnapshot , getPhiDeveloperBuilderStateSnapshot } from "./developer-workspace-store";
import type { PhiDeveloperBuilderWorkspaceState } from "./developer-workspace-types";

/**
 * Options for the four Signal wiring selects.
 *
 * The sender side is always the SELECTED block -- wiring answers "what does this block do to the rest
 * of the page", so offering other senders would only invite editing a route that belongs elsewhere. The
 * receiver side is every endpoint in the Area, because that is where a route may point.
 *
 * The cascade runs through `state.signalWiring`, which the Builder controller keeps in step with the
 * Form: a Form field's options provider sees its own static config, never its siblings' live values.
 */

function readState(context: PhiControlOptionsProviderContext) {
  return context.snapshot as PhiDeveloperBuilderWorkspaceState;
}

function formatOutputCapability(capability: PhiSignalOutputCapability) {
  return `${capability.id} · ${capability.action}:${capability.valueType}${capability.valueSchema ? ` · ${capability.valueSchema}` : ""}`;
}

function formatInputCapability(capability: PhiSignalInputCapability) {
  return `${capability.id} · ${capability.channel}/${capability.action}:${capability.valueType}${capability.valueSchema ? ` · ${capability.valueSchema}` : ""}`;
}

/**
 * A route only carries a value the receiver can read.
 *
 * What travels is the VALUE: the sender dispatches with the route's own channel, action and value type,
 * and the route takes all three from the receiver's capability -- "a channel has one canonical valueType
 * per receiver capability" (README). The sender's declared action is not part of the payload and does not
 * have to agree; it names what the sender does, not what the receiver hears.
 *
 * Requiring the two actions to match is what the Modal that predated the overlay contract did, and it
 * ruled out the most ordinary wiring there is: a Button's `activate` could not reach a block's
 * `visibility` toggle, so the receiver list came up empty for the output an author reaches for first.
 *
 * The value type still has to match exactly. A route that promises `none` drops the value on the way
 * out, and a mismatched schema arrives as something the receiver silently ignores.
 */
export function phiSignalCapabilitiesMatch(
  output: PhiSignalOutputCapability | null | undefined,
  input: PhiSignalInputCapability | null | undefined,
) {
  return Boolean(
    output &&
    input &&
    output.valueType === input.valueType &&
    (output.valueType !== "json" || output.valueSchema === input.valueSchema),
  );
}

export function resolvePhiBuilderSelectedSignalEndpoints(state: PhiDeveloperBuilderWorkspaceState): PhiSignalEndpoint[] {
  const plugins = getPhiBuilderModuleMetasSnapshot(state.area).plugins ?? [];
  const routeScope = "area" as const;
  if (state.nodeKind === "region") {
    const regionKey = state.selectedRegionKey;
    return regionKey ? [...resolvePhiRegionSignalEndpoints({ regionKey, label: regionKey, routeScope })] : [];
  }
  if (state.nodeId == null || !state.selectedRootRegionKey) {
    return [];
  }
  const draft = resolveRegionDraftKey(
    getPhiDeveloperRegionDraftsSnapshot(),
    state.area,
    state.selectedRootRegionKey,
    state.pageKey,
  );
  if (!draft) {
    return [];
  }
  if (state.nodeKind === "widget") {
    const widget = findPhiBuilderWidgetNodeByIdInWidgets(draft.rootNodeChildWidgets ?? [], state.nodeId) ??
      findPhiBuilderWidgetNodeByIdInLayouts(draft.rootNodeChildLayouts ?? [], state.nodeId);
    const plugin = widget
      ? plugins.find((candidate) => candidate.kind === "widget" &&
        (candidate.typeKey === widget.widgetType || `${candidate.pluginKey}/${candidate.typeKey}` === widget.widgetType))
      : null;
    return widget && plugin && plugin.kind === "widget"
      ? [...resolvePhiWidgetSignalEndpoints({
          blockId: widget.id,
          label: widget.label ?? widget.id,
          typeKey: plugin.typeKey,
          config: widget.config,
          runtimeSignals: plugin.runtimeSignals,
          signalSubcontrols: plugin.signalSubcontrols,
          routeScope,
        })]
      : [];
  }
  if (state.nodeKind === "layout") {
    const layout = findPhiBuilderLayoutNodeById(draft.rootNodeChildLayouts ?? [], state.nodeId);
    const plugin = layout
      ? plugins.find((candidate) => candidate.kind !== "widget" &&
        (candidate.typeKey === layout.widgetType || `${candidate.pluginKey}/${candidate.typeKey}` === layout.widgetType))
      : null;
    return layout && plugin && plugin.kind !== "widget"
      ? [...resolvePhiLayoutSignalEndpoints({
          blockId: layout.id,
          label: layout.label ?? layout.id,
          typeKey: plugin.typeKey,
          kind: "layout",
          runtimeSignals: plugin.runtimeSignals,
          routeScope,
        })]
      : [];
  }
  return [];
}

export function resolvePhiBuilderReceiverSignalEndpoints(state: PhiDeveloperBuilderWorkspaceState): PhiSignalEndpoint[] {
  const metas = getPhiBuilderModuleMetasSnapshot(state.area);
  return [
    ...collectPhiBuilderSignalEndpointsFromDrafts({
      regionDrafts: getPhiDeveloperRegionDraftsSnapshot(),
      builderPlugins: metas.plugins ?? [],
      area: state.area,
      pageKey: state.pageKey,
    }),
    ...collectPhiBuilderControllerSignalEndpoints({
      moduleDefinitions: state.runtimeModuleDefinitions,
      selectedModuleIds: state.runtimeModuleIdsByArea[state.area],
      area: state.area,
      demandSettings: getPhiBuilderDemandControllerSettingsSnapshot(state.area, state.pageKey),
    }),
  ];
}

function endpointOptions(endpoints: readonly PhiSignalEndpoint[]): PhiControlOption[] {
  return endpoints.map((endpoint) => ({
    value: endpoint.address,
    label: `${endpoint.label} · ${endpoint.address}`,
  }));
}

function findEndpoint(endpoints: readonly PhiSignalEndpoint[], address: string | null) {
  return address ? endpoints.find((endpoint) => endpoint.address === address) ?? null : null;
}

function resolveSenderOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const state = readState(context);
  return { options: endpointOptions(resolvePhiBuilderSelectedSignalEndpoints(state).filter((endpoint) => endpoint.emits.length > 0)) };
}

function resolveSenderCapabilityOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const state = readState(context);
  const sender = findEndpoint(resolvePhiBuilderSelectedSignalEndpoints(state), state.signalWiring.senderAddress);
  return {
    options: (sender?.emits ?? []).map((capability) => ({
      value: capability.id,
      label: formatOutputCapability(capability),
    })),
  };
}

function resolveReceiverOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const state = readState(context);
  const sender = findEndpoint(resolvePhiBuilderSelectedSignalEndpoints(state), state.signalWiring.senderAddress);
  const output = sender?.emits.find((capability) => capability.id === state.signalWiring.senderCapabilityId) ?? null;
  // Only endpoints that can actually receive the chosen output are offered; a route to anything else
  // would be accepted by the Form and dropped by the runtime.
  const receivers = resolvePhiBuilderReceiverSignalEndpoints(state).filter((endpoint) =>
    endpoint.address !== state.signalWiring.senderAddress &&
    (output == null
      ? endpoint.listens.length > 0
      : endpoint.listens.some((input) => phiSignalCapabilitiesMatch(output, input))));
  return { options: endpointOptions(receivers) };
}

function resolveReceiverCapabilityOptions(context: PhiControlOptionsProviderContext): PhiResolvedControlOptions {
  const state = readState(context);
  const sender = findEndpoint(resolvePhiBuilderSelectedSignalEndpoints(state), state.signalWiring.senderAddress);
  const output = sender?.emits.find((capability) => capability.id === state.signalWiring.senderCapabilityId) ?? null;
  const receiver = findEndpoint(resolvePhiBuilderReceiverSignalEndpoints(state), state.signalWiring.receiverAddress);
  return {
    options: (receiver?.listens ?? [])
      .filter((input) => output == null || phiSignalCapabilitiesMatch(output, input))
      .map((capability) => ({ value: capability.id, label: formatInputCapability(capability) })),
  };
}

const wiringProviderStore = {
  subscribe: (listener: () => void) => builderWorkspaceStore.subscribe("public", listener),
  getSnapshot: () => getPhiDeveloperBuilderStateSnapshot("public"),
};

export const PhiBuilderSignalSendersOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalSenders,
  ...wiringProviderStore,
  resolve: resolveSenderOptions,
});
export const PhiBuilderSignalSenderCapabilitiesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalSenderCapabilities,
  ...wiringProviderStore,
  resolve: resolveSenderCapabilityOptions,
});
export const PhiBuilderSignalReceiversOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalReceivers,
  ...wiringProviderStore,
  resolve: resolveReceiverOptions,
});
export const PhiBuilderSignalReceiverCapabilitiesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalReceiverCapabilities,
  ...wiringProviderStore,
  resolve: resolveReceiverCapabilityOptions,
});
