import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * Every shared form provider is paired with its implementation, by name and exactly once.
 *
 * A field type is two halves in two files: the descriptor says what it is and travels to the server
 * and the authoring catalogs, and the Control is browser code the registry holds. They used to be
 * joined by position -- `...PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS[10]` written beside the
 * number Control -- and a position is not a name. Inserting a field type into the middle of the
 * descriptor list re-paired every entry after it, registering each Control under its neighbour's key.
 *
 * Nothing caught that. Typecheck cannot: every descriptor has the same shape and `key` is a branded
 * string, not a literal, so all of them are interchangeable. The contract validators walk catalogs
 * rather than this file. The unit tests never reach it, because the suite is Node-only by design and
 * this is Client code that pulls in React and antd.
 *
 * So the check is here, and it is textual for the same reason the suite cannot host it. It asserts
 * what the repaired registry states: each provider is named by its key, no key is missing, none is
 * paired twice, and the positional spelling does not return.
 */
const repositoryRoot = process.cwd();

const REGISTRY_FILE = "components/forms/shared-form-provider-registry.tsx";
const CONTRACT_FILE = "components/forms/form-provider-contract.ts";

const PROVIDER_KINDS = [
  {
    label: "field type",
    keysConstant: "PHI_FORM_FIELD_PROVIDER_KEYS",
    helper: "phiSharedFieldType",
    descriptorsConstant: "PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS",
  },
  {
    label: "validation rule",
    keysConstant: "PHI_FORM_VALIDATION_PROVIDER_KEYS",
    helper: "phiSharedValidationRule",
    descriptorsConstant: "PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS",
  },
];

/** The member names of a `const X = { … } as const` object literal, in source order. */
function readConstantMembers(source, constantName) {
  const start = source.indexOf(`export const ${constantName} = {`);
  if (start === -1) throw new Error(`${CONTRACT_FILE} declares no ${constantName}.`);
  const end = source.indexOf("} as const;", start);
  if (end === -1) throw new Error(`${constantName} in ${CONTRACT_FILE} is not a closed const object.`);
  return [...source.slice(start, end).matchAll(/^\s{2}(\w+):/gmu)].map((match) => match[1]);
}

const contractSource = await readFile(path.join(repositoryRoot, CONTRACT_FILE), "utf8");
const registrySource = await readFile(path.join(repositoryRoot, REGISTRY_FILE), "utf8");

const failures = [];
let pairings = 0;

for (const kind of PROVIDER_KINDS) {
  const declared = readConstantMembers(contractSource, kind.keysConstant);
  const paired = [...registrySource.matchAll(
    new RegExp(`\\b${kind.helper}\\(${kind.keysConstant}\\.(\\w+)\\s*,`, "gu"),
  )].map((match) => match[1]);

  for (const name of declared) {
    const count = paired.filter((entry) => entry === name).length;
    if (count === 0) {
      failures.push(`${kind.keysConstant}.${name} is declared but no ${kind.label} in ${REGISTRY_FILE} renders it.`);
    } else if (count > 1) {
      failures.push(`${kind.keysConstant}.${name} is paired ${count} times in ${REGISTRY_FILE}; one key is one provider.`);
    }
  }
  for (const name of new Set(paired)) {
    if (!declared.includes(name)) {
      failures.push(`${REGISTRY_FILE} pairs ${kind.keysConstant}.${name}, which ${CONTRACT_FILE} does not declare.`);
    }
  }

  // The spelling this check exists to keep gone: a descriptor taken by position rather than by name.
  const positional = registrySource.match(new RegExp(`\\.\\.\\.${kind.descriptorsConstant}\\[`, "u"));
  if (positional) {
    failures.push(
      `${REGISTRY_FILE} takes a ${kind.label} descriptor by position (\`...${kind.descriptorsConstant}[…]\`). `
        + `Name it with ${kind.helper}(${kind.keysConstant}.…) instead: a position re-pairs silently when the list grows.`,
    );
  }

  pairings += paired.length;
}

if (failures.length > 0) {
  console.error(`Form provider registry validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Form provider registry valid (${pairings} shared providers paired with their implementation by key).`);
