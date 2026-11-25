import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PhiBuilderIcon } from "../shell/phi-builder-icon";
import { PhiBuilderInsertPickerControl, type PhiBuilderInsertPickerItem } from "./phi-builder-insert-picker-control";

vi.mock("../root/phi-config-provider", () => ({
  usePhiConfig: () => ({ token: { borderRadiusSM: 5, paddingXS: 8 } }),
}));

/* The popover's content drawn in place, since a server render never opens the overlay it hangs in. */
vi.mock("./phi-popover-control", () => ({
  PhiPopoverControl: ({ children, content }: { children: ReactNode; content: ReactNode }) =>
    createElement("div", null, children, content),
}));

function item(key: string, kind: "layout" | "widget", packageName: string): PhiBuilderInsertPickerItem {
  return {
    key,
    kind,
    origin: null,
    packageName,
    title: key,
    description: null,
    category: kind === "widget" ? (key === "product" ? "commerce" : "content") : null,
    tags: null,
    icon: null,
  };
}

function render(section: "layout" | "widget", packageFilters: string[] = []) {
  return renderToStaticMarkup(createElement(PhiBuilderInsertPickerControl, {
    open: true,
    trigger: createElement("button", { type: "button" }, "Insert"),
    items: [
      item("flex", "layout", "@phis/ui"),
      item("grid", "layout", "@phis/shop"),
      item("markdown", "widget", "@phis/ui"),
      item("product", "widget", "@phis/shop"),
    ],
    section,
    packageFilters,
    widgetCategoryFilters: [],
    allowLayoutSection: true,
    allowWidgetSection: true,
    onOpenChange: () => {},
    onSectionChange: () => {},
    onPackageFiltersChange: () => {},
    onWidgetCategoryFiltersChange: () => {},
    onChange: () => {},
  }));
}

/*
 * The Insert picker stands beside the Media and Icon pickers and dresses as they do: a small search
 * field with its frame, small controls in the header, and the Theme's corners -- not an underlined
 * field over a list with square corners.
 */
describe("the Builder's insert picker", () => {
  it("searches in the small search field the other pickers use", () => {
    const markup = render("widget");
    expect(markup).toMatch(/<input[^>]*type="search"/u);
    expect(markup).toContain("ant-input-affix-wrapper-sm");
    expect(markup).not.toContain("ant-input-borderless");
    expect(markup).toContain('placeholder="Search widgets"');
  });

  it("keeps its header controls small", () => {
    const markup = render("widget");
    expect(markup).toContain("ant-segmented-sm");
    expect(markup).toContain("ant-select-sm");
  });

  it("names its filters and its section switch, which have no visible label", () => {
    const markup = render("widget");
    expect(markup).toContain('aria-label="Filter categories"');
    expect(markup).toContain('aria-label="Filter packages"');
    expect(markup).toMatch(/<div[^>]*aria-label="Insert a layout or a widget"[^>]*class="[^"]*ant-segmented/u);
  });

  it("draws no square corner of its own", () => {
    expect(render("widget")).not.toContain("border-radius:0");
    expect(render("layout")).not.toContain("border-radius:0");
  });

  it("still lists one section, narrowed by the package filter", () => {
    const markup = render("layout", ["@phis/shop"]);
    expect(markup).toContain(">grid<");
    expect(markup).not.toContain(">flex<");
    expect(markup).not.toContain(">markdown<");
  });
});

describe("a Layout's builder icon", () => {
  function frameRadius(size: number | string) {
    const markup = renderToStaticMarkup(createElement(PhiBuilderIcon, { motif: "flex", size }));
    return /<rect x="1" y="1" width="14" height="14" rx="([^"]+)"/u.exec(markup)?.[1];
  }

  it("rounds its frame by the Theme's small radius, on screen at any pixel size", () => {
    expect(frameRadius(16)).toBe("5");
    expect(frameRadius(32)).toBe("2.5");
  });

  it("keeps the radius at its drawn 16px where the size is not in pixels", () => {
    expect(frameRadius("1em")).toBe("5");
  });
});
