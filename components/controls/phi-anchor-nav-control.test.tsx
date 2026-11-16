// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhiAnchorNavControl } from "./phi-anchor-nav-control";

/**
 * A jump from the contents is a fragment change the page hears: Ant Design writes the address with
 * `pushState`, which fires no `hashchange`, and a folded question listening for its fragment stayed shut.
 */
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("a jump from the contents", () => {
  it("is announced as a fragment change once the address is written, and not as the browser's own", async () => {
    const heard = vi.fn((event: Event) => ({ hash: window.location.hash, trusted: event.isTrusted === true }));
    window.addEventListener("hashchange", heard);
    render(<PhiAnchorNavControl items={[{ key: "q", href: "#which-port", title: "Which port?" }]} />);

    fireEvent.click(document.querySelector("a[href='#which-port']")!);
    await Promise.resolve();
    window.removeEventListener("hashchange", heard);

    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard.mock.results[0]!.value).toEqual({ hash: "#which-port", trusted: false });
  });

  it("is not announced where the address did not change", async () => {
    window.history.replaceState(null, "", "/#which-port");
    const heard = vi.fn();
    window.addEventListener("hashchange", heard);
    render(<PhiAnchorNavControl items={[{ key: "q", href: "#which-port", title: "Which port?" }]} />);

    fireEvent.click(document.querySelector("a[href='#which-port']")!);
    await Promise.resolve();
    window.removeEventListener("hashchange", heard);

    expect(heard).not.toHaveBeenCalled();
  });
});
