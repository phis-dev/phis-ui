import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Tables in Markdown (TABLES.md): what the catalog takes as an embeddable Table, how a text names one, and
 * how the Markdown Widget resolves it -- through the Modules active in its Area, the viewer's access and the
 * parameters the Module declares. The Module below is a fixture; nothing first-party offers one yet.
 */

vi.mock("server-only", () => ({}));
const translate = vi.hoisted(() => ({
  site: vi.fn(async (...args: unknown[]) => args.find(Array.isArray) as string[]),
  global: vi.fn(async (_locale: string, texts: string[]) => texts),
}));
vi.mock("../../../../../server-helpers/translate", () => ({
  trBulk: translate.site,
  trBulkForLocale: translate.site,
  trGlobalBulkForLocale: translate.global,
}));
vi.mock("../../../../../server-helpers/phi-runtime", () => ({
  phiRuntime: () => ({ apiBaseUrl: "https://core.test", internalToken: "token" }),
}));
vi.mock("../../../../../components/widgets/label-sets/table", async () => ({
  getPhiTableWidgetLabels: async () =>
    (await import("../../../../../components/widgets/label-types/table")).PHI_TABLE_WIDGET_DEFAULT_LABELS,
}));
vi.mock("../../../../../components/widgets/helpers/internal-reference-resolver.server", () => ({
  resolvePhiWidgetInternalReferences: async () => ({ pagePaths: new Map(), assetUrls: new Map(), assets: new Map() }),
}));

import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiMarkdownBlock } from "../../../../../components/widgets/shared/markdown-body-client";
import { resolveMarkdownRenderData } from "../../../../../components/widgets/shared/markdown-render";
import { PHI_VIEWER_ACCESS_ANYONE, PHI_VIEWER_ACCESS_AUTHENTICATED } from "../../../../../types/access";
import type {
  PhiResolvedRuntimeModuleSet,
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleId,
} from "../../../../../types/cms-plugins";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiEmbeddableTableDescriptor } from "../../../../../types/table-embed";
import { checkPhiEmbeddableTables } from "../../../../../helpers/preset-table-check";
import type { PhiTableProviderResourceDescriptor } from "../../../../../types/table-widget";
import { createPhiRuntimeModuleCatalog } from "../../../contracts";
import { collectPhiRuntimeDataProviderKeys } from "../../../resolver";
import { PHI_TABLE_WIDGET_DEFINITION } from "../table/config";
import { createPhiMarkdownTableEmbedResolver } from "./table-embeds.server";

const PLATFORM_ID = "@test/pkg/modules/platform" as PhiRuntimeModuleId;
const PRICES_ID = "@acme/prices/modules/prices" as PhiRuntimeModuleId;
const PROVIDER_KEY = "@acme/prices/tables/prices" as const;
const EMBED_KEY = "@acme/prices/table-embeds/price-list" as const;

const RESOURCE: PhiTableProviderResourceDescriptor = {
  resourceKey: "prices",
  title: "Prices",
  rowIdentityPath: "id",
  fields: [
    { key: "id", title: "Id", type: "number" },
    { key: "name", title: "Product", type: "string" },
    { key: "amount", title: "Price", type: "number" },
    {
      key: "category",
      title: "Category",
      type: "enum",
      options: [{ value: "hosting", label: "Hosting" }, { value: "support", label: "Support" }],
    },
    { key: "active", title: "Active", type: "boolean" },
    { key: "meta", title: "Meta", type: "json" },
  ],
  bindingFields: [{
    key: "currency",
    title: "Currency",
    type: "enum",
    defaultValue: "EUR",
    options: [{ value: "EUR", label: "Euro" }, { value: "CHF", label: "Swiss franc" }],
  }],
  query: { filterFields: ["category", "active", "meta"], pagination: "offset", total: true, sorting: "single" },
};

