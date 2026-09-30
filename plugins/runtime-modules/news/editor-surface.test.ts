import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/*
 * The Page's words, stubbed: a label set asks Core for the translation of every string, which wants an
 * installation. What this test reads is the wiring, and the wiring is the same whatever the words are.
 */
vi.mock("../../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));
vi.mock("./trees/editor-news-label-set", () => ({
  getPhiEditorNewsPageLabels: async () => ({
    pageTitle: "News",
    pageDescription: "",
    contentLabel: "news",
    widgetLabel: "news entries",
  }),
}));
vi.mock("./trees/editor-news-widget-label-set", () => ({
  getPhiEditorNewsWidgetLabels: async () => ({
    searchPlaceholder: "",
    statusLabel: "",
    statuses: { all: "", draft: "", published: "" },
    rowStatus: { draft: "", published: "" },
    columns: {
      title: "", slug: "", status: "", language: "", tags: "", published: "", expires: "", changed: "",
    },
    actions: { withdraw: "", delete: "", new: "", edit: "", publish: "" },
    withdraw: { title: "", description: "" },
    delete: { title: "", description: "" },
    empty: { title: "", text: "" },
    overlays: { create: "", entry: "", publication: "" },
    form: {
      save: "", cancel: "", slugPlaceholder: "", slugError: "", titleError: "", subtitleLabel: "",
      contentLabel: "", contentPlaceholder: "", contentError: "", linkLabel: "", linkPlaceholder: "",
      sourceLocalePlaceholder: "", translateLabel: "",
    },
  }),
}));

import { createPhiEditorRuntimeModuleCatalog } from "../area-catalogs/editor";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../descriptor-compiler";
import { resolvePhiRuntimeModuleSet } from "../resolver";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "./client-data-providers";
import {
  PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_NEWS_RUNTIME_MODULE_ID,
  PHI_NEWS_TABLE_RESOURCE_KEY,
} from "./ids";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";
import { PhiCmsPageType, PhiCmsStatus } from "../../../constants/phi-cms";
import { PHI_VIEWER_ACCESS_ANYONE } from "../../../types/access";
import type { PhiCmsPageNode } from "../../../types/cms";
import { PHI_NEWS_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS, PHI_NEWS_FORM_IDS, PHI_NEWS_RUNTIME_MODULE_FORMS } from "./forms";

/**
 * The editor surface, as far as it can be pinned without a Site.
 *
 * What a rendered Page looks like needs an Area a Site has set up in the Builder; what a Module brings to
 * that Area does not, and this is that: the address, the Provider behind the Table, and the resource the
 * Table names. Those three drifting apart is the failure that renders an empty page with no diagnosis.
 */
describe("what News brings to the editor Area", () => {
  it("answers /news in the editor Area, from the editor Module's own route", () => {
    const entries = createPhiEditorRuntimeModuleCatalog();
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "editor",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });

    /*
     * Under its package, not at `/news`: only the Public Area lets a Site hand a Module the address it
     * asked for. Everywhere else a route lives where its package puts it and has nothing to contest.
     */
    const route = resolvePhiCmsRoutePreset(table, "/phis/ui/news");
    expect(route?.descriptor.presetKey).toBe("editor-news-page");
    /*
     * This Module's own Page, not the Area's. That is what makes it switchable: the Page and its sidebar
     * entry are computed from the catalog, so switching the Module off takes both away -- and it is the
     * only shape a Module outside this package could use, since it can add nothing to the Area's own
     * definition.
     */
    expect(route?.descriptor.ownerModuleId).toBe(PHI_NEWS_RUNTIME_MODULE_ID);

    const [navigation] = route?.descriptor.navigation ?? [];
    expect(navigation?.navKey).toBe("editor:sidebar");
    // By role, not by another Module's item key: naming one would make this entry depend on it being there.
    expect(navigation).toMatchObject({ anchor: "main" });
    expect(navigation?.item.routePresetKey).toBe("editor-news-page");

  });

  it("is carried by the editor Area and brings its Provider there", async () => {
    const catalog = createPhiEditorRuntimeModuleCatalog();
    expect(catalog.has(PHI_NEWS_RUNTIME_MODULE_ID)).toBe(true);

    const moduleSet = await resolvePhiRuntimeModuleSet({
      catalog,
      moduleIds: [PHI_NEWS_RUNTIME_MODULE_ID],
      area: "editor",
      serverCapabilities: null,
    });

    expect(moduleSet.dataProviderDescriptorsByKey.has(PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table)).toBe(true);
    expect(moduleSet.dataProviderDescriptorsByKey.has(PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags)).toBe(true);
  });

  it("declares the resource the Table names, with an offset page and the tag facet", () => {
    const descriptor = PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table);
    const resource = descriptor?.resources?.find(
      (entry) => entry.resourceKey === PHI_NEWS_TABLE_RESOURCE_KEY,
    );

    expect(resource?.rowIdentityPath).toBe("contentId");
    // The Table contract's paging, which is what the endpoint answers `total` for.
    expect(resource?.query).toMatchObject({ pagination: "offset", search: true, facets: ["tags"] });
    expect(resource?.actions?.map((action) => action.key)).toEqual(["withdraw", "delete", "refresh"]);
  });

  it("picks a tag from the offer rather than taking a typed one", () => {
    const descriptor = PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table);
    const tags = descriptor?.resources?.[0]?.fields?.find((field) => field.key === "tags");

    expect(tags).toMatchObject({
      type: "enum[]",
      optionsProvider: { providerKey: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags },
    });
  });

  // A declared Provider whose Client nobody registered answers nothing in a browser, silently.
  it("registers a Client for every Provider it declares", () => {
    expect(PHI_NEWS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS.map((entry) => entry.key).sort())
      .toEqual(Object.values(PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS).sort());
  });
});

