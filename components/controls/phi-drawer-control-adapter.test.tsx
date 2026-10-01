// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PhiDrawerControlAdapter as PhiDrawerControl } from "./phi-drawer-control-adapter";

/**
 * What a drawer paints and where its header parts stand, measured on the mounted adapter: the styles
 * go through antd's `styles` slots, and only a render shows which element ends up carrying them.
 */
afterEach(cleanup);

function wrapper() {
  return document.querySelector<HTMLElement>(".ant-drawer-content-wrapper");
}

describe("the drawer's surface", () => {
  it("stands on the elevated surface when its chrome names no background", () => {
    render(<PhiDrawerControl open title="Menu" body={<p>body</p>} />);
    expect(wrapper()?.style.background).toBe("var(--ant-color-bg-elevated)");
  });

  it("gives way to the background its chrome names", () => {
    render(<PhiDrawerControl open title="Menu" body={<p>body</p>} containerStyle={{ background: "red" }} />);
    expect(wrapper()?.style.background).toBe("red");
  });
});

describe("the drawer's header", () => {
  it("starts the title past a close button that stands before it", () => {
    render(<PhiDrawerControl open placement="right" title={<span data-title>Menu</span>} body={null} />);
    const title = document.querySelector<HTMLElement>("[data-title]")!.parentElement!;
    expect(title.style.insetInlineStart).toContain("var(--ant-control-height)");
  });

  it("draws no header band when there is nothing to put in it", () => {
    render(<PhiDrawerControl open closable={false} body={<p>body</p>} />);
    expect(document.querySelector(".ant-drawer-header")).toBeNull();
  });
});
