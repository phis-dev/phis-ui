import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import type { PhiFormHandlerProviderDescriptor } from "../types/form-descriptor";

/**
 * The relay's own part of a submit: whose CSRF proof goes upstream, which Area it names, and what
 * comes back to the browser.
 *
 * Resolving the handler is `resolvePhiServerFormHandler`'s contract (form-handler-resolution.test.ts)
 * and is stood in for here; what it is asked is recorded, because the Area it is handed is the relay's
 * decision. The complete, real catalog is walked by `scripts/validate-form-gateway-contracts.ts`.
 */

vi.mock("server-only", () => ({}));

const scope = vi.hoisted(() => ({
  provider: null as PhiFormHandlerProviderDescriptor | null,
  resolutions: [] as Array<{ area: unknown; formId: string; phase: string }>,
}));

vi.mock("./form-handler-resolution", () => ({
  resolvePhiServerFormHandler: async (options: { area: unknown; formId: string; phase: string }) => {
    scope.resolutions.push({ area: options.area, formId: options.formId, phase: options.phase });
    return scope.provider ? { formId: options.formId, area: "public", provider: scope.provider } : null;
  },
}));

const { buildPhiSiteFormRouteHandlers } = await import("./site-form-route");

const UPSTREAM = "http://phi.test";
const SITE = "http://site.test";
const FORM_ID = "@phis/ui/modules/auth/forms/login";
const BROWSER_TOKEN = "browser-token";

function provider(
  overrides: Partial<PhiFormHandlerProviderDescriptor>,
): PhiFormHandlerProviderDescriptor {
  return {
    key: "@phis/ui/modules/auth/form-handler:login",
    ownerModuleId: "@phis/ui/modules/auth",
    title: "Login",
    phase: "submit",
    handlerKey: "auth.login",
    category: "auth",
    transport: "relay",
    method: "POST",
    endpointKey: null,
    upstreamPath: "/api/v1/auth/password/login",
    csrfPath: "/api/v1/auth/csrf",
    requiresCsrf: true,
    credentialPolicy: "none",
    ...overrides,
  } as PhiFormHandlerProviderDescriptor;
}

type UpstreamCall = { url: string; method: string; headers: Headers; body: unknown };
let calls: UpstreamCall[] = [];
let upstreamSetCookies: string[] = [];

vi.stubGlobal("fetch", async (input: unknown, init?: RequestInit) => {
  calls.push({
    url: String(input),
    method: init?.method ?? "GET",
    headers: new Headers(init?.headers as HeadersInit),
    body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
  });
  const response = Response.json({ ok: true, issuedAt: "1", formToken: "t" });
  for (const setCookie of upstreamSetCookies) response.headers.append("set-cookie", setCookie);
  return response;
});

/** A Site's own `buildHeaders`: the browser's headers pass, the Site's credentials are added. */
function buildHandlers() {
  return buildPhiSiteFormRouteHandlers({
    upstreamBaseUrl: UPSTREAM,
    timeoutMs: 1000,
    buildHeaders: (request) => {
      const headers = new Headers(request.headers);
      headers.set("authorization", "Bearer internal");
      headers.set("x-phis-site-key", "site");
      return headers;
    },
    loadAreaBridge: async () => null,
  });
}

