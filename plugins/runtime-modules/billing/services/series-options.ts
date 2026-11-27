"use client";

import { createPhiControlOptionsProviderClient } from "../../../../components/controls/phi-options-provider";
import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiJsonError, requestPhiJson } from "../../../../helpers/client-json-request";
import { PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { loadPhiBillingSeries, PHI_BILLING_SERIES_API_PATH } from "./series-table";

/**
 * The installed Add-ons that issue billing documents (their manifest declares `billing.issues`), as the
 * choices of a series' allowed Add-ons, by id. Core answers them with the series.
 */
export const PhiBillingIssuersOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.issuers,
  load: async () => (await loadPhiBillingSeries()).issuers,
  resolveLoadKey: () => "billing-issuers",
  resolve: (context) => {
    const issuers = Array.isArray(context.asyncData)
      ? context.asyncData.filter((issuer): issuer is string => typeof issuer === "string")
      : [];
    return { options: issuers.map((issuer) => ({ value: issuer, label: issuer })) };
  },
});

/** What the preview answered: the number, or the rule the template breaks, in Core's words. */
type PhiBillingNextNumberAnswer = { next: string } | { refused: string };

async function previewNextNumber(template: string, reset: string): Promise<PhiBillingNextNumberAnswer> {
  const reply = await requestPhiJson(`${PHI_BILLING_SERIES_API_PATH}/preview`, { method: "POST", body: { template, reset } });
  if (reply.ok && isPhiRecord(reply.payload) && typeof reply.payload.next === "string") return { next: reply.payload.next };
  return { refused: readPhiJsonError(reply.payload, `The preview failed with status ${reply.status}.`) };
}

/**
 * The number a template and reset would give the next document now, as Core answers it -- never worked
 * out in the browser. One option: the number, or, disabled, the rule the template breaks. Asked again for
 * every template and reset the Form holds; without a template there is nothing to ask.
 */
export const PhiBillingNextNumberOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_BILLING_RUNTIME_DATA_PROVIDER_KEYS.nextNumber,
  load: async ({ dependencies }) => {
    const template = typeof dependencies.template === "string" ? dependencies.template.trim() : "";
    const reset = typeof dependencies.reset === "string" ? dependencies.reset : "none";
    return template ? await previewNextNumber(template, reset) : null;
  },
  resolveLoadKey: ({ dependencies }) => `billing-next-number:${JSON.stringify([dependencies.template ?? "", dependencies.reset ?? ""])}`,
  resolve: (context) => {
    const answer = context.asyncData as PhiBillingNextNumberAnswer | null | undefined;
    if (!answer) return { options: [] };
    return "next" in answer
      ? { options: [{ value: answer.next, label: answer.next }] }
      : { options: [{ value: "", label: answer.refused, disabled: true }] };
  },
});
