"use client";

import { useMemo } from "react";

import type { PhiRuntimeControllerSetting } from "../../../types";
import { createPhiPluginStateStore } from "../../../components/state/plugin-state-store";

type PhiBuilderDemandControllerState = {
  registrations: ReadonlyMap<string, {
    ownerKey: string;
    ownerMountScope: Extract<PhiRuntimeControllerSetting["mountScope"], "area" | "page">;
    pageKey: string | null;
    settings: readonly PhiRuntimeControllerSetting[];
  }>;
};

const demandControllerStore = createPhiPluginStateStore<PhiBuilderDemandControllerState>(
  "@phis/ui/builder-demand-controller-settings",
  () => ({ registrations: new Map() }),
);

function settingKey(setting: PhiRuntimeControllerSetting) {
  return `${setting.mountScope}:${setting.type}:${setting.instanceKey}`;
}

export function registerPhiBuilderDemandControllerSettings(
  area: string,
  registrationKey: string,
  ownerKey: string,
  ownerMountScope: Extract<PhiRuntimeControllerSetting["mountScope"], "area" | "page">,
  pageKey: string | null,
  settings: readonly PhiRuntimeControllerSetting[],
) {
  const localKeys = new Set<string>();
  for (const setting of settings) {
    const key = settingKey(setting);
    if (localKeys.has(key)) {
      throw new Error(`Duplicate Builder demand controller setting "${key}".`);
    }
    localKeys.add(key);
  }

  demandControllerStore.patch(area, (current) => {
    const registrations = new Map(current.registrations);
    registrations.set(registrationKey, { ownerKey, ownerMountScope, pageKey, settings });
    return { registrations };
  });

  return () => {
    demandControllerStore.patch(area, (current) => {
      if (current.registrations.get(registrationKey)?.settings !== settings) {
        return current;
      }
      const registrations = new Map(current.registrations);
      registrations.delete(registrationKey);
      return { registrations };
    });
  };
}

function resolveDemandControllerSettings(
  state: { registrations: Map<string, { ownerMountScope: string; pageKey: string | null; settings: readonly PhiRuntimeControllerSetting[] }> },
  pageKey: string,
) {
  const settingsByKey = new Map<string, PhiRuntimeControllerSetting>();
  for (const registration of state.registrations.values()) {
    if (registration.ownerMountScope === "page" && registration.pageKey !== pageKey) {
      continue;
    }
    for (const setting of registration.settings) {
      const key = settingKey(setting);
      if (!settingsByKey.has(key)) {
        settingsByKey.set(key, setting);
      }
    }
  }
  return [...settingsByKey.values()];
}

/**
 * Snapshot form of the hook below, for readers that are not components -- the Signal wiring options
 * providers resolve their receiver list outside React.
 */
export function getPhiBuilderDemandControllerSettingsSnapshot(area: string, pageKey: string) {
  return resolveDemandControllerSettings(demandControllerStore.getSnapshot(area) as never, pageKey);
}

export function usePhiBuilderDemandControllerSettings(area: string, pageKey: string) {
  const state = demandControllerStore.useStore(area);
  return useMemo(() => resolveDemandControllerSettings(state as never, pageKey), [pageKey, state]);
}
