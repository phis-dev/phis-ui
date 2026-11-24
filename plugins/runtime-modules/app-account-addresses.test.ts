import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PhisSiteAddressFlags } from "@phis/contracts/users";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";
import { checkPhiPresetTables } from "../../helpers/preset-table-check";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { validatePhiTableWidgetBinding } from "../../types/table-widget";
import { toPhiSiteAddressRow } from "../../helpers/site-address-row";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";
import { PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./app/data-providers";
import { PHI_APP_FORM_HANDLER_PROVIDER_DESCRIPTORS, PHI_APP_FORM_IDS, PHI_APP_RUNTIME_MODULE_FORMS } from "./app/forms";
import { buildPhiDefaultAppProfilePageTree } from "./app/trees/phi-default-app-profile-page-tree";
import { buildPhiAppAddressDefaultRequest } from "./app/services/addresses-table";
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

  it("holds to the preset tree contract and checks its addresses Table against the Provider", async () => {
    const tree = await loadTree();
    const forms = PHI_APP_RUNTIME_MODULE_FORMS.map((form) => form.formId);
    expect(forms).toEqual(expect.arrayContaining([PHI_APP_FORM_IDS.addressCreate, PHI_APP_FORM_IDS.addressEdit]));
    expect(checkPhiPresetTreeContract(tree, { page: PROFILE_PAGE, forms: [] })).toEqual([]);
    expect(checkPhiPresetTables(tree, { dataProviders: PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS })).toEqual([]);
    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"))!;
    const [resource] = PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources;
    expect(validatePhiTableWidgetBinding(PHI_TABLE_WIDGET_DEFINITION.parseConfig(table.config as Record<string, unknown>), resource)).toEqual([]);
    // Add and change open their dialogs; the edit Form reads the row it was opened on.
    expect(tree.overlays.map((overlay) => overlay.config.openActionKey)).toEqual(["create", "edit"]);
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
