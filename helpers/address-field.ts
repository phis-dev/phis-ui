import type { PhisSiteAddressInput } from "@phis/contracts/users";

import { readPhiCountryCode } from "../constants/countries";
import { isPhiRecord } from "./is-record";

/** The parts of an address a person writes (`PhisSiteAddressInput`), in the order the `address` field asks them. */
export const PHI_ADDRESS_PARTS = ["name", "companyName", "line1", "line2", "postalCode", "city", "region", "country"] as const;
export type PhiAddressPart = (typeof PHI_ADDRESS_PARTS)[number];

/** The parts Core refuses an address without (phis-server `readPhisSiteAddressInput`). */
export const PHI_ADDRESS_REQUIRED_PARTS = ["name", "line1", "city", "country"] as const satisfies readonly PhiAddressPart[];

/** The widths of `phis.site_addresses` Core holds each text part to; the country is a code. */
export const PHI_ADDRESS_PART_MAX_LENGTHS = {
  companyName: 256,
  name: 256,
  line1: 256,
  line2: 256,
  postalCode: 32,
  city: 128,
  region: 128,
} as const satisfies Partial<Record<PhiAddressPart, number>>;

type PhiAddressTextPart = keyof typeof PHI_ADDRESS_PART_MAX_LENGTHS;
const OPTIONAL_PARTS = new Set<PhiAddressPart>(["companyName", "line2", "postalCode", "region"]);

/**
 * The `address` field's value as a Form holds it: every part of `PhisSiteAddressInput`, an empty optional
 * part `null`, an empty required part `""`. Read leniently -- it is what somebody is typing -- and never
 * thrown on; whether it can be sent is `findPhiAddressProblems`'s answer.
 */
export function readPhiAddressFieldValue(value: unknown): PhisSiteAddressInput {
  const record = isPhiRecord(value) ? value : {};
  const part = (key: PhiAddressPart) => {
    const raw = typeof record[key] === "string" ? record[key] as string : "";
    return OPTIONAL_PARTS.has(key) && !raw ? null : raw;
  };
  return {
    name: part("name") ?? "",
    companyName: part("companyName"),
    line1: part("line1") ?? "",
    line2: part("line2"),
    postalCode: part("postalCode"),
    city: part("city") ?? "",
    region: part("region"),
    country: part("country") ?? "",
  };
}

/** The value a part change makes: the part written, an empty optional part `null` again. */
export function writePhiAddressFieldPart(
  value: PhisSiteAddressInput,
  part: PhiAddressPart,
  next: string | null,
): PhisSiteAddressInput {
  const text = next ?? "";
  return { ...value, [part]: OPTIONAL_PARTS.has(part) && !text ? null : text };
}

export type PhiAddressProblem =
  | { part: PhiAddressPart; kind: "required" }
  | { part: PhiAddressTextPart; kind: "tooLong"; max: number }
  | { part: "country"; kind: "country" };

/**
 * What keeps the address from being one Core takes, part by part in the field's order: a required part
 * empty (after trimming, as Core trims), a part longer than its column, a country that is no ISO 3166-1
 * alpha-2 code.
 */
export function findPhiAddressProblems(value: PhisSiteAddressInput): PhiAddressProblem[] {
  const problems: PhiAddressProblem[] = [];
  for (const part of PHI_ADDRESS_PARTS) {
    const text = (value[part] ?? "").trim();
    if ((PHI_ADDRESS_REQUIRED_PARTS as readonly PhiAddressPart[]).includes(part) && !text) {
      problems.push({ part, kind: "required" });
      continue;
    }
    if (part === "country") {
      if (!readPhiCountryCode(text)) problems.push({ part, kind: "country" });
      continue;
    }
    const max = PHI_ADDRESS_PART_MAX_LENGTHS[part];
    if (text.length > max) problems.push({ part, kind: "tooLong", max });
  }
  return problems;
}
