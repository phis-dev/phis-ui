import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PhiBaseRole } from "../constants/phi-base-roles";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { resolvePhiCmsDescriptorCatalog } from "../plugins/runtime-modules/descriptor-compiler";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/observability/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/user-management/ids";
import {
  runWithPhiRequestRuntime,
  setPhiRequestNavigationContext,
} from "../server-helpers/request-runtime";
import type { PhiBlockRuntime } from "../types";
import { PHI_CORE_ROLE_PROVIDER_ID } from "../types/access";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";
import {
  createPhiAssetUri,
  createPhiPageReference,
  createPhiPageUri,
  readPhiInternalReference,
  readPhiPageReference,
  type PhiPageReference,
} from "../types/references";
import { sanitizePhiHtmlWidgetMarkup } from "../components/widgets/helpers/html-content";
import { normalizePhiImageWidgetConfig } from "../plugins/runtime-modules/core/widgets/image/config";
import { resolvePhiWidgetInternalReferences } from "../components/widgets/helpers/internal-reference-resolver.server";
import { resolvePhiHtmlReferences } from "../components/widgets/helpers/html-internal-references.server";

// ---------------------------------------------------------------------------
// Codec: Site and Module Page ownership
// ---------------------------------------------------------------------------

const siteReference = createPhiPageReference({ kind: "site", pageScopeId: 47 });
assert.deepEqual(readPhiPageReference(siteReference)?.target, { kind: "site", pageScopeId: 47 });

const moduleReference = createPhiPageReference({
  kind: "module",
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  presetKey: "admin-users-page",
});
assert.deepEqual(readPhiPageReference(moduleReference)?.target, {
  kind: "module",
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  presetKey: "admin-users-page",
});

// The two ownership kinds never collide, and a Module reference names both halves of its identity.
assert.notEqual(String(siteReference), String(moduleReference));
assert.notEqual(
  String(moduleReference),
  String(createPhiPageReference({
    kind: "module",
    ownerModuleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
    presetKey: "admin-users-page",
  })),
);
assert.notEqual(
  String(moduleReference),
  String(createPhiPageReference({
    kind: "module",
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    presetKey: "admin-logs-page",
  })),
);

for (const invalidScopeId of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
  assert.throws(
    () => createPhiPageReference({ kind: "site", pageScopeId: invalidScopeId }),
    /Invalid Phi Page target/u,
    `Page scope id ${invalidScopeId} must not encode.`,
  );
}
for (const invalidModuleId of ["phis-ui", "@phis", "@phis/", "/phis-ui", ""]) {
  assert.throws(
    () => createPhiPageReference({ kind: "module", ownerModuleId: invalidModuleId, presetKey: "page" }),
    /Invalid Phi Page target/u,
    `Module id "${invalidModuleId}" must not encode.`,
  );
}
for (const invalidPresetKey of ["", "   "]) {
  assert.throws(
    () => createPhiPageReference({
      kind: "module",
      ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
      presetKey: invalidPresetKey,
    }),
    /Invalid Phi Page target/u,
  );
}

/**
 * A Page reference is a function of identity alone. Nothing that changes when a Page moves may enter
 * the encoding, or a path edit would rewrite every stored reference to it -- which is exactly the
 * Builder-history churn the stable reference exists to prevent. Assert the payload shape rather than
 * trusting the constructor signature.
 */
const decodePayload = (reference: PhiPageReference) => JSON.parse(
  Buffer.from(String(reference).slice("v1.".length).replaceAll("-", "+").replaceAll("_", "/"), "base64")
    .toString("utf8"),
) as Record<string, unknown>;
assert.deepEqual(Object.keys(decodePayload(siteReference)).sort(), ["i", "k", "v"]);
assert.deepEqual(Object.keys(decodePayload(moduleReference)).sort(), ["k", "m", "p", "v"]);
assert.equal(
  String(createPhiPageReference({ kind: "site", pageScopeId: 47 })),
  String(siteReference),
);

// Rejected encodings: wrong prefix, non-base64url, non-JSON, unknown version, unknown kind, wrong types.
const encode = (value: unknown) =>
  `v1.${Buffer.from(JSON.stringify(value), "utf8").toString("base64url")}`;
