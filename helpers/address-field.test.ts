import { describe, expect, it } from "vitest";

import { findPhiAddressProblems, readPhiAddressFieldValue, writePhiAddressFieldPart } from "./address-field";
import { listPhiCountryOptions } from "./country-names";
import { PHI_ISO_3166_ALPHA2_CODES, readPhiCountryCode } from "../constants/countries";

/** The `address` and `country` Form fields (FORMS.md). */
describe("an address as one value", () => {
  it("reads what is typed leniently, an empty optional part null", () => {
    expect(readPhiAddressFieldValue({ name: "Ada", line2: "", country: "CH", other: 1 })).toEqual({
      name: "Ada", companyName: null, line1: "", line2: null, postalCode: null, city: "", region: null, country: "CH",
    });
    expect(readPhiAddressFieldValue(null).name).toBe("");
    const value = readPhiAddressFieldValue({});
    expect(writePhiAddressFieldPart(value, "region", "").region).toBeNull();
    expect(writePhiAddressFieldPart(value, "city", "Bern").city).toBe("Bern");
  });

  it("is held to what Core takes: the four required parts, the column widths, a country of the list", () => {
    const empty = readPhiAddressFieldValue({ name: " " });
    expect(findPhiAddressProblems(empty).map((problem) => [problem.part, problem.kind])).toEqual([
      ["name", "required"], ["line1", "required"], ["city", "required"], ["country", "required"],
    ]);
    const full = readPhiAddressFieldValue({ name: "Ada", line1: "Main 1", city: "Bern", country: "CH", postalCode: "x".repeat(33) });
    expect(findPhiAddressProblems(full)).toEqual([{ part: "postalCode", kind: "tooLong", max: 32 }]);
    expect(findPhiAddressProblems({ ...full, postalCode: "3000", country: "ch" })).toEqual([{ part: "country", kind: "country" }]);
    expect(findPhiAddressProblems({ ...full, postalCode: "3000" })).toEqual([]);
  });

  it("offers every ISO 3166-1 country by its code, named and sorted in the reader's language", () => {
    expect(PHI_ISO_3166_ALPHA2_CODES).toHaveLength(249);
    expect(readPhiCountryCode("CH")).toBe("CH");
    expect(readPhiCountryCode("ch")).toBeNull();
    const german = listPhiCountryOptions("de");
    expect(german.find((option) => option.value === "CH")?.label).toBe("Schweiz");
    expect(german.findIndex((option) => option.value === "AT")).toBeLessThan(german.findIndex((option) => option.value === "CH"));
    expect(listPhiCountryOptions("en").find((option) => option.value === "DE")?.label).toBe("Germany");
  });
});
