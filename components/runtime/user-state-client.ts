"use client";

import { readPhisUserStateWrite } from "../../constants/user-state";
import type {
  PhisDeclarableUserStateKey,
  PhisUserStateStoredValue,
} from "../../types/user-state";

/**
 * Reading and writing what the viewer decided, from the browser.
 *
 * Always the viewer's own: the route takes no user id, so there is no argument here to get wrong, and
 * the session cookie is the whole authorization. What a Module may write is decided by its key prefix
 * against the Modules this Site runs -- a key of a Module that is switched off comes back refused.
 *
 * A declaration is passed in rather than looked up. The Module holds it (`userState` on its definition),
 * this only uses it to refuse a malformed value before spending a round trip -- and the refusal is the
 * same code Core runs, from `@phis/contracts`. Which does not make it the decision: the two packages
 * ship separately, so a server that disagrees is the one that is right.
 */

const USER_STATE_URL = "/api/site/user-state";

export type PhiUserStateWriteError = "refused" | "unavailable" | "too-large" | "failed";

export class PhiUserStateError extends Error {
  readonly kind: PhiUserStateWriteError;

  constructor(kind: PhiUserStateWriteError, message: string) {
    super(message);
    this.kind = kind;
  }
}

/**
 * Everything this Site's active Modules kept about the viewer.
 *
 * A key that was never written is absent, never a default: what absence means belongs to the Module
 * that declared the key, and "not dismissed" and "dismissed false" are the same thing only by
 * convention.
 */
export async function fetchPhiUserState(signal?: AbortSignal) {
  const response = await fetch(USER_STATE_URL, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new PhiUserStateError("failed", `user_state_read_failed:${response.status}`);
  }
  const payload = await response.json().catch(() => null) as { state?: unknown } | null;
  const state = payload?.state;
  return state && typeof state === "object" && !Array.isArray(state)
    ? state as Readonly<Record<string, PhisUserStateStoredValue>>
    : {};
}

/**
 * One key written, with the value the server ended up holding.
 *
 * The answer matters for the shape that does not store what it was given: a marker that was already
 * further along keeps its own value, and a caller that assumed otherwise would show a reader as having
 * unread what they read. `stored` is the current value where the caller has it, which lets the local
 * check refuse a backwards marker without asking.
 */
export async function writePhiUserState(input: {
  descriptor: PhisDeclarableUserStateKey;
  value: unknown;
  stored?: PhisUserStateStoredValue | null;
}) {
  const write = readPhisUserStateWrite(input.descriptor, input.value, input.stored);
  if (!write) {
    throw new PhiUserStateError(
      "refused",
      `${input.descriptor.key} was given a value its ${input.descriptor.shape} shape does not admit.`,
    );
  }

  const response = await fetch(USER_STATE_URL, {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      key: input.descriptor.key,
      shape: input.descriptor.shape,
      value: write.value,
      ...(input.descriptor.shape === "set" ? { limit: input.descriptor.limit } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new PhiUserStateError(
      response.status === 403 ? "unavailable" : response.status === 413 ? "too-large" : "failed",
      body?.error ?? `user_state_write_failed:${response.status}`,
    );
  }

  const payload = await response.json().catch(() => null) as { value?: unknown } | null;
  return (payload?.value ?? null) as PhisUserStateStoredValue | null;
}

/**
 * One key removed, which is not the same as writing a falsy value.
 *
 * A Site that offers somebody a way back -- showing a dismissed card again -- needs the key gone rather
 * than set to `false`, because absent is what the reading Module treats as "never decided".
 */
export async function clearPhiUserState(key: PhisDeclarableUserStateKey["key"]) {
  const response = await fetch(`${USER_STATE_URL}?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new PhiUserStateError(
      response.status === 403 ? "unavailable" : "failed",
      body?.error ?? `user_state_clear_failed:${response.status}`,
    );
  }
}
