import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ permanentRedirect: vi.fn(), redirect: vi.fn() }));

import { PhiCmsPageType } from "../../constants/phi-cms";
import type { PhiCmsPageNode } from "../../types/cms";
import { resolvePhiCmsPageRedirect } from "./phi-cms-page-redirect";

function redirectPage(redirect: Record<string, unknown>) {
  return {
    path: "/old",
    pageType: PhiCmsPageType.Redirect,
    layoutConfig: { redirect },
  } as unknown as PhiCmsPageNode;
}

describe("resolvePhiCmsPageRedirect", () => {
  const target = { area: "public", path: "/new" };

  it("forwards temporarily or permanently only as the page states", () => {
    expect(resolvePhiCmsPageRedirect(redirectPage({ target, status: 307 }), "en"))
      .toEqual({ href: "/en/new", permanent: false });
    expect(resolvePhiCmsPageRedirect(redirectPage({ target, status: 308 }), "en"))
      .toEqual({ href: "/en/new", permanent: true });
  });

  it("refuses a forward without a status rather than making it permanent", () => {
    expect(() => resolvePhiCmsPageRedirect(redirectPage({ target }), "en")).toThrow(/status/);
    expect(() => resolvePhiCmsPageRedirect(redirectPage({ target, status: 200 }), "en")).toThrow(/status/);
  });

  it("does not forward onto the path the request already names", () => {
    expect(resolvePhiCmsPageRedirect(redirectPage({ target, status: 307 }), "en", "/en/new")).toBeNull();
  });
});