const PRICE_LIST: PhiEmbeddableTableDescriptor = {
  key: EMBED_KEY,
  title: "Price list",
  source: { providerKey: PROVIDER_KEY, resourceKey: "prices" },
  presentation: {
    columns: [
      { key: "name", fieldKey: "name", title: "Product" },
      { key: "amount", fieldKey: "amount", title: "Price", align: "right" },
    ],
    layout: { mode: "auto", overflowX: "auto" },
  },
  fixedFilters: { active: true },
  params: { currency: { binding: "currency" }, category: { filter: "category" } },
  maxRows: 10,
};

function pricesModule(embeddableTables: readonly PhiEmbeddableTableDescriptor[] = [PRICE_LIST]): PhiRuntimeModuleDefinition {
  return {
    moduleId: PRICES_ID,
    kind: "module",
    eligibleAreas: ["public"],
    serverBinding: { providerId: "@phis/server/core", requiredCapabilities: [] },
    title: "Prices",
    description: "A fixture Module offering one Table to Markdown.",
    category: "other",
    iconFamily: "test",
    dataProviders: [{
      key: PROVIDER_KEY,
      ownerModuleId: PRICES_ID,
      executionMode: "live",
      authoringMode: "read",
      title: "Prices",
      kind: "table",
      resources: [RESOURCE],
    }],
    embeddableTables,
  };
}

function platform(): PhiRuntimeModuleDefinition {
  return {
    moduleId: PLATFORM_ID,
    kind: "platform",
    eligibleAreas: ["public"],
    serverBinding: { providerId: "@phis/server/core", requiredCapabilities: [] },
    controllerType: "@test/platform",
    controller: { pluginKey: "@test", key: "platform", title: "platform", allowedMountScopes: ["area"], runtimeSignals: { emits: [], listens: [] } },
    title: "Platform",
    description: "Test platform.",
    category: "other",
    iconFamily: "test",
    controllerMountPolicy: "area",
  };
}

function entry(definition: PhiRuntimeModuleDefinition): PhiRuntimeModuleCatalogEntry {
  return { definition, widgets: [], layouts: [], load: async () => { throw new Error("not executed"); } };
}

function catalogOf(...definitions: PhiRuntimeModuleDefinition[]) {
  return createPhiRuntimeModuleCatalog([entry(platform()), ...definitions.map(entry)], []);
}

function withEmbed(change: Partial<PhiEmbeddableTableDescriptor>) {
  return () => catalogOf(pricesModule([{ ...PRICE_LIST, ...change }]));
}

/** What the check a package runs beside `checkPhiPresetTables` says of the price list with one change. */
function findingsWith(change: Partial<PhiEmbeddableTableDescriptor>, prices = pricesModule()) {
  return checkPhiEmbeddableTables({ ...prices, embeddableTables: [{ ...PRICE_LIST, ...change }] }).map((finding) => finding.message);
}

