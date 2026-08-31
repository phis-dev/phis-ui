import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  readAllPhiSiteModuleServerAreaContributions,
  readPhiSiteModuleServerAreaContributions,
} from "../plugins/runtime-modules/site-module-contributions";
import {
  PHI_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS,
  type PhiSiteModuleServerAreaContributions,
} from "../plugins/runtime-modules/site-modules";
import type { PhiRuntimeModuleServerAreaContribution } from "../plugins/runtime-modules/area-contributions";
import type { PhiRuntimeModuleCatalogEntry, PhiRuntimeModuleDefinition } from "../types/cms-plugins";
import { collectPhiSiteModuleServerAreaContributions } from "../module-projection";
import { collectPhiSiteModuleClientContributions } from "../module-projection-client";
import {
  extendWithPhiSiteModuleClientManifests,
  readAllPhiSiteModuleAuthoringClientContributions,
} from "../plugins/runtime-modules/site-module-client-manifests";
import {
  PHI_SITE_MODULE_CLIENT_CONTRIBUTIONS,
  type PhiSiteModuleClientContributions,
} from "../plugins/runtime-modules/site-modules-client";

/**
 * The seam a Site build replaces, checked from both sides.
 *
 * A Module living outside `@phis/ui` has no way into an Area catalog on its own: this package must not
 * know its name, and the Skeleton belongs to the Site operator and is not edited when a Module is
 * installed. `site-modules.ts` is the one module a Site build resolves elsewhere, and everything below
 * it has to behave the same whether that file is the shipped empty one or a generated one.
 *
 * The wiring is checked against the sources on purpose. A seventh Area catalog written without the seam
 * would compile perfectly and silently offer nothing the Site installed, which is exactly the failure
 * that would not be noticed until someone asks why their Module is missing.
 */

function contribution(moduleId: `${string}/${string}`): PhiRuntimeModuleServerAreaContribution {
  // The readers select and merge by module id and never look inside the entry, so a placeholder is
  // honest here; what a valid entry must contain is the catalog's contract and is checked where the
  // catalog is built.
  return { moduleId, catalogEntry: { definition: { moduleId } } as PhiRuntimeModuleCatalogEntry };
}

const installed: PhiSiteModuleServerAreaContributions = {
  public: [contribution("@acme/shop/modules/storefront")],
  admin: [
    contribution("@acme/shop/modules/storefront"),
    contribution("@acme/shop/modules/orders"),
  ],
};

// The shipped seam is empty, so an installation without Modules of its own composes as it always did.
assert.deepEqual(PHI_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS, {});
assert.deepEqual(readPhiSiteModuleServerAreaContributions(PHI_SITE_MODULE_SERVER_AREA_CONTRIBUTIONS, "public"), []);

// An Area sees its own Modules and no others.
assert.deepEqual(
  readPhiSiteModuleServerAreaContributions(installed, "public").map((entry) => entry.moduleId),
  ["@acme/shop/modules/storefront"],
);
assert.deepEqual(readPhiSiteModuleServerAreaContributions(installed, "editor"), []);

// The Builder sees the union across Areas, and a Module contributing to several appears once.
assert.deepEqual(
  readAllPhiSiteModuleServerAreaContributions(installed).map((entry) => entry.moduleId).sort(),
  ["@acme/shop/modules/orders", "@acme/shop/modules/storefront"],
);

// Every Area catalog reads the seam, and the Builder reads the union.
for (const area of ["accounting", "admin", "app", "editor", "public"] as const) {
  assert.match(
    readFileSync(`plugins/runtime-modules/area-catalogs/${area}.ts`, "utf8"),
    new RegExp(`phiSiteModuleServerAreaContributions\\("${area}"\\)`),
    `the ${area} Area catalog must compose the Site's own Modules`,
  );
}
assert.match(
  readFileSync("plugins/runtime-modules/catalog.ts", "utf8"),
  /phiAllSiteModuleServerAreaContributions\(\)/,
  "the Builder catalog must compose the complete installed union",
);

// --- the client half -------------------------------------------------------------------------

// The shipped client seam is empty too, so the first-party manifests reach the boundary untouched.
assert.deepEqual(PHI_SITE_MODULE_CLIENT_CONTRIBUTIONS.areas, {});
assert.deepEqual(PHI_SITE_MODULE_CLIENT_CONTRIBUTIONS.calendarAdapters, []);

const clientInstalled: PhiSiteModuleClientContributions = {
  areas: {
    public: {
      controllers: [{ moduleId: "@acme/shop/modules/storefront", loadController: async () => null }],
      renderLoaders: [["@acme/shop/cart", async () => null]],
      dataProviders: [{ key: "@acme/shop/orders" }],
      authoring: [{ moduleId: "@acme/shop/modules/storefront", loadAuthoring: async () => null }],
    },
    admin: {
      authoring: [{ moduleId: "@acme/shop/modules/storefront", loadAuthoring: async () => null }],
      dataProviders: [{ key: "@acme/shop/reports" }],
    },
  },
  calendarAdapters: [{ key: "@acme/shop/calendars/deliveries" }],
} as unknown as PhiSiteModuleClientContributions;

