import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PhisSiteAddressFlags } from "@phis/contracts/users";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { toPhiSiteAddressRow } from "../../helpers/site-address-row";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import { PHI_SITE_ADDRESS_ITEM_RENDERER_KEY } from "../../constants/site-address";
import { PHI_COLLECTION_VIEW_WIDGET_DEFINITION } from "./core/widgets/collection-view/config";
import { PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./app/data-providers";
import { PHI_APP_FORM_HANDLER_PROVIDER_DESCRIPTORS, PHI_APP_FORM_IDS, PHI_APP_RUNTIME_MODULE_FORMS } from "./app/forms";
import { buildPhiDefaultAppProfilePageTree } from "./app/trees/phi-default-app-profile-page-tree";
import {
  buildPhiAppAddressDefaultRequest,
  PHI_APP_ADDRESSES_COLLECTION_PROVIDER_REGISTRATION as PROVIDER,
} from "./app/services/addresses-collection";
import { shapePhiFormHandlerRequest } from "../../gateway/form-handler-request";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "../../components/forms/form-provider-contract";

const PROFILE_PAGE = {
  id: 7,
  siteId: 1,
  areaMask: 4,
  path: "/profile",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 4,
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
} satisfies PhiCmsPageNode;

async function loadTree() {
  return buildPhiDefaultAppProfilePageTree({
    page: PROFILE_PAGE,
    runtime: {
      locale: { current: "en" },
      site: { key: "site", availableLocales: [{ code: "en", label: "English" }] },
      viewer: {
        access: "authenticated",
        roleClaims: [],
        groupClaims: [],
        authorizationRevision: 0,
        profile: { firstName: "Ada", lastName: "Lovelace", phone: "+41 31 000 00 00", mobile: null },
      },
    } as never,
  });
}

/** The account's telephone numbers and addresses (phis-server `users:v1` routes). */
describe("the account's numbers and addresses", () => {
  it("places the numbers beside the name, started from the viewer, both always stated", async () => {
    const tree = await loadTree();
    const forms = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/form"));
    const name = forms.find((widget) => widget.config.formId === PHI_APP_FORM_IDS.profileName)!;
    const phone = forms.find((widget) => widget.config.formId === PHI_APP_FORM_IDS.profilePhone)!;
    expect(phone.parentLayoutNodeId).toBe(name.parentLayoutNodeId);
    expect((phone.config.formConfig as { initialValues: unknown }).initialValues).toEqual({ phone: "+41 31 000 00 00", mobile: "" });
    const handler = PHI_APP_FORM_HANDLER_PROVIDER_DESCRIPTORS.find((entry) => entry.handlerKey === "site.app.profile-phone");
    expect(handler).toMatchObject({ method: "PATCH", upstreamPath: "/api/v1/auth/profile/phone", credentialPolicy: "site-session" });
  });

  it("holds to the preset tree contract and draws the addresses as tiles that open the change dialog", async () => {
    const tree = await loadTree();
    const forms = PHI_APP_RUNTIME_MODULE_FORMS.map((form) => form.formId);
    expect(forms).toEqual(expect.arrayContaining([PHI_APP_FORM_IDS.addressCreate, PHI_APP_FORM_IDS.addressEdit]));
    expect(checkPhiPresetTreeContract(tree, { page: PROFILE_PAGE, forms: [] })).toEqual([]);
    // No Table is left on the Page: the addresses are a Collection drawn by Core's address renderer.
    expect(tree.contentWidgets.some((widget) => widget.widgetType.endsWith("/table"))).toBe(false);
    const view = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/collection-view"))!;
    const config = PHI_COLLECTION_VIEW_WIDGET_DEFINITION.parseConfig(view.config as Record<string, unknown>);
    const [resource] = PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources;
    expect(resource.itemRendererKey).toBe(PHI_SITE_ADDRESS_ITEM_RENDERER_KEY);
    expect(resource.recordRead).toBe(true);
    // Every toolbar action the placement names is one the resource declares.
    const declared = resource.actions.map((action) => action.key);
    expect(config.features.actions?.toolbar?.map((action) => action.key).every((key) => declared.includes(key))).toBe(true);
    // Add and change open their dialogs on the tiles' announcement; the change Form reads the tile's address.
    expect(tree.overlays.map((overlay) => overlay.config.openActionKey)).toEqual(["create", "edit"]);
    for (const overlay of tree.overlays) {
      const open = (overlay.config.signalRoutes as { listens: { capabilityId: string; valueSchema?: string }[] }).listens
        .find((route) => route.capabilityId === "open")!;
      expect(open.valueSchema).toBe(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction);
    }
    const editForm = tree.contentWidgets.find((widget) => widget.config.formId === PHI_APP_FORM_IDS.addressEdit)!;
    expect(editForm.config.source).toEqual(view.config.source);
    const recordOpen = (editForm.config.signalRoutes as { listens: { capabilityId: string; valueSchema?: string }[] }).listens
      .find((route) => route.capabilityId === "recordOpen")!;
    expect(recordOpen.valueSchema).toBe(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction);
  });

  it("reads one address for the change Form from the list, and answers a removal with the list as it now stands", async () => {
    const listed = [{ id: 3, name: "Ada", line1: "Main 1", city: "Bern", postalCode: "3000", country: "CH", flags: PhisSiteAddressFlags.Billing }];
    let removed = false;
    const fetchMock = vi.fn(async (_path: string, init?: RequestInit) => {
      if (init?.method === "DELETE") removed = true;
      return Response.json(init?.method === "DELETE" ? { ok: true } : { items: removed ? [] : listed });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const signal = new AbortController().signal;
      await expect(PROVIDER.readRecord({ resourceKey: "addresses", rowIdentity: 3, signal } as never))
        .resolves.toMatchObject({ id: 3, address: expect.objectContaining({ line1: "Main 1" }), flags: PhisSiteAddressFlags.Billing });
      await expect(PROVIDER.readRecord({ resourceKey: "addresses", rowIdentity: 4, signal } as never)).rejects.toThrow(/no longer one of yours/u);
      const answer = await PROVIDER.action({ resourceKey: "addresses", actionKey: "delete", itemKey: 3, signal } as never);
      expect(fetchMock.mock.calls.map(([path, init]) => [path, init?.method ?? "GET"])).toEqual([
        ["/api/site/account/addresses", "GET"],
        ["/api/site/account/addresses", "GET"],
        ["/api/site/account/addresses/3", "DELETE"],
        ["/api/site/account/addresses", "GET"],
      ]);
      expect(answer).toMatchObject({ resourceKey: "addresses", items: [], total: 0, error: null });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("sends Core's shape: the address and its flags as the two fields hold them, the version in the path", () => {
    const edit = PHI_APP_FORM_HANDLER_PROVIDER_DESCRIPTORS.find((entry) => entry.handlerKey === "site.app.address-edit")!;
    const address = { companyName: null, name: "Ada", line1: "Main 1", line2: null, postalCode: "3000", city: "Bern", region: null, country: "CH" };
    const flags = PhisSiteAddressFlags.Billing | PhisSiteAddressFlags.Shipping | PhisSiteAddressFlags.DefaultShipping;
    expect(shapePhiFormHandlerRequest({ upstreamPath: edit.upstreamPath!, values: { id: 9, address, flags } }))
      .toEqual({ path: "/api/site/account/addresses/9", body: { address, flags } });
    // The two Forms are the address and flags fields, the change with the hidden id.
    const editForm = PHI_APP_RUNTIME_MODULE_FORMS.find((form) => form.formId === PHI_APP_FORM_IDS.addressEdit)!;
    expect(editForm.descriptor.fields.map((field) => [field.key, field.fieldProviderKey])).toEqual([
      ["id", PHI_FORM_FIELD_PROVIDER_KEYS.hidden],
      ["address", PHI_FORM_FIELD_PROVIDER_KEYS.address],
      ["flags", PHI_FORM_FIELD_PROVIDER_KEYS.flags],
    ]);
  });

  it("reads an address's flags as marks and tags, and sets a default by sending it again", () => {
    const address = { id: 3, name: "Ada", line1: "Main 1", city: "Bern", postalCode: "3000", country: "CH", flags: PhisSiteAddressFlags.Billing | PhisSiteAddressFlags.Superseded };
    expect(toPhiSiteAddressRow(address)).toMatchObject({
      id: 3, lines: "Main 1, 3000 Bern, CH", billing: true, shipping: false, purposes: ["billing"],
    });
    expect(buildPhiAppAddressDefaultRequest(address, "makeDefaultShipping").flags)
      .toBe(PhisSiteAddressFlags.Billing | PhisSiteAddressFlags.Shipping | PhisSiteAddressFlags.DefaultShipping);
  });
});
