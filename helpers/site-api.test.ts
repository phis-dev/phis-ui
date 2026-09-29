import { describe, expect, it } from "vitest";
import { PHIS_SITE_KEY_HEADER, PHIS_TOKEN_HEADER } from "../constants/http-headers";
import { buildApiHeaders, PHIS_UI_USER_AGENT } from "./site-api";

describe("buildApiHeaders", () => {
  it("adds no gateway block unless asked", () => {
    const headers = buildApiHeaders();
    expect(headers.has("accept")).toBe(false);
    expect(headers.has("user-agent")).toBe(false);
    expect(headers.has("content-type")).toBe(false);
    expect(headers.has("cookie")).toBe(false);
  });

  it("adds Accept and the phis-ui User-Agent for a gateway request", () => {
    const headers = buildApiHeaders({ gateway: true });
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("user-agent")).toBe(PHIS_UI_USER_AGENT);
    expect(PHIS_UI_USER_AGENT).toBe("phis-ui/1.0");
  });

  it("lets a gateway request name its own User-Agent", () => {
    const headers = buildApiHeaders({ gateway: true, userAgent: "phis-ui-sitemap/1.0" });
    expect(headers.get("user-agent")).toBe("phis-ui-sitemap/1.0");
  });

  it("adds the JSON Content-Type for a request with a JSON body", () => {
    expect(buildApiHeaders({ jsonBody: true }).get("content-type")).toBe("application/json");
  });

  it("forwards the cookie only when it is not blank", () => {
    expect(buildApiHeaders({ cookie: " a=1; b=2 " }).get("cookie")).toBe("a=1; b=2");
    expect(buildApiHeaders({ cookie: "   " }).has("cookie")).toBe(false);
    expect(buildApiHeaders({ cookie: null }).has("cookie")).toBe(false);
    expect(buildApiHeaders({ cookie: undefined }).has("cookie")).toBe(false);
  });

  it("sets token, site key and locale only when included and present", () => {
    const headers = buildApiHeaders({
      token: "t",
      siteKey: "s",
      locale: "de",
      includeToken: true,
      includeSiteKey: true,
      includeLocale: true,
    });
    expect(headers.get(PHIS_TOKEN_HEADER)).toBe("t");
    expect(headers.get(PHIS_SITE_KEY_HEADER)).toBe("s");
    expect(headers.get("x-locale")).toBe("de");

    const skipped = buildApiHeaders({ token: "t", siteKey: "", includeSiteKey: true });
    expect(skipped.has(PHIS_TOKEN_HEADER)).toBe(false);
    expect(skipped.has(PHIS_SITE_KEY_HEADER)).toBe(false);
  });
});
