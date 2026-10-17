import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/*
 * The words, stubbed: a Label Set asks Core for the translation of every string, which wants an
 * installation. What this test reads is the wiring, and the wiring is the same whatever the words are.
 */
vi.mock("../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));
vi.mock("../../components/widgets/label-sets/content-entries", () => ({
  getPhiContentEntryEditorLabels: async () => ({
    searchPlaceholder: "",
    footer: "%1",
    statusLabel: "",
    statuses: { all: "", draft: "", published: "" },
    rowStatus: { draft: "", published: "", submitted: "" },
    columns: {
      title: "", slug: "", status: "", language: "", tags: "", published: "", expires: "", changed: "", author: "",
    },
    actions: { withdraw: "", delete: "", new: "", edit: "", publish: "", submit: "" },
    withdraw: { title: "", description: "" },
    submit: { title: "", description: "" },
    delete: { title: "", description: "" },
    empty: { text: "" },
    overlays: { publication: "" },
    form: {
      save: "", cancel: "", slugPlaceholder: "", slugError: "", titleError: "", subtitleLabel: "",
      contentLabel: "", contentPlaceholder: "", contentError: "", linkLabel: "",
      link: { none: "", page: "", external: "", pagePlaceholder: "", externalPlaceholder: "", newTab: "", pagesUnavailable: "" },
      translateLabel: "", publishedAtPlaceholder: "", expiresAtPlaceholder: "",
    },
  }),
}));
const KIND_LABELS = { widgetLabel: "entries", entryTitle: "Entry", createTitle: "New entry", emptyTitle: "None" };
vi.mock("./news/labels", () => ({ getPhiNewsKindLabels: async () => KIND_LABELS }));
vi.mock("./blog/labels", () => ({ getPhiBlogKindLabels: async () => KIND_LABELS }));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";
import { createPhiEditorRuntimeModuleCatalog } from "./area-catalogs/editor";
import { createPhiPublicRuntimeModuleCatalog } from "./area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "./descriptor-compiler";
import { resolvePhiRuntimeModuleSet } from "./resolver";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./core/ids";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./core/data-providers";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "./core/client-data-providers";
import {
  normalizePhiEntryListWidgetConfig,
  PHI_ENTRY_LIST_DEFAULT_LIMIT,
} from "./core/widgets/entry-list/config";
import { PHI_NEWS_FORM_IDS, PHI_NEWS_PRESET_KEYS, PHI_NEWS_RUNTIME_MODULE_ID } from "./news/ids";
import { PHI_NEWS_RUNTIME_MODULE_ROUTES } from "./news/presets";
import { PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS, PHI_NEWS_RUNTIME_MODULE_FORMS } from "./news/forms";
import { PHI_BLOG_FORM_IDS, PHI_BLOG_PRESET_KEYS, PHI_BLOG_RUNTIME_MODULE_ID } from "./blog/ids";
import { PHI_BLOG_RUNTIME_MODULE_ROUTES } from "./blog/presets";
import { PHI_BLOG_FORM_HANDLER_PROVIDER_DESCRIPTORS, PHI_BLOG_RUNTIME_MODULE_FORMS } from "./blog/forms";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../constants/core-data-provider-keys";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PhiCmsFlags, PhiCmsPageType, PhiCmsStatus } from "../../constants/phi-cms";
import { hasPhiFlag } from "../../helpers/flags";
import { readPhiLinkTarget, readPhiPageReference } from "../../types/references";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../types/access";
import type { PhiCmsPageNode } from "../../types/cms";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";

/**
 * Every kind's Module, read the same way (`CONTENT_ENTRIES.md`): what it brings to the Public and the
 * Editor Area, and that it brings nothing of its own besides Pages and Forms.
 */
const KINDS = [
  {
    kind: "news" as const,
    moduleId: PHI_NEWS_RUNTIME_MODULE_ID,
    routes: PHI_NEWS_RUNTIME_MODULE_ROUTES,
    presetKeys: PHI_NEWS_PRESET_KEYS,
    formIds: PHI_NEWS_FORM_IDS,
    forms: PHI_NEWS_RUNTIME_MODULE_FORMS,
    handlers: PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  },
  {
    kind: "blog" as const,
    moduleId: PHI_BLOG_RUNTIME_MODULE_ID,
    routes: PHI_BLOG_RUNTIME_MODULE_ROUTES,
    presetKeys: PHI_BLOG_PRESET_KEYS,
    formIds: PHI_BLOG_FORM_IDS,
    forms: PHI_BLOG_RUNTIME_MODULE_FORMS,
    handlers: PHI_BLOG_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  },
];

const viewerWith = (flags: number) => ({
  access: "authenticated" as const,
  roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags }],
  groupClaims: [],
});
const SITE = { defaultLocale: "de", sourceLocale: "en", availableLocales: [{ code: "de", label: "Deutsch" }, { code: "en", label: "English" }] };
const PUBLISHER_RUNTIME = { locale: { current: "en" }, site: SITE, viewer: viewerWith(PhiBaseRole.Publisher) };
const AUTHOR_RUNTIME = { locale: { current: "en" }, site: SITE, viewer: viewerWith(PhiBaseRole.Author) };

