"use client";

/**
 * Reading and writing the viewer's own avatar.
 *
 * Always the viewer's: the routes take no user id, so there is no argument here to get wrong.
 * Credentials are included because the session cookie is the whole authorization.
 */
export type PhiAvatarAsset = {
  id: number;
  /** Named as the Media projections name them: `deliveryUrl` is the original, the others are derived. */
  deliveryUrl?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  altText?: string | null;
  title?: string | null;
};

const AVATAR_URL = "/api/site/account/avatar";

function readAvatar(payload: unknown): PhiAvatarAsset | null {
  if (!payload || typeof payload !== "object") return null;
  const avatar = (payload as { avatar?: unknown }).avatar;
  if (!avatar || typeof avatar !== "object") return null;
  const id = (avatar as { id?: unknown }).id;
  return typeof id === "number" ? (avatar as PhiAvatarAsset) : null;
}

export async function fetchPhiViewerAvatar(signal?: AbortSignal) {
  const response = await fetch(AVATAR_URL, { credentials: "include", signal });
  if (!response.ok) {
    throw new Error(`avatar_read_failed:${response.status}`);
  }
  return readAvatar(await response.json().catch(() => null));
}

export async function setPhiViewerAvatar(assetId: number) {
  const response = await fetch(AVATAR_URL, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ assetId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? `avatar_write_failed:${response.status}`);
  }
  return readAvatar(await response.json().catch(() => null));
}

export async function clearPhiViewerAvatar() {
  const response = await fetch(AVATAR_URL, { method: "DELETE", credentials: "include" });
  if (!response.ok) {
    throw new Error(`avatar_clear_failed:${response.status}`);
  }
}
