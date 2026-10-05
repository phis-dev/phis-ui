import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { repositoryRoot } from "./lib/repo-root.mjs";
import { listPhiPresetTreeFiles } from "./preset-tree-files";

/*
 * A Page that sends to a `demand` Controller must be the Page that mounts it.
 *
 * Three mount policies, three ways a Controller comes into being. `site` and `area` are mounted for the
 * scope they name, whether anything asks or not. `demand` is mounted by whoever needs it: a Page states it
 * in its tree's `controllerSettings`, or a Widget asks for it through a `conditionStateRequest` route --
 * and if nobody does, it does not exist.
 *
 * Wiring to one that nobody mounts fails in silence, which is why this is a validator and not a
 * convention. The signal bus holds an addressed signal until a listener answers for that address; with no
 * Controller there is no listener, so the Table's `actionActivate` was simply held. Nothing threw, nothing
 * logged, the rows drew correctly -- and the News dialogs never opened. It cost an afternoon to find,
 * because every visible part of the chain was right.
 *
 * The rule reads intent from the import: a preset tree that imports a Module's Controller address is
 * wiring something to it. What counts as mounting it is the tree's own `controllerSettings` naming that
 * Controller's type, or a Widget in it demanding the Controller through a route whose capability
 * materializes its receiver -- a `conditionStateRequest` (`types/runtime-condition.ts`), or the Auth step
 * Widget's `authWorkflowRequest` (`auth/widgets/auth-workflow/config.ts`), which is how the Auth
 * Controller arrives with the login Overlay's zones and on the sign-in Page.
 */

/** Route capabilities a Widget's `requiredRuntimeControllers` turns into a mount of the receiver. */
const PHI_CONTROLLER_DEMANDING_CAPABILITIES = new Map([
  ["conditionStateRequest", "types/runtime-condition.ts"],
  ["authWorkflowRequest", "plugins/runtime-modules/auth/widgets/auth-workflow/config.ts"],
]);


/* Each demanding capability is still read by a requirement resolver, or this list has gone stale. */
for (const [capability, resolverFile] of PHI_CONTROLLER_DEMANDING_CAPABILITIES) {
  const resolverSource = readFileSync(path.join(repositoryRoot, resolverFile), "utf8");
  assert.ok(
    resolverSource.includes(`"${capability}"`) && /ControllerRequirement/u.test(resolverSource),
    `${resolverFile} no longer turns a "${capability}" route into a Controller requirement.`,
  );
}

/* The premise: `area` is mounted by the resolver for the Area, `demand` is mounted by nobody. */
assert.match(
  readFileSync(path.join(repositoryRoot, "plugins/runtime-modules/resolver.ts"), "utf8"),
  /if \(definition\.controllerMountPolicy === "area"\)/u,
  "The resolver mounts a Controller for its Area only under the `area` policy; if that changes, this validator's rule changes with it.",
);

/** Controller type by the address module that exports it, for the Modules that mount on demand. */
const demandControllerTypesByAddressModule = new Map<string, { moduleId: string; controllerType: string }>();
for (const [moduleId, entry] of PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG) {
  const definition = entry.definition;
  if (definition.controllerMountPolicy !== "demand" || !definition.controllerType) continue;
  /* The Module's own directory, named by the last segment of its id -- `@phis/ui/modules/news` is `news`. */
  const addressModule = path.join(
    repositoryRoot,
    "plugins/runtime-modules",
    path.basename(moduleId),
    "controller/address",
  );
  demandControllerTypesByAddressModule.set(addressModule, {
    moduleId,
    controllerType: definition.controllerType,
  });
}
assert.ok(
  demandControllerTypesByAddressModule.size > 0,
  "No Module mounts its Controller on demand; this validator has nothing to read and is stale.",
);

/*
 * A tree and the node builders it imports from beside it, because that is where a placement is often
 * written: both Login trees take their Widgets from `phi-login-form-nodes.ts`, the step among them.
 */
function readTreeWithLocalBuilders(file: string, source: string) {
  const builders = [...source.matchAll(/from\s+"(\.\/[^"]+)"/gu)].flatMap((match) => {
    for (const extension of [".ts", ".tsx"]) {
      try {
        return [readFileSync(path.resolve(path.dirname(file), `${match[1]}${extension}`), "utf8")];
      } catch {
        continue;
      }
    }
    return [];
  });
  return [source, ...builders].join("\n");
}

const failures: string[] = [];
for (const file of listPhiPresetTreeFiles(repositoryRoot)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/from\s+"([^"]*\/controller\/address)"/gu)) {
    const resolved = path.resolve(path.dirname(file), match[1]!);
    const owner = demandControllerTypesByAddressModule.get(resolved);
    if (!owner) continue;

    /*
     * The type constant, as this file would have to name it to state a setting. Comparing the constant's
     * name rather than its value is right here: a `controllerSettings` entry is written in the tree, so
     * the name it is written under is what a reader and this check both see.
     */
    const typeConstant = /([A-Z0-9_]*CONTROLLER_TYPE)\b/u.exec(source)?.[1];
    const statesSetting = typeConstant != null &&
      new RegExp(`controllerSettings[\\s\\S]*?${typeConstant}`, "u").test(source);
    const placements = readTreeWithLocalBuilders(file, source);
    const demandsController = [...PHI_CONTROLLER_DEMANDING_CAPABILITIES.keys()]
      .some((capability) => placements.includes(capability));
    if (statesSetting || demandsController) continue;

    failures.push([
      `${path.relative(repositoryRoot, file)} wires signals to the "${owner.moduleId}" Controller,`,
      `which is mounted on demand and which nothing in this tree mounts.`,
      `State it in the tree's \`controllerSettings\` with \`mountScope: "page"\`,`,
      `or have a Widget demand it (${[...PHI_CONTROLLER_DEMANDING_CAPABILITIES.keys()].join(", ")}).`,
    ].join(" "));
  }
}

assert.deepEqual(failures, [], `\n${failures.join("\n")}\n`);

console.log(
  `validate-controller-mount-contracts: ${demandControllerTypesByAddressModule.size} demand-mounted Controllers, every preset wiring to one mounts it.`,
);