describe("embeddable Tables in the Module catalog", () => {
  it("takes the fixture's price list, and the check finds nothing in it", () => {
    expect(catalogOf(pricesModule()).get(PRICES_ID)?.definition.embeddableTables?.map((embed) => embed.key))
      .toEqual([EMBED_KEY]);
    expect(checkPhiEmbeddableTables(pricesModule())).toEqual([]);
  });

  it("refuses a key that is not the Module's own", () => {
    expect(withEmbed({ key: "@other/pkg/table-embeds/price-list" })).toThrow(/needs a table-embeds key of its own Module/);
    expect(withEmbed({ key: "@acme/prices/price-list" as never })).toThrow(/needs a table-embeds key of its own Module/);
  });

  it("refuses a Provider the Module does not declare, and a resource its Provider does not", () => {
    expect(withEmbed({ source: { providerKey: "@acme/prices/tables/other", resourceKey: "prices" } }))
      .toThrow(/reads a resource no table Provider of this Module declares/);
    expect(withEmbed({ source: { providerKey: PROVIDER_KEY, resourceKey: "discounts" } }))
      .toThrow(/reads a resource no table Provider/);
  });

  it("finds columns the Table Widget would refuse for the resource, as checkPhiPresetTables does", () => {
    expect(findingsWith({
      presentation: { ...PRICE_LIST.presentation, columns: [{ key: "sku", fieldKey: "sku", title: "SKU" }] },
    })).toEqual([expect.stringMatching(/references undeclared field "sku"/)]);
  });

  it("finds an editor: an embedded Table is read-only", () => {
    expect(findingsWith({
      presentation: { ...PRICE_LIST.presentation, columns: [{ key: "name", fieldKey: "name", title: "Product", editor: {} }] },
    })).toContainEqual(expect.stringMatching(/read-only/));
  });

  it("finds a parameter that sets anything but a declared binding field or filter", () => {
    expect(findingsWith({ params: { tier: { binding: "tier" } } })).toEqual([expect.stringMatching(/parameter "tier" names "tier", which the resource does not declare/)]);
    expect(findingsWith({ params: { name: { filter: "name" } } })).toEqual([expect.stringMatching(/parameter "name" names "name", which the resource does not declare/)]);
    expect(findingsWith({ params: { meta: { filter: "meta" } } })).toEqual([expect.stringMatching(/a json field/)]);
    expect(findingsWith({ params: { active: { filter: "active" } } })).toEqual([expect.stringMatching(/which a fixed filter pins/)]);
    expect(findingsWith({ params: { "1st": { filter: "category" } } })).toEqual([expect.stringMatching(/no parameter name/)]);
  });

  it("finds maxRows on a resource that answers every row at once", () => {
    const prices = pricesModule();
    const provider = prices.dataProviders![0]!;
    expect(findingsWith({}, {
      ...prices,
      dataProviders: [{ ...provider, kind: "table", resources: [{ ...RESOURCE, query: { ...RESOURCE.query, pagination: "none" } }] }],
    })).toEqual([expect.stringMatching(/maxRows, which needs a resource that pages/)]);
  });

  it("refuses an access policy of another role provider", () => {
    expect(withEmbed({ accessPolicy: { access: "roles", providerId: "@acme/other", roles: 1 } as never }))
      .toThrow(/references role provider "@acme\/other"/);
  });

  it("refuses one key offered by two Modules", () => {
    const twin = { ...pricesModule(), moduleId: "@acme/prices/modules/twin" as PhiRuntimeModuleId };
    expect(() => catalogOf(pricesModule(), {
      ...twin,
      dataProviders: [{ ...twin.dataProviders![0]!, key: "@acme/prices/tables/twin", ownerModuleId: twin.moduleId }],
      embeddableTables: [{ ...PRICE_LIST, source: { providerKey: "@acme/prices/tables/twin", resourceKey: "prices" } }],
    })).toThrow(/is owned twice/);
  });
});

type Viewer = PhiBlockRuntime["viewer"];
const ANONYMOUS = { access: "public", roleClaims: [], groupClaims: [], authorizationRevision: 0 } as unknown as Viewer;
const SIGNED_IN = { access: "authenticated", roleClaims: [], groupClaims: [], authorizationRevision: 0 } as unknown as Viewer;

function runtimeFor(viewer: Viewer = ANONYMOUS) {
  return {
    site: { key: "site", publicUrl: "https://example.org" },
    locale: { current: "de" },
    area: "public",
    viewer,
  } as unknown as PhiBlockRuntime;
}

function registryFor({ active = true, embeds = [PRICE_LIST] }: { active?: boolean; embeds?: readonly PhiEmbeddableTableDescriptor[] } = {}) {
  return {
    runtimeModuleCatalog: catalogOf(pricesModule(embeds)),
    activeModuleIds: new Set(active ? [PLATFORM_ID, PRICES_ID] : [PLATFORM_ID]),
    runtimeWidgetPluginsByType: new Map([[PhiCmsWidgetType.Table, PHI_TABLE_WIDGET_DEFINITION]]),
    widgetAccessPoliciesByType: new Map([[PhiCmsWidgetType.Table, PHI_VIEWER_ACCESS_ANYONE]]),
    roleProviderIdByWidgetType: new Map(),
  } as unknown as Parameters<typeof createPhiMarkdownTableEmbedResolver>[0]["registry"];
}

