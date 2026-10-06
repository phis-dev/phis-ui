import type { PhiFormGuardProps } from "./contracts";

/** The code a submit handler answers with when the guard token is older than the Site allows. */
export const PHI_FORM_GUARD_EXPIRED_CODE = "form_expired";

/**
 * A guard token and the window it is good for, measured on this browser's clock: `readyAt` is the
 * first moment the handler accepts it, `expiresAt` the last. Both are taken on the safe side -- ready
 * from when the answer arrived, expiring from when it was asked for -- so neither clock skew nor the
 * request's own duration can put a submit outside the window the server measures.
 */
export type PhiFormGuardLease = {
  props: PhiFormGuardProps;
  readyAt: number;
  expiresAt: number;
};

/**
 * Asks the Site's form relay for a guard token, for a form whose descriptor declares `guard`.
 *
 * The relay issues one only for a form whose submit handler is active in the Area the page names
 * (`usePhiFormRelayArea`), so a refusal is a wiring fault to show, not something to retry.
 */
export async function requestPhiFormGuard(
  formId: string,
  area: string | null,
): Promise<PhiFormGuardLease> {
  const requestedAt = Date.now();
  const search = new URLSearchParams({ phase: "guard", formId, ...(area ? { area } : {}) });
  const response = await fetch(`/api/site/forms?${search.toString()}`, {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (
    !response.ok ||
    typeof payload?.issuedAt !== "string" ||
    typeof payload.formToken !== "string" ||
    typeof payload.minSubmitMs !== "number" ||
    typeof payload.maxSubmitMs !== "number"
  ) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "The form could not be prepared.");
  }
  return {
    props: { issuedAt: payload.issuedAt, formToken: payload.formToken },
    readyAt: Date.now() + payload.minSubmitMs,
    expiresAt: requestedAt + payload.maxSubmitMs,
  };
}
