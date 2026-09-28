import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderCmsStoragePathForCatalog,
  resolvePhiBuilderPageKeyFromCatalogPath,
} from "../helpers/cms-page-catalog";
import { createPhiPageReference } from "../types/references";

const catalog = resolvePhiBuilderActivePageCatalog(
  "public",
  { public: [{ key: "home", title: "Home", storagePath: "/" }] },
  { public: [{ key: "pending", title: "Pending", storagePath: "/pending" }] },
  {
    public: [
      {
        id: 17,
        reference: createPhiPageReference({ kind: "site", pageScopeId: 17 }),
        path: "/new-page",
        tombstoned: false,
        workingDraftRevisionId: 17,
      },
      {
        id: 18,
        reference: createPhiPageReference({ kind: "site", pageScopeId: 18 }),
        path: "/nested/child",
        tombstoned: false,
        publishedRevisionId: 18,
      },
      {
        id: 19,
        reference: createPhiPageReference({ kind: "module", ownerModuleId: "@test/pkg/modules/inactive", presetKey: "inactive-page" }),
        path: "/inactive-module-page",
        ownerModuleId: "@test/pkg/modules/inactive",
        presetKey: "inactive-page",
        tombstoned: false,
      },
    ],
  },
);

assert.equal(resolvePhiBuilderCmsStoragePathForCatalog("public", "home", catalog), "/");
assert.equal(resolvePhiBuilderCmsStoragePathForCatalog("public", "new-page", catalog), "/new-page");
assert.equal(resolvePhiBuilderCmsStoragePathForCatalog("public", "nested/child", catalog), "/nested/child");
assert.equal(resolvePhiBuilderCmsStoragePathForCatalog("public", "pending", catalog), "/pending");
assert.equal(resolvePhiBuilderPageKeyFromCatalogPath("public", "/new-page", catalog), "new-page");
assert.throws(
  () => resolvePhiBuilderCmsStoragePathForCatalog("public", "inactive-page", catalog),
  /not present in the active Builder Page catalog/,
);
assert.throws(
  () => resolvePhiBuilderCmsStoragePathForCatalog("public", "missing", catalog),
  /not present in the active Builder Page catalog/,
);

/*
 * A surface that offers a Page as a target reads the offered catalog, never the active one.
 *
 * The two answer different questions. The active catalog mirrors what is **installed**, so a base
 * Module Page that a Site package covers is still in it; the offered catalog is what the Area
 * **answers with**, and that is the only honest list to pick a target from. Offering the covered one
 * puts two entries reading the same address in front of an author -- and the one they are likelier to
 * take is the one no visitor is ever served.
 *
 * Three surfaces had written the wrong one: the Navigation Page source tree, the Markdown and HTML
 * link picker, and the Inspector's link-target field, the last by copying the second. They are found
 * here by what they do rather than by name -- a file that turns Pages into something draggable or
 * pickable is one of them -- so a fourth cannot be added without meeting this.
 */
const OFFERING_MARKERS = [
  "buildPhiBuilderPageReferenceTree",
  "buildPhiBuilderNavigationPageDragSourceKey",
] as const;
const ACTIVE_CATALOG_READER = "resolvePhiBuilderActivePageCatalog";
const BUILDER_ROOT = new URL("../plugins/runtime-modules/builder/", import.meta.url);

function collectSourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) {
      return collectSourceFiles(child);
    }
    return /\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name) ? [child] : [];
  });
}

const offendingSurfaces = collectSourceFiles(BUILDER_ROOT).flatMap((file) => {
  const source = readFileSync(file, "utf8");
  const offers = OFFERING_MARKERS.some((marker) => source.includes(marker));
  return offers && source.includes(ACTIVE_CATALOG_READER)
    ? [file.pathname.slice(file.pathname.indexOf("/plugins/") + 1)]
    : [];
});

assert.deepEqual(
  offendingSurfaces,
  [],
  `These surfaces offer a Page as a target and read the active Page catalog instead of the offered one: ${offendingSurfaces.join(", ")}`,
);

console.log("Builder Page catalog contracts valid.");
