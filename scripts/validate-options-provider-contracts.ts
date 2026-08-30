import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  canPhiControlOptionsResolverRun,
  resolvePhiControlOptionsDependencies,
} from "../components/controls/phi-options-provider";

/**
 * A store-backed options provider must not resolve during the server render.
 *
 * `getServerSnapshot` answers with the empty snapshot so hydration cannot disagree with the markup, and
 * every resolver reads that snapshot as its own store's shape. Running one with nothing threw: the
 * Builder's `resolveProviderArea` read `.area` off `null` and Next fell back to client rendering for the
 * whole route.
 */
assert.equal(
  canPhiControlOptionsResolverRun({ getSnapshot: () => ({}) }, null),
  false,
  "A store-backed provider must not resolve without a snapshot.",
);
assert.equal(
  canPhiControlOptionsResolverRun({ getSnapshot: () => ({}) }, { area: "public" }),
  true,
  "With a snapshot the resolver runs as usual.",
);
assert.equal(
  canPhiControlOptionsResolverRun({}, null),
  true,
  "A static provider reads no store and resolves on the server too.",
);
assert.equal(
  canPhiControlOptionsResolverRun(null, null),
  true,
  "No provider is not a provider that must be held back.",
);

const source = await readFile(
  new URL("../components/controls/phi-options-provider.tsx", import.meta.url),
  "utf8",
);
assert.match(
  source,
  /if \(!canPhiControlOptionsResolverRun\(registeredProvider, providerSnapshot\)\)/u,
  "The hook must consult the guard before calling a resolver.",
);

/**
 * These resolvers are why the guard exists: each reads the snapshot as a concrete store state and
 * dereferences it without a null check, which is correct only because they never see the empty one.
 */
for (const path of [
  "plugins/runtime-modules/builder/options-providers.ts",
  "plugins/runtime-modules/revisions/services/options.ts",
  "components/media/asset-options-providers.ts",
]) {
  const resolverSource = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  assert.match(
    resolverSource,
    /context\.snapshot as /u,
    `${path} relies on the guard, so it must keep reading the snapshot as its own store state.`,
  );
}

/**
 * Searching where the data is.
 *
 * A provider that answers a route rather than a store has to be asked again as someone types, so the
 * control hands its raw text down and the hook applies the policy the field declared: whether the
 * provider is searchable at all, from how many characters, and who narrows the list. One declaration,
 * read in one place -- `loadMode` and `search` have been on the config all along.
 *
 * Two halves have to stay true. The text must not enter the default load key, or a provider that does
 * not search reloads on every keystroke. And where the route answered the search, the control must not
 * filter the answer again: a match made on an address or an alias the label never shows would vanish.
 */
