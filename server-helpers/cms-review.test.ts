import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../gateway/site-theme", () => ({ getSiteThemeRevision: vi.fn() }));

import { hasPhiCmsAuthorizedPreviewRead } from "./cms-review";

/*
 * The Area access guard steps aside for a preview because Core has already decided who may see it.
 * That holds only for the reads Core actually authorizes -- the Area and the Page -- so the question
 * "is this a preview" has to be asked as "did Core authorize what is on screen".
 */
describe("hasPhiCmsAuthorizedPreviewRead", () => {
  it("is true for a draft revision and for an Area or Page review", () => {
    expect(hasPhiCmsAuthorizedPreviewRead({ revision: "12" })).toBe(true);
    expect(hasPhiCmsAuthorizedPreviewRead({ reviewKind: "area", reviewRevision: "3" })).toBe(true);
    expect(hasPhiCmsAuthorizedPreviewRead({ reviewKind: "page", reviewRevision: "3", reviewPage: "/x" })).toBe(true);
  });

  it("is false for a Navigation or Theme review, whose Area and Page come back live", () => {
    expect(hasPhiCmsAuthorizedPreviewRead({ reviewKind: "navigation", reviewRevision: "1", reviewNavKey: "x" })).toBe(false);
    expect(hasPhiCmsAuthorizedPreviewRead({ reviewKind: "theme", reviewRevision: "1", reviewThemeKey: "brand" })).toBe(false);
  });

  it("is false without a usable revision", () => {
    expect(hasPhiCmsAuthorizedPreviewRead(undefined)).toBe(false);
    expect(hasPhiCmsAuthorizedPreviewRead({})).toBe(false);
    expect(hasPhiCmsAuthorizedPreviewRead({ revision: "0" })).toBe(false);
    expect(hasPhiCmsAuthorizedPreviewRead({ revision: "abc" })).toBe(false);
    expect(hasPhiCmsAuthorizedPreviewRead({ reviewKind: "area" })).toBe(false);
    expect(hasPhiCmsAuthorizedPreviewRead({ reviewKind: "area", reviewRevision: "-1" })).toBe(false);
  });
});
