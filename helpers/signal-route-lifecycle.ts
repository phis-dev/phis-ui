import {
  readPhiSignalRouteSet,
  type PhiSignalAddress,
  type PhiSignalReceiver,
  type PhiSignalRoute,
  type PhiSignalRouteSet,
  type PhiSignalScope,
} from "../types/signals";

export type PhiSignalRouteReceiverTarget = {
  address: PhiSignalAddress;
  scope: PhiSignalScope;
};

export type PhiSignalRouteReceiverRemap = {
  from: PhiSignalAddress;
  to: PhiSignalAddress;
  scope?: PhiSignalScope | null;
};

function isAddressOrSubcontrolOf(receiver: PhiSignalReceiver, address: PhiSignalAddress) {
  return receiver !== null &&
    receiver !== "broadcast" &&
    (receiver === address || receiver.startsWith(`${address}:`));
}

function routeTargetsReceiver(
  route: PhiSignalRoute,
  targets: readonly PhiSignalRouteReceiverTarget[],
) {
  return targets.some((target) =>
    route.scope === target.scope && isAddressOrSubcontrolOf(route.receiver, target.address),
  );
}

function pruneRouteList(
  routes: readonly PhiSignalRoute[] | null | undefined,
  targets: readonly PhiSignalRouteReceiverTarget[],
) {
  const current = routes ?? [];
  const next = current.filter((route) => !routeTargetsReceiver(route, targets));
  return next.length > 0 ? next : null;
}

export function prunePhiSignalRoutesByReceiver(
  routeSet: unknown,
  targets: readonly PhiSignalRouteReceiverTarget[],
): PhiSignalRouteSet | null {
  const current = readPhiSignalRouteSet(routeSet);
  if (!current) {
    return null;
  }

  const emits = pruneRouteList(current.emits, targets);
  const listens = pruneRouteList(current.listens, targets);
  return emits || listens ? { emits, listens } : null;
}

function remapReceiver(
  receiver: PhiSignalReceiver,
  scope: PhiSignalScope,
  remaps: readonly PhiSignalRouteReceiverRemap[],
): PhiSignalReceiver {
  if (receiver === null || receiver === "broadcast") {
    return receiver;
  }

  const remap = remaps.find((candidate) =>
    (candidate.scope == null || candidate.scope === scope) &&
    isAddressOrSubcontrolOf(receiver, candidate.from),
  );
  if (!remap) {
    return receiver;
  }

  return `${remap.to}${receiver.slice(remap.from.length)}` as PhiSignalAddress;
}

function remapRouteList(
  routes: readonly PhiSignalRoute[] | null | undefined,
  remaps: readonly PhiSignalRouteReceiverRemap[],
) {
  const current = routes ?? [];
  if (current.length === 0) {
    return null;
  }

  return current.map((route) => ({
    ...route,
    receiver: remapReceiver(route.receiver, route.scope, remaps),
  }));
}

export function remapPhiSignalRoutesByReceiver(
  routeSet: unknown,
  remaps: readonly PhiSignalRouteReceiverRemap[],
): PhiSignalRouteSet | null {
  const current = readPhiSignalRouteSet(routeSet);
  if (!current) {
    return null;
  }

  const orderedRemaps = [...remaps].sort((left, right) => right.from.length - left.from.length);
  const emits = remapRouteList(current.emits, orderedRemaps);
  const listens = remapRouteList(current.listens, orderedRemaps);
  return emits || listens ? { emits, listens } : null;
}

function updateConfigSignalRoutes(
  config: Record<string, unknown>,
  update: (routeSet: unknown) => PhiSignalRouteSet | null,
) {
  if (!Object.prototype.hasOwnProperty.call(config, "signalRoutes")) {
    return config;
  }

  const nextRoutes = update(config.signalRoutes);
  const nextConfig = { ...config };
  if (nextRoutes) {
    nextConfig.signalRoutes = nextRoutes;
  } else {
    delete nextConfig.signalRoutes;
  }
  return nextConfig;
}

export function prunePhiSignalRoutesFromConfig(
  config: Record<string, unknown>,
  targets: readonly PhiSignalRouteReceiverTarget[],
) {
  const current = readPhiSignalRouteSet(config.signalRoutes);
  if (
    current &&
    ![...(current.emits ?? []), ...(current.listens ?? [])].some((route) =>
      routeTargetsReceiver(route, targets),
    )
  ) {
    return config;
  }

  return updateConfigSignalRoutes(config, (routeSet) =>
    prunePhiSignalRoutesByReceiver(routeSet, targets),
  );
}

export function remapPhiSignalRoutesInConfig(
  config: Record<string, unknown>,
  remaps: readonly PhiSignalRouteReceiverRemap[],
) {
  const current = readPhiSignalRouteSet(config.signalRoutes);
  if (
    current &&
    ![...(current.emits ?? []), ...(current.listens ?? [])].some((route) =>
      remapReceiver(route.receiver, route.scope, remaps) !== route.receiver,
    )
  ) {
    return config;
  }

  return updateConfigSignalRoutes(config, (routeSet) =>
    remapPhiSignalRoutesByReceiver(routeSet, remaps),
  );
}
