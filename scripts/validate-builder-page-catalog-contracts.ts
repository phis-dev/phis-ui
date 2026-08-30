import assert from "node:assert/strict";

import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderCmsStoragePathForCatalog,
  resolvePhiBuilderPageKeyFromStoragePath,
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
assert.equal(resolvePhiBuilderPageKeyFromStoragePath("public", "/new-page", catalog), "new-page");
assert.throws(
  () => resolvePhiBuilderCmsStoragePathForCatalog("public", "inactive-page", catalog),
  /not present in the active Builder Page catalog/,
);
assert.throws(
  () => resolvePhiBuilderCmsStoragePathForCatalog("public", "missing", catalog),
  /not present in the active Builder Page catalog/,
);

console.log("Builder Page catalog contracts valid.");
