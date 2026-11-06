// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PHI_WIDGET_FAILURE_LOG_EVENT, type PhiWidgetFailureProps } from "./widget-failure";
import { PhiWidgetFailure } from "./widget-failure-client";
import { PhiWidgetFailureServer } from "./widget-failure.server";

afterEach(cleanup);

const failure = {
  widgetType: "core/collection-view",
  widgetId: "EQEXTckA4RzIwceA" as PhiCmsInstanceId,
  title: "Collection provider \"x/y\" is not available from the active runtime modules.",
  description: "Switch the Module on in this Area.",
} satisfies Omit<PhiWidgetFailureProps, "renderMode">;

function readLoggedEvents(warn: ReturnType<typeof vi.spyOn>) {
  return warn.mock.calls.map(([line]) => JSON.parse(String(line)) as { event: string; targetId: string | null });
}

/**
 * A Widget whose data or configuration failed is the author's to read and nobody's on a live page --
 * and the operator's in the log, either way.
 */
describe("a Widget's failure", () => {
  it("draws nothing on a live page and writes the warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<PhiWidgetFailure renderMode="live" {...failure} />);
    expect(container.innerHTML).toBe("");
    expect(readLoggedEvents(warn)).toEqual([
      expect.objectContaining({ event: PHI_WIDGET_FAILURE_LOG_EVENT, targetId: "EQEXTckA4RzIwceA" }),
    ]);
  });

  it.each(["preview", "editor"] as const)("shows the cause in %s and writes the warning too", async (renderMode) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<PhiWidgetFailure renderMode={renderMode} {...failure} />);
    expect(await screen.findByText(failure.title, {}, { timeout: 10_000 })).toBeTruthy();
    expect(screen.getByText(failure.description)).toBeTruthy();
    expect(document.querySelector(`[data-phi-widget-failure="${failure.widgetType}"]`)).toBeTruthy();
    expect(readLoggedEvents(warn)).toHaveLength(1);
  });

  it("writes one warning per failure however often the Widget renders", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<PhiWidgetFailure renderMode="live" {...failure} />);
    rerender(<PhiWidgetFailure renderMode="live" {...failure} />);
    expect(readLoggedEvents(warn)).toHaveLength(1);
    rerender(<PhiWidgetFailure renderMode="live" {...failure} title="Another cause." />);
    expect(readLoggedEvents(warn)).toHaveLength(2);
  });

  it("is decided the same way on the server, where the warning is written during the render", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(PhiWidgetFailureServer({ renderMode: "live", ...failure })).toBeNull();
    expect(readLoggedEvents(warn)).toEqual([
      expect.objectContaining({ event: PHI_WIDGET_FAILURE_LOG_EVENT, targetId: "EQEXTckA4RzIwceA" }),
    ]);

    render(PhiWidgetFailureServer({ renderMode: "preview", ...failure }));
    expect(await screen.findByText(failure.title, {}, { timeout: 10_000 })).toBeTruthy();
  });
});
