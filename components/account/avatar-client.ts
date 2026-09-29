"use client";

import { readPhiJsonError, requestPhiJson } from "../../helpers/client-json-request";

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
  const { ok, status, payload } = await requestPhiJson(AVATAR_URL, { signal });
  if (!ok) {
    throw new Error(`avatar_read_failed:${status}`);
  }
  return readAvatar(payload);
}

export async function setPhiViewerAvatar(assetId: number) {
  const { ok, status, payload } = await requestPhiJson(AVATAR_URL, { method: "PUT", body: { assetId } });
  if (!ok) {
    throw new Error(readPhiJsonError(payload, `avatar_write_failed:${status}`));
  }
  return readAvatar(payload);
}

export async function clearPhiViewerAvatar() {
  const { ok, status } = await requestPhiJson(AVATAR_URL, { method: "DELETE" });
  if (!ok) {
    throw new Error(`avatar_clear_failed:${status}`);
  }
}
