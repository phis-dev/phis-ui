"use client";

import { createPhiPluginStateStore } from "../../../components/state/plugin-state-store";
import type { PhiBuilderNavigationTree } from "../../../helpers/cms-navigation-catalog";
import { phiBuilderHistory } from "./history";

const navigationDraftStore = createPhiPluginStateStore<Record<string, PhiBuilderNavigationTree>>(
  "@phis/ui/builder-navigation-drafts",
  () => ({}),
);

export function usePhiBuilderNavigationDrafts() {
  return navigationDraftStore.useStore("default");
}

export function usePhiBuilderNavigationDraft(navKey: string) {
  return navigationDraftStore.useStoreSelector("default", (drafts) => drafts[navKey] ?? null);
}

export function getPhiBuilderNavigationDraftsSnapshot() {
  return navigationDraftStore.getSnapshot("default");
}

export function getPhiBuilderNavigationDraftSnapshot(navKey: string) {
  return navigationDraftStore.getSnapshot("default")[navKey] ?? null;
}

export function setPhiBuilderNavigationDraft(
  navKey: string,
  draft: PhiBuilderNavigationTree,
  options?: {
    historyContext?: string | null;
    historyLabel?: string;
  },
) {
  const previousDraft = navigationDraftStore.getSnapshot("default")[navKey] ?? null;
  const previousAllocation = previousDraft?.draftAllocation ?? null;
  const requestedAllocation = draft.draftAllocation;
  const resolvedDraft = previousAllocation &&
    (!requestedAllocation || requestedAllocation.nextNodeSequence < previousAllocation.nextNodeSequence)
    ? { ...draft, draftAllocation: previousAllocation }
    : draft;
  if (Object.is(previousDraft, resolvedDraft)) {
    return;
  }

  navigationDraftStore.patch("default", (current) => ({
    ...current,
    [navKey]: resolvedDraft,
  }));

  if (options?.historyContext) {
    phiBuilderHistory.record(options.historyContext, {
      label: options.historyLabel ?? "Update navigation",
      before: {
        kind: "navigation",
        navKey,
        draft: previousDraft,
      },
      after: {
        kind: "navigation",
        navKey,
        draft: resolvedDraft,
      },
    });
  }
}

export function updatePhiBuilderNavigationDraft(
  navKey: string,
  update: (current: PhiBuilderNavigationTree | null) => PhiBuilderNavigationTree,
) {
  let resolved: PhiBuilderNavigationTree | null = null;
  navigationDraftStore.patch("default", (current) => {
    const currentDraft = current[navKey] ?? null;
    const requested = update(currentDraft);
    const currentAllocation = currentDraft?.draftAllocation ?? null;
    const requestedAllocation = requested.draftAllocation;
    resolved = currentAllocation &&
      (!requestedAllocation || requestedAllocation.nextNodeSequence < currentAllocation.nextNodeSequence)
      ? { ...requested, draftAllocation: currentAllocation }
      : requested;
    return { ...current, [navKey]: resolved };
  });
  if (!resolved) {
    throw new Error(`Navigation Draft "${navKey}" could not be updated.`);
  }
  return resolved;
}

export function clearPhiBuilderNavigationDraft(navKey: string) {
  navigationDraftStore.patch("default", (current) => {
    if (!(navKey in current)) {
      return current;
    }

    const next = { ...current };
    delete next[navKey];
    return next;
  });
}

export function restorePhiBuilderNavigationDraft(
  navKey: string,
  draft: PhiBuilderNavigationTree | null,
) {
  if (draft == null) {
    clearPhiBuilderNavigationDraft(navKey);
    return;
  }
  setPhiBuilderNavigationDraft(navKey, draft);
}
