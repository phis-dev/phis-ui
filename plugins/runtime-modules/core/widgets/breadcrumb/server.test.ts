import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const readFields = vi.hoisted(() => vi.fn());
vi.mock("../../../../../server-helpers/record-fields", () => ({ resolvePhiPageRecordFields: readFields }));
vi.mock("../../../../../gateway/site-nav", () => ({ fetchSiteNavigationFolderTarget: vi.fn(async () => null) }));
vi.mock("../../../../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "http://core", internalToken: "t" }),
}));

import { PhiBreadcrumbWidget } from "./server";

const registry = {} as never;
const record = { providerKey: "shop/product", params: { slug: "chair" } };

async function titleFor(options: {
  title?: string | null;
  withRecord?: boolean;
  config?: Record<string, unknown>;
  registry?: never;
}) {
  const element = await PhiBreadcrumbWidget({
    runtime: {
      site: { key: "site" },
      area: "public",
      page: { path: "/shop/chair", title: options.title ?? null, ...(options.withRecord === false ? {} : { record }) },
    },
    config: options.config ?? {},
    registry: "registry" in options ? options.registry : registry,
  } as never);
  return (element.props as { componentProps: { pageTitle: string | null } }).componentProps.pageTitle;
}

describe("breadcrumb server: the title of the Page's record", () => {
  beforeEach(() => {
    readFields.mockReset();
    readFields.mockResolvedValue({
      status: "ok",
      fields: new Map([["name", { kind: "text", value: "The Chair" }], ["price", { kind: "number", value: 3 }]]),
    });
  });

  it("hands the title over as finished text when it is a text of the record, from the memoised read", async () => {
    expect(await titleFor({ title: "The Chair" })).toBe("The Chair");
    expect(readFields).toHaveBeenCalledTimes(1);
  });

  it("leaves the segment where the Page's title is not the record's", async () => {
    expect(await titleFor({ title: "Product" })).toBeNull();
    expect(await titleFor({ title: null })).toBeNull();
  });

  it("leaves the segment for a Page about no record, a fixed pathLabel and showPath false", async () => {
    expect(await titleFor({ title: "The Chair", withRecord: false })).toBeNull();
    expect(await titleFor({ title: "The Chair", config: { pathLabel: "Here" } })).toBeNull();
    expect(await titleFor({ title: "The Chair", config: { showPath: false } })).toBeNull();
    expect(await titleFor({ title: "The Chair", registry: undefined })).toBeNull();
  });

  it("never fails: a missing or unavailable record and a throwing read leave the segment", async () => {
    readFields.mockResolvedValue({ status: "missing" });
    expect(await titleFor({ title: "The Chair" })).toBeNull();
    readFields.mockResolvedValue({ status: "unavailable", reason: "down" });
    expect(await titleFor({ title: "The Chair" })).toBeNull();
    readFields.mockRejectedValue(new Error("boom"));
    expect(await titleFor({ title: "The Chair" })).toBeNull();
  });
});
