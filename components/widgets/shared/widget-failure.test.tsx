// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PHI_CORE_ROLE_PROVIDER_ID, PhiBaseRole } from "@phis/contracts/access";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PHI_WIDGET_FAILURE_LOG_EVENT, type PhiWidgetFailureProps } from "./widget-failure";
import { PhiWidgetFailureAudienceProvider } from "./widget-failure-audience";
import { PhiWidgetFailure } from "./widget-failure-client";
import { canPhiViewerReadWidgetFailures } from "./widget-failure-staff";
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
 * A Widget whose data or configuration failed is the author's to read, Staff's on a live page and no
 * visitor's -- and the operator's in the log, either way.
 */
describe("a Widget's failure", () => {
  it("draws nothing on a visitor's live page and writes the warning", () => {
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

  it("shows the cause to Staff on a live page", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <PhiWidgetFailureAudienceProvider staff>
        <PhiWidgetFailure renderMode="live" {...failure} />
      </PhiWidgetFailureAudienceProvider>,
    );
    expect(await screen.findByText(failure.title, {}, { timeout: 10_000 })).toBeTruthy();
    expect(document.querySelector(`[data-phi-widget-failure="${failure.widgetType}"]`)).toBeTruthy();
  });

  it("is decided the same way on the server, where the warning is written during the render", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(PhiWidgetFailureServer({ renderMode: "live", ...failure }));
    expect(container.innerHTML).toBe("");
    expect(readLoggedEvents(warn)).toEqual([
      expect.objectContaining({ event: PHI_WIDGET_FAILURE_LOG_EVENT, targetId: "EQEXTckA4RzIwceA" }),
    ]);
    cleanup();

    render(
      <PhiWidgetFailureAudienceProvider staff>
        {PhiWidgetFailureServer({ renderMode: "live", ...failure })}
      </PhiWidgetFailureAudienceProvider>,
    );
    expect(await screen.findByText(failure.title, {}, { timeout: 10_000 })).toBeTruthy();
    cleanup();

    render(PhiWidgetFailureServer({ renderMode: "preview", ...failure }));
    expect(await screen.findByText(failure.title, {}, { timeout: 10_000 })).toBeTruthy();
  });
});

describe("who reads a Widget's failure on a live page", () => {
  const withRole = (flags: number) => ({
    access: "authenticated" as const,
    roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags }],
  });

  it("is whoever holds a Core role, Staff alone included", () => {
    for (const flag of [PhiBaseRole.Admin, PhiBaseRole.Builder, PhiBaseRole.Supporter, PhiBaseRole.Staff]) {
      expect(canPhiViewerReadWidgetFailures(withRole(flag))).toBe(true);
    }
  });

  it("is not a visitor, nor a customer with an account and no role", () => {
    expect(canPhiViewerReadWidgetFailures({ access: "public" })).toBe(false);
    expect(canPhiViewerReadWidgetFailures(withRole(0))).toBe(false);
    expect(canPhiViewerReadWidgetFailures({
      access: "authenticated",
      addonRoleClaims: [{ providerId: "@acme/shop", roles: ["seller"] }],
    })).toBe(false);
  });
});
