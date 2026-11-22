import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import { createPhiAccountingRuntimeModuleCatalog } from "./area-catalogs/accounting";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "./descriptor-compiler";
import { PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "./accounting/client-data-providers";
import { PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./accounting/data-providers";
import { PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION } from "./accounting/definition";
import {
  PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY,
  PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY,
  PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY,
  PHI_ACCOUNTING_RUNTIME_MODULE_ID,
} from "./accounting/ids";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES } from "./accounting/presets";
import { checkPhiPresetTreeContract } from "../../helpers/preset-tree-contract-check";
import { PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import type { PhiCmsPageNode } from "../../types/cms";
import { validatePhiTableWidgetBinding } from "../../types/table-widget";
import { validatePhiRecordWidgetBinding } from "../../helpers/record-widget";
import { createPhiSignalAddress } from "../../types/signals";
import { PHI_TABLE_WIDGET_DEFINITION } from "./core/widgets/table/config";
import { PHI_RECORD_WIDGET_DEFINITION } from "./core/widgets/record/config";

const PRODUCTS_PAGE = {
  id: 23,
  siteId: 3,
  areaMask: 32,
  path: "/products",
  pageType: PhiCmsPageType.Standard,
  status: PhiCmsStatus.Published,
  flags: 0,
  visibilityMask: 32,
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

const accountant = {
  access: "authenticated" as const,
  roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags: PhiBaseRole.Accountant }],
  groupClaims: [],
};

async function loadTree() {
  const route = PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES.find(
    (entry) => entry.presetKey === PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY,
  );
  return route!.loadTree({
    page: PRODUCTS_PAGE,
    runtime: { locale: { current: "en" }, viewer: accountant },
  } as never);
}

/** The Site's product directory, the Accounting Area's own Page (phis-server SERVER_ADDONS.md, products:v1). */
describe("the product directory page", () => {
  it("is a Page of the Accounting Area's base Module with a sidebar entry", () => {
    const entries = createPhiAccountingRuntimeModuleCatalog();
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "accounting",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });
    const route = resolvePhiCmsRoutePreset(table, "/products") ?? resolvePhiCmsRoutePreset(table, "/phis/ui/products");
    expect(route?.descriptor.presetKey).toBe(PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY);
    expect(route?.descriptor.ownerModuleId).toBe(PHI_ACCOUNTING_RUNTIME_MODULE_ID);
    const [navigation] = route?.descriptor.navigation ?? [];
    expect(navigation?.navKey).toBe("accounting:sidebar");
    expect(navigation?.anchor).toBe("main");
    expect(navigation?.item.routePresetKey).toBe(PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY);
    // Bound to Core alone: it has to work with no shop and no Add-on of its own.
    expect(PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION.serverBinding).toEqual({
      providerId: "@phis/server/core",
      requiredCapabilities: [],
    });
  });

  it("holds to the preset tree contract the descriptor compiler throws on", async () => {
    const tree = await loadTree();
    expect(checkPhiPresetTreeContract(tree, { page: PRODUCTS_PAGE, forms: [] })).toEqual([]);
  });

  it("binds its Table and the terms record to a Provider the Accounting Area loads in the browser", async () => {
    const tree = await loadTree();
    const source = { providerKey: PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY, resourceKey: PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY };
    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    const record = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/record"));
    expect(table?.config.source).toEqual(source);
    expect(record?.config.source).toEqual(source);
    expect(PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS.map((descriptor) => descriptor.key))
      .toContain(PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY);
    expect(PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS.map((definition) => definition.key))
      .toContain(PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY);
    expect(PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY).toBe("@phis/ui/modules/accounting/tables/products");
  });

  it("offers each act the Provider declares: the release through its dialog, lock and unlock with a question", async () => {
    const tree = await loadTree();
    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    const config = table!.config as {
      features: {
        actions: { row: { key: string; execution: string; confirm?: { title: string } }[] };
        filters: { key: string }[];
      };
    };
    const actions = config.features.actions.row;
    expect(actions.map((action) => [action.key, action.execution])).toEqual([
      ["release", "signal"], ["lock", "provider"], ["unlock", "provider"],
    ]);
    for (const action of actions.filter((entry) => entry.execution === "provider")) {
      expect(action.confirm?.title).toContain("%1");
    }
    // The dialog is the release's question; the row asks none of its own.
    expect(actions[0]?.confirm).toBeUndefined();
    expect(config.features.filters.map((filter) => filter.key)).toEqual(["supplier", "state", "pendingTerms"]);
    const [resource] = PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources;
    // The binding check the Table runs before it queries: actions, filters and the counted footer.
    const parsed = PHI_TABLE_WIDGET_DEFINITION.parseConfig(table!.config as Record<string, unknown>);
    expect(validatePhiTableWidgetBinding(parsed, resource)).toEqual([]);
  });

  it("opens the terms dialog and its record on the release row action, and sets the terms side by side", async () => {
    const tree = await loadTree();
    const [overlay] = tree.overlays;
    const record = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/record"));
    expect(overlay?.config.openActionKey).toBe("release");
    expect(record?.config.openActionKey).toBe("release");
    expect(record?.parentLayoutNodeId).toBe(overlay?.bodyLayoutNodeId);
    const presentation = record!.config.presentation as { columns: number; fields: { fieldKey: string }[] };
    expect(presentation.columns).toBe(2);
    const terms = presentation.fields.map((field) => field.fieldKey).filter((key) => /^(inForce|pending)/.test(key));
    expect(terms).toEqual([
      "inForceSale", "pendingSale",
      "inForceReferralUrl", "pendingReferralUrl",
      "inForceFree", "pendingFree",
      "inForceAccountRequired", "pendingAccountRequired",
      "inForceParts", "pendingParts",
    ]);
  });

  it("releases from the dialog: the footer's Release runs the record's action, and success closes it and reloads the Table", async () => {
    const tree = await loadTree();
    const [overlay] = tree.overlays;
    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"))!;
    const record = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/record"))!;
    const commands = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/command-toolbar"))!;
    const overlayAddress = createPhiSignalAddress("cms", overlay!.id);
    const recordAddress = createPhiSignalAddress("cms", record.id);
    const tableAddress = createPhiSignalAddress("cms", table.id);
    type Route = { capabilityId: string; channel: string; action: string; valueType: string; receiver: string };
    const routes = (config: Record<string, unknown>, side: "emits" | "listens") =>
      ((config.signalRoutes as Partial<Record<typeof side, Route[]>>)[side] ?? []).map(
        ({ capabilityId, channel, action, valueType, receiver }) => ({ capabilityId, channel, action, valueType, receiver }));

    // The record runs the Provider's release, named in its own actions, and the binding holds.
    const parsed = PHI_RECORD_WIDGET_DEFINITION.parseConfig(record.config as Record<string, unknown>);
    expect(parsed.actions).toEqual([{ key: "release", mode: "normal" }]);
    const [resource] = PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources;
    expect(validatePhiRecordWidgetBinding(parsed, resource)).toEqual([]);
    // Named after the product it shows.
    expect(parsed.titleFromRecord).toEqual({ template: "Terms: %1", field: "id" });

    // Footer: Cancel closes, Release (primary) sends the action's key to the record's input.
    const buttons = (commands.config as { buttons: { key: string; variant?: string; emits: { capabilityId: string; value?: unknown }[] }[] }).buttons;
    expect(buttons.map((button) => button.key)).toEqual(["cancel", "release"]);
    expect(buttons[1]).toMatchObject({ variant: "primary", emits: [{ capabilityId: "release", value: "release" }] });
    expect(routes(commands.config, "emits")).toEqual([
      { capabilityId: "close", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
      { capabilityId: "release", channel: "action", action: "activate", valueType: "string", receiver: recordAddress },
    ]);
    expect(routes(record.config, "listens")).toContainEqual(
      { capabilityId: "actionActivate", channel: "action", action: "activate", valueType: "string", receiver: recordAddress });

    // Success closes the dialog and reloads the Table, each heard where it goes; the title reaches the Overlay.
    expect(routes(record.config, "emits")).toEqual([
      { capabilityId: "recordTitle", channel: "title", action: "change", valueType: "string", receiver: overlayAddress },
      { capabilityId: "actionSuccess", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
      { capabilityId: "actionSuccess", channel: "reload", action: "activate", valueType: "none", receiver: tableAddress },
    ]);
    expect(routes(overlay!.config, "listens")).toEqual(expect.arrayContaining([
      { capabilityId: "title", channel: "title", action: "change", valueType: "string", receiver: overlayAddress },
      { capabilityId: "close", channel: "dialog", action: "close", valueType: "none", receiver: overlayAddress },
    ]));
    expect(routes(table.config, "listens")).toEqual([
      { capabilityId: "reload", channel: "reload", action: "activate", valueType: "none", receiver: tableAddress },
    ]);
  });

  it("is refused by the preset check where the record's title reaches no Overlay title input", async () => {
    const tree = await loadTree();
    const [overlay] = tree.overlays;
    const listens = (overlay!.config.signalRoutes as { listens: { capabilityId: string }[] }).listens;
    const broken = {
      ...tree,
      overlays: [{
        ...overlay!,
        config: { ...overlay!.config, signalRoutes: { ...(overlay!.config.signalRoutes as object), listens: listens.filter((route) => route.capabilityId !== "title") } },
      }],
    };
    const record = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/record"))!;
    expect(checkPhiPresetTreeContract(broken, { page: PRODUCTS_PAGE, forms: [] }).map((finding) => finding.message)).toEqual([
      `Preset Record "${record.id}" sends its title to Overlay "${overlay!.id}", which has no "title" route on page title/change.`,
    ]);
  });
});
