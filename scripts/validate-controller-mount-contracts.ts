import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { PHI_ASSET_CONTROLLER_TYPE } from "../components/media/asset-controller-address";
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

const PHI_ASSET_CONTROLLER_ADDRESS_MODULE = "components/media/asset-controller-address";

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
  /*
   * The Asset Controller's address is not in its Module's folder: pickers in the Foundation, the Builder
   * and the Theme Module send to it, so it lives beside them (`components/media/asset-controller-address.ts`).
   * A tree importing it is wiring to that Controller all the same.
   */
  if (definition.controllerType === PHI_ASSET_CONTROLLER_TYPE) {
    demandControllerTypesByAddressModule.set(
      path.join(repositoryRoot, PHI_ASSET_CONTROLLER_ADDRESS_MODULE),
      { moduleId, controllerType: definition.controllerType },
    );
  }
}
assert.ok(
  demandControllerTypesByAddressModule.has(path.join(repositoryRoot, PHI_ASSET_CONTROLLER_ADDRESS_MODULE)),
  "The Asset Module no longer mounts its Controller on demand; the Asset rules of this validator are stale.",
);
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
  for (const match of source.matchAll(/from\s+"([^"]*\/(?:controller\/address|asset-controller-address))"/gu)) {
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

/*
 * A file that addresses the Asset Controller in code belongs to a Widget that asks for the Controller.
 *
 * The trees above are one way to send to a `demand` Controller. The other is a client file that builds
 * the routes itself, as the pickers of the authoring chrome did until 18.11.2026: the canvas' image tool
 * and mask picker, the Inspector's image fields and Backgrounds, the Theme's Logo and Background each
 * sent the Controller what they searched. No tree names such routes, so no tree can be asked whether it
 * mounts their receiver -- and the hosts stand in two scopes, the Inspector's Area Overlay and the Page
 * beside it, so every one of them asking would have mounted two Controllers behind one address. Those
 * pickers keep their own state and send the Controller nothing now.
 *
 * So the address has two readers, named here: the requirement a Widget declares
 * (`components/media/asset-controller-requirement.ts`) and the Asset Module, whose Media Page states the
 * Controller in its tree. Any other file that imports the address is wiring to the Controller in code.
 * It fails here unless it is in the table below, which names the Widget definition that draws it, and
 * that definition asks for the Controller. The table is empty because nothing does.
 */
const PHI_ASSET_CONTROLLER_ADDRESS_READERS = [
  "components/media/asset-controller-address.ts",
  "components/media/asset-controller-requirement.ts",
] as const;
const PHI_ASSET_CONTROLLER_CODE_HOSTS = new Map<string, string>([]);

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? [] : listSourceFiles(file);
    }
    return /\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name) ? [file] : [];
  });
}

const assetControllerAddressFiles = ["components", "plugins"]
  .flatMap((directory) => listSourceFiles(path.join(repositoryRoot, directory)))
  .map((file) => path.relative(repositoryRoot, file))
  .filter((file) =>
    !PHI_ASSET_CONTROLLER_ADDRESS_READERS.some((reader) => reader === file) &&
    !file.startsWith("plugins/runtime-modules/asset/"))
  .filter((file) => /from\s+"[^"]*\/asset-controller-address"/u.test(readFileSync(path.join(repositoryRoot, file), "utf8")));
for (const file of assetControllerAddressFiles) {
  const hostDefinition = PHI_ASSET_CONTROLLER_CODE_HOSTS.get(file);
  if (!hostDefinition) {
    failures.push(
      `${file} addresses the Asset Controller in code, which is mounted on demand, and no Widget is named ` +
      "as its host. A picker of the authoring chrome sends the Controller nothing; anything else declares " +
      "`requiredRuntimeControllers` on the Widget that draws it (components/media/asset-controller-requirement.ts) " +
      "and adds the pair to PHI_ASSET_CONTROLLER_CODE_HOSTS.",
    );
    continue;
  }
  if (!/requirePhiAssetController|resolvePhiAssetControllerRouteRequirements/u
    .test(readFileSync(path.join(repositoryRoot, hostDefinition), "utf8"))) {
    failures.push(
      `${hostDefinition} hosts ${file}, which addresses the Asset Controller, and does not ask for it ` +
      "(`requiredRuntimeControllers`, components/media/asset-controller-requirement.ts).",
    );
  }
}
for (const file of PHI_ASSET_CONTROLLER_CODE_HOSTS.keys()) {
  assert.ok(
    assetControllerAddressFiles.includes(file),
    `${file} no longer addresses the Asset Controller; take it out of PHI_ASSET_CONTROLLER_CODE_HOSTS.`,
  );
}

assert.deepEqual(failures, [], `\n${failures.join("\n")}\n`);

console.log(
  `validate-controller-mount-contracts: ${new Set([...demandControllerTypesByAddressModule.values()].map(({ controllerType }) => controllerType)).size} demand-mounted Controllers, every preset wiring to one mounts it; ` +
  `${assetControllerAddressFiles.length} files address the Asset Controller in code outside its Module.`,
);