/**
 * The two Forms behind that Page, and the wiring between them and the Table.
 *
 * None of it can be seen from a rendered page: a dialog whose `openActionKey` no action sends opens empty
 * for ever, and a handler pointing at the wrong endpoint is the publishing role writing words.
 */
describe("what News writes with", () => {
  const NEWS_PAGE = {
    id: 21,
    siteId: 3,
    areaMask: 16,
    path: "/news",
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
  } satisfies PhiCmsPageNode;

  /*
   * Two Forms, two authorities, two endpoints. A handler that pointed the publication at the entry's path
   * would be the publishing role writing words, and nothing in a rendered page would say so.
   */
  it("sends each Form to the endpoint its authority guards", () => {
    const byHandler = new Map(
      PHI_NEWS_FORM_HANDLER_PROVIDER_DESCRIPTORS.map((entry) => [entry.handlerKey, entry]),
    );

    expect(byHandler.get("news.entry")).toMatchObject({
      method: "PUT",
      upstreamPath: "/api/site/editor/news",
      transport: "relay",
      credentialPolicy: "site-session",
      requiresCsrf: false,
    });
    expect(byHandler.get("news.publication")).toMatchObject({
      method: "POST",
      upstreamPath: "/api/site/editor/news/publish",
      transport: "relay",
      credentialPolicy: "site-session",
    });
  });

  it("declares both Forms for the editor Area and nowhere else", () => {
    expect(PHI_NEWS_RUNTIME_MODULE_FORMS.map((form) => [form.formId, form.areas, form.submitHandlerKey]))
      .toEqual([
        [PHI_NEWS_FORM_IDS.entry, ["editor"], "news.entry"],
        [PHI_NEWS_FORM_IDS.publication, ["editor"], "news.publication"],
      ]);
  });

  /*
   * The wiring nobody can see from outside: which dialog opens on which row action, and that every route
   * ends at this Module's Controller. A Form whose `openActionKey` no action sends opens empty for ever.
   */
  it("wires each dialog to the row action that opens it", async () => {
    const [, editorRoute] = PHI_NEWS_RUNTIME_MODULE_ROUTES;
    const tree = await editorRoute!.loadTree({
      page: NEWS_PAGE,
      runtime: { locale: { current: "en" } },
    } as never);

    const forms = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/form"));
    /*
     * Three Forms, and the first of them reads nothing.
     *
     * A Form with a `source` and an `openActionKey` is a record editor: it shows its skeleton until the row
     * it was opened with arrives. Writing a new entry has no row, so the create dialog carries the same
     * Form unbound -- with one dialog for both, the plus opened on a skeleton that never resolved.
     */
    expect(forms.map((form) => {
      const config = form.config as { formId?: string; openActionKey?: string; source?: unknown };
      return [config.formId, config.openActionKey ?? null, config.source == null ? "unbound" : "record"];
    })).toEqual([
      [PHI_NEWS_FORM_IDS.entry, null, "unbound"],
      [PHI_NEWS_FORM_IDS.entry, "edit", "record"],
      [PHI_NEWS_FORM_IDS.publication, "publish", "record"],
    ]);

    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    const features = (table!.config as { features: { actions: { row: { key: string }[]; toolbar: { key: string }[] } } }).features;
    expect(features.actions.row.map((action) => action.key)).toEqual(["edit", "publish", "withdraw", "delete"]);
    expect(features.actions.toolbar.map((action) => action.key)).toEqual(["new"]);

    // Three dialogs, each with a body and a footer beside the page's own layout.
    expect(tree.overlays).toHaveLength(3);
    expect(tree.layoutNodes).toHaveLength(7);

    /* Both footers as one compact group, the way every other overlay footer states it. */
    const commands = tree.contentWidgets.filter((widget) => widget.widgetType.endsWith("/command-toolbar"));
    expect(commands).toHaveLength(3);
    for (const toolbar of commands) {
      expect(toolbar.config).toMatchObject({ compact: true });
    }
  });

  /*
   * Nothing coordinates this Page, and that is the point.
   *
   * Every route names a Widget: the Table announces, each Overlay and each record-bound Form decides by
   * its own `openActionKey` whether it was meant, the footer presses its Form, and a Form that went
   * through closes its dialog and tells the Table to read again. A Controller in between was three
   * silent failures -- one nobody mounted, one whose senders it could not recognise, and one that heard
   * what it sent -- for a spinner and a refusal to close mid-save.
   */
  it("wires the Page to Widgets alone, with no Controller in between", async () => {
    const [, editorRoute] = PHI_NEWS_RUNTIME_MODULE_ROUTES;
    const tree = await editorRoute!.loadTree({
      page: NEWS_PAGE,
      runtime: { locale: { current: "en" } },
    } as never);

    expect(tree.controllerSettings).toBeUndefined();

    const receivers = [...tree.contentWidgets, ...tree.overlays].flatMap((node) => {
      const routes = (node.config as { signalRoutes?: { emits?: { receiver?: string }[]; listens?: { receiver?: string }[] } }).signalRoutes;
      return [...routes?.emits ?? [], ...routes?.listens ?? []].map((route) => route.receiver ?? "");
    });
    expect(receivers.length).toBeGreaterThan(0);
    expect(receivers.filter((receiver) => receiver.startsWith("controller:"))).toEqual([]);
  });

  /* A plus, as on every other Table: the label stays, as the tooltip and the accessible name. */
  it("offers a new entry as an icon action", async () => {
    const [, editorRoute] = PHI_NEWS_RUNTIME_MODULE_ROUTES;
    const tree = await editorRoute!.loadTree({
      page: NEWS_PAGE,
      runtime: { locale: { current: "en" } },
    } as never);

    const table = tree.contentWidgets.find((widget) => widget.widgetType.endsWith("/table"));
    const [toolbarAction] = (table!.config as {
      features: { actions: { toolbar: { key: string; icon: string; display: string; label: string }[] } };
    }).features.actions.toolbar;

    expect(toolbarAction).toMatchObject({ key: "new", icon: "antd:plus", display: "icon" });
  });
});
