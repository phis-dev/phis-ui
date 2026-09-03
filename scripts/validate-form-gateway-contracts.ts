import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { NextRequest } from "next/server";

import {
  buildPhiFormSubmitDescriptor,
  buildPhiFormSubmitDescriptorFromHandlerProvider,
  resolvePhiFormSubmitTarget,
} from "../gateway/form-submit";
import { buildPhiSiteFormRouteHandlers } from "../gateway/site-form-route";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/auth/ids";
import type { PhiFormHandlerProviderDescriptor } from "../types/form-descriptor";
import type { PhiRuntimeModuleCatalogEntry } from "../types/cms-plugins";
import { PHIS_SITE_KEY_HEADER } from "../constants/http-headers";

// ---------------------------------------------------------------------------
// Descriptor algebra
// ---------------------------------------------------------------------------

const provider = (credentialPolicy: "none" | "site-session" | "auth-link") => ({
  key: `@test/pkg/modules/module/form-handler:${credentialPolicy}`,
  ownerModuleId: "@test/pkg/modules/module",
  title: credentialPolicy,
  phase: "submit",
  handlerKey: `test.${credentialPolicy}`,
  category: "forms",
  transport: "relay",
  method: "POST",
  endpointKey: null,
  upstreamPath: `/api/v1/forms/${credentialPolicy}`,
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy,
} satisfies PhiFormHandlerProviderDescriptor);

for (const policy of ["none", "site-session", "auth-link"] as const) {
  const descriptor = buildPhiFormSubmitDescriptorFromHandlerProvider("@test/pkg/modules/module/forms/test", provider(policy));
  assert.equal(descriptor.credentialPolicy, policy);
  assert.equal(resolvePhiFormSubmitTarget(descriptor).upstreamPath, `/api/v1/forms/${policy}`);
}

assert.equal(
  resolvePhiFormSubmitTarget(buildPhiFormSubmitDescriptorFromHandlerProvider(
    "@test/pkg/modules/module/forms/test",
    { ...provider("site-session"), endpointKey: "ignored", upstreamPath: "/api/v1/forms/authoritative" },
  )).upstreamPath,
  "/api/v1/forms/authoritative",
);

// A Provider that names no credential policy gets none. The closed default is the whole point: an
// omission must never widen what a submission may carry.
assert.equal(
  buildPhiFormSubmitDescriptor({ formId: "f", submitHandlerKey: "forms.contact" }).credentialPolicy,
  "none",
);

// The category follows the handler-key namespace unless the Provider states one.
for (const [handlerKey, category] of [
  ["auth.login", "auth"],
  ["account.profile", "account"],
  ["site.admin.settings", "site"],
  ["forms.contact", "forms"],
  ["anything.else", "forms"],
] as const) {
  assert.equal(buildPhiFormSubmitDescriptor({ formId: "f", submitHandlerKey: handlerKey }).category, category);
}
assert.equal(
  buildPhiFormSubmitDescriptor({ formId: "f", submitHandlerKey: "auth.login", category: "forms" }).category,
  "forms",
);
assert.equal(
  buildPhiFormSubmitDescriptor({ formId: "f", submitHandlerKey: "auth.login", category: "nonsense" }).category,
  "auth",
  "An unknown category falls back to the namespace rather than to an arbitrary prefix.",
);

// Without an explicit path the endpoint key resolves under its category prefix.
for (const [category, prefix] of [
  ["auth", "/api/auth"],
  ["account", "/api/account"],
  ["forms", "/api/forms"],
  ["site", "/api/site/forms"],
] as const) {
  const withKey = buildPhiFormSubmitDescriptor({
    formId: "f",
    submitHandlerKey: "x.y",
    category,
    endpointKey: "/subscribe",
  });
  assert.equal(resolvePhiFormSubmitTarget(withKey).upstreamPath, `${prefix}/subscribe`);
  const bare = buildPhiFormSubmitDescriptor({ formId: "f", submitHandlerKey: "x.y", category });
  assert.equal(resolvePhiFormSubmitTarget(bare).upstreamPath, prefix);
}

