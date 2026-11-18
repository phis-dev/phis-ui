import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const readField = vi.hoisted(() => vi.fn());
vi.mock("../../../../../server-helpers/record-fields", () => ({ resolvePhiWidgetRecordField: readField }));

import { createPhiPageReference } from "../../../../../types/references";
import { applyPhiSimpleTextColor, PHI_SIMPLE_TEXT_WIDGET_DEFINITION } from "./config";
import { resolvePhiSimpleTextLink } from "./plugin";

const parse = PHI_SIMPLE_TEXT_WIDGET_DEFINITION.parseConfig;
const fields = PHI_SIMPLE_TEXT_WIDGET_DEFINITION.fields;
const runtime = {} as never;
const registry = {} as never;

describe("Simple Text's config", () => {
  it("keeps where it leads as a link target and reads nothing of the old link keys", () => {
    const config = parse({
      text: "Write to us",
      linkTarget: { kind: "external", href: "mailto:info@example.org", newTab: true },
      href: "https://old.example.org",
      external: true,
      newTab: true,
      disabled: true,
    });
    expect(config.linkTarget).toEqual({ kind: "external", href: "mailto:info@example.org", newTab: true });
    expect(config).not.toHaveProperty("href");
    expect(config).not.toHaveProperty("external");
    expect(config).not.toHaveProperty("newTab");
    expect(config).not.toHaveProperty("disabled");
  });

  it("refuses a target that is not one: a path is a Page link that lost its identity", () => {
    expect(parse({ linkTarget: { kind: "external", href: "/pricing" } }).linkTarget).toBeUndefined();
  });

  it("offers no Inspector field for the words, which are written on the canvas", () => {
    const keys = fields.map((field) => field.key);
    expect(keys).not.toContain("text");
    expect(keys).not.toContain("href");
    expect(keys).not.toContain("disabled");
    expect(fields.find((field) => field.key === "linkTarget")).toMatchObject({ type: "link-target", heading: "Link target" });
    expect(fields.find((field) => field.key === "linkRecordField")).toMatchObject({ type: "record-field", kinds: ["link"] });
    expect(fields.find((field) => field.key === "recordField")).toMatchObject({ heading: "Text" });
  });
});

describe("Simple Text's colour from the toolbar", () => {
  it("drops the tone when a colour is written, and leaves the default when the colour goes", () => {
    expect(applyPhiSimpleTextColor("#ff0000")).toEqual({ color: "#ff0000", tone: undefined });
    expect(applyPhiSimpleTextColor(null)).toEqual({ color: undefined });
  });
});

describe("where a Simple Text leads", () => {
  beforeEach(() => readField.mockReset());

  it("follows its target: an address as it is, a Page by the address it resolved to", async () => {
    readField.mockResolvedValue({ bound: false });
    await expect(resolvePhiSimpleTextLink({ linkTarget: { kind: "external", href: "https://example.org", newTab: true } }, runtime, registry, null))
      .resolves.toEqual({ href: "https://example.org", newTab: true, external: true });
    const reference = createPhiPageReference({ kind: "site", pageScopeId: 7 });
    await expect(resolvePhiSimpleTextLink({ linkTarget: { kind: "page", reference } }, runtime, registry, new Map([[reference, "/about"]])))
      .resolves.toEqual({ href: "/about", newTab: false, external: false });
  });

  it("leads nowhere for a Page that did not resolve, or without a target", async () => {
    readField.mockResolvedValue({ bound: false });
    const reference = createPhiPageReference({ kind: "site", pageScopeId: 7 });
    await expect(resolvePhiSimpleTextLink({ linkTarget: { kind: "page", reference } }, runtime, registry, new Map())).resolves.toBeNull();
    await expect(resolvePhiSimpleTextLink({}, runtime, registry, null)).resolves.toBeNull();
  });

  it("follows a link field of the page record instead, and leads nowhere where the record lacks it", async () => {
    readField.mockResolvedValue({ bound: true, field: { kind: "link", value: { href: "https://shop.example.org/p/chair" } } });
    await expect(resolvePhiSimpleTextLink({ linkRecordField: "subscribe", linkTarget: { kind: "external", href: "https://other.example.org" } }, runtime, registry, null))
      .resolves.toEqual({ href: "https://shop.example.org/p/chair", newTab: false, external: true });
    readField.mockResolvedValue({ bound: true, field: null });
    await expect(resolvePhiSimpleTextLink({ linkRecordField: "subscribe" }, runtime, registry, null)).resolves.toBeNull();
  });
});