function post(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return buildHandlers().POST(new NextRequest(`${SITE}/api/site/forms`, {
    method: "POST",
    headers: { host: "site.test", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }));
}

const cookiesOf = (call: UpstreamCall | undefined) =>
  (call?.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).filter(Boolean).sort();

beforeEach(() => {
  calls = [];
  upstreamSetCookies = [];
  scope.resolutions = [];
  scope.provider = provider({});
});

describe("site form relay: CSRF", () => {
  it("forwards the browser's token and cookie unchanged and mints no pair of its own", async () => {
    const response = await post(
      { formId: FORM_ID, phase: "submit", area: "public", values: { email: "a@b.test" } },
      {
        cookie: `phis_csrf=${BROWSER_TOKEN}; phis_session=session-1`,
        "x-csrf-token": BROWSER_TOKEN,
      },
    );

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls.some((call) => call.url.includes("/csrf"))).toBe(false);
    expect(calls[0]?.url).toBe(`${UPSTREAM}/api/v1/auth/password/login`);
    expect(calls[0]?.headers.get("x-csrf-token")).toBe(BROWSER_TOKEN);
    // `none` forwards no session: the CSRF cookie is the only one that goes along.
    expect(cookiesOf(calls[0])).toEqual([`phis_csrf=${BROWSER_TOKEN}`]);
    expect(calls[0]?.body).toEqual({ email: "a@b.test" });
  });

  it("forwards the credential cookie the Provider names beside the CSRF cookie", async () => {
    scope.provider = provider({ credentialPolicy: "site-session", method: "PATCH" });
    await post(
      { formId: FORM_ID, phase: "submit", area: "app", values: {} },
      {
        cookie: `phis_csrf=${BROWSER_TOKEN}; phis_session=session-1; phis_auth_link=link; other=x`,
        "x-csrf-token": BROWSER_TOKEN,
      },
    );

    expect(calls[0]?.method).toBe("PATCH");
    expect(cookiesOf(calls[0])).toEqual([`phis_csrf=${BROWSER_TOKEN}`, "phis_session=session-1"]);
  });

  it.each([
    ["no header", { cookie: `phis_csrf=${BROWSER_TOKEN}` }],
    ["no cookie", { "x-csrf-token": BROWSER_TOKEN }],
    ["a header that disagrees", { cookie: `phis_csrf=${BROWSER_TOKEN}`, "x-csrf-token": "forged" }],
    ["an empty pair", { cookie: "phis_csrf=", "x-csrf-token": " " }],
  ])("refuses a CSRF handler with %s before anything goes upstream", async (_label, headers) => {
    const body = { formId: FORM_ID, phase: "submit", area: "public", values: {} };
    const response = await post(body, headers);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid CSRF token." });
    expect(calls).toHaveLength(0);
  });

  it("sends a handler that declares no CSRF neither the header nor the cookie", async () => {
    scope.provider = provider({
      handlerKey: "forms.contact",
      category: "forms",
      upstreamPath: "/api/v1/forms/contact",
      csrfPath: null,
      requiresCsrf: false,
    });
    const response = await post(
      { formId: "@phis/ui/modules/public/forms/contact", phase: "submit", area: "public", values: {} },
      { cookie: `phis_csrf=${BROWSER_TOKEN}; phis_session=s`, "x-csrf-token": BROWSER_TOKEN },
    );

    expect(response.status).toBe(200);
    expect(calls[0]?.url).toBe(`${UPSTREAM}/api/v1/forms/contact`);
    expect(calls[0]?.headers.get("x-csrf-token")).toBeNull();
    expect(calls[0]?.headers.get("cookie")).toBeNull();
  });

  it("submits a handler without CSRF when the browser has no token at all", async () => {
    scope.provider = provider({
      upstreamPath: "/api/v1/forms/contact",
      csrfPath: null,
      requiresCsrf: false,
    });
    const response = await post({ formId: FORM_ID, phase: "submit", area: "public", values: {} });

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
  });

  it("passes every Set-Cookie of the upstream answer back to the browser", async () => {
    upstreamSetCookies = ["phis_session=fresh; Path=/; HttpOnly", "phis_csrf=rotated; Path=/"];
    const response = await post(
      { formId: FORM_ID, phase: "submit", area: "public", values: {} },
      { cookie: `phis_csrf=${BROWSER_TOKEN}`, "x-csrf-token": BROWSER_TOKEN },
    );

    expect(response.headers.getSetCookie()).toEqual([
      "phis_session=fresh; Path=/; HttpOnly",
      "phis_csrf=rotated; Path=/",
    ]);
  });
});

describe("site form relay: Area", () => {
  it("hands resolution the Area the body names, with no Referer on the request", async () => {
    scope.provider = provider({ requiresCsrf: false, csrfPath: null });
    const response = await post({ formId: FORM_ID, phase: "confirm", area: "app", values: {} });

    expect(response.status).toBe(200);
    expect(scope.resolutions).toEqual([{ area: "app", formId: FORM_ID, phase: "confirm" }]);
  });

  it("does not read the Area from the Referer", async () => {
    scope.provider = provider({ requiresCsrf: false, csrfPath: null });
    await post(
      { formId: FORM_ID, phase: "submit", values: {} },
      { referer: `${SITE}/admin/settings` },
    );

    expect(scope.resolutions[0]?.area).toBeNull();
  });

  it("passes on only a string as the Area", async () => {
    await post({ formId: FORM_ID, phase: "submit", area: ["admin"], values: {} });

    expect(scope.resolutions[0]?.area).toBeNull();
  });

  it("answers 404 when nothing resolves, without an upstream call", async () => {
    scope.provider = null;
    const response = await post({ formId: FORM_ID, phase: "submit", values: {} });

    expect(response.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("reads the Area of a guard and of a preview from the query", async () => {
    const handlers = buildHandlers();
    const forms = `${SITE}/api/site/forms`;
    await handlers.GET(new NextRequest(`${forms}?phase=guard&formId=${FORM_ID}&area=public`));
    scope.provider = provider({
      phase: "preview",
      method: "GET",
      upstreamPath: "/api/v1/forms/preview",
    });
    await handlers.GET(
      new NextRequest(`${forms}?phase=preview&formId=${FORM_ID}&token=t&area=app`),
    );

    expect(scope.resolutions.map((entry) => [entry.phase, entry.area])).toEqual([
      ["submit", "public"],
      ["preview", "app"],
    ]);
  });
});