assert.match(
  source,
  /search,\n\s*dependencies: dependencyValues,\n\s*snapshot: providerSnapshot,/u,
  "The load context must carry the search text and the resolved dependencies.",
);
assert.doesNotMatch(
  source,
  /defaultProviderLoadKey = JSON\.stringify\(\{[^}]*search/u,
  "The default load key must not include the search, or every provider reloads on each keystroke.",
);
assert.match(
  source,
  /enabled: optionsProvider\?\.search\?\.enabled === true/u,
  "Searchability is declared on the field, not decided by the control.",
);
assert.match(
  source,
  /minChars: Math\.max\(optionsProvider\?\.search\?\.minChars \?\? 2, 1\)/u,
  "The minimum length comes from the same declaration.",
);
assert.match(
  source,
  /filterLocally: optionsProvider\?\.loadMode !== "server"/u,
  "Who narrows the list follows loadMode rather than a second flag in the answer.",
);
assert.match(
  source,
  /setTimeout\(\(\) => setSearch\(next\), PHI_OPTIONS_SEARCH_DEBOUNCE_MS\)/u,
  "Debouncing lives in the hook, so no provider reinvents it.",
);

{
  const control = await readFile(new URL("../components/controls/phi-select-control.tsx", import.meta.url), "utf8");
  assert.match(
    control,
    /filterOption=\{filterOptionsLocally \? undefined : false\}/u,
    "A server-searched answer must not be filtered locally as well.",
  );
  assert.match(control, /onSearch=\{onSearch\}/u, "The control must report what was typed.");

  const candidates = await readFile(new URL("../plugins/runtime-modules/groups/forms.ts", import.meta.url), "utf8");
  assert.match(candidates, /loadMode: "server",\n\s*search: \{ enabled: true, minChars: 2 \}/u,
    "A field whose route answers the search declares both.");

  const provider = await readFile(new URL("../plugins/runtime-modules/groups/services/options.ts", import.meta.url), "utf8");
  assert.match(provider, /group-member-candidates:\$\{readPhiOptionsRevision\(context\)\}:\$\{context\.search\}/u,
    "A searching provider takes the search into its own load key.");
  assert.doesNotMatch(provider, /searchMode/u,
    "The answer does not repeat what the field already declared.");
}

/**
 * Reloading when what a provider reads has changed.
 *
 * The reload path is key-driven, so subscribing to a revision is only half of it: a provider that
 * subscribes but keeps a constant load key re-renders with exactly what it loaded the first time, which
 * looks like the bug it was meant to fix. Every provider that subscribes must carry the revision in its
 * key, and something has to announce the change -- a store nobody bumps is a store that never fires.
 */
{
  const store = await readFile(new URL("../components/controls/phi-options-revision.ts", import.meta.url), "utf8");
  assert.match(store, /getServerSnapshot: \(\) => 0/u,
    "The server render and the first client render start from the same revision.");

  const subscribers = [
    "plugins/runtime-modules/groups/services/options.ts",
  ];
  for (const path of subscribers) {
    const providerSource = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    if (!/phi-options-revision/u.test(providerSource)) continue;
    const keys = providerSource.match(/resolveLoadKey: [^\n]*(?:\n\s+[^\n]*)?/gu) ?? [];
    assert.ok(keys.length > 0, `${path} declares load keys.`);
    for (const key of keys) {
      assert.match(key, /readPhiOptionsRevision\(context\)/u,
        `${path}: a provider that subscribes to a revision must carry it in its load key.`);
    }
  }

  const bumpers = [
    "plugins/runtime-modules/groups/services/table.tsx",
    "plugins/runtime-modules/groups/controller/client.tsx",
  ];
  for (const path of bumpers) {
    const bumperSource = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(bumperSource, /PHI_GROUPS_OPTIONS_REVISION\.bump\(\)/u,
      `${path}: whoever writes announces it, or the lists stay as they were.`);
  }
}

/**
 * A field whose options depend on a sibling field.
 *
 * Three things have to hold together. The dependency must reach the load key outside `resolveLoadKey`,
 * because that function replaces the default key entirely and a provider could otherwise answer with
 * what it loaded for the previous parent -- a plausible list for the wrong group. A required dependency
 * without a value must stop the load rather than let the provider answer with everything, which would
 * look exactly like the dependency being ignored. And the field must be cleared when a required parent
 * changes, or a value chosen under the old parent is still what gets submitted.
 */
{
  const resolved = resolvePhiControlOptionsDependencies(
    [{ param: "groupId", source: "form", valuePath: "groupId", required: true }],
    { form: { groupId: "2" } },
  );
  assert.deepEqual(resolved, { values: { groupId: "2" }, satisfied: true });

  assert.equal(
    resolvePhiControlOptionsDependencies(
      [{ param: "groupId", source: "form", valuePath: "groupId", required: true }],
      { form: {} },
    ).satisfied,
    false,
    "A required parent without a value means there is no question to ask yet.",
  );
  assert.equal(
    resolvePhiControlOptionsDependencies(
      [{ param: "groupId", source: "form", valuePath: "groupId", required: true }],
      { form: { groupId: "" } },
    ).satisfied,
    false,
    "A cleared select reports an empty string, which is not a value.",
  );
  assert.equal(
    resolvePhiControlOptionsDependencies(
      [{ param: "groupId", source: "form", valuePath: "groupId" }],
      { form: {} },
    ).satisfied,
    true,
    "An optional dependency narrows a list; it does not withhold one.",
  );
  assert.deepEqual(
    resolvePhiControlOptionsDependencies(
      [{ param: "kind", source: "config", valuePath: "nested.kind" }],
      { config: { nested: { kind: "page" } } },
    ).values,
    { kind: "page" },
    "A surface without a form reads the configuration it was built from.",
  );

  assert.match(
    source,
    /JSON\.stringify\(dependencyValues\),\n\s*registeredProvider\.resolveLoadKey\?\.\(loadContext\)/u,
    "Dependencies sit outside resolveLoadKey, where a provider cannot drop them.",
  );
  assert.match(
    source,
    /const mayLoad = Boolean\(registeredProvider\?\.load\) && dependenciesSatisfied;/u,
    "An unsatisfied required dependency stops the load rather than narrowing nothing.",
  );

  const control = await readFile(new URL("../components/controls/phi-form-control.tsx", import.meta.url), "utf8");
  assert.match(control, /formValues,\n\s*\}\);/u, "The form hands its live values to the options hook.");
  assert.match(
    control,
    /\.filter\(\(dependency\) => dependency\.required && dependency\.source === "form"\)/u,
    "Only a required parent clears the field; an optional one leaves what is already chosen.",
  );
  assert.match(control, /if \(value != null && value !== ""\) onChange\?\.\(undefined\)/u,
    "A value chosen under the previous parent must not survive the change.");
}

console.log("Control options provider contracts validated.");