async function render(
  markdown: string,
  { registry = registryFor(), viewer, renderMode = "live" as const, resolver = true }:
    { registry?: ReturnType<typeof registryFor>; viewer?: Viewer; renderMode?: "live" | "preview"; resolver?: boolean } = {},
) {
  const runtime = runtimeFor(viewer);
  const data = await resolveMarkdownRenderData(
    { sourceMode: "inline", markdown, translate: true, renderMode },
    runtime,
    resolver ? { tableEmbeds: createPhiMarkdownTableEmbedResolver({ registry, runtime, renderMode }) } : {},
  );
  if ("error" in data) throw new Error(data.error);
  return data.blocks;
}

function embedOf(blocks: PhiMarkdownBlock[]) {
  const block = blocks.find((candidate) => candidate.kind === "table_embed");
  if (block?.kind !== "table_embed") throw new Error("no table embed");
  return block;
}

const ADDRESS = `phis:table/${EMBED_KEY}`;

describe("a Table embedded in Markdown", () => {
  beforeEach(() => {
    translate.site.mockClear();
    translate.global.mockClear();
  });

  it("draws a paragraph holding only the embed as the Module's Table, with the caption and the parameters", async () => {
    const blocks = await render(`Our prices:\n\n![Prices in francs](${ADDRESS}?currency=CHF&category=support)\n\nMore text.`);
    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "table_embed", "paragraph"]);
    const embed = embedOf(blocks);
    expect(embed.notice).toBeNull();
    expect(embed.table?.renderMode).toBe("live");
    expect(embed.table?.config).toEqual({
      presentation: { ...PRICE_LIST.presentation, title: "Prices in francs" },
      features: { pagination: { enabled: false, pageSize: 10 } },
      fixedFilters: { active: true, category: "support" },
      source: { providerKey: PROVIDER_KEY, resourceKey: "prices", params: { currency: "CHF" } },
      signalRoutes: null,
    });
    expect(embed.table?.labels.emptyTitle).toBeTruthy();
  });

  it("takes the caption as the Site's words and the Module's column titles as a Preset's", async () => {
    await render(`![Preise](${ADDRESS})`);
    const siteTexts = translate.site.mock.calls.flatMap((call) => call.find(Array.isArray) as string[]);
    const globalTexts = translate.global.mock.calls.flatMap((call) => call[1]);
    expect(siteTexts).toContain("Preise");
    expect(siteTexts).not.toContain("Product");
    expect(globalTexts).toEqual(expect.arrayContaining(["Product", "Price"]));
    expect(globalTexts).not.toContain("Preise");
  });

  it("refuses a parameter the Module does not declare, and a value its field does not take", async () => {
    for (const query of ["colour=red", "currency=USD", "category=retail", "currency=EUR&currency=CHF"]) {
      const live = embedOf(await render(`![Prices](${ADDRESS}?${query})`));
      expect(live).toEqual({ kind: "table_embed", caption: "Prices", table: null, notice: null });
    }
    const authored = embedOf(await render(`![Prices](${ADDRESS}?colour=red)`, { renderMode: "preview" }));
    expect(authored.table).toBeNull();
    expect(authored.notice).toMatch(/has no parameter "colour"/);
    const required = embedOf(await render(`![Prices](${ADDRESS}?currency=CHF&currency=EUR)`, { renderMode: "preview" }));
    expect(required.notice).toMatch(/"currency" does not take "EUR" here/);
  });

  it("refuses a key no Module offers: the caption alone live, a notice where it is authored", async () => {
    const live = embedOf(await render("![Prices](phis:table/@acme/prices/table-embeds/unknown)"));
    expect(live).toEqual({ kind: "table_embed", caption: "Prices", table: null, notice: null });
    const authored = embedOf(await render("![Prices](phis:table/@acme/prices/table-embeds/unknown)", { renderMode: "preview" }));
    expect(authored.notice).toMatch(/No Module offers/);
  });

  it("refuses the Table of a Module that is not active in the Area", async () => {
    const embed = embedOf(await render(`![Prices](${ADDRESS})`, { registry: registryFor({ active: false }), renderMode: "preview" }));
    expect(embed.table).toBeNull();
    expect(embed.notice).toMatch(/"Prices" is not active in this Area/);
  });

  it("refuses a viewer the embed's access policy does not admit, as a Table Widget on the Page would be", async () => {
    const registry = registryFor({ embeds: [{ ...PRICE_LIST, accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED }] });
    const anonymous = embedOf(await render(`![Prices](${ADDRESS})`, { registry, viewer: ANONYMOUS, renderMode: "preview" }));
    expect(anonymous.table).toBeNull();
    expect(anonymous.notice).toMatch(/may not see/);
    const signedIn = embedOf(await render(`![Prices](${ADDRESS})`, { registry, viewer: SIGNED_IN }));
    expect(signedIn.table).not.toBeNull();
  });

  it("keeps an embed anywhere but a paragraph of its own as its caption, and asks nobody about it", async () => {
    const resolver = vi.fn();
    const runtime = runtimeFor();
    const data = await resolveMarkdownRenderData(
      {
        sourceMode: "inline",
        translate: false,
        markdown: `See ![the prices](${ADDRESS}) below.\n\n## ![Prices](${ADDRESS})\n\n| a |\n|---|\n| ![cell](${ADDRESS}) |`,
      },
      runtime,
      { tableEmbeds: resolver },
    );
    if ("error" in data) throw new Error(data.error);
    expect(resolver).not.toHaveBeenCalled();
    expect(JSON.stringify(data.blocks)).not.toContain("phis:table");
    expect(JSON.stringify(data.blocks)).not.toContain("phi-table-embed:");
    const [sentence, heading, table] = data.blocks;
    expect(sentence).toEqual({ kind: "paragraph", inlines: [{ kind: "text", text: "See the prices below." }] });
    expect(heading).toMatchObject({ kind: "heading", inlines: [{ kind: "text", text: "Prices" }] });
    expect(table).toMatchObject({ kind: "table", rows: [[[{ kind: "text", text: "cell" }]]] });
  });

  it("is its caption where no resolver is handed in -- another Widget's text, a teaser, the index", async () => {
    const embed = embedOf(await render(`![Prices](${ADDRESS})`, { resolver: false, renderMode: "preview" }));
    expect(embed).toEqual({ kind: "table_embed", caption: "Prices", table: null, notice: null });
  });
});

