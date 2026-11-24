import { PhisSiteAddressFlags } from "@phis/contracts/users";

/** The parts of an address a person writes (`PhisSiteAddressInput`), in the order a form asks them. */
export const PHI_SITE_ADDRESS_TEXT_KEYS = ["companyName", "name", "line1", "line2", "postalCode", "city", "region", "country"] as const;

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * One address of a Site's book (`PhisSiteAddress`) as a Table and an edit Form read it: its parts, one by
 * one and as the `address` field's value, the flags as four marks, as tags and as the number, and the parts
 * after the name on one line. Only the purposes and
 * defaults are read off the flags; Core lists no `Superseded` or `Removed` address to an account or a
 * customer file. Shared by the account's own addresses and staff's customer file.
 */
export function toPhiSiteAddressRow(address: Record<string, unknown>) {
  const flags = typeof address.flags === "number" ? address.flags : 0;
  const has = (bit: number) => (flags & bit) !== 0;
  const marks = {
    billing: has(PhisSiteAddressFlags.Billing),
    shipping: has(PhisSiteAddressFlags.Shipping),
    defaultBilling: has(PhisSiteAddressFlags.DefaultBilling),
    defaultShipping: has(PhisSiteAddressFlags.DefaultShipping),
  };
  const place = [text(address.postalCode), text(address.city)].filter(Boolean).join(" ");
  return {
    id: address.id,
    ...Object.fromEntries(PHI_SITE_ADDRESS_TEXT_KEYS.map((key) => [key, text(address[key]) ?? ""])),
    // The parts as one value, as the `address` Form field holds them: an edit Form opens on it.
    address: Object.fromEntries(PHI_SITE_ADDRESS_TEXT_KEYS.map((key) => [key, text(address[key])])),
    lines: [text(address.companyName), text(address.line1), text(address.line2), place || null, text(address.region), text(address.country)]
      .filter(Boolean).join(", "),
    purposes: (Object.keys(marks) as (keyof typeof marks)[]).filter((key) => marks[key]),
    ...marks,
    createdAt: address.createdAt ?? null,
    flags,
  };
}