function pageAt(path: string, areaMask: number): PhiCmsPageNode {
  return {
    id: 21,
    siteId: 3,
    areaMask,
    path,
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
}

function routeTable(area: "public" | "editor") {
  const entries = area === "public" ? createPhiPublicRuntimeModuleCatalog() : createPhiEditorRuntimeModuleCatalog();
  return compilePhiCmsActiveRouteTable({
    catalog: resolvePhiCmsDescriptorCatalog(entries),
    area,
    activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
  });
}

describe("the entries surface Core carries for every kind", () => {
  it("resolves the list and the detail Widget in the Public Area with no kind's Module active", async () => {
    const moduleSet = await resolvePhiRuntimeModuleSet({
      catalog: createPhiPublicRuntimeModuleCatalog(),
      moduleIds: [],
      area: "public",
      serverCapabilities: null,
    });
    for (const type of [PhiCmsWidgetType.EntryList, PhiCmsWidgetType.EntryDetail]) {
      expect(moduleSet.installedOwnerModuleIdByWidgetType.get(type)).toBe(PHI_CORE_RUNTIME_MODULE_ID);
      expect(moduleSet.widgetDefinitionsByType.has(type)).toBe(true);
    }
  });

  it("declares one Table resource per kind, with an offset page and the tag facet", () => {
    const table = PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries);
    expect(table?.resources?.map((resource) => resource.resourceKey)).toEqual(["news", "blog"]);
    type Resource = {
      resourceKey: string;
      rowIdentityPath?: string;
      query?: unknown;
      actions?: readonly { key: string }[];
      fields?: readonly { key: string }[];
    };
    for (const resource of (table?.resources ?? []) as readonly Resource[]) {
      expect(resource.rowIdentityPath).toBe("contentId");
      expect(resource.query).toMatchObject({ pagination: "offset", search: true, facets: ["tags"] });
      expect(resource.actions?.map((action) => action.key)).toEqual(["withdraw", "delete", "refresh"]);
      expect(resource.fields?.find((field) => field.key === "tags")).toMatchObject({
        type: "enum[]",
        optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags },
      });
    }
  });

  // A declared Provider whose Client nobody registered answers nothing in a browser, silently.
  it("registers a Client for both Providers it declares", () => {
    const clients = new Set(PHI_CORE_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS.map((entry) => entry.key));
    for (const key of [
      PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries,
      PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags,
    ]) {
      expect(clients.has(key)).toBe(true);
    }
  });

  /*
   * The defaults matter because a Site may place the Widget with an empty config: one that never opens the
   * Inspector must still get the entries as they were published.
   */
  it("shows the published entry whole when nothing is configured, and holds its ceiling", () => {
    expect(normalizePhiEntryListWidgetConfig(null)).toMatchObject({
      kind: "news",
      limit: PHI_ENTRY_LIST_DEFAULT_LIMIT,
      showTags: true,
      showLinks: true,
    });
    expect(normalizePhiEntryListWidgetConfig({ kind: "blog", limit: 500 })).toMatchObject({ kind: "blog", limit: 50 });
    for (const limit of [0, -5, "many", null, 2.5]) {
      expect(normalizePhiEntryListWidgetConfig({ limit }).limit).toBe(PHI_ENTRY_LIST_DEFAULT_LIMIT);
    }
    expect(normalizePhiEntryListWidgetConfig({ showTags: false, showLinks: false }))
      .toMatchObject({ showTags: false, showLinks: false });
  });
});

