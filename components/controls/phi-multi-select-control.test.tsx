import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PhiMultiSelectControl } from "./phi-multi-select-control";

vi.mock("../root/phi-config-provider", () => ({
  usePhiConfig: () => ({ token: { paddingXS: 8 } }),
}));

const OPTIONS = [{ value: "content", label: "content" }, { value: "form", label: "form" }];

function render(props: { label?: string; ariaLabel?: string }) {
  return renderToStaticMarkup(createElement(PhiMultiSelectControl<string>, {
    ...props,
    value: [],
    options: OPTIONS,
    onChange: () => {},
  }));
}

/*
 * A filter in a picker's header has no visible label beside it, and the placeholder is no name: the
 * field is named by `ariaLabel`, which takes precedence over a label as it does on the Select.
 */
describe("the Multi Select's accessible name", () => {
  it("is the ariaLabel where no label stands beside the field", () => {
    const markup = render({ ariaLabel: "Filter categories" });
    expect(markup).toContain('aria-label="Filter categories"');
    expect(markup).not.toContain("aria-labelledby");
  });

  it("is the visible label otherwise", () => {
    const markup = render({ label: "Categories" });
    expect(markup).toContain("aria-labelledby");
    // The only aria-label left is the arrow icon's own.
    expect(markup.match(/aria-label="[^"]*"/gu)).toEqual(['aria-label="down"']);
  });

  it("prefers the ariaLabel over the label", () => {
    const markup = render({ label: "Categories", ariaLabel: "Filter categories" });
    expect(markup).toContain('aria-label="Filter categories"');
    expect(markup).not.toContain("aria-labelledby");
  });
});
