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
import { validatePhiTableWidgetBinding } from "../../helpers/table-widget-binding";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./threads/data-providers";
import { PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS } from "../../constants/customer-file";
import { PHI_SITE_ADDRESS_ITEM_RENDERER_KEY } from "../../constants/site-address";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES } from "./accounting/presets";
import { PHI_ACCOUNTING_CUSTOMER_FILE_PAGE_PRESET_KEY } from "./accounting/ids";
import { PHI_ACCOUNTING_CUSTOMER_FILE_ACCESS } from "./accounting/customer-file-access";
import { PHI_THREADS_RUNTIME_MODULE_ROUTES } from "./threads/presets";
import { createPhiThreadsControllerAddress } from "../../constants/threads-controller-address";
import { PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../components/regions/presets/phi-base-page-layout";
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

  it("picks the member with Core's member picker and hands the choice to the lists and the file", async () => {
    const tree = await loadTree(PhiBaseRole.Accountant);
    expect(checkPhiPresetTreeContract(tree, { page: PAGE, forms: [] })).toEqual([]);
    const provider = PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.table)!;
    if (provider.kind !== "table") throw new Error("The customer file Provider is a Table Provider.");
    // The footer rule is the Tables': the addresses tiles are no Table and are not judged by it.
    expect(checkPhiPresetTables(tree, { dataProviders: [provider] })).toEqual([]);
    const tables = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/table"));
    for (const table of tables) {
      const parsed = PHI_TABLE_WIDGET_DEFINITION.parseConfig(table.config as Record<string, unknown>);
      const resource = provider.resources.find((entry) => entry.resourceKey === parsed.source!.resourceKey)!;
      expect(validatePhiTableWidgetBinding(parsed, resource)).toEqual([]);
    }
    const [person, threads] = tables;
    const addresses = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/collection-view"))!;
    expect(addresses.config.source).toMatchObject({
      providerKey: PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.addresses,
      resourceKey: "addresses",
    });
    // Read-only: the resource offers the tiles no action, and the placement names none.
    const addressesProvider = PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_CUSTOMER_FILE_DATA_PROVIDER_KEYS.addresses)!;
    expect(addressesProvider.kind === "collection" ? "actions" in addressesProvider.resources[0]! : null).toBe(false);
    expect(addressesProvider.kind === "collection" ? addressesProvider.resources[0]!.itemRendererKey : null).toBe(PHI_SITE_ADDRESS_ITEM_RENDERER_KEY);
    // The member select stands first, alone in a Flex of its own: the input of everything below it.
    const picker = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/select-box"))!;
    const row = tree.layoutNodes.find((node) => node.id === picker.parentLayoutNodeId)!;
    expect([row.widgetType.split("/").pop(), row.parentLayoutNodeId, row.slotIndex]).toEqual(["flex", PHI_BASE_PAGE_LAYOUT_NODE_ID, 0]);
    expect(tree.contentWidgets.filter((widget) => widget.parentLayoutNodeId === PHI_BASE_PAGE_LAYOUT_NODE_ID)
      .map((widget) => widget.slotIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(picker.config).toMatchObject({
      label: "Member",
      allowClear: true,
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteMembers, loadMode: "server", search: { enabled: true } },
    });
    expect(picker.config.controlSize).toBeUndefined();
    const controller = createPhiThreadsControllerAddress();
    expect((picker.config.signalRoutes as { emits: { capabilityId: string; channel: string; valueType: string; receiver: string }[] }).emits
      .map((entry) => [entry.capabilityId, entry.channel, entry.valueType, entry.receiver])).toEqual([["change", "member", "string", controller]]);
    // The member search exists once: the person Table filters nothing of its own and sends nothing.
    expect((person!.config.features as { filters?: unknown }).filters).toBeUndefined();
    expect((person!.config.signalRoutes as { emits?: unknown }).emits).toBeUndefined();
    // Two readers: the file, which the Controller opens for the member, and the conversation chosen below it.
    const readers = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/thread-conversation"));
    expect(readers.map((widget) => widget.config.title ?? null)).toEqual(["File", null]);
    const controllerEmits = (tree.controllerSettings![0]!.config!.signalRoutes as { emits: { capabilityId: string; receiver: string }[] }).emits;
    expect(controllerEmits.filter((entry) => entry.capabilityId.startsWith("file")).map((entry) => entry.receiver))
      .toEqual([`cms:${readers[0]!.id}`, `cms:${readers[0]!.id}`]);
    // The member reaches both Tables from the Controller, as the filters they listen for.
    expect(controllerEmits.filter((entry) => entry.capabilityId === "memberFiltersChange").map((entry) => entry.receiver))
      .toEqual([`cms:${person!.id}`, `cms:${threads!.id}`]);
    for (const table of [person!, threads!]) {
      expect((table.config.signalRoutes as { listens: { capabilityId: string; channel: string }[] }).listens
        .filter((entry) => entry.channel === "filters").map((entry) => entry.capabilityId)).toEqual(["filtersChange"]);
    }
    // The member reaches the addresses tiles from the Controller, as binding params they listen for.
    const memberParams = controllerEmits.filter((entry) => entry.capabilityId === "memberParamsChange");
    expect(memberParams.map((entry) => entry.receiver)).toEqual([`cms:${addresses.id}`]);
    expect((addresses.config.signalRoutes as { listens: { capabilityId: string; channel: string }[] }).listens
      .map((entry) => [entry.capabilityId, entry.channel])).toEqual([["bindingParamsChange", "bindingParams"]]);
    // Each Reply reaches its own dialog's Form and the Controller, which so knows where the message landed.
    for (const reader of readers) {
      const replies = (reader.config.signalRoutes as { emits: { capabilityId: string; receiver: string }[] }).emits
        .filter((entry) => entry.capabilityId === "reply").map((entry) => entry.receiver);
      expect(replies).toHaveLength(3);
      expect(replies).toContain(controller);
    }
    // Core's Reply Form twice: the note's, where every message is internal, and the reply's, which offers it.
    const forms = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/form"));
    expect(forms.map((form) => (form.config.formConfig as { initialValues: unknown } | undefined)?.initialValues ?? null))
      .toEqual([null, { internalAllowed: true }]);
    expect(tree.overlays).toHaveLength(2);
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
      expect(tree.contentWidgets.filter((widget) => /\/(table|collection-view)$/u.test(widget.widgetType))
        .map((widget) => (widget.config.source as { resourceKey: string }).resourceKey))
        .toEqual(["person", "addresses", "threads"]);
    }
  });

  it("reads Core's answer: the person, and the conversations without the file", () => {
    expect(buildPhiCustomerFilePath(5, new URLSearchParams({ page: "1", pageSize: "25" }))).toBe("/api/site/members/5/file?page=1&pageSize=25");
    expect(toPhiCustomerFilePersonRow({ userId: 5, displayName: "Ada", name: { firstName: "Ada", lastName: "Lovelace", companyName: null }, phone: { phone: "1", mobile: null } }))
      .toEqual({ userId: 5, displayName: "Ada", fullName: "Ada Lovelace", companyName: "", email: "", phone: "1", mobile: "" });
    const answer = { fileThreadId: 9, threads: [{ id: 3, kind: PhisThreadKind.Support, status: PhisThreadStatus.Open, unread: true }] };
    expect(toPhiCustomerFileThreadRows(answer).map((row) => [(row as { id?: unknown }).id, row.kind, row.state]))
      .toEqual([[3, String(PhisThreadKind.Support), "unread"]]);
    // A row of the file the list carries is left out: the file has its own panel.
    const listed = { ...answer, threads: [{ id: 9, kind: PhisThreadKind.File, status: PhisThreadStatus.Open }, ...answer.threads] };
    expect(toPhiCustomerFileThreadRows(listed).map((row) => (row as { id?: unknown }).id)).toEqual([3]);
  });
});