// Identity and transport normalization.
const normalized = buildPhiFormSubmitDescriptor({
  formId: "  @Phis/UI/Modules/Public/Forms/Contact  ",
  submitHandlerKey: "  Forms.Contact  ",
  upstreamPath: "api/v1/forms/contact",
  csrfPath: "api/auth/csrf",
  requiresCsrf: 1 as unknown as boolean,
});
assert.equal(normalized.formId, "@phis/ui/modules/public/forms/contact");
assert.equal(normalized.submitHandlerKey, "forms.contact");
assert.equal(normalized.upstreamPath, "/api/v1/forms/contact");
assert.equal(normalized.csrfPath, "/api/auth/csrf");
assert.equal(normalized.requiresCsrf, true);
for (const [transport, expected] of [
  ["api", "serverAction"],
  ["serverAction", "serverAction"],
  ["server-action", "serverAction"],
  ["relay", "relay"],
  ["nonsense", "relay"],
  [null, "relay"],
] as const) {
  assert.equal(buildPhiFormSubmitDescriptor({ formId: "f", submitHandlerKey: "x", transport }).transport, expected);
}
for (const [method, expected] of [
  ["get", "GET"],
  ["PATCH", "PATCH"],
  ["delete", "DELETE"],
  ["nonsense", "POST"],
  [null, "POST"],
] as const) {
  assert.equal(buildPhiFormSubmitDescriptor({ formId: "f", submitHandlerKey: "x", method }).method, expected);
}
assert.equal(
  resolvePhiFormSubmitTarget(buildPhiFormSubmitDescriptor({
    formId: "f",
    submitHandlerKey: "auth.login",
  })).routeTarget,
  "auth:/api/auth",
);

// ---------------------------------------------------------------------------
// Dispatch matrix
// ---------------------------------------------------------------------------

const UPSTREAM = "http://phi.test";
const SITE_HOST = "site.test";
const AUTH_CAPABILITY = { id: "@phis/server/authentication:v1", interfaceDigest: "digest" };

const FORM_IDS = {
  contact: "@phis/ui/modules/public/forms/contact",
  login: "@phis/ui/modules/auth/forms/login",
  providerLink: "@phis/ui/modules/auth/forms/provider-link-confirmation",
  adminPolicy: "@phis/ui/modules/auth/forms/admin-policy",
  addOn: "@test/pkg/modules/add-on/forms/subscribe",
} as const;

type UpstreamCall = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
};

let activeModuleIds: string[] = [];
let providerCapabilities: Array<{ id: string; interfaceDigest: string }> = [AUTH_CAPABILITY];
let csrfStatus = 200;
let csrfPayload: unknown = { token: "csrf-token-1" };
let upstreamStatus = 200;
let upstreamPayload: unknown = { ok: true };
let upstreamSetCookies: string[] = [];
let upstreamThrows: Error | null = null;
const calls: UpstreamCall[] = [];

const CSRF_PATHS = new Set(["/api/auth/csrf", "/api/v1/auth/csrf"]);

function headerRecord(init: RequestInit | undefined) {
  const headers = new Headers((init?.headers ?? {}) as HeadersInit);
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
  const url = String(input);
  const path = url.slice(UPSTREAM.length).split("?", 1)[0] ?? "";

  if (path === "/api/v1/site/area") {
    return Response.json({
      preset: {
        preset: { config: { runtimeModules: activeModuleIds } },
        runtimeModuleIds: activeModuleIds,
      },
    });
  }
  if (path === "/api/v1/site/capabilities") {
    return Response.json({
      siteKey: "site",
      releaseBuildId: null,
      buildManifestDigest: "digest",
      providers: [
        {
          providerId: "@phis/server/core",
          state: "available",
          diagnosticCode: null,
          capabilities: providerCapabilities,
        },
        { providerId: "@test/pkg/modules/add-on", state: "available", diagnosticCode: null, capabilities: [] },
      ],
    });
  }
  if (path === "/api/v1/forms/registry") {
    return Response.json({ forms: [] });
  }

  calls.push({
    url,
    method: init?.method ?? "GET",
    headers: headerRecord(init),
    body: typeof init?.body === "string" ? init.body : null,
  });

  if (CSRF_PATHS.has(path)) {
    return Response.json(csrfPayload ?? {}, { status: csrfStatus });
  }
  if (upstreamThrows) {
    throw upstreamThrows;
  }
  const response = Response.json(upstreamPayload ?? {}, { status: upstreamStatus });
  for (const setCookie of upstreamSetCookies) {
    response.headers.append("set-cookie", setCookie);
  }
  return response;
}) as typeof globalThis.fetch;

