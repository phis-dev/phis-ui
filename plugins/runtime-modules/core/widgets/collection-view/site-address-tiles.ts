import type { PhiCollectionProviderResourceDescriptor } from "../../../../../types/collection-provider";

/**
 * What an address tile reads of an item and offers on it (COLLECTIONS.md, "The address renderer"), apart
 * from drawing it. Pure and React-free, so the rules are tested as rules.
 */

/** The four marks a tile shows as tags, in this order: what the address is for, then what it is the default for. */
export const PHI_SITE_ADDRESS_PURPOSES = ["billing", "shipping", "defaultBilling", "defaultShipping"] as const;
export type PhiSiteAddressPurpose = (typeof PHI_SITE_ADDRESS_PURPOSES)[number];

/**
 * The item actions the renderer has a control for, in the order a tile draws them. `edit` is announced
 * on the Widget's `actionActivate` (`{ actionKey: "edit", itemKey }`) for the dialog that changes the
 * address; the other three are the Provider's own actions, run through the Binding (`itemKey` the
 * address id), whose answer is the collection as it now stands. `delete` asks first.
 */
export const PHI_SITE_ADDRESS_ITEM_ACTIONS = ["edit", "makeDefaultBilling", "makeDefaultShipping", "delete"] as const;
export type PhiSiteAddressItemAction = (typeof PHI_SITE_ADDRESS_ITEM_ACTIONS)[number];

export type PhiSiteAddressTile = {
  id: number;
  /** The company where there is one, else the name: what the address is made out to. */
  title: string;
  /** The name under a company, then the parts after it, one per line; empty parts left out. */
  lines: string[];
  purposes: PhiSiteAddressPurpose[];
  defaultBilling: boolean;
  defaultShipping: boolean;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * One item as a tile, from the shape `toPhiSiteAddressRow` answers (`helpers/site-address-row.ts`), or
 * null for one that is no address (no positive whole id): an item the renderer cannot name is not drawn
 * as a tile it could act on. `countryName` names a country code in the reader's language.
 */
export function readPhiSiteAddressTile(
  item: Readonly<Record<string, unknown>>,
  countryName: (code: string) => string,
): PhiSiteAddressTile | null {
  const id = item.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) return null;
  const company = text(item.companyName);
  const name = text(item.name);
  const place = [text(item.postalCode), text(item.city)].filter(Boolean).join(" ");
  const country = text(item.country);
  const marks = Array.isArray(item.purposes) ? item.purposes : [];
  return {
    id,
    title: company || name,
    lines: [company ? name : "", text(item.line1), text(item.line2), place, text(item.region), country ? countryName(country) : ""]
      .filter(Boolean),
    purposes: PHI_SITE_ADDRESS_PURPOSES.filter((purpose) => marks.includes(purpose)),
    defaultBilling: item.defaultBilling === true,
    defaultShipping: item.defaultShipping === true,
  };
}

/**
 * The item actions a tile offers: those the resource declares at item scope, in the renderer's order,
 * and of the two defaults only the one the address does not already hold. A resource that declares none
 * -- the customer file's -- is read-only, and its tiles offer nothing.
 */
export function resolvePhiSiteAddressTileActions(
  resource: Pick<PhiCollectionProviderResourceDescriptor, "actions"> | null | undefined,
  tile: Pick<PhiSiteAddressTile, "defaultBilling" | "defaultShipping">,
): PhiSiteAddressItemAction[] {
  const declared = new Set((resource?.actions ?? []).filter((action) => action.scope === "item").map((action) => action.key));
  return PHI_SITE_ADDRESS_ITEM_ACTIONS.filter((key) => declared.has(key) &&
    !(key === "makeDefaultBilling" && tile.defaultBilling) &&
    !(key === "makeDefaultShipping" && tile.defaultShipping));
}

/**
 * Why the placement asks for a tool the resource does not offer, or null: a toolbar action the resource
 * does not declare at resource scope, or a selection the resource announces under no schema. Said as the
 * Widget's failure rather than drawn as a control that does nothing.
 */
export function readPhiSiteAddressToolFailure({
  toolbarKeys,
  selection,
  resource,
}: {
  toolbarKeys: readonly string[];
  selection: boolean;
  resource: Pick<PhiCollectionProviderResourceDescriptor, "actions" | "resourceKey" | "selectionValueSchema"> | null | undefined;
}): string | null {
  const declared = new Set((resource?.actions ?? []).filter((action) => action.scope === "resource").map((action) => action.key));
  const missing = toolbarKeys.find((key) => !declared.has(key));
  if (missing) {
    return `The address tiles name the toolbar action "${missing}", which resource "${resource?.resourceKey ?? "unknown"}" does not declare.`;
  }
  if (selection && !resource?.selectionValueSchema) {
    return `The address tiles offer a choice, and resource "${resource?.resourceKey ?? "unknown"}" announces no selection schema.`;
  }
  return null;
}
