import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const readField = vi.hoisted(() => vi.fn());
vi.mock("../../../../../server-helpers/record-fields", () => ({ resolvePhiWidgetRecordField: readField }));
vi.mock("../../../../../gateway/site-nav", () => ({ fetchSiteNavigationFolderTarget: vi.fn(async () => null) }));
const moduleFolders = vi.hoisted(() => vi.fn((_area: unknown, _addresses: readonly string[]) => new Map<string, string>()));
vi.mock("../../../../../server-helpers/module-folder-targets", () => ({ resolvePhiRequestModuleFolderTargets: moduleFolders }));
vi.mock("../../../../../helpers/phis-server-credentials", () => ({
  readPhiServerApiCredentials: () => ({ apiBaseUrl: "http://core", internalToken: "t" }),
}));

import { PhiBreadcrumbWidget } from "./server";

const registry = {} as never;
const record = { providerKey: "shop/product", params: { slug: "chair" } };

async function titleFor(options: {
  titleField?: string;
  withRecord?: boolean;
  config?: Record<string, unknown>;
  registry?: never;
}) {
  const element = await PhiBreadcrumbWidget({
    runtime: {
      site: { key: "site" },
      area: "public",
      page: {
        path: "/shop/chair",
        title: "Whatever the Page is called",
        ...(options.withRecord === false ? {} : { record: { ...record, ...(options.titleField ? { titleField: options.titleField } : {}) } }),
      },
    },
    config: options.config ?? {},
    registry: "registry" in options ? options.registry : registry,
  } as never);
  return (element.props as { componentProps: { pageTitle: string | null } }).componentProps.pageTitle;
}

describe("breadcrumb server: the title field of the Page's record", () => {
  beforeEach(() => {
    readField.mockReset();
    readField.mockResolvedValue({ bound: true, field: { kind: "text", value: " The Chair " } });
  });

  it("reads the field the route names, as a text, through the shared memoised helper", async () => {
    expect(await titleFor({ titleField: "name" })).toBe("The Chair");
    expect(readField).toHaveBeenCalledTimes(1);
    expect(readField.mock.calls[0]![0]).toMatchObject({ registry, key: "name", kinds: ["text"] });
  });

  it("leaves the segment where the route names no titleField, whatever the Page is called", async () => {
    expect(await titleFor({})).toBeNull();
    expect(readField).not.toHaveBeenCalled();
  });

  it("leaves the segment for a Page about no record, a fixed pathLabel, showPath false and no registry", async () => {
    expect(await titleFor({ titleField: "name", withRecord: false })).toBeNull();
    expect(await titleFor({ titleField: "name", config: { pathLabel: "Here" } })).toBeNull();
    expect(await titleFor({ titleField: "name", config: { showPath: false } })).toBeNull();
    expect(await titleFor({ titleField: "name", registry: undefined })).toBeNull();
    expect(readField).not.toHaveBeenCalled();
  });

  it("never fails: no such field, an empty one, an unbound Page and a throwing read leave the segment", async () => {
    readField.mockResolvedValue({ bound: true, field: null });
    expect(await titleFor({ titleField: "name" })).toBeNull();
    readField.mockResolvedValue({ bound: true, field: { kind: "text", value: "  " } });
    expect(await titleFor({ titleField: "name" })).toBeNull();
    readField.mockResolvedValue({ bound: false });
    expect(await titleFor({ titleField: "name" })).toBeNull();
    readField.mockRejectedValue(new Error("boom"));
    expect(await titleFor({ titleField: "name" })).toBeNull();
  });
});

describe("breadcrumb server: the folders that lead somewhere", () => {
  it("links a folder a Module container leads to where the Site chose no target", async () => {
    moduleFolders.mockReturnValueOnce(new Map([["/faq", "module:faq-overview"]]));
    const element = await PhiBreadcrumbWidget({
      runtime: { site: { key: "site" }, area: "public", page: { path: "/faq/hosting", title: "Hosting" } },
      config: {},
    } as never);
    expect((element.props as { componentProps: { linkedFolderPaths: string[] } }).componentProps.linkedFolderPaths)
      .toEqual(["/faq"]);
    expect(moduleFolders).toHaveBeenLastCalledWith("public", ["/faq"]);
  });
});
