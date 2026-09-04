import {
  access,
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(packageRoot, "dist");
const sourceManifest = JSON.parse(
  await readFile(path.join(packageRoot, "package.json"), "utf8"),
);

function resolveRuntimeTarget(target) {
  return `./${target
    .replace(/^\.\//, "")
    .replace(/\.d\.ts$/, ".js")
    .replace(/\.(?:tsx?|jsx?)$/, ".js")}`;
}

function resolveTypesTarget(target) {
  const normalized = target.replace(/^\.\//, "");
  return `./${normalized.endsWith(".d.ts")
    ? normalized
    : normalized.replace(/\.(?:tsx?|jsx?)$/, ".d.ts")}`;
}

async function copyRuntimeCssAssets(sourceDirectory, targetDirectory) {
  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    const source = path.join(sourceDirectory, entry.name);
    const target = path.join(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyRuntimeCssAssets(source, target);
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      await mkdir(targetDirectory, { recursive: true });
      await copyFile(source, target);
    }
  }
}

const packageExports = Object.fromEntries(
  Object.entries(sourceManifest.exports).map(([exportKey, sourceTarget]) => {
    const runtimeTarget = resolveRuntimeTarget(
      sourceTarget.import ?? sourceTarget.default,
    );
    const typesTarget = resolveTypesTarget(
      sourceTarget.types ?? sourceTarget.import ?? sourceTarget.default,
    );

    return [
      exportKey,
      {
        types: typesTarget,
        import: runtimeTarget,
        default: runtimeTarget,
      },
    ];
  }),
);

const distManifest = {
  name: sourceManifest.name,
  version: sourceManifest.version,
  license: sourceManifest.license,
  type: "module",
  main: "./index.js",
  module: "./index.js",
  types: "./index.d.ts",
  exports: packageExports,
  files: ["**/*"],
  sideEffects: ["**/*.css"],
  peerDependencies: sourceManifest.peerDependencies,
  dependencies: sourceManifest.dependencies,
};

await copyFile(
  path.join(packageRoot, "index.js"),
  path.join(distDirectory, "index.js"),
);
await copyFile(
  path.join(packageRoot, "index.d.ts"),
  path.join(distDirectory, "index.d.ts"),
);
await copyFile(
  path.join(packageRoot, "README.md"),
  path.join(distDirectory, "README.md"),
);
// The terms travel with the artifact or they do not apply to it: whoever installs this from npm has
// the tarball and nothing else, and the repository they would otherwise have to go looking in is not
// part of what they received.
for (const legalFile of ["LICENSE", "NOTICE"]) {
  await copyFile(
    path.join(packageRoot, legalFile),
    path.join(distDirectory, legalFile),
  );
}
await cp(
  path.join(packageRoot, "styles"),
  path.join(distDirectory, "styles"),
  { recursive: true },
);
await copyRuntimeCssAssets(
  path.join(packageRoot, "components"),
  path.join(distDirectory, "components"),
);
await writeFile(
  path.join(distDirectory, "package.json"),
  `${JSON.stringify(distManifest, null, 2)}\n`,
);

for (const [exportKey, target] of Object.entries(packageExports)) {
  for (const condition of ["types", "import"]) {
    try {
      await access(path.resolve(distDirectory, target[condition]));
    } catch {
      throw new Error(
        `Built package export "${exportKey}" has no ${condition} target ` +
          `"${target[condition]}".`,
      );
    }
  }
}
