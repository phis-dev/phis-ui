// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhiImageControl } from "./phi-image-control";

vi.mock("../root/phi-config-provider", () => ({
  usePhiConfig: () => ({ token: { colorBgMask: "rgba(0, 0, 0, 0.45)" } }),
}));

/**
 * The plain zoom: a click scales the picture to the viewport, the next click puts it back. The overlay
 * stands in a portal, so its click must not reach the picture's box and open it again.
 */
afterEach(cleanup);

function renderZoomable() {
  return render(
    <PhiImageControl
      presentation={{ kind: "original", url: "/picture.png", fit: "cover", objectPosition: undefined, width: 120, height: 80, focalRect: null, variantSpec: null } as never}
      source="url"
      alt="A picture"
      zoom
    />,
  );
}

function overlay() {
  return document.body.querySelector<HTMLElement>('[role="dialog"]');
}

describe("the zoomed picture", () => {
  it("opens on a click and closes on the next", () => {
    const view = renderZoomable();
    fireEvent.click(view.getByRole("button", { name: "A picture" }));
    expect(overlay()).not.toBeNull();
    fireEvent.click(overlay()!);
    expect(overlay()).toBeNull();
  });

  it("closes on Escape", () => {
    const view = renderZoomable();
    fireEvent.click(view.getByRole("button", { name: "A picture" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay()).toBeNull();
  });

  it("opens from the keyboard", () => {
    const view = renderZoomable();
    fireEvent.keyDown(view.getByRole("button", { name: "A picture" }), { key: "Enter" });
    expect(overlay()).not.toBeNull();
  });
});
