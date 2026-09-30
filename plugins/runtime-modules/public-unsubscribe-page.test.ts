import { describe, expect, it } from "vitest";

import { PHI_PUBLIC_FORM_RUNTIME_MODULE_ROUTES } from "./area-base-presets";
import { PHI_SHARED_FORM_IDS } from "../../components/forms/shared-form-ids";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";

/**
 * The page a circular's footer leads to.
 *
 * Two things about it are obligations rather than choices, and both are easy to undo by accident. It must
 * not appear in any navigation -- nobody navigates to leaving, and a menu item advertises the exit to
 * people who never subscribed. And the press must be a `POST` carrying the token out of the address, never
 * a link that acts on being fetched: mail clients and scanners fetch the links in a message before anybody
 * has seen them.
 */
describe("the public unsubscribe page", () => {
  const route = PHI_PUBLIC_FORM_RUNTIME_MODULE_ROUTES
    .find((descriptor) => descriptor.path === "/unsubscribe");

  it("is a Public route of the base Module, and is in no navigation", () => {
    expect(route).toBeDefined();
    expect(route!.area).toBe("public");
    expect(route!.presetKey).toBe("public-unsubscribe-page");
    expect(route!.navigation).toEqual([]);
  });

  it("puts the token from the address into the form, and shows the form only with one", async () => {
    const page: PhiCmsPageNode = {
      id: 11,
      siteId: 3,
      areaMask: 2,
      path: "/unsubscribe",
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: 6,
      accessPolicy: PHI_VIEWER_ACCESS_ANYONE,
      titleMsgId: null,
      descriptionMsgId: null,
      heroRootLayoutNodeId: null,
      headerBottomRootLayoutNodeId: null,
      siderRightRootLayoutNodeId: null,
      footerTopRootLayoutNodeId: null,
      drawerRightRootLayoutNodeId: null,
      contentRootLayoutNodeId: null,
      layoutConfig: {},
    };

    const tree = await route!.loadTree({ page } as never);
    const widgets = tree.contentWidgets;
    const form = widgets.find((widget) => widget.widgetType.endsWith("/form"));

    expect(form).toBeDefined();
    const config = form!.config as Record<string, unknown>;
    expect(config.formId).toBe(PHI_SHARED_FORM_IDS.unsubscribe);
    expect(config.formConfig).toEqual({ initialValuesFromQuery: { token: "token" } });
    // Only with a token, so an address without one offers no button to press.
    expect(config.visibleWhen).toMatchObject({ valuePath: "query.token", operator: "truthy" });
    // Enter must not send it: the only field is hidden, so a stray keypress would be the whole action.
    expect(config.submitOnEnter).toBe(false);

    // And the other way round: something to read when the link arrived without its token.
    const incomplete = widgets.filter((widget) => widget.widgetType.endsWith("/description"));
    expect(incomplete).toHaveLength(2);
    expect(incomplete.map((widget) => (widget.config as Record<string, unknown>).visibleWhen))
      .toEqual([
        expect.objectContaining({ operator: "truthy" }),
        expect.objectContaining({ operator: "falsy" }),
      ]);
  });
});