for (const invalid of [
  "",
  "v1.",
  "v2.eyJ2IjoxLCJrIjoicyIsImkiOjQ3fQ",
  "eyJ2IjoxLCJrIjoicyIsImkiOjQ3fQ",
  "v1.not base64url!",
  `v1.${Buffer.from("not json", "utf8").toString("base64url")}`,
  encode({ v: 2, k: "s", i: 47 }),
  encode({ v: 1, k: "x", i: 47 }),
  encode({ v: 1, k: "s", i: "47" }),
  encode({ v: 1, k: "s", i: 0 }),
  encode({ v: 1, k: "m", m: "phis-ui", p: "page" }),
  encode({ v: 1, k: "m", m: "@phis/ui", p: "" }),
  encode([1, 2, 3]),
  encode(null),
]) {
  assert.equal(readPhiPageReference(invalid), null, `"${invalid}" must not decode.`);
}
assert.equal(readPhiPageReference(47), null);
assert.equal(readPhiPageReference(null), null);

// ---------------------------------------------------------------------------
// Fragment preservation
// ---------------------------------------------------------------------------

assert.deepEqual(readPhiInternalReference(createPhiPageUri(siteReference, "details")), {
  kind: "page",
  reference: siteReference,
  target: { kind: "site", pageScopeId: 47 },
  fragment: "details",
});
const pageFragmentOf = (uri: string) => {
  const parsed = readPhiInternalReference(uri);
  return parsed?.kind === "page" ? parsed.fragment : undefined;
};
// A leading "#" is presentation, not part of the fragment, and surrounding whitespace is not either.
assert.equal(pageFragmentOf(createPhiPageUri(siteReference, "#details")), "details");
assert.equal(pageFragmentOf(createPhiPageUri(siteReference, "  details  ")), "details");
// An empty fragment produces no "#" at all rather than a trailing one.
for (const emptyFragment of [undefined, null, "", "   ", "#"]) {
  const uri = createPhiPageUri(siteReference, emptyFragment);
  assert.equal(uri.includes("#"), false, `Fragment ${JSON.stringify(emptyFragment)} must not emit "#".`);
  assert.equal(pageFragmentOf(uri), null);
}
// Fragments survive characters that would otherwise re-split the URI or break the encoding.
for (const fragment of ["a#b", "sec 1", "ü/ö", "100%", "a&b=c", "phis:page/spoof"]) {
  assert.equal(
    pageFragmentOf(createPhiPageUri(siteReference, fragment)),
    fragment,
    `Fragment "${fragment}" must round-trip.`,
  );
}
// A malformed percent escape is not silently kept as literal text.
assert.equal(readPhiInternalReference(`phis:page/${siteReference}#%E0%A4%A`), null);
assert.throws(() => createPhiPageUri("v1.broken" as PhiPageReference), /Invalid Phi Page reference/u);

// ---------------------------------------------------------------------------
// Asset references
// ---------------------------------------------------------------------------

assert.deepEqual(readPhiInternalReference(createPhiAssetUri(71)), { kind: "asset", assetId: 71 });
for (const invalidAssetId of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
  assert.throws(() => createPhiAssetUri(invalidAssetId), /positive integers/u);
}
for (const invalid of [
  "phis:asset/0",
  "phis:asset/",
  "phis:asset/007",
  "phis:asset/1e3",
  "phis:asset/71#top",
  "phis:asset/ 71",
  "phis:asset/-1",
  "phis:asset/9007199254740993",
]) {
  assert.equal(readPhiInternalReference(invalid), null, `"${invalid}" must not decode.`);
}
assert.equal(readPhiInternalReference("/local/path"), null);
assert.equal(readPhiInternalReference("https://example.test/"), null);
assert.equal(readPhiInternalReference(71), null);

// ---------------------------------------------------------------------------
// Sanitizer scheme gate
// ---------------------------------------------------------------------------

