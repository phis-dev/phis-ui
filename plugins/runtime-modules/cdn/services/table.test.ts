import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhisCdnAdminFileV1, PhisCdnAdminListV1, PhisCdnCheckReportV1 } from "@phis/contracts/addon";

import { PHI_CDN_TABLE_PARAM_KEYS } from "../table-params";
import { PhiCdnTableProviderClient, resetPhiCdnTableRowsForTests, toPhiCdnCheckRows, toPhiCdnFileRow } from "./table";
import { PHI_TABLE_PROVIDER_REFUSED_CODE } from "../../../../components/widgets/client/shared/phi-table-provider-refusal";
import type { PhiTableProviderRegistration } from "../../../../components/widgets/client/shared/phi-table-provider";

/*
 * The registration the bound Client carries, read out of the component the factory returns: the tests
 * ask the Provider as the Table's Binding asks it.
 */
async function readRegistration(): Promise<PhiTableProviderRegistration> {
  const render = PhiCdnTableProviderClient as unknown as (props: { children: null }) => { props: { registration: PhiTableProviderRegistration } };
  return render({ children: null }).props.registration;
}

function file(overrides: Partial<PhisCdnAdminFileV1> = {}): PhisCdnAdminFileV1 {
  return {
    key: "phivoice/1.2.0/PhiVoice-1.2.0-arm64.dmg",
    name: "phivoice",
    version: "1.2.0",
    fileName: "PhiVoice-1.2.0-arm64.dmg",
    sizeBytes: 20 * 1024 * 1024,
    sha256: "a".repeat(64),
    contentType: "application/x-apple-diskimage",
    publishedAt: "2026-11-25T10:00:00.000Z",
    url: "https://cdn.example.test/phivoice/1.2.0/PhiVoice-1.2.0-arm64.dmg",
    storage: "cdn",
    os: 4,
    arch: 2,
    state: "offered",
    origin: { kind: "upload", addonId: null, actorUserId: 7, sourceUrl: null },
    ...overrides,
  };
}

function list(overrides: Partial<PhisCdnAdminListV1> = {}): PhisCdnAdminListV1 {
  return {
    cdn: { publicBaseUrl: "https://cdn.example.test", profileKey: "cdn", flags: 1 },
    files: [file()],
    total: 1,
    page: 1,
    pageSize: 50,
    ...overrides,
  };
}

function reply(status: number, body: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const fetchMock = vi.fn<typeof fetch>();
const signal = new AbortController().signal;
const params = {
  [PHI_CDN_TABLE_PARAM_KEYS.noCdnText]: "No CDN here: phis cdn attach.",
  [PHI_CDN_TABLE_PARAM_KEYS.copiedText]: "Copied.",
  [PHI_CDN_TABLE_PARAM_KEYS.copyFailedText]: "Could not copy.",
};

beforeEach(() => {
  resetPhiCdnTableRowsForTests();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the CDN files table", () => {
  it("asks Core's list with the Table's query and answers rows with their state and platform", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, list()));
    const provider = await readRegistration();
    const result = await provider.query({
      resourceKey: "files",
      query: { page: 2, pageSize: 500, search: " voice ", filters: { state: "all" }, sorts: [{ key: "name", direction: "ascending" }] },
      params,
      locale: "en",
      timeZone: "UTC",
      signal,
    });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), "https://site.test");
    expect(url.pathname).toBe("/api/site/admin/cdn");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "2",
      pageSize: "200",
      q: "voice",
      state: "all",
      sort: "name",
      dir: "asc",
    });
    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({
      key: "phivoice/1.2.0/PhiVoice-1.2.0-arm64.dmg",
      sizeLabel: "20 MiB",
      storage: "cdn",
      platform: ["macos", "arm64"],
      state: "offered",
      origin: "upload",
      withdrawDisabled: false,
      deleteDisabled: false,
    });
  });

  it("says how a CDN is attached where the Site has none, as a refused read", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, list({ cdn: null, files: [], total: 0 })));
    const provider = await readRegistration();
    await expect(provider.query({ resourceKey: "files", query: {}, params, locale: "en", timeZone: "UTC", signal }))
      .rejects.toMatchObject({ code: PHI_TABLE_PROVIDER_REFUSED_CODE, message: "No CDN here: phis cdn attach." });
  });

  it("refuses an answer that is not Core's list", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { files: [{ key: 1 }], total: 1, cdn: null }));
    const provider = await readRegistration();
    await expect(provider.query({ resourceKey: "files", query: {}, locale: "en", timeZone: "UTC", signal }))
      .rejects.toMatchObject({ code: "invalid-response" });
  });

  it("shows Core's sentence when Core refuses", async () => {
    fetchMock.mockResolvedValueOnce(reply(503, { error: "storage_unavailable", message: "The CDN profile is disabled." }));
    const provider = await readRegistration();
    await expect(provider.query({ resourceKey: "files", query: {}, locale: "en", timeZone: "UTC", signal }))
      .rejects.toThrow("The CDN profile is disabled.");
  });

  it("names an Add-on's file by the Add-on and a withdrawn one as withdrawn", () => {
    const row = toPhiCdnFileRow(file({
      storage: "link",
      state: "withdrawn",
      origin: { kind: "addon", addonId: "@phis/releases", actorUserId: null, sourceUrl: "https://github.com/x" },
    }), "en");
    expect(row).toMatchObject({ origin: "@phis/releases", sourceUrl: "https://github.com/x", withdrawDisabled: true, deleteDisabled: false });
  });

  it("withdraws and deletes by the key's three path segments", async () => {
    const provider = await readRegistration();
    fetchMock.mockResolvedValueOnce(reply(200, { file: file({ state: "withdrawn" }), flags: 0 }));
    await expect(provider.mutate!({ kind: "action", resourceKey: "files", actionKey: "withdraw", rowIdentity: "a b/1:2/c+d.deb", query: {}, signal }))
      .resolves.toEqual({ status: "accepted", invalidation: "view" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/site/admin/cdn/files/a%20b/1%3A2/c%2Bd.deb/withdraw");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");

    fetchMock.mockResolvedValueOnce(reply(200, { file: file({ state: "deleted" }) }));
    await provider.mutate!({ kind: "action", resourceKey: "files", actionKey: "delete", rowIdentity: "a/1/c", query: {}, signal });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/site/admin/cdn/files/a/1/c");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("copies the address of a row it answered", async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    fetchMock.mockResolvedValueOnce(reply(200, list()));
    const provider = await readRegistration();
    await provider.query({ resourceKey: "files", query: {}, params, locale: "en", timeZone: "UTC", signal });
    const result = await provider.mutate!({
      kind: "action",
      resourceKey: "files",
      actionKey: "copy-url",
      rowIdentity: file().key,
      params,
      query: {},
      signal,
    });
    expect(writeText).toHaveBeenCalledWith(file().url);
    expect(result).toEqual({ status: "accepted", invalidation: "none", message: "Copied." });

    writeText.mockRejectedValueOnce(new Error("denied"));
    await expect(provider.mutate!({ kind: "action", resourceKey: "files", actionKey: "copy-url", rowIdentity: file().key, params, query: {}, signal }))
      .resolves.toMatchObject({ status: "rejected", message: "Could not copy." });
  });

  it("reads a record from the rows it answered, else from Core", async () => {
    const provider = await readRegistration();
    fetchMock.mockResolvedValueOnce(reply(200, list({ files: [file({ state: "deleted" })] })));
    await expect(provider.readRecord!({ resourceKey: "files", rowIdentity: file().key, locale: "en", timeZone: "UTC", signal }))
      .resolves.toMatchObject({ key: file().key, state: "deleted", deleteDisabled: true });
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]), "https://site.test");
    expect(url.searchParams.get("state")).toBe("all");
    expect(url.searchParams.get("name")).toBe("phivoice");
  });
});

