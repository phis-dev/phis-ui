import { isPhiNpmPackageName } from "./package";

/**
 * The grammar every first-party and third-party identifier follows.
 *
 * ```text
 * <npm-package>/modules/<module>                       the module itself
 * <npm-package>/modules/<module>/<namespace>/<leaf>    anything the module owns
 * ```
 *
 * The `modules` marker is what makes the rest readable: without it, `@acme/status/options` could be a
 * module named `options` or a namespace under a nameless module, and nothing could tell which. A leaf
 * never repeats its module's name, because a module does not need to say its own name inside its own
 * namespace.
 *
 * A package that publishes an identifier without a module layer is still valid --
 * `<npm-package>/<namespace>/<leaf>` -- so a single-artifact package is not forced to invent one.
 */
export const PHI_MODULE_MARKER = "modules";

const SEGMENT_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

function isModuleSegment(value: string) {
  return SEGMENT_PATTERN.test(value);
}

/**
 * How many segments a leaf may have.
 *
 * `"segment"` is the default and what most namespaces want: one name, no structure. `"path"` exists
 * because Forms genuinely nest -- `forms/effects/appearance` groups three Forms that belong to one
 * inspector section -- and refusing that would rename working Form ids to buy nothing.
 */
export type PhiModuleLeafShape = "segment" | "path";

function isModuleLeaf(value: string, shape: PhiModuleLeafShape) {
  if (!value) {
    return false;
  }
  return shape === "path"
    ? value.split("/").every(isModuleSegment)
    : isModuleSegment(value);
}

export function createPhiRuntimeModuleId(packageName: string, moduleKey: string) {
  if (!isPhiNpmPackageName(packageName) || !isModuleSegment(moduleKey)) {
    throw new Error(`Invalid Phi runtime module id parts: ${packageName}/${moduleKey}.`);
  }
  return `${packageName}/${PHI_MODULE_MARKER}/${moduleKey}` as `${string}/${string}`;
}

export function isPhiRuntimeModuleId(value: unknown): value is `${string}/${string}` {
  if (typeof value !== "string") {
    return false;
  }
  const marker = value.indexOf(`/${PHI_MODULE_MARKER}/`);
  if (marker < 0) {
    return false;
  }
  const moduleKey = value.slice(marker + PHI_MODULE_MARKER.length + 2);
  return isPhiNpmPackageName(value.slice(0, marker)) && isModuleSegment(moduleKey);
}

/**
 * The namespace prefix a module's own artifacts share -- what a Widget or Layout definition declares
 * as its plugin key, and what a leaf is appended to.
 */
export function createPhiModuleNamespace<TNamespace extends string>(
  moduleId: string,
  namespace: TNamespace,
): `${string}/${TNamespace}` {
  if (!isPhiRuntimeModuleId(moduleId) || !isModuleSegment(namespace)) {
    throw new Error(`Invalid Phi module namespace parts: ${moduleId} / ${namespace}.`);
  }
  return `${moduleId}/${namespace}` as `${string}/${TNamespace}`;
}

export function createPhiModuleIdentifier<TNamespace extends string>(
  moduleId: string,
  namespace: TNamespace,
  leaf: string,
  leafShape: PhiModuleLeafShape = "path",
): `${string}/${TNamespace}/${string}` {
  if (!isModuleLeaf(leaf, leafShape)) {
    throw new Error(`Invalid Phi module identifier leaf: ${leaf}.`);
  }
  return `${createPhiModuleNamespace(moduleId, namespace)}/${leaf}` as `${string}/${TNamespace}/${string}`;
}

/**
 * Whether a value names something in `namespace`, first-party or not. The owner in front of the
 * namespace is either a bare package or a package followed by `/modules/<module>`.
 *
 * This is the reader for what the factories above write. Keeping them in one file is the point: a
 * grammar that is widened on the writing side alone turns stored data into rejected data.
 */
export function isPhiModuleScopedIdentifier(
  namespace: string,
  value: unknown,
  leafShape: PhiModuleLeafShape = "segment",
): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const marker = value.indexOf(`/${namespace}/`);
  if (marker < 0) {
    return false;
  }
  const leaf = value.slice(marker + namespace.length + 2);
  if (!isModuleLeaf(leaf, leafShape)) {
    return false;
  }
  const owner = value.slice(0, marker);
  return isPhiRuntimeModuleId(owner) || isPhiNpmPackageName(owner);
}
