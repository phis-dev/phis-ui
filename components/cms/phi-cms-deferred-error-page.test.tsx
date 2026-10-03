// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhiCmsDeferredErrorPage } from "./phi-cms-deferred-error-page";

afterEach(cleanup);

/**
 * Next renders a refusal boundary into every response, so this one asks for the Site's error page only
 * once it is mounted -- which is once it is shown -- and stands on plain copy until then.
 */
describe("a refusal route's deferred page", () => {
  it("asks for nothing until it is mounted, then for its own code", async () => {
    const load = vi.fn(async () => <p>Site 404</p>);
    const element = <PhiCmsDeferredErrorPage code={404} load={load} />;
    expect(load).not.toHaveBeenCalled();

    render(element);
    expect(screen.getByText("This page could not be found.")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Site 404")).toBeTruthy());
    expect(load).toHaveBeenCalledWith(404);
  });

  it("keeps the plain copy where the Site has no page or the Action fails", async () => {
    const empty = vi.fn(async () => null);
    render(<PhiCmsDeferredErrorPage code={403} load={empty} />);
    await waitFor(() => expect(empty).toHaveBeenCalled());
    expect(screen.getByText("You are not allowed to view this page.")).toBeTruthy();
    cleanup();

    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    render(<PhiCmsDeferredErrorPage code={401} load={failing} />);
    await waitFor(() => expect(failing).toHaveBeenCalled());
    expect(screen.getByText("You are not authorized to view this page.")).toBeTruthy();
  });
});
