import assert from "node:assert/strict";

import { hasPhiCmsPresetUpdate } from "../plugins/runtime-modules/preset-version";
import { resolvePhiCmsRoutePage } from "../plugins/runtime-modules/route-page-resolution";
import type {
  PhiCmsPresetIdentity,
  PhiCmsRoutePresetBinding,
  PhiCmsRoutePresetDescriptor,
} from "../types/cms-module-descriptors";

type TestPage = { source: "site" | "snapshot" | "installed" };

const createDescriptor = (
  presetKey: string,
  path: string,
): PhiCmsRoutePresetDescriptor => ({
  ownerModuleId: "@test/pkg/modules/routes",
  presetKey,
  presetVersion: 3,
  area: "public",
  pageKey: presetKey,
  path,
  title: presetKey,
  loadTree: async () => {
    throw new Error("Contract descriptor trees are not loaded in this test.");
  },
});

const exactBinding: PhiCmsRoutePresetBinding = {
  descriptor: createDescriptor("news-archive", "/news/archive"),
  params: {},
};
const dynamicBinding: PhiCmsRoutePresetBinding = {
  descriptor: createDescriptor("news-article", "/news/:id"),
  params: { id: "42" },
};

async function runResolution({
  binding,
  pages,
}: {
  binding: PhiCmsRoutePresetBinding | null;
  pages: Map<string, TestPage>;
}) {
  const calls: Array<{ path: string; sourcePreset: PhiCmsPresetIdentity | null }> = [];
  let instantiated = 0;
  const page = await resolvePhiCmsRoutePage({
    binding,
    requestedPath: binding?.descriptor.path.replace(":id", "42") ?? "/site-page",
    loadPage: async (path, sourcePreset) => {
      calls.push({ path, sourcePreset });
      const key = sourcePreset
        ? `${sourcePreset.ownerModuleId}/${sourcePreset.presetKey}`
        : `site:${path}`;
      return pages.get(key) ?? null;
    },
    instantiatePreset: async () => {
      instantiated += 1;
      return { source: "installed" };
    },
  });
  return { calls, instantiated, page };
}

const exactSnapshotKey = "@test/pkg/modules/routes/news-archive";
const exactSnapshot = await runResolution({
  binding: exactBinding,
  pages: new Map([[exactSnapshotKey, { source: "snapshot" }]]),
});
assert.deepEqual(exactSnapshot.page, { source: "snapshot" });
assert.deepEqual(exactSnapshot.calls, [{
  path: "/news/archive",
  sourcePreset: { ownerModuleId: "@test/pkg/modules/routes", presetKey: "news-archive" },
}]);
assert.equal(exactSnapshot.instantiated, 0);

const exactInstalled = await runResolution({ binding: exactBinding, pages: new Map() });
assert.deepEqual(exactInstalled.page, { source: "installed" });
assert.equal(exactInstalled.calls.length, 1);
assert.equal(exactInstalled.instantiated, 1);

const dynamicSitePage = await runResolution({
  binding: dynamicBinding,
  pages: new Map([["site:/news/42", { source: "site" }]]),
});
assert.deepEqual(dynamicSitePage.page, { source: "site" });
assert.deepEqual(dynamicSitePage.calls, [{ path: "/news/42", sourcePreset: null }]);
assert.equal(dynamicSitePage.instantiated, 0);

const dynamicSnapshot = await runResolution({
  binding: dynamicBinding,
  pages: new Map([["@test/pkg/modules/routes/news-article", { source: "snapshot" }]]),
});
assert.deepEqual(dynamicSnapshot.page, { source: "snapshot" });
assert.deepEqual(dynamicSnapshot.calls, [
  { path: "/news/42", sourcePreset: null },
  {
    path: "/news/42",
    sourcePreset: { ownerModuleId: "@test/pkg/modules/routes", presetKey: "news-article" },
  },
]);
assert.equal(dynamicSnapshot.instantiated, 0);

const inactiveModuleRoute = await runResolution({
  binding: null,
  pages: new Map([["site:/site-page", { source: "site" }]]),
});
assert.deepEqual(inactiveModuleRoute.page, { source: "site" });
assert.deepEqual(inactiveModuleRoute.calls, [{ path: "/site-page", sourcePreset: null }]);
assert.equal(inactiveModuleRoute.instantiated, 0);

const installedSource = {
  ownerModuleId: "@test/pkg/modules/routes",
  presetKey: "news-article",
  sourcePresetVersion: 3,
} as const;
assert.equal(hasPhiCmsPresetUpdate(installedSource, { ...installedSource, sourcePresetVersion: 2 }), true);
assert.equal(hasPhiCmsPresetUpdate(installedSource, installedSource), false);
assert.equal(hasPhiCmsPresetUpdate(installedSource, { ...installedSource, sourcePresetVersion: 4 }), false);
assert.equal(hasPhiCmsPresetUpdate(installedSource, { ...installedSource, presetKey: "other", sourcePresetVersion: 1 }), false);
assert.equal(hasPhiCmsPresetUpdate(installedSource, null), false);

console.log("Route snapshot contracts valid.");