/**
 * A third-party Add-on dispatches through exactly the same gateway. It is added next to the
 * first-party entries so the Area definitions and base modules stay real; only the extra module and
 * its Provider are new.
 */
const ADD_ON_MODULE_ID = "@test/pkg/modules/add-on";
const addOnEntry = {
  definition: {
    moduleId: ADD_ON_MODULE_ID,
    kind: "module",
    eligibleAreas: ["public"],
    serverBinding: { providerId: ADD_ON_MODULE_ID, requiredCapabilities: [] },
    controllerType: "@test/pkg/modules/add-on/controller",
    controller: {
      pluginKey: "@test/pkg/modules/add-on",
      key: "controller",
      title: "Add-on controller",
      allowedMountScopes: ["area"],
      runtimeSignals: { emits: [], listens: [] },
    },
    title: "Add-on",
    description: "Third-party Form Add-on.",
    category: "test",
    iconFamily: "test",
    controllerMountPolicy: "demand",
    formProviders: {
      handlers: [{
        key: "@test/pkg/modules/add-on/form-handler:subscribe",
        ownerModuleId: ADD_ON_MODULE_ID,
        title: "Subscribe",
        phase: "submit",
        handlerKey: "forms.add-on.subscribe",
        category: "forms",
        transport: "relay",
        method: "POST",
        endpointKey: null,
        upstreamPath: "/api/v1/add-on/subscribe",
        csrfPath: null,
        requiresCsrf: false,
        credentialPolicy: "none",
      }],
    },
  },
  widgets: [],
  layouts: [],
  forms: [{
    formId: FORM_IDS.addOn,
    ownerModuleId: ADD_ON_MODULE_ID,
    submitHandlerKey: "forms.add-on.subscribe",
    confirmHandlerKey: null,
    previewHandlerKey: null,
    category: "forms",
    descriptor: {
      schemaVersion: 1,
      key: FORM_IDS.addOn,
      labelSetKey: null,
      layout: { labelPlacement: "top", labelAlign: "start" },
      fields: [],
    },
  }],
  load: async () => {
    throw new Error("not loaded");
  },
} as unknown as PhiRuntimeModuleCatalogEntry;

const catalogWithAddOn = createPhiRuntimeModuleCatalog(
  [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values(), addOnEntry],
  PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.areaDefinitions,
);

function buildHandlers(options?: { upstreamBaseUrl?: string; withAddOn?: boolean }) {
  return buildPhiSiteFormRouteHandlers({
    upstreamBaseUrl: options?.upstreamBaseUrl ?? UPSTREAM,
    buildHeaders: () => new Headers({
      authorization: "Bearer internal-token",
      [PHIS_SITE_KEY_HEADER]: "site",
    }),
    timeoutMs: 2000,
    ...(options?.withAddOn ? { runtimeModuleCatalog: catalogWithAddOn } : {}),
  });
}

type SubmitOptions = {
  body?: unknown;
  referer?: string | null;
  cookie?: string | null;
  host?: string;
  forwardedHost?: string | null;
  upstreamBaseUrl?: string;
  withAddOn?: boolean;
};

async function submit(options: SubmitOptions) {
  calls.length = 0;
  const headers = new Headers({ host: options.host ?? SITE_HOST });
  if (options.referer !== null) {
    headers.set("referer", options.referer ?? `http://${SITE_HOST}/en/contact`);
  }
  if (options.cookie !== null) {
    headers.set("cookie", options.cookie ?? "phis_session=session-1; phis_auth_link=link-1; other=keep");
  }
  if (options.forwardedHost) {
    headers.set("x-forwarded-host", options.forwardedHost);
  }
  const request = new NextRequest(`http://${SITE_HOST}/api/site/forms`, {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? {}),
  });
  const response = await buildHandlers({
    upstreamBaseUrl: options.upstreamBaseUrl,
    withAddOn: options.withAddOn,
  }).POST(request);
  return { response, payload: (await response.json()) as Record<string, unknown> };
}

const dispatchCall = () => calls.at(-1);
const cookiesOf = (call: UpstreamCall | undefined) =>
  (call?.headers.cookie ?? "").split(";").map((part) => part.trim()).filter(Boolean);

// --- Request identity ------------------------------------------------------

activeModuleIds = [];
for (const body of [
  {},
  { phase: "submit" },
  { formId: FORM_IDS.contact },
  { formId: FORM_IDS.contact, phase: "preview" },
  { formId: "", phase: "submit" },
]) {
  const { response } = await submit({ body });
  assert.equal(response.status, 400, `${JSON.stringify(body)} must not reach an upstream.`);
  assert.equal(calls.length, 0);
}

