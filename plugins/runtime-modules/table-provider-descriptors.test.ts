import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/*
 * A Table Provider takes its resources from its Module's descriptor list, and that list holds the
 * Module's other Providers too. Reading the first entry worked until User Management gained its Add-on
 * role options in front of the table: the module then threw on evaluation and the users page answered
 * 500. Evaluating each one is the whole check -- a registration without resources refuses itself.
 */
describe("the Table Providers that read their resources from a descriptor list", () => {
  it.each([
    ["User Management", () => import("./user-management/services/table")],
    ["Auth installations", () => import("./auth/services/installations-table")],
    ["Observability", () => import("./observability/services/table")],
    ["Editor releases", () => import("./editor/services/releases-table")],
    ["Accounting products", () => import("./accounting/services/products-table")],
  ])("%s loads", async (_name, load) => {
    await expect(load()).resolves.toBeDefined();
  });
});