describe("the Providers a page mounts for its embeds", () => {
  const moduleSet = {
    moduleDefinitionsById: new Map([[PRICES_ID, pricesModule()]]),
    dataProviderDescriptorsByKey: new Map([[PROVIDER_KEY, pricesModule().dataProviders![0]!]]),
    widgetDefinitionsByType: new Map(),
    layoutDefinitionsByType: new Map(),
    formDefinitionsById: new Map(),
  } as unknown as PhiResolvedRuntimeModuleSet;
  const treeWith = (markdown: string, published?: string) => [{
    contentWidgets: [{
      id: 1,
      widgetType: PhiCmsWidgetType.Markdown,
      config: { markdown },
      ...(published ? { resolvedContent: { textFields: { markdown: { source: published } } } } : {}),
    }],
    layoutNodes: [],
  }] as unknown as Parameters<typeof collectPhiRuntimeDataProviderKeys>[0]["trees"];

  it("mounts the Provider of an embed the text or its published content names", () => {
    expect([...collectPhiRuntimeDataProviderKeys({ moduleSet, trees: treeWith(`![Prices](${ADDRESS}?currency=CHF)`) })])
      .toEqual([PROVIDER_KEY]);
    expect([...collectPhiRuntimeDataProviderKeys({ moduleSet, trees: treeWith("Draft.", `![Prices](${ADDRESS})`) })])
      .toEqual([PROVIDER_KEY]);
  });

  it("mounts nothing for a text without one, or for a key no active Module offers", () => {
    expect(collectPhiRuntimeDataProviderKeys({ moduleSet, trees: treeWith("Plain text, ![a picture](phis:asset/4).") }).size).toBe(0);
    expect(collectPhiRuntimeDataProviderKeys({ moduleSet, trees: treeWith("![x](phis:table/@acme/prices/table-embeds/unknown)") }).size).toBe(0);
  });
});
