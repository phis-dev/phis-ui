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

/*
 * What `tsc` does not emit but the emitted code still reaches: stylesheets it imports, and the pictures
 * it names through `new URL("./picture.jpg", import.meta.url)` -- a Theme ground's image, which the Site
 * build serves as a file of its own.
 */
const RUNTIME_FILE_ASSET_EXTENSIONS = [".css", ".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"];

async function copyRuntimeFileAssets(sourceDirectory, targetDirectory) {
  for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
    const source = path.join(sourceDirectory, entry.name);
    const target = path.join(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyRuntimeFileAssets(source, target);
    } else if (entry.isFile() && RUNTIME_FILE_ASSET_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      await mkdir(targetDirectory, { recursive: true });
      await copyFile(source, target);
    }
  }
}

/*
 * An export written as plain JavaScript (`.mjs`) is shipped as written: `tsc` neither emits nor declares
 * it. The render cache handler is one -- Next loads it by path at runtime, outside any bundler, so it
 * cannot be TypeScript.
 */
const plainJavaScriptExports = Object.entries(sourceManifest.exports)
  .filter(([, sourceTarget]) => (sourceTarget.import ?? sourceTarget.default).endsWith(".mjs"));

const packageExports = Object.fromEntries(
  Object.entries(sourceManifest.exports).map(([exportKey, sourceTarget]) => {
    const sourceRuntimeTarget = sourceTarget.import ?? sourceTarget.default;
    if (sourceRuntimeTarget.endsWith(".mjs")) {
      return [exportKey, { import: sourceRuntimeTarget, default: sourceRuntimeTarget }];
    }
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

/*
 * The tarball is packed from `dist`, which is not a workspace member, so a `workspace:` range there cannot
 * be resolved -- and a published manifest must not carry one anyway. It becomes the exact version of the
 * workspace package this build was made against, which is what `pnpm publish` would have written.
 */
async function resolveWorkspaceDependencies(dependencies) {
  const resolved = {};
  for (const [name, range] of Object.entries(dependencies ?? {})) {
    if (!range.startsWith("workspace:")) {
      resolved[name] = range;
      continue;
    }
    const installed = JSON.parse(
      await readFile(path.join(packageRoot, "node_modules", name, "package.json"), "utf8"),
    );
    resolved[name] = installed.version;
  }
  return resolved;
}

const distManifest = {
  name: sourceManifest.name,
  version: sourceManifest.version,
  license: sourceManifest.license,
  // A scoped package is restricted unless it says otherwise, and the tarball is what npm reads: the
  // workspace manifest never reaches the registry, so the answer has to travel with the artifact.
  publishConfig: sourceManifest.publishConfig,
  type: "module",
  main: "./index.js",
  module: "./index.js",
  types: "./index.d.ts",
  exports: packageExports,
  files: ["**/*"],
  sideEffects: ["**/*.css"],
  peerDependencies: sourceManifest.peerDependencies,
  dependencies: await resolveWorkspaceDependencies(sourceManifest.dependencies),
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
await copyRuntimeFileAssets(
  path.join(packageRoot, "components"),
  path.join(distDirectory, "components"),
);
await copyRuntimeFileAssets(
  path.join(packageRoot, "plugins"),
  path.join(distDirectory, "plugins"),
);
for (const [, sourceTarget] of plainJavaScriptExports) {
  const target = sourceTarget.import ?? sourceTarget.default;
  await mkdir(path.dirname(path.join(distDirectory, target)), { recursive: true });
  await copyFile(path.join(packageRoot, target), path.join(distDirectory, target));
}
await writeFile(
  path.join(distDirectory, "package.json"),
  `${JSON.stringify(distManifest, null, 2)}\n`,
);

for (const [exportKey, target] of Object.entries(packageExports)) {
  for (const condition of ["types", "import"].filter((key) => target[key] != null)) {
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
