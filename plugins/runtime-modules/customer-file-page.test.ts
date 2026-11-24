import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PhisThreadKind, PhisThreadStatus } from "../../constants/threads";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../constants/core-data-provider-keys";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";
import { checkPhiPresetTables } from "../../helpers/preset-table-check";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { validatePhiTableWidgetBinding } from "../../types/table-widget";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./threads/data-providers";
import { PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS } from "../../constants/customer-file";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES } from "./accounting/presets";
import { PHI_ACCOUNTING_CUSTOMER_FILE_PAGE_PRESET_KEY } from "./accounting/ids";
import { PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS } from "./accounting/customer-file-access";
import { PHI_THREADS_RUNTIME_MODULE_ROUTES } from "./threads/presets";
import {
  buildPhiCustomerFilePath,
  toPhiCustomerFilePersonRow,
  toPhiCustomerFileThreadRows,
} from "./threads/services/customer-file-table";

const PAGE = {
  id: 41,
  siteId: 1,
  areaMask: 4,
  path: "/customer-file",
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

const viewer = (flags: number) => ({
  access: "authenticated" as const,
  roleClaims: flags ? [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags }] : [],
  groupClaims: [],
});

const ROUTE = PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES.find((entry) => entry.presetKey === PHI_ACCOUNTING_CUSTOMER_FILE_PAGE_PRESET_KEY)!;

async function loadTree(flags: number) {
  return ROUTE.loadTree({ page: PAGE, runtime: { locale: { current: "en" }, viewer: viewer(flags) } } as never);
}

/** Staff's customer file (phis-server `GET /api/site/members/{userId}/file`). */
describe("the customer file page", () => {
  it("is the Accounting Module's, in Accounting only, its entry offered to accounting", () => {
    expect([ROUTE.area, ROUTE.path]).toEqual(["accounting", "/customer-file"]);
    expect(ROUTE.navigation?.[0]?.item.accessPolicy).toEqual(PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS);
    expect(PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS.allowedRoleFlags & PhiBaseRole.Supporter).toBe(0);
    expect(PHI_THREADS_RUNTIME_MODULE_ROUTES.some((route) => route.path === "/customer-file")).toBe(false);
  });

  it("picks the member with Core's member picker and hands the choice to the other two lists", async () => {
    const tree = await loadTree(PhiBaseRole.Accountant);
    expect(checkPhiPresetTreeContract(tree, { page: PAGE, forms: [] })).toEqual([]);
    expect(checkPhiPresetTables(tree, { dataProviders: PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS })).toEqual([]);
    const tables = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/table"));
    const provider = PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.table)!;
    for (const table of tables) {
      const parsed = PHI_TABLE_WIDGET_DEFINITION.parseConfig(table.config as Record<string, unknown>);
      const resource = provider.resources!.find((entry) => entry.resourceKey === parsed.source!.resourceKey)!;
      expect(validatePhiTableWidgetBinding(parsed, resource)).toEqual([]);
    }
    const [person, addresses, threads] = tables;
    const filters = (person!.config.features as { filters: { key: string; optionsProvider: { providerKey: string } }[] }).filters;
    expect(filters.map((filter) => [filter.key, filter.optionsProvider.providerKey]))
      .toEqual([["userId", PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers]]);
    const emits = (person!.config.signalRoutes as { emits: { capabilityId: string; receiver: string }[] }).emits;
    expect(emits.map((entry) => entry.capabilityId)).toEqual(["queryChange", "queryChange"]);
    expect(emits.map((entry) => entry.receiver)).toEqual([`cms:${addresses!.id}`, `cms:${threads!.id}`]);
    // The conversation and Core's Reply Form, with the internal note offered.
    expect(tree.contentWidgets.some((widget) => widget.widgetType.endsWith("/thread-conversation"))).toBe(true);
    const reply = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/form"))!;
    expect((reply.config.formConfig as { initialValues: unknown }).initialValues).toEqual({ internalAllowed: true });
    expect(tree.controllerSettings?.length).toBe(1);
  });

  it("reads nothing for a viewer without accounting, a Supporter included", async () => {
    for (const flags of [0, PhiBaseRole.Supporter]) {
      const tree = await loadTree(flags);
      expect(tree.contentWidgets.map((widget) => widget.widgetType.split("/").pop())).toEqual(["simple-text"]);
      expect(tree.controllerSettings).toBeUndefined();
    }
  });

  it("places the addresses for every viewer it is for", async () => {
    for (const flags of [PhiBaseRole.Accountant, PhiBaseRole.Maintainer]) {
      const tree = await loadTree(flags);
      expect(tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/table"))
        .map((widget) => (widget.config.source as { resourceKey: string }).resourceKey))
        .toEqual(["person", "addresses", "threads"]);
    }
  });

  it("reads Core's answer: the person, and the file first on the first page", () => {
    expect(buildPhiCustomerFilePath(5, new URLSearchParams({ page: "1", pageSize: "25" }))).toBe("/api/site/members/5/file?page=1&pageSize=25");
    expect(toPhiCustomerFilePersonRow({ userId: 5, displayName: "Ada", name: { firstName: "Ada", lastName: "Lovelace", companyName: null }, phone: { phone: "1", mobile: null } }))
      .toEqual({ userId: 5, displayName: "Ada", fullName: "Ada Lovelace", companyName: "", email: "", phone: "1", mobile: "" });
    const answer = { fileThreadId: 9, threads: [{ id: 3, kind: PhisThreadKind.Support, status: PhisThreadStatus.Open, unread: true }] };
    expect(toPhiCustomerFileThreadRows(answer, 1, "Customer file").map((row) => [(row as { id?: unknown }).id, row.kind, row.state]))
      .toEqual([[9, String(PhisThreadKind.File), "open"], [3, String(PhisThreadKind.Support), "unread"]]);
    expect(toPhiCustomerFileThreadRows(answer, 2, "Customer file").map((row) => (row as { id: number }).id)).toEqual([3]);
  });
});
