import { describe, expect, it } from "vitest";

import {
  decodePhiProtectedMail,
  encodePhiProtectedMail,
  isPhiProtectedMail,
  protectPhiMailHref,
  splitPhiMailAddresses,
} from "./protected-mail";

/* An address leaves the server scrambled and comes back whole in the browser. */

describe("protected mail", () => {
  it("comes back as it went in, without itself in the string", () => {
    const token = encodePhiProtectedMail("mailto:info@phis.dev?subject=Hällo");
    expect(token).toMatch(/^phi-mail:[0-9a-f]+$/u);
    expect(token).not.toContain("info");
    expect(decodePhiProtectedMail(token)).toBe("mailto:info@phis.dev?subject=Hällo");
  });

  it("writes the same string for the same address, so hydration agrees", () => {
    expect(encodePhiProtectedMail("a@b.de")).toBe(encodePhiProtectedMail("a@b.de"));
  });

  it("protects only mailto hrefs", () => {
    expect(isPhiProtectedMail(protectPhiMailHref("mailto:a@b.de"))).toBe(true);
    expect(protectPhiMailHref("https://phis.dev")).toBe("https://phis.dev");
    expect(protectPhiMailHref("tel:+491234")).toBe("tel:+491234");
    expect(protectPhiMailHref(undefined)).toBeUndefined();
  });

  it("refuses what it did not write", () => {
    expect(decodePhiProtectedMail("phi-mail:zz")).toBeNull();
    expect(decodePhiProtectedMail("mailto:a@b.de")).toBeNull();
  });

  it("cuts a text where it names an address", () => {
    const segments = splitPhiMailAddresses("Write to info@phis.dev or sales@phis.dev.");
    expect(segments.map((segment) => segment.kind)).toEqual(["text", "mail", "text", "mail", "text"]);
    expect(JSON.stringify(segments)).not.toContain("@");
    expect(splitPhiMailAddresses("no address")).toEqual([{ kind: "text", text: "no address" }]);
  });
});
