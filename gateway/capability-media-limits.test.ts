import { describe, expect, it } from "vitest";

import { readPhiCapabilityProviderMediaLimits } from "./capability-media-limits";

/**
 * An Add-on's Media limits reach the Site in its capability snapshot entry, and the Media fields of its
 * Module apply them. A limit misread there is a field that takes what the Add-on refuses on save, so the
 * reader is as strict as the manifest reader on phis-server's side.
 */
describe("reading a provider's Media limits from the capability snapshot", () => {
  it("reads none where none is stated, and each limit as stated", () => {
    expect(readPhiCapabilityProviderMediaLimits(undefined)).toBeUndefined();
    expect(readPhiCapabilityProviderMediaLimits({})).toEqual({});
    expect(readPhiCapabilityProviderMediaLimits({ maxFileBytes: 10_485_760, kinds: ["image", "pdf"], maxPerField: 12 }))
      .toEqual({ maxFileBytes: 10_485_760, kinds: ["image", "pdf"], maxPerField: 12 });
    expect(readPhiCapabilityProviderMediaLimits({ maxPerField: 3 })).toEqual({ maxPerField: 3 });
  });

  it.each([
    ["null", null],
    ["a list", []],
    ["a text", "image"],
    ["another key", { maxFiles: 3 }],
    ["a size of zero", { maxFileBytes: 0 }],
    ["a size that is no whole number", { maxFileBytes: 1.5 }],
    ["a size as text", { maxFileBytes: "1048576" }],
    ["a negative count", { maxPerField: -1 }],
    ["an empty list of kinds", { kinds: [] }],
    ["an unknown kind", { kinds: ["picture"] }],
    ["a kind twice", { kinds: ["image", "image"] }],
    ["kinds that are no list", { kinds: "image" }],
  ])("refuses %s", (_name, value) => {
    expect(() => readPhiCapabilityProviderMediaLimits(value)).toThrow("Invalid server capability provider media limits.");
  });
});