const html = `<p><a href="${createPhiPageUri(siteReference)}">Page</a><img src="${createPhiAssetUri(71)}" alt="Asset"></p>`;
assert.match(sanitizePhiHtmlWidgetMarkup(html, { allowInternalReferences: true }), /phis:page\//u);
assert.doesNotMatch(sanitizePhiHtmlWidgetMarkup(html), /phis:/u);
assert.match(
  sanitizePhiHtmlWidgetMarkup(`<img src="${createPhiAssetUri(71)}" alt="Asset">`, { allowInternalReferences: true }),
  /phis:asset\/71/u,
);
// The authoring gate opens the `phis` scheme, never anything else.
assert.doesNotMatch(
  sanitizePhiHtmlWidgetMarkup(
    `<p><a href="javascript:alert(1)">x</a><a href="data:text/html,x">y</a></p>`,
    { allowInternalReferences: true },
  ),
  /javascript:|data:/u,
);
// Alt text, titles and dimensions survive sanitizing, which is what keeps them across translation.
const preservedImage = sanitizePhiHtmlWidgetMarkup(
  `<p><img src="https://cdn.test/a.png" alt="Ein Bild" title="Titel" width="10" height="20"><a href="https://example.test/" title="Ziel">Text</a></p>`,
);
for (const expected of ['alt="Ein Bild"', 'title="Titel"', 'width="10"', 'height="20"', 'title="Ziel"', ">Text<"]) {
  assert.ok(preservedImage.includes(expected), `Sanitizing must preserve ${expected}.`);
}

const image = normalizePhiImageWidgetConfig({ sourceKind: "asset", assetId: 71, sourceUrl: "/legacy" });
assert.equal(image.sourceKind, "asset");
assert.equal("sourceUrl" in image, false);
assert.equal(image.objectPosition, undefined);

// ---------------------------------------------------------------------------
// Bulk server resolution
// ---------------------------------------------------------------------------

const catalog = resolvePhiCmsDescriptorCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);
const allModuleIds = new Set(
  [...catalog.routesByArea.values()].flatMap((routes) =>
    [...routes].map(({ descriptor }) => descriptor.ownerModuleId)),
) as ReadonlySet<PhiRuntimeModuleId>;

type ReferenceRequestBody = { area?: string; references: string[]; assets: number[] };
const referenceRequests: ReferenceRequestBody[] = [];
const originalFetch = globalThis.fetch;

