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
      category: "",
    },
    actions: { withdraw: "", delete: "", new: "", edit: "", publish: "", submit: "", curate: "" },
    curation: { authorNone: "Nobody", categoryNone: "None" },
    categories: {
      widgetLabel: "", title: "", columns: { label: "", slug: "", order: "", entries: "" },
      empty: { title: "", text: "" }, footer: "%1", actions: { new: "", edit: "", delete: "" },
      overlays: { create: "", edit: "" }, delete: { title: "", description: "" },
      form: { labelError: "", slugPlaceholder: "" },
    },
    withdraw: { title: "", description: "" },
    submit: { title: "", description: "" },
    delete: { title: "", description: "" },
    empty: { text: "" },
    overlays: { publication: "", curation: "" },
    form: {
      save: "", cancel: "", slugPlaceholder: "", slugError: "", titleError: "", subtitleLabel: "",
      contentLabel: "", contentPlaceholder: "", contentError: "", linkLabel: "",
      link: { none: "", page: "", external: "", pagePlaceholder: "", externalPlaceholder: "", newTab: "", pagesUnavailable: "" },
      translateLabel: "", publishedAtPlaceholder: "", expiresAtPlaceholder: "",
    },
  }),
}));
const KIND_LABELS = { widgetLabel: "entries", entryTitle: "Entry", createTitle: "New entry", emptyTitle: "None" };
/*
 * The entry a detail tree reads before it draws anything. `launch` is published; any other address is
 * not, and the tree answers 404 for it -- `notFound()` throws, as Next's does.
 */
