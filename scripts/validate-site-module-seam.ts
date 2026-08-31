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
import type { PhiRuntimeModuleCatalogEntry } from "../types/cms-plugins";

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

console.log("Site Module seam valid: the shipped seam is empty, composes per Area, and every Area catalog reads it.");
