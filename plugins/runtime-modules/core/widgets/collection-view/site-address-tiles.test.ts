import { describe, expect, it } from "vitest";

import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import { toPhiSiteAddressRow } from "../../../../../helpers/site-address-row";
import { PHI_COLLECTION_VIEW_WIDGET_DEFINITION } from "./config";
import {
  readPhiSiteAddressTile,
  readPhiSiteAddressToolFailure,
  resolvePhiSiteAddressTileActions,
} from "./site-address-tiles";

const COUNTRY = (code: string) => (code === "CH" ? "Switzerland" : code);
const ROW = toPhiSiteAddressRow({
  id: 3,
  companyName: "Analytical Engines",
  name: "Ada Lovelace",
  line1: "Main 1",
  postalCode: "3000",
  city: "Bern",
  country: "CH",
  flags: 1 | 2 | 8,
});
const ACTIONS = ["edit", "makeDefaultBilling", "makeDefaultShipping", "delete"].map((key) => ({ key, title: key, scope: "item" as const }));

/** The address renderer (COLLECTIONS.md, "The address renderer"). */
describe("an address tile", () => {
  it("names the company and the name, the parts a line each, the country in words, and the marks in order", () => {
    expect(readPhiSiteAddressTile(ROW, COUNTRY)).toEqual({
      id: 3,
      title: "Analytical Engines",
      lines: ["Ada Lovelace", "Main 1", "3000 Bern", "Switzerland"],
      purposes: ["billing", "shipping", "defaultShipping"],
      defaultBilling: false,
      defaultShipping: true,
    });
    const person = readPhiSiteAddressTile(toPhiSiteAddressRow({ id: 4, name: "Ada", line1: "Main 1", city: "Bern", country: "CH" }), COUNTRY);
    expect([person?.title, person?.lines]).toEqual(["Ada", ["Main 1", "Bern", "Switzerland"]]);
    // An item without an address id is no tile anybody could act on.
    expect(readPhiSiteAddressTile({ name: "Ada" }, COUNTRY)).toBeNull();
  });

  it("offers the item actions the resource declares, and a default only where the address does not hold it", () => {
    const tile = readPhiSiteAddressTile(ROW, COUNTRY)!;
    expect(resolvePhiSiteAddressTileActions({ actions: ACTIONS }, tile)).toEqual(["edit", "makeDefaultBilling", "delete"]);
    // The customer file's resource declares none: its tiles are read-only.
    expect(resolvePhiSiteAddressTileActions({}, tile)).toEqual([]);
    expect(resolvePhiSiteAddressTileActions({ actions: [{ key: "delete", title: "Remove", scope: "resource" }] }, tile)).toEqual([]);
  });

  it("refuses a toolbar action the resource does not declare and a choice it announces under no schema", () => {
    const resource = { resourceKey: "addresses", actions: [{ key: "create", title: "Add", scope: "resource" as const }] };
    expect(readPhiSiteAddressToolFailure({ toolbarKeys: ["create"], selection: false, resource })).toBeNull();
    expect(readPhiSiteAddressToolFailure({ toolbarKeys: ["upload"], selection: false, resource })).toMatch(/"upload"/u);
    expect(readPhiSiteAddressToolFailure({ toolbarKeys: [], selection: true, resource })).toMatch(/no selection schema/u);
    expect(readPhiSiteAddressToolFailure({
      toolbarKeys: [],
      selection: true,
      resource: { ...resource, selectionValueSchema: PHI_SIGNAL_VALUE_SCHEMAS.siteAddressSelection },
    })).toBeNull();
  });

  it("reads the prepared choice strictly", () => {
    const parse = (features: unknown) => PHI_COLLECTION_VIEW_WIDGET_DEFINITION.parseConfig({ features } as Record<string, unknown>).features.selection;
    expect(parse({ selection: { mode: "single" } })).toEqual({ mode: "single" });
    expect(parse({})).toBeUndefined();
    expect(() => parse({ selection: { mode: "multiple" } })).toThrow(/features\.selection\.mode/u);
  });
});