vi.mock("../../server-helpers/content-entry-page", () => ({
  loadPhiContentEntryPage: async (_runtime: unknown, { slug }: { slug: string }) => slug === "launch"
    ? { entry: { title: "Launch", subtitle: "", slug }, related: [] }
    : null,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
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
  PHI_ENTRY_LIST_DEFAULT_PARTS,
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
import { readPhiTourTargets } from "../../types/tours";
import { readPhiVisualAnchorOwner } from "../../types/visual-anchors";
import type { PhiCmsRoutePresetDescriptor } from "../../types/cms-module-descriptors";
import { hasPhiFlag } from "../../helpers/flags";
import { PhiContentEntryPart } from "../../constants/content-entry-parts";
import { PHI_SURFACE_WASH } from "../../helpers/surface-presets";
import { PHI_LAYOUT } from "../../theme/phi-tokens";
import { PHI_BASE_PAGE_LAYOUT_NODE_ID } from "../../components/regions/presets/phi-base-page-layout";
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
    for (const type of [PhiCmsWidgetType.EntryList, PhiCmsWidgetType.EntryDetail, PhiCmsWidgetType.EntryHeader]) {
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
      show: PHI_ENTRY_LIST_DEFAULT_PARTS,
      source: "latest",
    });
    // Tags and link are among what an unconfigured list shows.
    expect(PHI_ENTRY_LIST_DEFAULT_PARTS & PhiContentEntryPart.Tags).not.toBe(0);
    expect(PHI_ENTRY_LIST_DEFAULT_PARTS & PhiContentEntryPart.Link).not.toBe(0);
    expect(normalizePhiEntryListWidgetConfig({ kind: "blog", limit: 500 })).toMatchObject({ kind: "blog", limit: 50 });
    for (const limit of [0, -5, "many", null, 2.5]) {
      expect(normalizePhiEntryListWidgetConfig({ limit }).limit).toBe(PHI_ENTRY_LIST_DEFAULT_LIMIT);
    }
    expect(normalizePhiEntryListWidgetConfig({ show: PhiContentEntryPart.Title }).show).toBe(PhiContentEntryPart.Title);
    // A stored mask keeps to the parts the list offers; one that is no number leaves the default.
    expect(normalizePhiEntryListWidgetConfig({ show: 1 << 20 }).show).toBe(0);
    expect(normalizePhiEntryListWidgetConfig({ show: "all" }).show).toBe(PHI_ENTRY_LIST_DEFAULT_PARTS);
  });

  it("keeps the categories it is set to by id, none among them, and nothing that is neither", () => {
    expect(normalizePhiEntryListWidgetConfig(null).categories).toEqual([]);
    expect(normalizePhiEntryListWidgetConfig({ categories: ["3", 7, "none", "3", "", "travel", "0", 2.5] }).categories)
      .toEqual(["3", "7", "none"]);
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
    // The list alone: the navigation entry and the Page's title already name the kind.
    expect(tree.contentWidgets).toHaveLength(1);
    const [list] = tree.contentWidgets;
    expect(list!.widgetType).toBe(PhiCmsWidgetType.EntryList);

    const config = list!.config as { kind?: string; presentation?: string; detailLinkTarget?: unknown };
    expect(config.kind).toBe(kind);
    // A Blog reads as cards that lead to the post; News as whole entries.
    expect(config.presentation).toBe(kind === "blog" ? "cards" : "stack");
    const target = readPhiLinkTarget(config.detailLinkTarget);
    expect(target?.kind).toBe("page");
    const reference = target?.kind === "page" ? readPhiPageReference(target.reference) : null;
    expect(reference?.target).toMatchObject({ kind: "module" });
    // The reference names exactly the route that answers `/<kind>/:slug`.
    expect(resolvePhiCmsRoutePreset(routeTable("public"), `/${kind}/x`)?.descriptor.presetKey).toBe(presetKeys.detail);
  });

  it("draws a detail Page as header, text and related entries, all about the address asked for", async () => {
    const tree = await routes[1]!.loadTree({
      page: pageAt(`/${kind}/launch`, 2),
      runtime: PUBLISHER_RUNTIME,
      params: { slug: "launch" },
    } as never);
    const widgets = [...tree.contentWidgets].sort((left, right) => left.sortOrder - right.sortOrder);
    expect(widgets.map((widget) => widget.widgetType)).toEqual([
      PhiCmsWidgetType.EntryHeader,
      PhiCmsWidgetType.EntryDetail,
      PhiCmsWidgetType.EntryList,
    ]);
    expect(widgets.map((widget) => widget.slotIndex)).toEqual([0, 1, 2]);
    expect(tree.pageMeta?.title?.value).toBe("Launch");

    const [header, body, related] = widgets.map((widget) => widget.config as Record<string, unknown>);
    // All three are bound to one record -- the entry at the route's address -- so they share one read.
    const entry = { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry, params: { kind, slug: "launch" } };
    expect(header).toMatchObject({ entry });
    // A Blog names its author; News is dated and nothing more.
    expect(((header!.show as number) & PhiContentEntryPart.Author) !== 0).toBe(kind === "blog");
    expect(body).toMatchObject({ entry });
    expect(related).toMatchObject({ kind, source: "related", relatedTo: entry });
    // The relatives lead to this same route, each at its own address -- the target the list's titles name.
    const listTree = await routes[0]!.loadTree({ page: pageAt(`/${kind}`, 2) } as never);
    const listConfig = listTree.contentWidgets.find((widget) => widget.widgetType === PhiCmsWidgetType.EntryList)!
      .config as { detailLinkTarget?: unknown };
    expect(related!.detailLinkTarget).toEqual(listConfig.detailLinkTarget);
  });

  it("sets both Public Pages in the base scaffold, in a column of prose on the wash", async () => {
    for (const [route, params] of [[routes[0]!, {}], [routes[1]!, { slug: "launch" }]] as const) {
      const tree = await route.loadTree({
        page: pageAt(`/${kind}/launch`, 2),
        runtime: PUBLISHER_RUNTIME,
        params,
      } as never);
      // The base scaffold every module Page stands on, and the column in it.
      expect(tree.layoutNodes).toHaveLength(2);
      const scaffold = tree.layoutNodes.find((node) => node.parentLayoutNodeId === null)!;
      expect(scaffold.id).toBe(PHI_BASE_PAGE_LAYOUT_NODE_ID);
      expect(tree.regions[0]?.rootLayoutNodeId).toBe(PHI_BASE_PAGE_LAYOUT_NODE_ID);
      const column = tree.layoutNodes.find((node) => node.parentLayoutNodeId === scaffold.id)!;
      expect(column.config).toMatchObject({ maxSize: { width: PHI_LAYOUT.readingMax }, surface: PHI_SURFACE_WASH });
      // Every Widget of the Page stands in the column, none beside it.
      expect(new Set(tree.contentWidgets.map((widget) => widget.parentLayoutNodeId))).toEqual(new Set([column.id]));
    }
  });

  it("answers 404 for an address nothing published answers at", async () => {
    await expect(routes[1]!.loadTree({
      page: pageAt(`/${kind}/gone`, 2),
      runtime: PUBLISHER_RUNTIME,
      params: { slug: "gone" },
    } as never)).rejects.toThrow("NEXT_NOT_FOUND");
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
    // Curation changes two things about an entry and leaves the rest; a category is stated whole.
    expect(byHandler.get(`${kind}.curation`)).toMatchObject({
      method: "PATCH",
      upstreamPath: `/api/site/editor/entries/${kind}/curation`,
    });
    expect(byHandler.get(`${kind}.category`)).toMatchObject({
      method: "PUT",
      upstreamPath: `/api/site/editor/entries/${kind}/categories`,
    });
    expect(forms.map((form) => [form.formId, form.areas, form.submitHandlerKey])).toEqual([
      [formIds.entry, ["editor"], `${kind}.entry`],
      [formIds.publication, ["editor"], `${kind}.publication`],
      [formIds.curation, ["editor"], `${kind}.curation`],
      [formIds.category, ["editor"], `${kind}.category`],
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
      [formIds.curation, "curate", "record"],
      [formIds.category, null, "unbound"],
      [formIds.category, "edit", "record"],
    ]);
    expect(tree.overlays).toHaveLength(6);
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

  it("carries a Tour on its editor Page whose steps point at what that Page draws", async () => {
    const route: PhiCmsRoutePresetDescriptor = routes[2]!;
    expect(route.tour?.id).toBe(`${moduleId}/editor`);
    const tree = await route.loadTree({ page: pageAt(`/${kind}`, 16), runtime: PUBLISHER_RUNTIME } as never);
    const drawn = new Map(tree.contentWidgets.map((widget) => [`cms:${widget.id}`, widget.widgetType]));
    for (const target of readPhiTourTargets(route.tour)) {
      // A part (`cms:<id>:toolbar`) is the Table's to offer, so its owner has to be a Table.
      const owner = readPhiVisualAnchorOwner(target);
      expect(drawn.has(owner ?? target), target).toBe(true);
      if (owner) expect(drawn.get(owner), target).toMatch(/\/table$/u);
    }
  });

  it("offers an Author the submission, and a Publisher the publication and the withdrawal", async () => {
    const rowActionKeys = async (runtime: unknown) => {
      const tree = await routes[2]!.loadTree({ page: pageAt(`/${kind}`, 16), runtime } as never);
      const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
      return ((table?.config as { features?: { actions?: { row?: { key: string }[] } } })
        ?.features?.actions?.row ?? []).map((action) => action.key);
    };
    expect(await rowActionKeys(AUTHOR_RUNTIME)).toEqual(["edit", "submit", "delete"]);
    expect(await rowActionKeys(PUBLISHER_RUNTIME)).toEqual(["edit", "curate", "publish", "withdraw", "delete"]);
  });

  /*
   * Naming the author, filing under a category and keeping the categories are the Publisher's; Core refuses
   * them to an Author, so an Author's Page carries none of it rather than buttons that can only fail.
   */
  it("gives a Publisher the curation dialog and the kind's categories, and an Author neither", async () => {
    const treeFor = (runtime: unknown) =>
      routes[2]!.loadTree({ page: pageAt(`/${kind}`, 16), runtime } as never);
    const sources = (tree: Awaited<ReturnType<typeof treeFor>>) => tree.contentWidgets
      .filter((widget) => widget.widgetType.endsWith("/table"))
      .map((widget) => (widget.config as { source?: unknown }).source);

    const author = await treeFor(AUTHOR_RUNTIME);
    expect(sources(author)).toEqual([{ providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries, resourceKey: kind }]);
    expect(author.overlays).toHaveLength(3);

    const publisher = await treeFor(PUBLISHER_RUNTIME);
    expect(sources(publisher)).toEqual([
      { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries, resourceKey: kind },
      { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryCategories, resourceKey: kind },
    ]);
    // The curation Form's empty choices, in the page's language: the Options Provider has no Label Set.
    const curation = publisher.contentWidgets.find((widget) =>
      (widget.config as { formId?: string }).formId === formIds.curation)!;
    expect((curation.config as { formConfig?: unknown }).formConfig).toEqual({
      authorNoneLabel: "Nobody",
      categoryNoneLabel: "None",
    });
  });
});
