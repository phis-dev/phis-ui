import { describe, expect, it } from "vitest";

import { PhiCmsWidgetType } from "../constants/cms-widget-types";
import type { PhiCmsConfigField } from "../types/cms-plugins";
import type { PhiTableProviderResourceDescriptor } from "../types/table-widget";
import type { PhiTreeProviderResourceDescriptor } from "../types/tree-widget";
import { checkPhiWidgetBinding, checkPhiWidgetConfigIcons } from "./widget-binding-check";

const folders = {
  resourceKey: "folders",
  title: "Folders",
  nodeIdentityPath: "id",
  parentNodeIdentityPath: "parentId",
  titleFieldKey: "name",
  fields: [{ key: "name", title: "Name", type: "string" }],
  query: {},
  actions: [{ key: "remove", title: "Remove", scope: "node", confirmation: "required" }],
} as unknown as PhiTreeProviderResourceDescriptor;

const orders = {
  resourceKey: "orders",
  title: "Orders",
  rowIdentityPath: "id",
  fields: [{ key: "id", title: "Order", type: "string" }],
  query: { pagination: "none" },
  actions: [
    { key: "release", title: "Release", scope: "row" },
    { key: "export", title: "Export", scope: "resource" },
  ],
} as unknown as PhiTableProviderResourceDescriptor;

const providers = new Map([
  ["acme/folders", { key: "acme/folders", kind: "tree", resources: [folders] }],
  ["acme/orders", { key: "acme/orders", kind: "table", resources: [orders] }],
]);

/**
 * A bound Widget is checked where its config is made -- a preset's tests and the Builder's save -- and
 * not in the browser, so these are the checks that stand between a wrong binding and a live page.
 */
describe("a bound Widget's config against its Provider", () => {
  it("reads a Tree, which no build step judged before", () => {
    const config = {
      source: { providerKey: "acme/folders", resourceKey: "folders" },
      presentation: { node: { titleFieldKey: "name", descriptionFieldKey: "summary" } },
      features: { search: { enabled: true }, actions: { node: [{ key: "remove", execution: "provider" }] } },
    };
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Tree, config, providers)).toEqual([
      'Tree presentation references undeclared field "summary".',
      "Tree search requires Provider query search capability.",
      'Tree action "remove" requires confirmation presentation.',
    ]);
    // A preset may leave out what it does not use.
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Tree, {
      source: { providerKey: "acme/folders", resourceKey: "folders" },
      presentation: { node: { titleFieldKey: "name" } },
    }, providers)).toEqual([]);
  });

  it("reads a record Widget's actions against its Table resource", () => {
    const source = { providerKey: "acme/orders", resourceKey: "orders" };
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Record, { source, actions: [{ key: "release" }] }, providers)).toEqual([]);
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Record, { source, actions: [{ key: "export" }, { key: "lock" }] }, providers)).toEqual([
      'Record action "export" cannot run on a record: its scope is "resource".',
      'Record action "lock" is not declared by resource "orders".',
    ]);
  });

  it("names a resource its Provider does not declare, and leaves a Provider it was not handed alone", () => {
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Tree, { source: { providerKey: "acme/folders", resourceKey: "files" } }, providers))
      .toEqual(['Tree is bound to resource "files", which "acme/folders" does not declare.']);
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Table, { source: { providerKey: "other/rows", resourceKey: "rows" } }, providers))
      .toEqual([]);
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Button, { source: { providerKey: "acme/orders" } }, providers)).toEqual([]);
  });

  it("reads a Table's binding and the icons its actions draw", () => {
    const config = {
      source: { providerKey: "acme/orders", resourceKey: "orders" },
      presentation: { layout: { mode: "auto" }, columns: [{ key: "id", fieldKey: "id", title: "Order" }] },
      features: {
        pagination: { enabled: false },
        actions: { toolbar: [{ key: "export", execution: "provider", display: "icon", icon: "no-such-icon" }] },
      },
    };
    expect(checkPhiWidgetBinding(PhiCmsWidgetType.Table, config, providers)).toEqual([
      'Table action "export" names the icon "no-such-icon", which PhiIcon does not know.',
    ]);
  });
});

describe("the icons a Widget's config names", () => {
  const fields: PhiCmsConfigField[] = [
    { key: "icon", type: "icon", label: "Icon" },
    {
      key: "features.actions.toolbar",
      type: "collection",
      label: "Toolbar Actions",
      itemKeyField: "key",
      itemFields: [{ key: "icon", type: "icon", label: "Icon" }],
    },
  ];

  it("refuses a name PhiIcon does not know, in a field and in a collection's entries", () => {
    expect(checkPhiWidgetConfigIcons(fields, {
      icon: "plus",
      features: { actions: { toolbar: [{ key: "a", icon: "antd:delete" }, { key: "b", icon: "Trash" }] } },
    })).toEqual(['features.actions.toolbar[1].icon names the icon "Trash", which PhiIcon does not know.']);
    expect(checkPhiWidgetConfigIcons(fields, { icon: "antd:nothing-here" }))
      .toEqual(['icon names the icon "antd:nothing-here", which PhiIcon does not know.']);
  });

  it("takes what other owners draw, and an empty field", () => {
    expect(checkPhiWidgetConfigIcons(fields, { icon: "iconify:mdi:home" })).toEqual([]);
    expect(checkPhiWidgetConfigIcons(fields, { icon: "" })).toEqual([]);
    expect(checkPhiWidgetConfigIcons(undefined, { icon: "Trash" })).toEqual([]);
  });
});
