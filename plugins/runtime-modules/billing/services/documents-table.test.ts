import { afterEach, describe, expect, it, vi } from "vitest";

import { PhisBillingDocumentFlag, PhisBillingNumberSeriesFlag } from "@phis/contracts/billing";

import {
  PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION,
  toPhiBillingDocumentRecord,
  toPhiBillingDocumentRow,
} from "./documents-table";
import { toPhiBillingSeriesRow } from "./series-table";

const document = (rest: Record<string, unknown> = {}) => ({
  id: "0b6c8a52-35c8-4a4f-9a52-4d9e0b8a1c11",
  kind: "invoice",
  number: "PHI-2600042",
  label: "PhiVoice AI Pro, yearly",
  issuer: { kind: "merchant", name: "Phisys AG", taxId: null },
  source: { kind: "addon", addonId: "@phis/shop" },
  issuedAt: "2026-11-27T10:00:00.000Z",
  total: { currency: "CHF", minor: "3600" },
  presentment: null,
  status: "available",
  file: { contentType: "application/pdf", byteSize: 20480, sha256: "x" },
  paymentState: { state: "paid", paidMinor: "3600", at: "2026-11-27T10:00:00.000Z" },
  subject: "user:5",
  consumerAddonId: "@phis/shop",
  reference: "2611-ABCDEF",
  payment: null,
  subscription: null,
  correctsId: null,
  retainUntil: "2036-12-31T23:00:00.000Z",
  flags: 0,
  createdAt: "2026-11-27T10:00:00.000Z",
  version: 1,
  ...rest,
});