const missingBaseUrl = await submit({
  body: { formId: FORM_IDS.contact, phase: "submit" },
  upstreamBaseUrl: "",
});
assert.equal(missingBaseUrl.response.status, 500);
assert.equal(calls.length, 0);

// --- Area authority --------------------------------------------------------

/**
 * The Area comes from the referer, and only after the host matches the request. A forged referer from
 * another origin must not select an Area, or a public page could dispatch a staff Form.
 */
for (const referer of [null, "http://evil.test/admin/settings", "not a url"]) {
  const { response, payload } = await submit({
    body: { formId: FORM_IDS.contact, phase: "submit" },
    referer,
  });
  assert.equal(response.status, 404, `Referer ${String(referer)} must not resolve an Area.`);
  assert.equal(payload.error, "Form handler is not active for this Area.");
  assert.equal(calls.length, 0);
}
// A proxied host is honoured through the forwarded header.
const forwarded = await submit({
  body: { formId: FORM_IDS.contact, phase: "submit" },
  host: "internal.local",
  forwardedHost: SITE_HOST,
  referer: `http://${SITE_HOST}/en/contact`,
});
assert.equal(forwarded.response.status, 200);

// --- Descriptor authority --------------------------------------------------

/**
 * The Client sends an identity and values, never a destination. Everything a tampered body could add
 * is ignored, because the gateway re-resolves the Provider from the module catalog.
 */
const tampered = await submit({
  body: {
    formId: FORM_IDS.contact,
    phase: "submit",
    values: { name: "A" },
    upstreamPath: "/api/v1/auth/admin/policy",
    csrfPath: "/api/auth/csrf",
    requiresCsrf: true,
    credentialPolicy: "site-session",
    method: "DELETE",
    submitHandlerKey: "auth.admin.policy",
    endpointKey: "escalate",
    category: "auth",
    transport: "api",
  },
});
assert.equal(tampered.response.status, 200);
assert.equal(calls.length, 1, "A tampered csrfPath must not add a round trip.");
assert.equal(dispatchCall()?.url, `${UPSTREAM}/api/v1/forms/contact`);
assert.equal(dispatchCall()?.method, "POST");
assert.equal(dispatchCall()?.body, JSON.stringify({ name: "A" }));
assert.equal(dispatchCall()?.headers["x-csrf-token"], undefined);

// An unknown or malformed Form id resolves to nothing rather than to a default handler.
for (const formId of ["contact", "@phis/ui/modules/public/forms/does-not-exist", "../../etc/passwd"]) {
  const { response } = await submit({ body: { formId, phase: "submit" } });
  assert.equal(response.status, 404, `Form id "${formId}" must not dispatch.`);
  assert.equal(calls.length, 0);
}
// Identity normalization is the gateway's, not the Client's.
const casedIdentity = await submit({
  body: { formId: "  @PHIS/UI/MODULES/PUBLIC/FORMS/CONTACT  ", phase: "submit", values: {} },
});
assert.equal(casedIdentity.response.status, 200);
assert.equal(dispatchCall()?.url, `${UPSTREAM}/api/v1/forms/contact`);

// --- Module activation and Provider availability ---------------------------

/**
 * A Form dispatches only while its owning module is active in this Area and its server Provider is
 * available. Both gates are independent, and both fail closed.
 */
activeModuleIds = [];
const authInactive = await submit({ body: { formId: FORM_IDS.login, phase: "submit" } });
assert.equal(authInactive.response.status, 404);
assert.equal(calls.length, 0);

activeModuleIds = [PHI_AUTH_RUNTIME_MODULE_ID];
providerCapabilities = [];
const authCapabilityMissing = await submit({ body: { formId: FORM_IDS.login, phase: "submit" } });
assert.equal(
  authCapabilityMissing.response.status,
  404,
  "An Auth module without its server capability must not dispatch.",
);
assert.equal(calls.length, 0);

providerCapabilities = [AUTH_CAPABILITY];
const authActive = await submit({ body: { formId: FORM_IDS.login, phase: "submit", values: { email: "a@b.test" } } });
assert.equal(authActive.response.status, 200);

