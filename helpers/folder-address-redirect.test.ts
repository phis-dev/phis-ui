import { describe, expect, it } from "vitest";

import { resolvePhiCmsPageRedirect } from "../components/cms/phi-cms-page-redirect";
import { PhiCmsPageType } from "../constants/phi-cms";
import { localizeAreaPath } from "./locale";
import { buildPhiFolderAddressRedirectPage } from "./cms-area-root-route";

/**
 * A folder address answers with a bare Redirect page, which the Layout turns into a 307 before the shell
 * flushes, the way it answers a forwarding Area root.
 */
describe("buildPhiFolderAddressRedirectPage", () => {
  const payload = buildPhiFolderAddressRedirectPage({
    siteId: 31,
    areaMask: 1,
    area: "public",
    path: "/docs",
    targetPath: "/docs/guides/start",
  });

  it("is a Redirect page on the requested path with nothing to render", () => {
    expect(payload.path).toBe("/docs");
    expect(payload.page.page).toMatchObject({ path: "/docs", pageType: PhiCmsPageType.Redirect, accessPolicy: { access: "anyone" } });
    expect(payload.page.regions).toEqual([]);
    expect(payload.page.contentWidgets).toEqual([]);
  });

  it("forwards temporarily, not permanently, to the target in the request's locale", () => {
    expect(resolvePhiCmsPageRedirect(payload.page.page, "de", "/de/docs")).toEqual({
      href: localizeAreaPath("de", "public", "/docs/guides/start"),
      permanent: false,
    });
  });
});
