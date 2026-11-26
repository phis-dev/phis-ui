import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE, PHI_VIEWER_ACCESS_SITE_ADMIN } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";
import { checkPhiPresetTables } from "../../helpers/preset-table-check";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { validatePhiTableWidgetBinding } from "../../helpers/table-widget-binding";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./user-management/data-providers";
import {
  PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY,
  PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS,
} from "./user-management/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES } from "./user-management/presets";
import {
  PHI_USER_MANAGEMENT_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  PHI_USER_MANAGEMENT_FORM_IDS,
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_FORMS,
} from "./user-management/forms";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_VALIDATION_PROVIDER_KEYS } from "../../components/forms/form-provider-contract";
import {
  buildPhiUsersAccessGrantPath,
  buildPhiUsersAccessLogParams,
  PHI_USER_MANAGEMENT_USERS_ACCESS_TABLE_PROVIDER_REGISTRATION,
  toPhiUsersAccessAddonRow,
  toPhiUsersAccessLogRow,
} from "./user-management/services/users-access-table";

const PAGE = {
  id: 31,
  siteId: 1,
  areaMask: 2,
  path: "/settings/customer-data",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 2,
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

const route = PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES.find((entry) => entry.presetKey === PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY)!;

/** Core's answer to `GET /api/site/admin/users-access`, which the retention Form reads as its record. */
function answerRetention(retentionDays: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ retentionDays, addons: [] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function readRetentionRecord() {
  return PHI_USER_MANAGEMENT_USERS_ACCESS_TABLE_PROVIDER_REGISTRATION.readRecord({
    resourceKey: PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS.retention,
    rowIdentity: null,
    locale: "en",
    timeZone: "UTC",
    signal: new AbortController().signal,
  });
}

/** Nothing the Page builder may call: it also runs with no request, when the Presets' texts are collected. */
function refuseCore() {
  const fetchMock = vi.fn(async (input: unknown) => {
    throw new Error(`no Core while the page is built: ${String(input)}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function loadTree() {
  return route.loadTree({ page: PAGE, runtime: { locale: { current: "en" }, site: { key: "site" } } } as never);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Admin -> Settings -> Customer data (phis-server `/api/site/admin/users-access`, Site Admin only). */
describe("the customer data access page", () => {
  it("is a Settings entry of the Admin offered to Site Admins", () => {
    expect(route.area).toBe("admin");
    expect(route.path).toBe("/settings/customer-data");
    const [navigation] = route.navigation ?? [];
    expect(navigation).toMatchObject({ navKey: "admin:sidebar", anchor: "settings" });
    expect(navigation?.item.accessPolicy).toEqual(PHI_VIEWER_ACCESS_SITE_ADMIN);
  });

  it("holds to the preset contract and binds its two Tables to the Provider's resources", async () => {
    refuseCore();
    const tree = await loadTree();
    expect(checkPhiPresetTreeContract(tree, { page: PAGE, forms: PHI_USER_MANAGEMENT_RUNTIME_MODULE_FORMS })).toEqual([]);
    expect(checkPhiPresetTables(tree, { dataProviders: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS })).toEqual([]);
    const provider = PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess)!;
    const tables = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/table"));
    expect(tables.map((table) => (table.config.source as { resourceKey: string }).resourceKey)).toEqual(["addons", "log"]);
    for (const table of tables) {
      const parsed = PHI_TABLE_WIDGET_DEFINITION.parseConfig(table.config as Record<string, unknown>);
      const resource = provider.resources!.find((entry) => entry.resourceKey === parsed.source!.resourceKey)!;
      expect(validatePhiTableWidgetBinding(parsed, resource)).toEqual([]);
    }
  });

  it("is built without asking Core anything, and its retention Form reads its record when it mounts", async () => {
    const fetchMock = refuseCore();
    const tree = await loadTree();
    expect(fetchMock).not.toHaveBeenCalled();

    const forms = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/form"));
    expect(forms).toHaveLength(1);
    const [form] = forms;
    expect(form!.config).toMatchObject({
      formId: PHI_USER_MANAGEMENT_FORM_IDS.usersAccessRetention,
      source: {
        providerKey: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess,
        resourceKey: PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS.retention,
      },
      submit: "inline",
      execution: { mode: "handler" },
      feedback: { mode: "message" },
    });
    // A single-record Form: no open action to wait for, and no value of the build's own to start from.
    expect(form!.config).not.toHaveProperty("openActionKey");
    expect(form!.config.formConfig).not.toHaveProperty("initialValues");
    const resource = PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_KEYS.usersAccess)!
      .resources!.find((entry) => entry.resourceKey === PHI_USER_MANAGEMENT_USERS_ACCESS_RESOURCE_KEYS.retention)!;
    expect(resource.recordRead).toBe(true);
  });

  it("reads the retention record from Core's Admin route with the viewer's session, the number as the field", async () => {
    const fetchMock = answerRetention(90);
    await expect(readRetentionRecord()).resolves.toEqual({ id: "retention", days: 90 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/site/admin/users-access");
    expect(init.credentials).toBe("include");
  });

  it("refuses a retention Core does not answer as a number, in the Form rather than the Page", async () => {
    answerRetention(null);
    await expect(readRetentionRecord()).rejects.toThrow("The access log retention is invalid.");
  });

  it("states the retention as one whole number of days from 1 to 3650, saved by Core's retention route", () => {
    const form = PHI_USER_MANAGEMENT_RUNTIME_MODULE_FORMS
      .find((entry) => entry.formId === PHI_USER_MANAGEMENT_FORM_IDS.usersAccessRetention)!;
    expect(form.descriptor.fields).toHaveLength(1);
    const [field] = form.descriptor.fields;
    expect(field).toMatchObject({ key: "days", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number });
    expect(field!.validation?.map((rule) => rule.providerKey)).toEqual([
      PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
      PHI_FORM_VALIDATION_PROVIDER_KEYS.number,
    ]);
    expect(field!.validation?.[1]?.config).toEqual({ min: 1, max: 3650, integer: true });
    const handler = PHI_USER_MANAGEMENT_FORM_HANDLER_PROVIDER_DESCRIPTORS
      .find((entry) => entry.handlerKey === form.submitHandlerKey)!;
    expect(handler).toMatchObject({
      method: "PUT",
      upstreamPath: "/api/site/admin/users-access/retention",
      transport: "relay",
      credentialPolicy: "site-session",
    });
  });

  it("reads Core's rows: the acts by what awaits and what is granted, the log by subject and Add-on", () => {
    expect(toPhiUsersAccessAddonRow({ addonId: "@acme/crm", background: ["name", "email"], granted: ["name"], awaiting: ["email"] }))
      .toMatchObject({ hasAwaiting: true, hasGrant: true, fields: [] });
    expect(toPhiUsersAccessLogRow({ at: "2026-11-24T00:00:00Z", actor: null, fields: ["name"] }, 0, 1))
      .toMatchObject({ key: "1:0:2026-11-24T00:00:00Z", actor: "", fields: ["name"] });
    expect(buildPhiUsersAccessGrantPath("@acme/crm")).toBe("/api/site/admin/users-access/%40acme%2Fcrm");
    expect(buildPhiUsersAccessLogParams({ page: 2, pageSize: 50, filters: { subject: "s1", addonId: "@acme/crm" } }).toString())
      .toBe("page=2&pageSize=50&subject=s1&addonId=%40acme%2Fcrm");
  });
});
