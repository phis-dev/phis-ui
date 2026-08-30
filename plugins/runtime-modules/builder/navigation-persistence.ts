"use client";

import {
  materializePhiBuilderNavigationSurface,
  requirePhiBuilderNavigationScopeKey,
  type PhiBuilderNavigationItem,
  type PhiBuilderNavigationTree,
} from "../../../helpers/cms-navigation-catalog";
import type {
  PhiCmsNavigationCustomItem,
  PhiCmsNavigationItemOverride,
  PhiCmsNavigationOverlay,
  PhiCmsResolvedNavigationSurface,
} from "../../../types/cms-module-descriptors";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";

type NavigationReadPayload = {
  key?: string;
  revisionId?: number | null;
  nextNodeSequence?: number | null;
  overlay?: PhiCmsNavigationOverlay | null;
  error?: string;
  details?: string[];
};

async function readJson(response: Response) {
  return (await response.json().catch(() => null)) as NavigationReadPayload | null;
}

async function fetchNavigation(url: string, init?: RequestInit): Promise<NavigationReadPayload | null> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = (await readJson(response)) as NavigationReadPayload | null;
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(body?.error ?? `Navigation request failed (${response.status}).`);
  }
  return body;
}

async function loadPhiBuilderNavigationOverlay(
  navKey: string,
  kind: "draft" | "published",
) {
  const normalized = requirePhiBuilderNavigationScopeKey(navKey);
  const suffix = kind === "draft" ? "/draft" : "";
  const payload = await fetchNavigation(
    `/api/site/cms/navigation${suffix}?key=${encodeURIComponent(normalized)}`,
  );
  if (!payload?.overlay) {
    return null;
  }
  return {
    revisionId: Number.isInteger(payload.revisionId) ? (payload.revisionId as number) : null,
    nextNodeSequence: Number.isInteger(payload.nextNodeSequence) ? (payload.nextNodeSequence as number) : null,
    overlay: payload.overlay,
  };
}

export async function loadPhiBuilderNavigationDraft(
  navKey: string,
  descriptorSurface: PhiCmsResolvedNavigationSurface,
) {
  const draft = await loadPhiBuilderNavigationOverlay(navKey, "draft");
  if (draft && draft.revisionId == null) {
    throw new Error("Navigation draft response is missing its revision id.");
  }
  if (draft && (draft.nextNodeSequence == null || draft.nextNodeSequence < 1)) {
    throw new Error("Navigation draft response is missing its next node sequence.");
  }
  return draft
    ? {
        revisionId: draft.revisionId,
        navigation: {
          ...materializePhiBuilderNavigationSurface(descriptorSurface, draft.overlay),
          draftAllocation: {
            revisionId: draft.revisionId!,
            nextNodeSequence: draft.nextNodeSequence!,
          },
        },
      }
    : null;
}

export async function loadPhiBuilderNavigationScope(
  navKey: string,
  descriptorSurface: PhiCmsResolvedNavigationSurface,
): Promise<{ draftRevisionId: number | null; navigation: PhiBuilderNavigationTree }> {
  const draft = await loadPhiBuilderNavigationDraft(navKey, descriptorSurface);
  if (draft) {
    return {
      draftRevisionId: draft.revisionId,
      navigation: draft.navigation,
    };
  }
  const published = await loadPhiBuilderNavigationOverlay(navKey, "published");
  return {
    draftRevisionId: null,
    navigation: materializePhiBuilderNavigationSurface(descriptorSurface, published?.overlay ?? null),
  };
}

type ItemPosition = {
  item: PhiBuilderNavigationItem;
  parentId: PhiCmsInstanceId | null;
  index: number;
};

function collectItemPositions(
  items: readonly PhiBuilderNavigationItem[],
  parentId: PhiCmsInstanceId | null,
  target = new Map<PhiCmsInstanceId, ItemPosition>(),
) {
  items.forEach((item, index) => {
    if (target.has(item.id)) {
      throw new Error(`Navigation contains duplicate item id "${item.id}".`);
    }
    target.set(item.id, {
      item,
      parentId,
      index,
    });
    collectItemPositions(item.children, item.id, target);
  });
  return target;
}

