import { describe, expect, it } from "vitest";

import {
  createPhiModuleIconName,
  parsePhiModuleIconName,
} from "../constants/module-identity";
import {
  collectPhiModuleIconErrors,
  collectPhiModuleIconSets,
  definePhiModuleIcons,
  indexPhiModuleIconSets,
  resolvePhiModuleIcon,
} from "./module-icons";

const DRAWING = { viewBox: "0 0 24 24", paths: ["M0 0h24v24H0z"] };

/* The shape `@ant-design/icons-svg/es/asn/ProductOutlined` exports, shortened. */
const ANTD_OUTLINED = {
  name: "product",
  theme: "outlined",
  icon: {
    tag: "svg",
    attrs: { "fill-rule": "evenodd", viewBox: "64 64 896 896", focusable: "false" },
    children: [{ tag: "path", attrs: { d: "M464 144a16 16 0 0116 16z" } }],
  },
};

describe("module icon names", () => {
  it("cuts the icon name after the last slash of a scoped module id", () => {
    const name = createPhiModuleIconName("@phis/dev/modules/site", "product");
    expect(name).toBe("module:@phis/dev/modules/site/product");
    expect(parsePhiModuleIconName(name)).toEqual({ moduleId: "@phis/dev/modules/site", name: "product" });
    expect(parsePhiModuleIconName("module:acme-shop/modules/shop/shopping-cart")).toEqual({
      moduleId: "acme-shop/modules/shop",
      name: "shopping-cart",
    });
  });

  it("reads nothing that is not a module icon name", () => {
    expect(parsePhiModuleIconName("antd:product")).toBeNull();
    expect(parsePhiModuleIconName("module:product")).toBeNull();
    expect(parsePhiModuleIconName("module:@phis/dev/product")).toBeNull();
    expect(parsePhiModuleIconName("module:@phis/dev/modules/site/Product")).toBeNull();
    expect(parsePhiModuleIconName("module:@phis/dev/modules/site/")).toBeNull();
    expect(parsePhiModuleIconName(42)).toBeNull();
  });

  it("refuses to write a name the grammar cannot read back", () => {
    expect(() => createPhiModuleIconName("@phis/dev", "product")).toThrow();
    expect(() => createPhiModuleIconName("@phis/dev/modules/site", "a/b")).toThrow();
    expect(() => createPhiModuleIconName("@phis/dev/modules/site", "Product")).toThrow();
  });
});

describe("definePhiModuleIcons", () => {
  it("keeps a drawing of the Module's own", () => {
    expect(definePhiModuleIcons([{ name: "mark", label: "Mark", drawing: DRAWING }])).toEqual([
      { name: "mark", label: "Mark", drawing: DRAWING },
    ]);
  });

  it("reads an Ant Design outline definition into a drawing", () => {
    expect(definePhiModuleIcons([{ name: "product", label: "Product", drawing: ANTD_OUTLINED }])).toEqual([{
      name: "product",
      label: "Product",
      drawing: { viewBox: "64 64 896 896", paths: ["M464 144a16 16 0 0116 16z"], fillRule: "evenodd" },
    }]);
  });

  it("refuses a name registered twice", () => {
    expect(() => definePhiModuleIcons([
      { name: "mark", label: "Mark", drawing: DRAWING },
      { name: "mark", label: "Other", drawing: DRAWING },
    ])).toThrow(/registered twice/);
  });

  it("refuses a name outside the grammar, a missing label and an empty drawing", () => {
    expect(() => definePhiModuleIcons([{ name: "my/mark", label: "Mark", drawing: DRAWING }])).toThrow(/kebab/);
    expect(() => definePhiModuleIcons([{ name: "mark", label: " ", drawing: DRAWING }])).toThrow(/label/);
    expect(() => definePhiModuleIcons([
      { name: "mark", label: "Mark", drawing: { viewBox: "0 0 1 1", paths: [] } },
    ])).toThrow(/path data/);
  });

  it("refuses a two-tone definition and one with more than paths in it", () => {
    expect(() => definePhiModuleIcons([{
      name: "audio",
      label: "Audio",
      drawing: { name: "audio", theme: "twotone", icon: () => ANTD_OUTLINED.icon },
    }])).toThrow(/two-tone/);
    expect(() => definePhiModuleIcons([{
      name: "styled",
      label: "Styled",
      drawing: {
        ...ANTD_OUTLINED,
        icon: { ...ANTD_OUTLINED.icon, children: [{ tag: "defs", attrs: {} }] },
      },
    }])).toThrow(/<defs>/);
  });

  it("is the check the catalog runs on a definition written without it", () => {
    expect(collectPhiModuleIconErrors([
      { name: "mark", label: "Mark", drawing: DRAWING },
      { name: "mark", label: "Mark", drawing: DRAWING },
    ])).toEqual(['Module icon "mark" is registered twice.']);
  });
});

describe("resolvePhiModuleIcon", () => {
  const sets = collectPhiModuleIconSets([
    { moduleId: "@phis/dev/modules/site", title: "phis.dev", icons: [{ name: "product", label: "Product", drawing: DRAWING }] },
    { moduleId: "@phis/shop/modules/shop", title: "Shop" },
  ]);
  const index = indexPhiModuleIconSets(sets);

  it("holds a set only for a Module that registers icons", () => {
    expect(sets.map((set) => set.moduleId)).toEqual(["@phis/dev/modules/site"]);
  });

  it("finds an icon of a Module the Area holds", () => {
    expect(resolvePhiModuleIcon(index, "module:@phis/dev/modules/site/product")?.label).toBe("Product");
  });

  it("finds nothing for a Module that is not active there, or a name it does not register", () => {
    expect(resolvePhiModuleIcon(index, "module:@phis/shop/modules/shop/shopping-cart")).toBeNull();
    expect(resolvePhiModuleIcon(index, "module:@phis/dev/modules/site/basket")).toBeNull();
    expect(resolvePhiModuleIcon(index, "antd:product")).toBeNull();
  });
});