const emptyManifests = () => ({
  controller: new Map(),
  render: new Map(),
  dataProvider: new Map(),
  calendarAdapter: new Map(),
}) as unknown as Parameters<typeof extendWithPhiSiteModuleClientManifests>[2];

// An Area receives its own Modules...
const publicManifests = extendWithPhiSiteModuleClientManifests(clientInstalled, "public", emptyManifests());
assert.ok(publicManifests.controller.has("@acme/shop/modules/storefront"));
assert.ok(publicManifests.render.has("@acme/shop/cart"));
assert.ok(publicManifests.dataProvider.has("@acme/shop/orders"));
assert.ok(!publicManifests.dataProvider.has("@acme/shop/reports"), "an Area must not receive another Area's Providers");

// ...and the Calendar adapters, which are not Area-scoped anywhere in this codebase.
for (const area of ["public", "editor"] as const) {
  const manifests = extendWithPhiSiteModuleClientManifests(clientInstalled, area, emptyManifests());
  assert.ok(
    manifests.calendarAdapter.has("@acme/shop/calendars/deliveries"),
    `Calendar adapters must reach ${area} as well`,
  );
}

// A Module authored in two Areas appears once in the Builder's union, which would otherwise be refused.
assert.deepEqual(
  readAllPhiSiteModuleAuthoringClientContributions(clientInstalled).map((entry) => entry.moduleId),
  ["@acme/shop/modules/storefront"],
);

// Every Client Area host composes through the seam, and the Builder also extends the Authoring union.
for (const area of ["accounting", "admin", "app", "builder", "editor", "public"] as const) {
  assert.match(
    readFileSync(`next/areas/${area}-client.tsx`, "utf8"),
    new RegExp(`phiSiteModuleClientManifests\\("${area}"`),
    `the ${area} Client Area host must compose the Site's own Modules`,
  );
}
assert.match(
  readFileSync("next/areas/builder-client.tsx", "utf8"),
  /phiSiteModuleAuthoringClientManifest\(/,
  "the Builder must extend the Authoring union with the Site's own Modules",
);

// --- the projection a generated file calls -----------------------------------------------------

// `phis-cli` writes imports and one call; the placement happens here, from each Module's own
// eligibleAreas. Nothing loads a Module to work this out.
function definition(moduleId: string, eligibleAreas: readonly string[]) {
  return { moduleId, eligibleAreas } as unknown as PhiRuntimeModuleDefinition;
}

const storefront = "@acme/shop/modules/storefront";
const orders = "@acme/shop/modules/orders";
const definitions = [definition(storefront, ["public", "admin"]), definition(orders, ["admin"])];

const projected = collectPhiSiteModuleServerAreaContributions([
  { moduleId: storefront, catalogEntry: { definition: definitions[0] } },
  { moduleId: orders, catalogEntry: { definition: definitions[1] } },
] as unknown as PhiRuntimeModuleServerAreaContribution[]);

assert.deepEqual(Object.keys(projected).sort(), ["admin", "public"]);
assert.deepEqual(projected.public?.map((entry) => entry.moduleId), [storefront]);
assert.deepEqual(projected.admin?.map((entry) => entry.moduleId), [storefront, orders]);
assert.equal(projected.editor, undefined, "an Area no Module named must stay absent");

const projectedClient = collectPhiSiteModuleClientContributions({
  definitions,
  clients: [{
    modules: [
      { moduleId: storefront, renderLoaders: [["@acme/shop/cart", async () => null]] },
      { moduleId: orders, dataProviders: [{ key: "@acme/shop/orders" }] },
      // A Module the package never defined: dropped rather than registered nowhere.
      { moduleId: "@acme/shop/modules/ghost", dataProviders: [{ key: "@acme/shop/ghost" }] },
    ],
    calendarAdapters: [{ key: "@acme/shop/calendars/deliveries" }],
  }],
  authoring: [{ moduleId: storefront, loadAuthoring: async () => null }],
} as unknown as Parameters<typeof collectPhiSiteModuleClientContributions>[0]);

assert.deepEqual(projectedClient.areas.public?.renderLoaders?.map(([type]) => type), ["@acme/shop/cart"]);
assert.deepEqual(projectedClient.areas.admin?.renderLoaders?.map(([type]) => type), ["@acme/shop/cart"]);
assert.deepEqual(projectedClient.areas.admin?.dataProviders?.map((entry) => entry.key), ["@acme/shop/orders"]);
assert.deepEqual(projectedClient.areas.public?.dataProviders, [], "orders is not eligible for public");
assert.deepEqual(projectedClient.areas.public?.authoring?.map((entry) => entry.moduleId), [storefront]);
assert.deepEqual(
  projectedClient.calendarAdapters.map((entry) => entry.key),
  ["@acme/shop/calendars/deliveries"],
  "Calendar adapters are flattened, never placed into an Area",
);
for (const area of Object.values(projectedClient.areas)) {
  assert.ok(
    !JSON.stringify(Object.keys(area ?? {})).includes("calendar"),
    "no Area may carry its own Calendar adapters",
  );
}

console.log("Site Module seam valid: both halves ship empty, the projection places by eligibleAreas, and every Area host reads them.");
