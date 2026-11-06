import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PhiDashboardCardContext } from "../types/dashboard-cards";
import { definePhiDashboardCardRead } from "./dashboard-card-memo";

const context = (siteKey: string) => ({ apiBaseUrl: "http://core", internalToken: "t", siteKey }) as PhiDashboardCardContext;

describe("a read the cards of one Dashboard share", () => {
  it("loads once for one context, however many cards ask", async () => {
    const load = vi.fn(async () => ({ figures: 1 }));
    const read = definePhiDashboardCardRead(load);
    const shared = context("site");
    const [first, second] = await Promise.all([read(shared), read(shared)]);
    expect(first).toBe(second);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("loads again for another request's context", async () => {
    const load = vi.fn(async () => ({ figures: 1 }));
    const read = definePhiDashboardCardRead(load);
    await read(context("site"));
    await read(context("site"));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps a failure for the context it happened in", async () => {
    const load = vi.fn(async () => { throw new Error("down"); });
    const read = definePhiDashboardCardRead(load);
    const shared = context("site");
    await expect(read(shared)).rejects.toThrow("down");
    await expect(read(shared)).rejects.toThrow("down");
    expect(load).toHaveBeenCalledTimes(1);
  });
});
