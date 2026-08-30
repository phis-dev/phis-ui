import {
  PHI_BUILDER_PREVIEW_TTL_MS,
  parsePhiBuilderPreviewSnapshot,
  type PhiBuilderPreviewSnapshot,
  type PhiBuilderPreviewSnapshotId,
} from "./preview-transport";

type PhiBuilderPreviewStoreEntry = {
  snapshot: PhiBuilderPreviewSnapshot;
  expiresAt: number;
};

const GLOBAL_STORE_KEY = Symbol.for("@phis/ui/builder-preview-store");

function getStore(): Map<PhiBuilderPreviewSnapshotId, PhiBuilderPreviewStoreEntry> {
  const globalScope = globalThis as typeof globalThis & {
    [GLOBAL_STORE_KEY]?: Map<PhiBuilderPreviewSnapshotId, PhiBuilderPreviewStoreEntry>;
  };

  globalScope[GLOBAL_STORE_KEY] ??= new Map();
  return globalScope[GLOBAL_STORE_KEY];
}

function pruneExpiredPreviewSnapshots(now = Date.now()) {
  for (const [id, entry] of getStore()) {
    if (entry.expiresAt <= now) {
      getStore().delete(id);
    }
  }
}

function createPreviewSnapshotId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function savePhiBuilderPreviewSnapshot(snapshot: PhiBuilderPreviewSnapshot): PhiBuilderPreviewSnapshotId {
  const now = Date.now();
  pruneExpiredPreviewSnapshots(now);

  const id = createPreviewSnapshotId();
  getStore().set(id, {
    snapshot,
    expiresAt: now + PHI_BUILDER_PREVIEW_TTL_MS,
  });

  return id;
}

export function loadPhiBuilderPreviewSnapshot(
  id: string | null | undefined,
): PhiBuilderPreviewSnapshot | null {
  if (!id) {
    return null;
  }

  const now = Date.now();
  const entry = getStore().get(id);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now) {
    getStore().delete(id);
    return null;
  }

  entry.expiresAt = now + PHI_BUILDER_PREVIEW_TTL_MS;
  return entry.snapshot;
}

export function resolvePhiBuilderPreviewSnapshotFromSearchParam(
  value: string | null | undefined,
): PhiBuilderPreviewSnapshot | null {
  return loadPhiBuilderPreviewSnapshot(value) ?? parsePhiBuilderPreviewSnapshot(value);
}