function installReferenceProjection(projection: {
  resolved?: readonly unknown[];
  assets?: readonly unknown[];
}) {
  referenceRequests.length = 0;
  globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
    assert.match(String(input), /\/api\/v1\/site\/references$/u);
    referenceRequests.push(JSON.parse(String(init?.body)) as ReferenceRequestBody);
    return new Response(
      JSON.stringify({ resolved: projection.resolved ?? [], assets: projection.assets ?? [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof globalThis.fetch;
}

const viewerWithRoles = (roleFlags: number) => ({
  access: "authenticated" as const,
  roleClaims: roleFlags === 0 ? [] : [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags: roleFlags }],
  groupClaims: [],
});

function referenceRuntime(area: PhiCmsAreaKey, roleFlags: number, locale = "de") {
  return {
    site: { key: "reference-contracts" },
    locale: { current: locale },
    area,
    phis: { apiBaseUrl: "http://phi.test", internalToken: "internal" },
    viewer: viewerWithRoles(roleFlags),
  } as unknown as Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">;
}

function withRequestScope<T>(
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
  work: () => Promise<T>,
) {
  return runWithPhiRequestRuntime(runtime as PhiBlockRuntime, () => {
    setPhiRequestNavigationContext(runtime.area as PhiCmsAreaKey, catalog, activeModuleIds);
    return work();
  });
}

const resolveReferences = (input: {
  area?: PhiCmsAreaKey;
  locale?: string;
  roleFlags?: number;
  activeModuleIds?: ReadonlySet<PhiRuntimeModuleId>;
  pageReferences?: readonly PhiPageReference[];
  assetIds?: readonly number[];
}) => {
  const runtime = referenceRuntime(
    input.area ?? "admin",
    input.roleFlags ?? PhiBaseRole.Developer,
    input.locale,
  );
  return withRequestScope(runtime, input.activeModuleIds ?? allModuleIds, () =>
    resolvePhiWidgetInternalReferences({
      runtime,
      pageReferences: input.pageReferences ?? [],
      assetIds: input.assetIds ?? [],
    }));
};

const asset = (id: number, deliveryUrl: string) => ({
  id,
  deliveryUrl,
  deliveryRevision: 3,
  contentType: "image/png",
  originalName: `${id}.png`,
});

// One round trip carries both kinds, deduplicated, with invalid Asset ids dropped before the request.
installReferenceProjection({
  resolved: [{ reference: siteReference, path: "/about", deleted: false, targetKind: "site" }],
  assets: [asset(71, "https://cdn.test/71.png")],
});
const bulk = await resolveReferences({
  pageReferences: [siteReference, siteReference],
  assetIds: [71, 71, 0, -3, 1.5],
});
assert.equal(referenceRequests.length, 1);
assert.deepEqual(referenceRequests[0], {
  area: "admin",
  references: [siteReference],
  assets: [71],
});
assert.deepEqual([...bulk.pagePaths.entries()], [[siteReference, "/admin/about"]]);
assert.deepEqual([...bulk.assetUrls.entries()], [[71, "https://cdn.test/71.png"]]);

// Nothing to resolve issues no request at all.
installReferenceProjection({});
const empty = await resolveReferences({});
assert.equal(referenceRequests.length, 0);
assert.equal(empty.pagePaths.size, 0);
assert.equal(empty.assetUrls.size, 0);

// Missing and tombstoned targets resolve to nothing rather than to a broken path.
const tombstoned = createPhiPageReference({ kind: "site", pageScopeId: 48 });
const pathless = createPhiPageReference({ kind: "site", pageScopeId: 49 });
const unanswered = createPhiPageReference({ kind: "site", pageScopeId: 50 });
installReferenceProjection({
  resolved: [
    { reference: tombstoned, path: "/gone", deleted: true, targetKind: "site" },
    { reference: pathless, path: null, deleted: false, targetKind: "site" },
  ],
});
const absent = await resolveReferences({ pageReferences: [tombstoned, pathless, unanswered] });
assert.equal(absent.pagePaths.size, 0);

// An Asset the server does not project is simply not renderable; callers must not invent a URL.
installReferenceProjection({ assets: [asset(71, "https://cdn.test/71.png")] });
const partialAssets = await resolveReferences({ assetIds: [71, 72] });
assert.deepEqual([...partialAssets.assetUrls.keys()], [71]);

// A malformed projection fails loudly instead of resolving half a page.
installReferenceProjection({ resolved: [{ reference: siteReference, path: 47, deleted: false }] });
await assert.rejects(
  resolveReferences({ pageReferences: [siteReference] }),
  /Invalid internal Page reference projection/u,
);

// ---------------------------------------------------------------------------
// Module Page references: current Area, module activation, viewer access
// ---------------------------------------------------------------------------

/**
 * `admin-users-page` is the worked example of the split: it lives in the `admin` Area and carries the
 * Developer-tools policy. A Module reference resolves only when all three of Area, activation and
 * access agree -- the server projection never answers for Module targets.
 */
const usersReference = createPhiPageReference({
  kind: "module",
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  presetKey: "admin-users-page",
});
const unknownPresetReference = createPhiPageReference({
  kind: "module",
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  presetKey: "no-such-preset",
});

installReferenceProjection({ resolved: [] });
assert.deepEqual(
  [...(await resolveReferences({ pageReferences: [usersReference] })).pagePaths.entries()],
  [[usersReference, "/admin/users"]],
);

// Selecting from another Area must not leak a path across the Area boundary.
installReferenceProjection({ resolved: [] });
assert.equal(
  (await resolveReferences({ area: "editor", pageReferences: [usersReference] })).pagePaths.size,
  0,
);

// A deactivated owning module contributes no route, so its references stop resolving.
installReferenceProjection({ resolved: [] });
assert.equal(
  (await resolveReferences({
    pageReferences: [usersReference],
    activeModuleIds: new Set(
      [...allModuleIds].filter((id) => id !== PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID),
    ),
  })).pagePaths.size,
  0,
);

// Access is evaluated against the route policy, not against the Area the viewer already reached.
installReferenceProjection({ resolved: [] });
assert.equal(
  (await resolveReferences({ roleFlags: 0, pageReferences: [usersReference] })).pagePaths.size,
  0,
);
installReferenceProjection({ resolved: [] });
assert.deepEqual(
  [...(await resolveReferences({
    roleFlags: PhiBaseRole.Admin,
    pageReferences: [usersReference],
  })).pagePaths.values()],
  ["/admin/users"],
);

// An unknown preset key resolves to nothing rather than to the owning module's first route.
installReferenceProjection({ resolved: [] });
assert.equal(
  (await resolveReferences({ pageReferences: [unknownPresetReference] })).pagePaths.size,
  0,
);

// The server projection stays authoritative for Site Pages: a Module fallback never overwrites it.
installReferenceProjection({
  resolved: [{ reference: usersReference, path: "/from-server", deleted: false, targetKind: "module" }],
});
assert.equal(
  (await resolveReferences({ pageReferences: [usersReference] })).pagePaths.get(usersReference),
  "/admin/users",
  "A Module target is resolved from the route table, which the projection reports as pathless.",
);

// ---------------------------------------------------------------------------
// Locale and Area resolution
// ---------------------------------------------------------------------------

/**
 * Both the server projection and the route table carry Area-relative CMS paths. `REFERENCES.md`
 * requires the resolved href to be locale- and Area-correct, and Navigation already localizes through
 * `resolvePhiNavHref`, so references must produce the same href Navigation would.
 */
const resolvedHrefFor = async (input: {
  area: PhiCmsAreaKey;
  locale?: string;
  path: string;
}) => {
  installReferenceProjection({
    resolved: [{ reference: siteReference, path: input.path, deleted: false, targetKind: "site" }],
  });
  const resolved = await resolveReferences({
    area: input.area,
    locale: input.locale,
    pageReferences: [siteReference],
  });
  return resolved.pagePaths.get(siteReference);
};

// A public Page carries the locale segment, which is what the Site route host expects.
assert.equal(await resolvedHrefFor({ area: "public", locale: "de", path: "/about" }), "/de/about");
assert.equal(await resolvedHrefFor({ area: "public", locale: "en", path: "/about" }), "/en/about");
assert.equal(await resolvedHrefFor({ area: "public", locale: "de", path: "/" }), "/de");
// A staff Area carries the Area segment instead; staff routes are not locale-prefixed.
assert.equal(await resolvedHrefFor({ area: "admin", locale: "de", path: "/users" }), "/admin/users");
assert.equal(await resolvedHrefFor({ area: "builder", locale: "de", path: "/pages" }), "/builder/pages");
// An already-qualified path is left alone rather than prefixed twice.
assert.equal(await resolvedHrefFor({ area: "admin", locale: "de", path: "/admin/users" }), "/admin/users");
assert.equal(await resolvedHrefFor({ area: "admin", locale: "de", path: "/public/about" }), "/de/about");


// ---------------------------------------------------------------------------
// HTML projection: resolved, unresolved, and non-internal targets
// ---------------------------------------------------------------------------

const resolveHtml = (input: {
  html: string;
  area?: PhiCmsAreaKey;
  locale?: string;
  roleFlags?: number;
  sourceMode?: "inline" | "url";
  sourceUrl?: string | null;
}) => {
  const runtime = referenceRuntime(
    input.area ?? "admin",
    input.roleFlags ?? PhiBaseRole.Developer,
    input.locale,
  );
  return withRequestScope(runtime, allModuleIds, () =>
    resolvePhiHtmlReferences({
      html: input.html,
      sourceMode: input.sourceMode ?? "inline",
      sourceUrl: input.sourceUrl ?? null,
      runtime,
    }));
};

installReferenceProjection({
  resolved: [{ reference: siteReference, path: "/about", deleted: false, targetKind: "site" }],
  assets: [asset(71, "https://cdn.test/71.png")],
});
const projectedHtml = await resolveHtml({
  html: [
    `<p><a href="${createPhiPageUri(siteReference, "team")}">about us</a></p>`,
    `<p><a href="${createPhiPageUri(tombstoned)}">deleted page</a></p>`,
    `<p><img src="${createPhiAssetUri(71)}" alt="a picture"></p>`,
    `<p><img src="${createPhiAssetUri(72)}" alt="missing"></p>`,
    `<p><a href="https://example.test/">external</a><a href="mailto:a@b.test">mail</a></p>`,
    `<p><a href="/raw/path">raw path</a></p>`,
  ].join(""),
});
// A resolved Page keeps its fragment; the Asset becomes its delivery URL and keeps its alt text.
assert.ok(projectedHtml.includes(`<a href="/admin/about#team">about us</a>`));
assert.ok(projectedHtml.includes(`<img src="https://cdn.test/71.png" alt="a picture">`));
// A tombstoned Page loses the link but never the words the author wrote; so does a raw local path.
assert.ok(projectedHtml.includes("<p>deleted page</p>"));
assert.ok(projectedHtml.includes("<p>raw path</p>"));
// An unresolvable Asset leaves no broken image behind.
assert.doesNotMatch(projectedHtml, /missing/u);
assert.doesNotMatch(projectedHtml, /phis:/u);
// External destinations are untouched.
assert.ok(projectedHtml.includes(`<a href="https://example.test/">external</a>`));
assert.ok(projectedHtml.includes(`<a href="mailto:a@b.test">mail</a>`));

// Attributes an author sets on an image survive the projection alongside the swapped src: the
// sanitizer admits title, width, and height on `img`, so nothing between authoring and the page may
// quietly drop them.
installReferenceProjection({ assets: [asset(71, "https://cdn.test/71.png")] });
const attributedHtml = await resolveHtml({
  html: `<p><img src="${createPhiAssetUri(71)}" alt="a picture" title="Harbour at night" width="480" height="320"></p>`,
});
assert.ok(attributedHtml.includes(`src="https://cdn.test/71.png"`));
for (const attribute of [`alt="a picture"`, `title="Harbour at night"`, `width="480"`, `height="320"`]) {
  assert.ok(attributedHtml.includes(attribute), `The projection must keep ${attribute}.`);
}
const sanitizedAttributedHtml = sanitizePhiHtmlWidgetMarkup(
  `<p><img src="${createPhiAssetUri(71)}" alt="a picture" title="Harbour at night" width="480" height="320"></p>`,
  { allowInternalReferences: true },
);
for (const attribute of [`title="Harbour at night"`, `width="480"`, `height="320"`]) {
  assert.ok(sanitizedAttributedHtml.includes(attribute), `Authoring must persist ${attribute}.`);
}

// Relative widths are an editorial need an attribute cannot express, so `img` -- and only `img` --
// may size itself through inline style. The value stays a bounded length: no function, no keyword,
// nothing that could reach outside the element's own box.
const relativeImageHtml = sanitizePhiHtmlWidgetMarkup(
  `<p><img src="${createPhiAssetUri(71)}" alt="a picture" style="width: 50%; height: 12rem"></p>`,
  { allowInternalReferences: true },
);
assert.match(relativeImageHtml, /width:\s*50%/u);
assert.match(relativeImageHtml, /height:\s*12rem/u);
assert.ok(
  (await resolveHtml({ html: relativeImageHtml })).includes("width:50%")
    || (await resolveHtml({ html: relativeImageHtml })).includes("width: 50%"),
  "The projection must keep an image's relative width.",
);
for (const rejected of [
  "width: calc(100% - 10px)",
  "width: var(--x)",
  "width: auto",
  "width: 50",
  "width: expression(alert(1))",
  "background: url(https://evil.test/x.png)",
  "position: fixed",
]) {
  assert.doesNotMatch(
    sanitizePhiHtmlWidgetMarkup(`<p><img src="https://cdn.test/71.png" alt="x" style="${rejected}"></p>`),
    /style=/u,
    `An image must not carry "${rejected}".`,
  );
}
// The permission belongs to the image, not to the document: a block element gains nothing from it.
assert.doesNotMatch(
  sanitizePhiHtmlWidgetMarkup(`<p style="width: 50%">sized</p>`),
  /style=/u,
  "Only an image may size itself through inline style.",
);

// A public Page reference carries the locale segment, and the fragment follows the resolved href.
installReferenceProjection({
  resolved: [{ reference: siteReference, path: "/about", deleted: false, targetKind: "site" }],
});
const localizedHtml = await resolveHtml({
  area: "public",
  locale: "de",
  html: `<p><a href="${createPhiPageUri(siteReference, "team")}">about us</a></p>`,
});
assert.ok(localizedHtml.includes(`<a href="/de/about#team">about us</a>`));

// The same content resolved by a viewer who may not reach the Module target keeps its text only.
installReferenceProjection({ resolved: [] });
const deniedHtml = await resolveHtml({
  roleFlags: 0,
  html: `<p><a href="${createPhiPageUri(usersReference)}">users</a></p>`,
});
assert.equal(deniedHtml, "<p>users</p>");

// ---------------------------------------------------------------------------
// External-document bypass encodings
// ---------------------------------------------------------------------------

/**
 * A remote document is never allowed to smuggle an internal reference past the resolver. The guard
 * normalizes entities, repeated percent-encoding, control characters and case before deciding, so
 * every spelling of `phis:` must lose its link while keeping the visible text.
 */
const smuggled = [
  `phis:page/${siteReference}`,
  `PHIS:page/${siteReference}`,
  `phis%3Apage/${siteReference}`,
  `phis%253Apage/${siteReference}`,
  `p%68is:page/${siteReference}`,
  `&amp;colon;`.replace("&amp;colon;", `phis&colon;page/${siteReference}`),
  ` phis:page/${siteReference}`,
  ` p h i s : page/${siteReference}`,
  `phis:asset/71`,
];
for (const [index, href] of smuggled.entries()) {
  const output = await resolveHtml({
    sourceMode: "url",
    sourceUrl: "https://remote.test/docs/index.html",
    html: `<p><a href="${href}">Text ${index}</a><img src="${href}" alt="Bild ${index}"></p>`,
  });
  assert.doesNotMatch(output, /phi/iu, `"${href}" must not survive as a reference.`);
  assert.ok(output.includes(`Text ${index}`), `"${href}" must keep its visible text.`);
  assert.doesNotMatch(output, new RegExp(`Bild ${index}`, "u"), `"${href}" must drop the image.`);
}

// Legitimate remote targets still resolve against the document URL.
const remoteHtml = await resolveHtml({
  sourceMode: "url",
  sourceUrl: "https://remote.test/docs/index.html",
  html: [
    `<p><a href="../guide.html">Relativ</a></p>`,
    `<p><a href="#chapter">Fragment</a></p>`,
    `<p><a href="mailto:a@b.test">Mail</a><a href="tel:+123">Tel</a></p>`,
    `<p><img src="images/a.png" alt="Bild"></p>`,
  ].join(""),
});
assert.ok(remoteHtml.includes(`href="https://remote.test/guide.html"`));
assert.ok(remoteHtml.includes(`href="#chapter"`));
assert.ok(remoteHtml.includes(`href="mailto:a@b.test"`));
assert.ok(remoteHtml.includes(`src="https://remote.test/docs/images/a.png"`));

// A remote `javascript:` href survives URL resolution but never the sanitizer that follows it.
const scriptHtml = await resolveHtml({
  sourceMode: "url",
  sourceUrl: "https://remote.test/docs/index.html",
  html: `<p><a href="javascript:alert(1)">Klick</a></p>`,
});
assert.doesNotMatch(sanitizePhiHtmlWidgetMarkup(scriptHtml), /javascript:/u);

// A document with no source URL yields nothing rather than unresolved relative targets.
assert.equal(await resolveHtml({ sourceMode: "url", sourceUrl: "   ", html: `<p><a href="a">x</a></p>` }), "");

globalThis.fetch = originalFetch;

// ---------------------------------------------------------------------------
// Client output and authoring surfaces
// ---------------------------------------------------------------------------

const readSource = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The Client boundary is the sanitizer without the authoring flag: it runs on the projection result,
 * before translation, so no unresolved `phis:` string can reach a Client component even if a future
 * projection path forgets to unwrap one.
 */
const htmlWidgetSource = await readSource("plugins/runtime-modules/core/widgets/html/server.tsx");
const referenceCall = htmlWidgetSource.indexOf("resolvePhiHtmlReferences({");
const sanitizeCall = htmlWidgetSource.indexOf("sanitizePhiHtmlWidgetMarkup(await resolvePhiHtmlReferences({");
const translateCall = htmlWidgetSource.indexOf("translateSemanticHtml(");
assert.notEqual(sanitizeCall, -1, "The projection result must pass the Client sanitizer.");
assert.ok(sanitizeCall <= referenceCall, "The sanitizer must wrap the projection, not follow it later.");
assert.ok(referenceCall < translateCall, "References must resolve before translation.");
assert.doesNotMatch(
  htmlWidgetSource.slice(sanitizeCall),
  /allowInternalReferences/u,
  "The Client sanitizer must not open the internal scheme.",
);
assert.doesNotMatch(
  await readSource("components/widgets/helpers/semantic-html-translation.ts"),
  /allowInternalReferences/u,
  "Translation must never re-admit the internal scheme.",
);

const persistenceSource = await readSource("plugins/runtime-modules/builder/navigation-persistence.ts");
assert.doesNotMatch(persistenceSource, /\?\s*\{\s*href:\s*current\.item\.href/u);
assert.match(persistenceSource, /kind:\s*"page"/u);

// Module-owned Pages keep their path under module ownership, so a Builder path edit cannot reach them.
const pageCatalogSource = await readSource("helpers/cms-page-catalog.ts");
assert.match(pageCatalogSource, /pathLocked:\s*true/u);
assert.match(pageCatalogSource, /createPhiPageReference\(\{\s*\n?\s*kind:\s*"module"/u);

const htmlEditorSource = await readSource("components/widgets/client/html-editor.tsx");
const htmlToolsSource = await readSource("components/widgets/client/shared/phi-widget-tool-buttons.tsx");
const markdownBuilderSource = await readSource("plugins/runtime-modules/core/widgets/markdown/authoring.tsx");
assert.match(htmlEditorSource, /allowInternalReferences:\s*true/u);
assert.match(htmlToolsSource, /PhiBuilderPageReferencePicker/u);
assert.match(htmlToolsSource, /PhiInternalAssetReferencePickerButton/u);
assert.match(markdownBuilderSource, /PhiMarkdownWidgetToolbarTools/u);

/**
 * The authoring surface shows the Asset through the delivery endpoint, but what it persists must stay
 * the `phis:asset/<id>` reference: a resolved URL written back into the document would turn a live
 * reference into a copied Asset URL, which `REFERENCES.md` forbids.
 */
const htmlImageNodeSource = await readSource("components/widgets/client/html-editor-image-node.tsx");
const exportDomBody = htmlImageNodeSource.slice(
  htmlImageNodeSource.indexOf("exportDOM(): DOMExportOutput"),
  htmlImageNodeSource.indexOf("exportJSON(): SerializedPhiHtmlImageNode"),
);
assert.notEqual(exportDomBody.length, 0, "The image node must export a DOM element.");
assert.match(exportDomBody, /setAttribute\("src", this\.__src\)/u);
assert.doesNotMatch(
  exportDomBody,
  /resolvePhiHtmlImageAuthoringSrc/u,
  "Persisted markup must carry the reference, not the delivery URL.",
);
/*
 * The attribute Popover is a portal: it holds the caret while the node behind it is edited. An update
 * whose pending selection is null makes the reconciler clear the window selection, which takes the
 * caret out of the field mid-word, so the Popover's writes must not reconcile the selection.
 */
assert.match(
  htmlImageNodeSource,
  /node\.setAttributes\(attributes\);[\s\S]{0,80}\}, \{ tag: SKIP_DOM_SELECTION_TAG \}\)/u,
  "Editing an image from its Popover must not move the DOM selection.",
);
// The attribute half of reference survival: the node reads all three from the DOM and writes them back.
for (const attribute of ["title", "width", "height"]) {
  assert.ok(
    htmlImageNodeSource.includes(`["${attribute}"`) || htmlImageNodeSource.includes(`getAttribute("${attribute}")`),
    `The image node must carry the ${attribute} attribute.`,
  );
}

{
  /*
   * Markdown carries an image title too -- `![alt](url "title")` is ordinary syntax, unlike width and
   * height, which it genuinely cannot express. The title is prose and gets translated, but as a unit of
   * its own: it is a separate sentence from the alt text beside it, and asked for both in one string a
   * translator returned them merged and re-split at a different point. The url stays in the unit's
   * metadata and never reaches the translator at all, which is what keeps a `phis:` reference out of a
   * translation request.
   */
  const markdownSource = await readFile(
    new URL("../plugins/runtime-modules/core/widgets/markdown/server.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    markdownSource,
    /metadata\.titles\[index\] = node\.title\?\.trim\(\) \?\? ""/u,
    "An authored title must be carried beside the image rather than inside its token.",
  );
  assert.match(
    markdownSource,
    /trBulk\(titleSlots\.map\(\(slot\) => slot\.title\), 0, "text", sourceLocale\)/u,
    "A title must be translated as a unit of its own, never merged into the alt text's string.",
  );
  assert.match(
    markdownSource,
    /metadata\.images\.push\(node\.url\?\.trim\(\) \?\? ""\)/u,
    "The url must stay in metadata, where no translation request can see it.",
  );
  assert.match(
    markdownSource,
    /const title = metadata\.titles\[frame\.index \?\? -1\]/u,
    "A translated title must be read back onto the image it was authored on.",
  );
  const markdownBodySource = await readFile(
    new URL("../plugins/runtime-modules/core/widgets/markdown/client.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    markdownBodySource,
    /title=\{inline\.title \|\| undefined\}/u,
    "The Markdown renderer must put an authored title on the image.",
  );
}

console.log("Internal reference contracts validated.");