// A phase the Form does not declare has no handler, so it does not dispatch.
const missingPhase = await submit({ body: { formId: FORM_IDS.login, phase: "confirm" } });
assert.equal(missingPhase.response.status, 404);
assert.equal(calls.length, 0);

// --- Credential policies ---------------------------------------------------

/**
 * The relay strips the browser cookie header and then re-adds exactly the one cookie the Provider's
 * credential policy names. A public submission therefore forwards nothing at all, even though the
 * browser sent a Site session.
 */
activeModuleIds = [PHI_AUTH_RUNTIME_MODULE_ID];
const publicSubmission = await submit({ body: { formId: FORM_IDS.contact, phase: "submit", values: {} } });
assert.equal(publicSubmission.response.status, 200);
assert.equal(dispatchCall()?.headers.cookie, undefined, "A `none` policy forwards no cookie at all.");

// `auth.login` is public but CSRF-protected: the token round trip must not smuggle a session either.
const loginDispatch = await submit({ body: { formId: FORM_IDS.login, phase: "submit", values: {} } });
assert.equal(loginDispatch.response.status, 200);
assert.equal(calls.length, 2);
assert.equal(calls[0]?.url, `${UPSTREAM}/api/auth/csrf`);
assert.equal(calls[0]?.method, "GET");
assert.equal(calls[0]?.headers.cookie, undefined);
assert.equal(calls[1]?.url, `${UPSTREAM}/api/auth/login`);
assert.equal(calls[1]?.headers["x-csrf-token"], "csrf-token-1");
assert.deepEqual(cookiesOf(calls[1]), ["phis_csrf=csrf-token-1"]);

// A Site-session Provider forwards the session cookie and nothing else.
const siteSessionDispatch = await submit({ body: { formId: FORM_IDS.adminPolicy, phase: "submit", values: {} } });
assert.equal(siteSessionDispatch.response.status, 200);
assert.equal(calls[1]?.method, "PATCH");
assert.equal(calls[1]?.url, `${UPSTREAM}/api/v1/auth/admin/policy`);
assert.deepEqual(cookiesOf(calls[0]), ["phis_session=session-1"]);
assert.deepEqual(
  cookiesOf(calls[1]).sort(),
  ["phis_csrf=csrf-token-1", "phis_session=session-1"],
);

// An Auth-link Provider forwards the link cookie and never the Site session.
const authLinkDispatch = await submit({ body: { formId: FORM_IDS.providerLink, phase: "confirm", values: {} } });
assert.equal(authLinkDispatch.response.status, 200);
assert.equal(calls[0]?.url, `${UPSTREAM}/api/v1/auth/csrf`);
assert.deepEqual(cookiesOf(calls[0]), ["phis_auth_link=link-1"]);
assert.deepEqual(
  cookiesOf(calls[1]).sort(),
  ["phis_auth_link=link-1", "phis_csrf=csrf-token-1"],
);
assert.equal(calls[1]?.url, `${UPSTREAM}/api/v1/auth/providers/link/confirm`);

// Without the named cookie nothing is invented.
const noCookies = await submit({
  body: { formId: FORM_IDS.adminPolicy, phase: "submit", values: {} },
  cookie: null,
});
assert.equal(noCookies.response.status, 200);
assert.deepEqual(cookiesOf(calls[1]), ["phis_csrf=csrf-token-1"]);

// A failed CSRF handshake stops the dispatch instead of submitting without a token.
csrfStatus = 403;
csrfPayload = { error: "forbidden" };
const csrfDenied = await submit({ body: { formId: FORM_IDS.login, phase: "submit", values: {} } });
assert.equal(csrfDenied.response.status, 403);
assert.equal(csrfDenied.payload.error, "Could not initialize submit session.");
assert.equal(calls.length, 1, "A denied handshake must not reach the destination.");

csrfStatus = 200;
csrfPayload = { token: "   " };
const csrfEmpty = await submit({ body: { formId: FORM_IDS.login, phase: "submit", values: {} } });
assert.equal(csrfEmpty.response.status, 502);
assert.equal(calls.length, 1);
csrfPayload = { token: "csrf-token-1" };

// --- Upstream authority ----------------------------------------------------

/**
 * Authorization and validation are the server's decisions. The gateway forwards the values verbatim
 * and relays the verdict with its status and payload rather than reinterpreting either.
 */