describe("the CDN check table", () => {
  const report: PhisCdnCheckReportV1 = {
    flags: 0,
    objects: 4,
    recorded: 2,
    unrecorded: [
      { key: "x/1/a.zip", sizeBytes: 2048, flags: 1, reason: null },
      { key: "x/1/b.html", sizeBytes: 10, flags: 0, reason: "content type refused" },
    ],
    missing: ["y/2/c.deb"],
    sizeMismatch: [{ key: "z/3/d.deb", recorded: 100, stored: 90 }],
  };

  it("answers one row per finding, with what the footer counts", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, report));
    const provider = await readRegistration();
    const result = await provider.query({ resourceKey: "check", query: {}, locale: "en", timeZone: "UTC", signal });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/site/admin/cdn/check");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(result.summary).toEqual({ objects: 4, recorded: 2, consistent: false });
    expect(result.rows.map((row) => [row.finding, row.key, row.adoptable])).toEqual([
      ["unrecorded", "x/1/a.zip", true],
      ["unrecorded", "x/1/b.html", false],
      ["missing", "y/2/c.deb", false],
      ["size-mismatch", "z/3/d.deb", false],
    ]);
    expect(toPhiCdnCheckRows(report, "en")[3]).toMatchObject({ sizeLabel: "90 B", recordedLabel: "100 B" });
  });

  it("is refused with the attach sentence where the Site has no CDN", async () => {
    fetchMock.mockResolvedValueOnce(reply(404, { error: "no_cdn", message: "This Site has no CDN." }));
    const provider = await readRegistration();
    await expect(provider.query({ resourceKey: "check", query: {}, params, locale: "en", timeZone: "UTC", signal }))
      .rejects.toMatchObject({ code: PHI_TABLE_PROVIDER_REFUSED_CODE, message: "No CDN here: phis cdn attach." });
  });

  it("adopts one key and says why Core refused it", async () => {
    const provider = await readRegistration();
    fetchMock.mockResolvedValueOnce(reply(200, { adopted: ["x/1/a.zip"], refused: [] }));
    await expect(provider.mutate!({ kind: "action", resourceKey: "check", actionKey: "adopt", rowIdentity: "x/1/a.zip", query: {}, signal }))
      .resolves.toEqual({ status: "accepted", invalidation: "view" });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ keys: ["x/1/a.zip"] });

    fetchMock.mockResolvedValueOnce(reply(200, { adopted: [], refused: [{ key: "x/1/b.html", reason: "content type refused" }] }));
    await expect(provider.mutate!({ kind: "action", resourceKey: "check", actionKey: "adopt", rowIdentity: "x/1/b.html", query: {}, signal }))
      .resolves.toMatchObject({ status: "rejected", message: "content type refused" });
  });
});