export function buildPhiBuilderNavigationOverlay(
  navigation: PhiBuilderNavigationTree,
): PhiCmsNavigationOverlay {
  const base = materializePhiBuilderNavigationSurface(navigation.descriptorSurface, null);
  const baseByKey = collectItemPositions(base.items, null);
  const currentByKey = collectItemPositions(navigation.items, null);
  for (const [id, current] of currentByKey) {
    if (!baseByKey.has(id) && current.item.source !== "custom") {
      throw new Error(`Navigation item "${id}" is not owned by an active module.`);
    }
    if (baseByKey.has(id) && current.item.source !== "module") {
      throw new Error(`Navigation custom item "${id}" conflicts with an active module item.`);
    }
  }
  const tombstones = [...baseByKey.keys()].filter((itemKey) => {
    const current = currentByKey.get(itemKey);
    return !current || current.item.hidden;
  });
  const itemOverrides: PhiCmsNavigationItemOverride[] = [];
  const customItems: PhiCmsNavigationCustomItem[] = [];
  const buildPlacement = (current: ItemPosition) => ({
    parentId: current.parentId,
    index: current.index,
  });
  for (const [id, current] of currentByKey) {
    const baseline = baseByKey.get(id);
    if (!baseline) {
      if (current.item.source !== "custom") {
        continue;
      }
      if (current.item.hidden) {
        throw new Error(`Navigation custom item "${id}" cannot be tombstoned.`);
      }
      customItems.push({
        id: current.item.id,
        kind: current.item.kind,
        label: current.item.label,
        ...(current.item.icon !== undefined ? { icon: current.item.icon } : {}),
        ...(current.item.kind === "link" && current.item.external === true && current.item.href
          ? { target: { kind: "external" as const, href: current.item.href } }
          : current.item.kind === "link" && current.item.targetReference
            ? { target: { kind: "page" as const, reference: current.item.targetReference } }
            : {}),
        ...(current.item.newTab === true ? { newTab: true } : {}),
        placement: buildPlacement(current),
      });
      continue;
    }
    const override: PhiCmsNavigationItemOverride = { id: current.item.id };
    if (current.item.label !== baseline.item.label) {
      override.label = current.item.label;
    }
    if ((current.item.icon ?? null) !== (baseline.item.icon ?? null)) {
      override.icon = current.item.icon ?? null;
    }
    if (
      current.parentId !== baseline.parentId ||
      current.index !== baseline.index
    ) {
      override.placement = {
        ...buildPlacement(current),
      };
    }
    if (override.label !== undefined || override.icon !== undefined || override.placement) {
      itemOverrides.push(override);
    }
  }
  return {
    navKey: requirePhiBuilderNavigationScopeKey(navigation.key) as PhiCmsNavigationOverlay["navKey"],
    ...(navigation.label && navigation.label !== base.label ? { label: navigation.label } : {}),
    itemOverrides,
    customItems,
    tombstones,
  };
}

export async function savePhiBuilderNavigationDraft(navigation: PhiBuilderNavigationTree) {
  const normalizedKey = requirePhiBuilderNavigationScopeKey(navigation.key);
  const persistedDraft = await loadPhiBuilderNavigationOverlay(normalizedKey, "draft");
  const source = persistedDraft ?? await loadPhiBuilderNavigationOverlay(normalizedKey, "published");
  const requestedNextNodeSequence = Math.max(
    navigation.draftAllocation?.nextNodeSequence ?? 1,
    source?.nextNodeSequence ?? 1,
  );
  const response = await fetch("/api/site/cms/navigation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: normalizedKey,
      overlay: buildPhiBuilderNavigationOverlay(navigation),
      nextNodeSequence: requestedNextNodeSequence,
    }),
  });
  const body = (await readJson(response)) as NavigationReadPayload | null;
  if (!response.ok) {
    throw new Error(body?.error ?? `Failed to save navigation draft (${response.status}).`);
  }
  const revisionId = Number.isInteger(body?.revisionId) ? (body?.revisionId as number) : null;
  if (revisionId == null || revisionId <= 0) {
    throw new Error("Navigation draft save did not return a revision.");
  }
  const nextNodeSequence = Number.isInteger(body?.nextNodeSequence)
    ? (body?.nextNodeSequence as number)
    : null;
  if (nextNodeSequence == null || nextNodeSequence < 1) {
    throw new Error("Navigation draft save did not return its next node sequence.");
  }
  return { key: normalizedKey, revisionId, nextNodeSequence };
}

export async function publishPhiBuilderNavigationDraft(
  navigation: PhiBuilderNavigationTree,
  revisionId?: number | null,
) {
  const normalizedKey = requirePhiBuilderNavigationScopeKey(navigation.key);
  const savedRevisionId = revisionId != null && Number.isInteger(revisionId) && revisionId > 0
    ? revisionId
    : (await savePhiBuilderNavigationDraft(navigation)).revisionId;
  const response = await fetch("/api/site/cms/navigation/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: normalizedKey, revisionId: savedRevisionId }),
  });
  const body = (await readJson(response)) as NavigationReadPayload | null;
  if (!response.ok) {
    throw new Error(body?.error ?? `Failed to publish navigation draft (${response.status}).`);
  }
  const publishedRevisionId = Number.isInteger(body?.revisionId) ? (body?.revisionId as number) : null;
  if (publishedRevisionId == null || publishedRevisionId <= 0) {
    throw new Error("Navigation publish did not return a revision.");
  }
  return { key: normalizedKey, revisionId: publishedRevisionId };
}

export async function deletePhiBuilderNavigationDraft(navKey: string) {
  const normalized = requirePhiBuilderNavigationScopeKey(navKey);
  const response = await fetch(`/api/site/cms/navigation?key=${encodeURIComponent(normalized)}`, {
    method: "DELETE",
  });
  const body = (await readJson(response)) as NavigationReadPayload | null;
  if (!response.ok) {
    throw new Error(body?.error ?? `Failed to reset navigation draft (${response.status}).`);
  }
  return { key: normalized };
}