const answer = (documents: unknown[], cursor: string | null = null) =>
  new Response(JSON.stringify({ documents, cursor }), { status: 200, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the billing documents Provider", () => {
  it("reads the person's own documents a page at a time by cursor, with the kinds and year chosen", async () => {
    const fetch = vi.fn(async () => answer([document()], "next-page"));
    vi.stubGlobal("fetch", fetch);
    const result = await PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION.query({
      resourceKey: "own",
      query: { pageSize: 50, cursor: "this-page", filters: { kinds: ["invoice", "receipt"], year: "2026" } },
      locale: "en",
      timeZone: "UTC",
    } as never);
    expect(String((fetch.mock.calls[0] as unknown[])[0])).toBe(
      "/api/site/account/billing-documents?limit=50&cursor=this-page&kinds=invoice%2Creceipt&year=2026",
    );
    expect(result.nextCursor).toBe("next-page");
    expect(result.rows[0]).toMatchObject({ number: "PHI-2600042", issuerName: "Phisys AG", paymentState: "paid", available: true, marks: [] });
  });

  it("asks Accounting with the person, the period as instants and the rest of the filters", async () => {
    const fetch = vi.fn(async () => answer([]));
    vi.stubGlobal("fetch", fetch);
    await PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION.query({
      resourceKey: "site",
      query: {
        pageSize: 200,
        search: " PHI-26 ",
        filters: { userId: 5, issuerKind: "provider", status: ["failed"], from: "2026-01-01", to: "2026-01-31", paymentState: "" },
      },
      locale: "en",
      timeZone: "UTC",
    } as never);
    const url = new URL(String((fetch.mock.calls[0] as unknown[])[0]), "https://site.test");
    expect(url.pathname).toBe("/api/site/accounting/billing-documents");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "100",
      q: "PHI-26",
      userId: "5",
      issuerKind: "provider",
      status: "failed",
      from: "2026-01-01T00:00:00.000Z",
      // Core's `to` is exclusive: the whole last day counts.
      to: "2026-02-01T00:00:00.000Z",
    });
  });

  it("marks a document's bits, and says which invoice a credit note belongs to where it has read that invoice", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => answer([document()])));
    await PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION.query({ resourceKey: "own", query: {}, locale: "en", timeZone: "UTC" } as never);
    const credit = toPhiBillingDocumentRow(document({
      id: "c1",
      kind: "credit-note",
      number: "PHI-2600043",
      correctsId: "0b6c8a52-35c8-4a4f-9a52-4d9e0b8a1c11",
      status: "voided",
      flags: PhisBillingDocumentFlag.Voided | PhisBillingDocumentFlag.Detached,
    }) as never, { forInvoiceText: "Zu Rechnung %1" });
    expect(credit).toMatchObject({
      correctsNumber: "PHI-2600042",
      correctsLabel: "Zu Rechnung PHI-2600042",
      marks: ["voided", "detached"],
      available: false,
    });
  });

  it("writes the staff record's content out, and offers Retry only for a Provider's document given up", () => {
    const record = toPhiBillingDocumentRecord({
      document: document({
        status: "failed",
        source: { kind: "provider", addonId: "@phis/stripe" },
        content: {
          locale: "en",
          currency: "CHF",
          basis: "final",
          seller: { name: "Phisys AG", addressLines: ["Weg 1"], postalCode: "8000", city: "Zürich", country: "CH", taxId: null },
          buyer: null,
          lines: [{ description: "Pro", quantity: "1", unit: null, unitMinor: "3600", lineMinor: "3600", taxRate: null, taxCategory: "standard", servicePeriod: null }],
          totals: { net: { currency: "CHF", minor: "3600" }, taxes: [], total: { currency: "CHF", minor: "3600" } },
          servicePeriod: null,
          notes: null,
          payment: { dueAt: "2026-12-27T00:00:00.000Z", reference: null, iban: null, swissQr: null },
        },
      }) as never,
      corrections: [document({ id: "c1", number: "PHI-2600043" }) as never],
      corrected: null,
      series: { label: "Invoices", template: "PHI-{YY}{xxxxx}" },
      voidReason: null,
    }, "en");
    expect(record).toMatchObject({
      seller: "Phisys AG · Weg 1 · 8000 Zürich, CH",
      buyer: null,
      dueAt: "2026-12-27T00:00:00.000Z",
      seriesLabel: "Invoices (PHI-{YY}{xxxxx})",
      correctionNumbers: ["PHI-2600043"],
      fileLabel: "PDF, 20 KB",
      retryable: true,
    });
    expect(String(record.lines)).toContain("Pro");
  });

  it("opens a document in a tab of its own and downloads one in place, through the address Core signs", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ url: "/api/site/billing-documents/x/file?s=1", expiresAt: "2026-11-27T10:05:00.000Z" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    const open = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("window", { open, location: { assign } });
    const request = (actionKey: string) => ({ kind: "action", resourceKey: "own", actionKey, rowIdentity: "x" }) as never;
    await PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION.mutate(request("open"));
    await PHI_BILLING_DOCUMENTS_TABLE_PROVIDER_REGISTRATION.mutate(request("download"));
    expect(fetch.mock.calls.map((call) => [(call as unknown[])[0], JSON.parse(String(((call as unknown[])[1] as RequestInit).body))])).toEqual([
      ["/api/site/account/billing-documents/x/open", { disposition: "inline" }],
      ["/api/site/account/billing-documents/x/open", { disposition: "attachment" }],
    ]);
    expect(open).toHaveBeenCalledWith("/api/site/billing-documents/x/file?s=1", "_blank", "noopener,noreferrer");
    expect(assign).toHaveBeenCalledWith("/api/site/billing-documents/x/file?s=1");
  });
});

describe("a number series row", () => {
  it("reads its bits as the state and the yes/no a condition reads, and offers its id to the replacing Form", () => {
    const row = toPhiBillingSeriesRow({
      id: "s1",
      key: "invoice",
      label: "Invoices",
      template: "PHI-{YY}{xxxxx}",
      reset: "yearly",
      kinds: ["invoice"],
      sources: ["@phis/shop"],
      next: "PHI-2600001",
      flags: PhisBillingNumberSeriesFlag.Used,
      createdAt: "2026-11-27T10:00:00.000Z",
      closedAt: null,
    });
    expect(row).toMatchObject({ state: "used", used: true, closed: false, replaces: "s1" });
    expect(toPhiBillingSeriesRow({ ...row, kinds: [], sources: [], flags: PhisBillingNumberSeriesFlag.Closed | PhisBillingNumberSeriesFlag.Used } as never))
      .toMatchObject({ state: "closed", closed: true });
  });
});
