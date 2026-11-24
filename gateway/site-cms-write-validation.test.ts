import { describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import type { PhiCmsSiteBridge, PhiRuntimeModuleCatalog } from "../types/cms-plugins";
import { validatePhiCmsStructureWrite } from "./site-cms-write-validation";

function definitionFor(widgetType: string, fields: unknown[] = []) {
  const cut = widgetType.lastIndexOf("/");
  return {
    definition: {
      pluginKey: widgetType.slice(0, cut),
      typeKey: widgetType.slice(cut + 1),
      fields,
      parseConfig: (config: Record<string, unknown>) => {
        if (config.broken) throw new Error("cannot read this config");
        return config;
      },
    },
  };
}

const orders = {
  resourceKey: "orders",
  title: "Orders",
  rowIdentityPath: "id",
  fields: [{ key: "id", title: "Order", type: "string" }],
  query: { pagination: "none" },
  actions: [{ key: "release", title: "Release", scope: "row" }],
};

const catalog = new Map([["@acme/shop/modules/shop", {
  definition: { dataProviders: [{ key: "acme/orders", kind: "table", resources: [orders] }] },
  widgets: [
    definitionFor(PhiCmsWidgetType.Table),
    definitionFor(PhiCmsWidgetType.Record),
    definitionFor(PhiCmsWidgetType.Button, [{ key: "icon", type: "icon", label: "Icon" }]),
  ],
  layouts: [],
}]]) as unknown as PhiRuntimeModuleCatalog;

const loadAreaBridge = async () => ({ runtimeModuleCatalog: catalog }) as unknown as PhiCmsSiteBridge;

function write(widgets: readonly Record<string, unknown>[]) {
  return new Request("https://site.test/api/site/cms/page/draft", {
    method: "PUT",
    body: JSON.stringify({ area: "admin", tree: { contentWidgets: widgets } }),
  }) as unknown as NextRequest;
}

async function refusal(widgets: readonly Record<string, unknown>[]) {
  const response = await validatePhiCmsStructureWrite(write(widgets), loadAreaBridge);
  return response ? { status: response.status, body: await response.json() } : null;
}

/**
 * The Builder's save is where a config the live Widget no longer checks is stopped: a binding its
 * Provider does not declare, an icon nobody draws. The answer names the Widget and the cause.
 */
describe("a CMS structure write", () => {
  const source = { providerKey: "acme/orders", resourceKey: "orders" };
  const table = (config: Record<string, unknown>) => ({ id: "t1", widgetType: PhiCmsWidgetType.Table, config });

  it("goes through when every bound Widget holds and every icon is known", async () => {
    expect(await refusal([
      table({ source, presentation: { layout: { mode: "auto" }, columns: [{ key: "id", fieldKey: "id", title: "Order" }] }, features: { pagination: { enabled: false } } }),
      { id: "r1", widgetType: PhiCmsWidgetType.Record, config: { source, actions: [{ key: "release" }] } },
      { id: "b1", widgetType: PhiCmsWidgetType.Button, config: { icon: "plus" } },
    ])).toBeNull();
  });

  it("is refused for a Table bound to what its resource does not declare", async () => {
    expect(await refusal([
      table({ source, presentation: { layout: { mode: "auto" }, columns: [{ key: "total", fieldKey: "total", title: "Total" }] }, features: { pagination: { enabled: false } } }),
    ])).toEqual({
      status: 422,
      body: expect.objectContaining({
        code: "invalid-config",
        nodeId: "t1",
        error: `${PhiCmsWidgetType.Table}: Table column "total" references undeclared field "total".`,
      }),
    });
  });

  it("is refused for a record Widget's action the resource does not offer, and for a resource it does not declare", async () => {
    expect((await refusal([{ id: "r1", widgetType: PhiCmsWidgetType.Record, config: { source, actions: [{ key: "lock" }] } }]))?.body.error)
      .toBe(`${PhiCmsWidgetType.Record}: Record action "lock" is not declared by resource "orders".`);
    expect((await refusal([{ id: "r2", widgetType: PhiCmsWidgetType.Record, config: { source: { ...source, resourceKey: "returns" }, actions: [] } }]))?.body.error)
      .toBe(`${PhiCmsWidgetType.Record}: Record is bound to resource "returns", which "acme/orders" does not declare.`);
  });

  it("is refused for an icon PhiIcon does not know", async () => {
    expect((await refusal([{ id: "b1", widgetType: PhiCmsWidgetType.Button, config: { icon: "Trash" } }]))?.body).toEqual(
      expect.objectContaining({ nodeId: "b1", error: `${PhiCmsWidgetType.Button}: icon names the icon "Trash", which PhiIcon does not know.` }),
    );
  });

  it("leaves a Widget on a Provider the Area does not declare alone, and still refuses an unreadable config first", async () => {
    expect(await refusal([table({ source: { providerKey: "other/rows", resourceKey: "rows" } })])).toBeNull();
    expect((await refusal([table({ broken: true })]))?.body.error).toBe(`${PhiCmsWidgetType.Table}: cannot read this config`);
  });
});
