import type { PhiFormGuardProps } from "./contracts";

/**
 * Asks the Site's form relay for a guard token, for a form whose descriptor declares `guard`.
 *
 * The relay issues one only for a form whose submit handler is active in the Area of the page asking,
 * so a refusal is a wiring fault to show, not something to retry.
 */
export async function requestPhiFormGuard(formId: string): Promise<PhiFormGuardProps> {
  const search = new URLSearchParams({ phase: "guard", formId });
  const response = await fetch(`/api/site/forms?${search.toString()}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || typeof payload?.issuedAt !== "string" || typeof payload.formToken !== "string") {
    throw new Error(typeof payload?.error === "string" ? payload.error : "The form could not be prepared.");
  }
  return { issuedAt: payload.issuedAt, formToken: payload.formToken };
}
