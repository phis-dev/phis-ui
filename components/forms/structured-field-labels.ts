import type { PhiAddressPart } from "../../helpers/address-field";

/**
 * The `address` field's own wording, read from the Form's Label Set under these keys and falling back to
 * English, as the Media fields' are: one label per part, the sentence for each required part left empty,
 * one for a part longer than Core stores (`%1` the part's label, `%2` the most characters) and one for a
 * country that is no code of the list. A Form that places an address field states them in its Label Set.
 */
export const PHI_FORM_ADDRESS_LABEL_KEYS = {
  name: "addressName",
  companyName: "addressCompanyName",
  line1: "addressLine1",
  line2: "addressLine2",
  postalCode: "addressPostalCode",
  city: "addressCity",
  region: "addressRegion",
  country: "addressCountry",
  nameRequired: "addressNameRequired",
  line1Required: "addressLine1Required",
  cityRequired: "addressCityRequired",
  countryRequired: "addressCountryRequired",
  tooLong: "addressTooLong",
} as const satisfies Record<PhiAddressPart | `${"name" | "line1" | "city" | "country"}Required` | "tooLong", string>;

export const PHI_FORM_ADDRESS_DEFAULT_LABELS = {
  name: "Name",
  companyName: "Company",
  line1: "Street and number",
  line2: "Address line 2",
  postalCode: "Postal code",
  city: "City",
  region: "Region",
  country: "Country",
  nameRequired: "Enter the name the address is made out to.",
  line1Required: "Enter the street and number.",
  cityRequired: "Enter the city.",
  countryRequired: "Choose the country.",
  tooLong: "%1 takes at most %2 characters.",
} as const satisfies Record<keyof typeof PHI_FORM_ADDRESS_LABEL_KEYS, string>;

export type PhiFormAddressLabels = Record<keyof typeof PHI_FORM_ADDRESS_LABEL_KEYS, string>;

/** The address field's words from the Form's Label Set, each empty one in English. */
export function readPhiFormAddressLabels(labels: Readonly<Record<string, string>> | undefined): PhiFormAddressLabels {
  return Object.fromEntries(
    (Object.keys(PHI_FORM_ADDRESS_LABEL_KEYS) as (keyof typeof PHI_FORM_ADDRESS_LABEL_KEYS)[]).map((key) => [
      key,
      labels?.[PHI_FORM_ADDRESS_LABEL_KEYS[key]]?.trim() || PHI_FORM_ADDRESS_DEFAULT_LABELS[key],
    ]),
  ) as PhiFormAddressLabels;
}