for (const [status, payload] of [
  [401, { ok: false, error: "unauthenticated" }],
  [403, { ok: false, error: "insufficient_role" }],
  [403, { ok: false, error: "membership_disabled" }],
  [400, { ok: false, error: "site_mismatch" }],
  [422, { ok: false, errors: { email: "invalid" } }],
  [429, { ok: false, error: "rate_limited" }],
] as const) {
  upstreamStatus = status;
  upstreamPayload = payload;
  const relayed = await submit({
    body: { formId: FORM_IDS.contact, phase: "submit", values: { email: "not-an-email" } },
  });
  assert.equal(relayed.response.status, status);
  assert.deepEqual(relayed.payload, payload);
  assert.equal(
    dispatchCall()?.body,
    JSON.stringify({ email: "not-an-email" }),
    "The gateway forwards values unchanged; validation belongs to the server.",
  );
}
upstreamStatus = 200;
upstreamPayload = { ok: true };

// Session cookies the server issues reach the browser.
upstreamSetCookies = ["phis_session=fresh; Path=/; HttpOnly", "phis_locale=de; Path=/"];
const withSetCookies = await submit({ body: { formId: FORM_IDS.contact, phase: "submit", values: {} } });
assert.deepEqual(
  withSetCookies.response.headers.getSetCookie(),
  ["phis_session=fresh; Path=/; HttpOnly", "phis_locale=de; Path=/"],
);
upstreamSetCookies = [];

// A transport failure is reported as a gateway error, never as a successful submission.
upstreamThrows = new Error("The operation was aborted due to timeout");
const aborted = await submit({ body: { formId: FORM_IDS.contact, phase: "submit", values: {} } });
assert.equal(aborted.response.status, 502);
assert.equal(aborted.payload.error, "The operation was aborted due to timeout");
upstreamThrows = null;

// --- Third-party Add-on dispatch -------------------------------------------

activeModuleIds = [ADD_ON_MODULE_ID];
const addOnDispatch = await submit({
  body: { formId: FORM_IDS.addOn, phase: "submit", values: { email: "a@b.test" } },
  withAddOn: true,
});
assert.equal(addOnDispatch.response.status, 200);
assert.equal(dispatchCall()?.url, `${UPSTREAM}/api/v1/add-on/subscribe`);
assert.equal(dispatchCall()?.headers.cookie, undefined);
assert.equal(dispatchCall()?.body, JSON.stringify({ email: "a@b.test" }));

// An Area that names a module the catalog does not install is a configuration error, not a silent
// fallback: the dispatch fails loudly rather than resolving some other Provider.
const uninstalled = await submit({ body: { formId: FORM_IDS.addOn, phase: "submit", values: {} } });
assert.equal(uninstalled.response.status, 502);
assert.match(String(uninstalled.payload.error), /"@test\/pkg\/modules\/add-on" is not installed/u);
assert.equal(calls.length, 0);

// Installed but not activated for the Area: the Form simply does not dispatch.
activeModuleIds = [];
const addOnInactive = await submit({
  body: { formId: FORM_IDS.addOn, phase: "submit", values: {} },
  withAddOn: true,
});
assert.equal(addOnInactive.response.status, 404);
assert.equal(calls.length, 0);

// And its Form id resolves to nothing at all in a catalog without the module.
const addOnUnknown = await submit({ body: { formId: FORM_IDS.addOn, phase: "submit", values: {} } });
assert.equal(addOnUnknown.response.status, 404);
assert.equal(calls.length, 0);

globalThis.fetch = originalFetch;

{
  /*
   * A label set is cached by what it holds, not only by where it came from. Keyed by locale and set key
   * alone, a process that cached a set before a label was added kept serving the old object and the new
   * keys read as `undefined` -- the Background Travel switch rendered with no label and two blank
   * options. A deploy restarts the process and never sees it, which is exactly why the key has to
   * describe the set's contents rather than its name.
   */
  const labelSetSource = await readFile(new URL("../gateway/label-set.ts", import.meta.url), "utf8");
  assert.match(
    labelSetSource,
    /getLabelSetCacheKey\([\s\S]{0,200}?hashLabelSetShape\(definition\.labels\)/u,
    "The cache key must carry a fingerprint of the labels themselves.",
  );
  assert.match(
    labelSetSource,
    /function hashLabelSetShape[\s\S]*?Object\.entries\(labels\)/u,
    "The fingerprint must cover the keys and their source text, not just the count.",
  );
}

console.log("Server-authoritative Form gateway contracts validated.");
