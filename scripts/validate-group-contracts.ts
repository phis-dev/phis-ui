import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PhiGroupMembershipFlags } from "../constants/site-groups";
import { canPhiViewerManageSomeGroup } from "../plugins/runtime-modules/groups/page-visibility";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../plugins/runtime-modules/groups/data-providers";
import { PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS } from "../plugins/runtime-modules/groups/ids";

const readSource = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const claim = (flags: number) => ({
  providerId: "@phis/server/core" as const,
  key: "docs-team",
  flags,
});

// ---------------------------------------------------------------------------
// Who is offered the company-display switch
// ---------------------------------------------------------------------------

/**
 * A control that can only ever be refused is worse than no control, so the column is left out rather
 * than shown disabled. Managing any listed group earns it; Developer and Admin administer every group
 * and so always have it.
 */
assert.equal(
  canPhiViewerManageSomeGroup({
    siteWide: false,
    groupClaims: [claim(PhiGroupMembershipFlags.Editor), claim(PhiGroupMembershipFlags.Author)],
  }),
  false,
  "An Editor is the highest level that manages nothing, and was the one this UI used to call a Manager.",
);
assert.equal(
  canPhiViewerManageSomeGroup({
    siteWide: false,
    groupClaims: [claim(PhiGroupMembershipFlags.Member), claim(PhiGroupMembershipFlags.Manager)],
  }),
  true,
);
assert.equal(
  canPhiViewerManageSomeGroup({ siteWide: true, groupClaims: [] }),
  true,
  "Developer and Admin administer every group.",
);

// ---------------------------------------------------------------------------
// What a group row lets anyone change
// ---------------------------------------------------------------------------

/**
 * The level decides authority; the flag decides display. Keeping the two apart is why the only
 * editable field on a group row is the company display, and why it is gated on what the control plane
 * said about this row rather than on a level the interface worked out.
 */
{
  const table = PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
    .find((descriptor) => descriptor.key === PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table);
  assert.ok(table && "resources" in table && table.resources, "The Groups table provider declares resources.");

  const resources = table.resources;
  for (const resourceKey of ["groups", "myGroups"]) {
    const resource = resources.find((entry) => entry.resourceKey === resourceKey);
    assert.ok(resource, `The ${resourceKey} resource stays declared.`);
    const mutable = (resource.fields ?? []).filter((field) => field.mutable).map((field) => field.key);
    assert.deepEqual(mutable, ["showMemberCompany"],
      `Only the company display is editable on a ${resourceKey} row.`);
    const gate = (resource.fields ?? []).find((field) => field.key === "showMemberCompany")?.mutableWhen;
    assert.deepEqual(
      gate,
      { match: "all", conditions: [{ source: "row", valuePath: "manages", operator: "truthy" }] },
      "The switch follows what the control plane said about this row.",
    );
  }

  const members = resources.find((entry) => entry.resourceKey === "groupMembers");
  assert.ok(members);
  const memberMutable = (members.fields ?? []).filter((field) => field.mutable).map((field) => field.key);
  assert.deepEqual(memberMutable, ["membershipFlags"],
    "A membership row offers its level and nothing else about the person.");
}

// ---------------------------------------------------------------------------
// Retiring a group, and the way back
// ---------------------------------------------------------------------------

/**
 * Retiring ends a group's service; it is a command, not a value in a cell, so it is an action that
 * asks first. The way back is deliberately not offered beside it on the App: a retired group grants
 * nothing, so it leaves the actor's own list the moment it is retired -- and with it the Manager level
 * that would have allowed the return. Reactivation is therefore declared only on the Site-wide
 * resource, whose scope the control plane already restricts to Developer and Admin.
 */
{
  const table = PHI_GROUPS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
    .find((descriptor) => descriptor.key === PHI_GROUPS_RUNTIME_DATA_PROVIDER_KEYS.table);
  const resources = (table && "resources" in table && table.resources) || [];
  const actionKeys = (resourceKey: string) =>
    (resources.find((entry) => entry.resourceKey === resourceKey)?.actions ?? []).map((action) => action.key);

  assert.ok(actionKeys("groups").includes("retire"), "Administration retires a group.");
  assert.ok(actionKeys("groups").includes("reactivate"), "Administration is where a group comes back.");
  assert.ok(actionKeys("myGroups").includes("retire"), "A Manager may end the group they run.");
  assert.ok(
    !actionKeys("myGroups").includes("reactivate"),
    "Reactivation is never offered where retired groups cannot appear.",
  );

  const retire = (resources.find((entry) => entry.resourceKey === "groups")?.actions ?? [])
    .find((action) => action.key === "retire");
  assert.equal(retire?.confirmation, "required", "Ending a group's service asks first.");
  assert.equal(retire?.intent, "destructive");

  for (const resourceKey of ["groups", "myGroups"]) {
    const fields = resources.find((entry) => entry.resourceKey === resourceKey)?.fields ?? [];
    assert.ok(
      fields.some((field) => field.key === "local"),
      `${resourceKey} says whether the row is Core-owned: a Directory group has no state to write here.`,
    );
  }
}

{
  const service = await readSource("plugins/runtime-modules/groups/services/table.tsx");
  assert.match(
    service,
    /JSON\.stringify\(\{ retired: request\.actionKey === "retire" \}\)/u,
    "Both actions write the same property; which one is the action's own name.",
  );
}

// ---------------------------------------------------------------------------
// One address for the resource
// ---------------------------------------------------------------------------

{
  const service = await readSource("plugins/runtime-modules/groups/services/table.tsx");
  assert.doesNotMatch(service, /api\/site\/admin\/groups/u,
    "Groups are read from one address; the scope says which question.");
  assert.match(service, /const SITE_SCOPE_PATH = `\$\{API_PATH\}\?scope=site&includeRetired=1`/u,
    "Administration asks for retired groups; every other caller gets the ones in service.");

  const options = await readSource("plugins/runtime-modules/groups/services/options.ts");
  assert.doesNotMatch(options, /includeRetired/u,
    "A retired group disappears from selection, so an options provider never asks for one.");

  const forms = await readSource("plugins/runtime-modules/groups/forms.ts");
  assert.doesNotMatch(forms, /api\/site\/admin\/groups/u);
}

console.log("Group contracts validated.");