describe.each(KINDS)("what the $kind Module brings", ({ kind, moduleId, routes, presetKeys, formIds, forms, handlers }) => {
  it(`answers /${kind} and /${kind}/:slug in the Public Area, indexable, with one header entry`, () => {
    const table = routeTable("public");
    const list = resolvePhiCmsRoutePreset(table, `/${kind}`);
    const detail = resolvePhiCmsRoutePreset(table, `/${kind}/launch`);

    expect(list?.descriptor).toMatchObject({ presetKey: presetKeys.list, ownerModuleId: moduleId });
    expect(detail?.descriptor).toMatchObject({ presetKey: presetKeys.detail, ownerModuleId: moduleId });
    expect(detail?.params).toEqual({ slug: "launch" });
    // A Site's entries are exactly the kind of page a search engine should find.
    expect(hasPhiFlag(list?.descriptor.defaultPageFlags, PhiCmsFlags.NoIndex)).toBe(false);

    const [entry, ...more] = list?.descriptor.navigation ?? [];
    expect(more).toEqual([]);
    expect(entry).toMatchObject({ navKey: "public:header", item: { routePresetKey: presetKeys.list } });
    // Namespaced to this Module: the catalog refuses two Modules claiming one item key.
    expect(entry?.item.itemKey.startsWith(moduleId)).toBe(true);
    expect(detail?.descriptor.navigation ?? []).toEqual([]);
  });

  it("links the list's titles to its own detail route", async () => {
    const tree = await routes[0]!.loadTree({ page: pageAt(`/${kind}`, 2) } as never);
    const [heading, list] = [...tree.contentWidgets].sort((left, right) => left.sortOrder - right.sortOrder);
    expect(heading!.widgetType.endsWith("/markdown")).toBe(true);
    expect(list!.widgetType).toBe(PhiCmsWidgetType.EntryList);

    const config = list!.config as { kind?: string; detailLinkTarget?: unknown };
    expect(config.kind).toBe(kind);
    const target = readPhiLinkTarget(config.detailLinkTarget);
    expect(target?.kind).toBe("page");
    const reference = target?.kind === "page" ? readPhiPageReference(target.reference) : null;
    expect(reference?.target).toMatchObject({ kind: "module" });
    // The reference names exactly the route that answers `/<kind>/:slug`.
    expect(resolvePhiCmsRoutePreset(routeTable("public"), `/${kind}/x`)?.descriptor.presetKey).toBe(presetKeys.detail);
  });

  it("answers its editor Page under its package, from its own route, in the sidebar's main group", () => {
    const route = resolvePhiCmsRoutePreset(routeTable("editor"), `/phis/ui/${kind}`);
    expect(route?.descriptor).toMatchObject({ presetKey: presetKeys.editor, ownerModuleId: moduleId });
    const [navigation] = route?.descriptor.navigation ?? [];
    expect(navigation).toMatchObject({ navKey: "editor:sidebar", anchor: "main" });
  });

  /*
   * Two Forms, two authorities, two endpoints. A handler that pointed the publication at the entry's path
   * would be the publishing role writing words, and nothing in a rendered page would say so.
   */
  it("sends each of its Forms to the endpoint its authority guards", () => {
    const byHandler = new Map(handlers.map((entry) => [entry.handlerKey, entry]));
    expect(byHandler.get(`${kind}.entry`)).toMatchObject({
      method: "PUT",
      upstreamPath: `/api/site/editor/entries/${kind}`,
      transport: "relay",
      credentialPolicy: "site-session",
      requiresCsrf: false,
    });
    expect(byHandler.get(`${kind}.publication`)).toMatchObject({
      method: "POST",
      upstreamPath: `/api/site/editor/entries/${kind}/publish`,
    });
    expect(forms.map((form) => [form.formId, form.areas, form.submitHandlerKey])).toEqual([
      [formIds.entry, ["editor"], `${kind}.entry`],
      [formIds.publication, ["editor"], `${kind}.publication`],
    ]);
  });

  /*
   * The wiring nobody can see from outside: which dialog opens on which row action, and that nothing
   * coordinates the Page -- every route ends at a Widget, and a Form whose `openActionKey` no action sends
   * opens empty for ever.
   */
  it("wires its editor Page to the Table of its kind, without a Controller", async () => {
    const tree = await routes[2]!.loadTree({ page: pageAt(`/${kind}`, 16), runtime: PUBLISHER_RUNTIME } as never);

    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    expect((table!.config as { source?: unknown }).source).toEqual({
      providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries,
      resourceKey: kind,
    });

    const formWidgets = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/form"));
    expect(formWidgets.map((form) => {
      const config = form.config as { formId?: string; openActionKey?: string; source?: unknown };
      return [config.formId, config.openActionKey ?? null, config.source == null ? "unbound" : "record"];
    })).toEqual([
      [formIds.entry, null, "unbound"],
      [formIds.entry, "edit", "record"],
      [formIds.publication, "publish", "record"],
    ]);
    expect(tree.overlays).toHaveLength(3);
    expect(tree.controllerSettings).toBeUndefined();

    const receivers = [...tree.contentWidgets, ...tree.overlays].flatMap((node) => {
      const signalRoutes = (node.config as { signalRoutes?: { emits?: { receiver?: string }[]; listens?: { receiver?: string }[] } }).signalRoutes;
      return [...signalRoutes?.emits ?? [], ...signalRoutes?.listens ?? []].map((route) => route.receiver ?? "");
    });
    expect(receivers.filter((receiver) => receiver.startsWith("controller:"))).toEqual([]);

    const features = (table!.config as {
      features: { actions: { toolbar: { key: string; icon: string; display: string; mode?: string }[] } };
    }).features;
    expect(features.actions.toolbar[0]).toMatchObject({ key: "new", icon: "antd:plus", display: "icon", mode: "primary" });
  });

  it("offers an Author the submission, and a Publisher the publication and the withdrawal", async () => {
    const rowActionKeys = async (runtime: unknown) => {
      const tree = await routes[2]!.loadTree({ page: pageAt(`/${kind}`, 16), runtime } as never);
      const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
      return ((table?.config as { features?: { actions?: { row?: { key: string }[] } } })
        ?.features?.actions?.row ?? []).map((action) => action.key);
    };
    expect(await rowActionKeys(AUTHOR_RUNTIME)).toEqual(["edit", "submit", "delete"]);
    expect(await rowActionKeys(PUBLISHER_RUNTIME)).toEqual(["edit", "publish", "withdraw", "delete"]);
  });
});
