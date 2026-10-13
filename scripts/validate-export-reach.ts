import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

import { repositoryRoot } from "./lib/repo-root.mjs";

/*
 * An `export` says somebody outside this file reads the name. Nothing else checked that it was true.
 *
 * A name may be exported when one of these holds:
 *
 * - it is public: reachable through `package.json#exports`, `export *` chains included -- the only way
 *   a Module package or a Site reaches this package;
 * - another file of this package imports it, by name, through `import *`, a dynamic `import()` or an
 *   `import("…")` type;
 * - it is a type the public surface names in a signature, transitively, so that a third party holding
 *   the public name can type what it passes and receives;
 * - it is a type named in the signature of something this file exports, public or not: publishing that
 *   function later must not mean finding its types one by one.
 *
 * Everything else was an `export` read by nobody, which is how AUDIT-2026-10-05 found 584 of them. Grep
 * cannot answer this (multi-line export blocks, `export *`), so the compiler does.
 *
 * Out of scope: `scripts/` (its `.mjs` readers are outside the program) and a config file's default
 * export, which its tool reads.
 */

const OUT_OF_SCOPE = (relative: string) => relative.startsWith("scripts/") || /^[^/]+\.config\.[cm]?ts$/u.test(relative);

/**
 * Exported, read by nobody, and kept on purpose until somebody decides whether they go.
 * Each is unused even inside its own file: dropping the `export` would make it dead code.
 */
const UNDECIDED = new Set([
  "components/controls/phi-button-types.ts#readPhiButtonType",
  "components/media/asset-collection-runtime.ts#usePhiAssetCollectionRuntime",
  "components/widgets/config/search-shared.ts#buildPhiSearchWidgetDefinition",
  "components/widgets/signals/command-toolbar-address.ts#createPhiCommandToolbarControlAddress",
  "plugins/runtime-modules/auth/overlay-ids.ts#isPhiAuthLoginOverlayArea",
  "plugins/runtime-modules/builder/controller/region-controller.ts#getBuilderRegionKey",
  "plugins/runtime-modules/builder/inspector-overlay-addresses.ts#PHI_BUILDER_INSPECTOR_DRAWER_OVERLAY_IDS",
  "plugins/runtime-modules/descriptor-compiler.ts#resolvePhiCmsRouteDescriptorByPageId",
]);

/**
 * Exported because another validator reads the text, `export` included:
 * `validate-area-client-reach.mjs` recognises a lazy Controller Client only as
 * `export const <name> = dynamic(() => import(...))`, and `validate-control-boundaries.mjs` reads the
 * Theme's own token vocabulary only as `export const PHI_THEME_OWN_TOKEN_KEYS = [...] as const;`.
 */
const EXPORTED_FOR_ANOTHER_RULE = new Set([
  "plugins/runtime-modules/revisions/client.ts#PhiLazyRevisionsRuntimeControllerClient",
  "theme/phi-theme-tokens.ts#PHI_THEME_OWN_TOKEN_KEYS",
]);

const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(repositoryRoot, "tsconfig.json"), ts.sys.readFile).config,
  ts.sys,
  repositoryRoot,
);
const program = ts.createProgram(config.fileNames, config.options);
const checker = program.getTypeChecker();
const isOwn = (file: ts.SourceFile) =>
  !file.isDeclarationFile && file.fileName.startsWith(`${repositoryRoot}/`) && !file.fileName.includes("/node_modules/");
const resolve = (symbol: ts.Symbol | undefined) =>
  symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

function addExportsOf(moduleSpecifier: ts.Node | undefined, into: Set<ts.Symbol>) {
  const moduleSymbol = moduleSpecifier && checker.getSymbolAtLocation(moduleSpecifier);
  if (!moduleSymbol) return;
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const resolved = resolve(exported);
    if (resolved) into.add(resolved);
  }
}

// Public: everything a door of package.json#exports carries.
const doors = new Set<string>();
const packageJson = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8")) as { exports: unknown };
(function collect(value: unknown) {
  if (typeof value === "string") doors.add(value);
  else if (value && typeof value === "object") Object.values(value).forEach(collect);
})(packageJson.exports);
const publicSymbols = new Set<ts.Symbol>();
for (const door of doors) {
  const file = program.getSourceFile(path.join(repositoryRoot, door));
  if (file) addExportsOf(file, publicSymbols);
}

// Read elsewhere: imported or re-exported by another file of the package.
const readElsewhere = new Set<ts.Symbol>();
const addSymbol = (node: ts.Node) => {
  const resolved = resolve(checker.getSymbolAtLocation(node));
  if (resolved) readElsewhere.add(resolved);
};
for (const file of program.getSourceFiles()) {
  if (!isOwn(file)) continue;
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const clause = node.importClause;
      if (clause.name) addSymbol(clause.name);
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) addExportsOf(node.moduleSpecifier, readElsewhere);
      if (bindings && ts.isNamedImports(bindings)) bindings.elements.forEach((element) => addSymbol(element.name));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (!node.exportClause || ts.isNamespaceExport(node.exportClause)) addExportsOf(node.moduleSpecifier, readElsewhere);
      else node.exportClause.elements.forEach((element) => addSymbol(element.name));
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      addExportsOf(node.arguments[0], readElsewhere);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      addExportsOf(node.argument.literal, readElsewhere);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

// Named in a signature: the types a signature mentions, followed through their own declarations.
function collectSignatureTypes(roots: Iterable<ts.Symbol>) {
  const found = new Set<ts.Symbol>();
  const queue: ts.Symbol[] = [];
  const visitFunction = (fn: ts.SignatureDeclaration) => {
    fn.typeParameters?.forEach(visit);
    fn.parameters.forEach((parameter) => parameter.type && visit(parameter.type));
    if (fn.type) visit(fn.type);
  };
  function visit(node: ts.Node): void {
    if (ts.isBlock(node)) return;
    if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node) || ts.isTypeQueryNode(node)) {
      const name = ts.isTypeReferenceNode(node) ? node.typeName : ts.isTypeQueryNode(node) ? node.exprName : node.expression;
      const symbol = resolve(checker.getSymbolAtLocation(
        ts.isQualifiedName(name) ? name.right : ts.isPropertyAccessExpression(name) ? name.name : name,
      ));
      if (symbol && !found.has(symbol) && !publicSymbols.has(symbol)) {
        found.add(symbol);
        queue.push(symbol);
      }
    }
    if (ts.isVariableDeclaration(node)) {
      if (node.type) visit(node.type);
      const initializer = node.initializer;
      if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) visitFunction(initializer);
      else if (initializer && (ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer))) visit(initializer.type);
      return;
    }
    if (ts.isFunctionLike(node)) {
      visitFunction(node);
      return;
    }
    ts.forEachChild(node, visit);
  }
  const visitDeclarations = (symbol: ts.Symbol) => {
    for (const declaration of symbol.declarations ?? []) {
      if (!declaration.getSourceFile().isDeclarationFile) visit(declaration);
    }
  };
  for (const root of roots) visitDeclarations(root);
  while (queue.length > 0) visitDeclarations(queue.shift()!);
  return found;
}
const publicSignatureTypes = collectSignatureTypes(publicSymbols);

const isKept = (symbol: ts.Symbol) =>
  publicSymbols.has(symbol) || readElsewhere.has(symbol) || publicSignatureTypes.has(symbol);
const exportsByFile = new Map<ts.SourceFile, { exported: ts.Symbol; resolved: ts.Symbol }[]>();
for (const file of program.getSourceFiles()) {
  const moduleSymbol = isOwn(file) ? checker.getSymbolAtLocation(file) : undefined;
  if (!moduleSymbol) continue;
  exportsByFile.set(file, checker.getExportsOfModule(moduleSymbol).flatMap((exported) => {
    const resolved = resolve(exported);
    return resolved?.declarations?.[0]?.getSourceFile() === file ? [{ exported, resolved }] : [];
  }));
}
// Paired: the types named, transitively, in the signature of any function, value or class that is kept.
const pairedTypes = collectSignatureTypes(
  [...exportsByFile.values()].flat()
    .map(({ resolved }) => resolved)
    .filter((symbol) => symbol.flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Variable | ts.SymbolFlags.Class) && isKept(symbol)),
);

const unread: string[] = [];
const staleUndecided = new Set(UNDECIDED);
for (const [file, exports] of exportsByFile) {
  const relative = path.relative(repositoryRoot, file.fileName);
  if (OUT_OF_SCOPE(relative)) continue;
  for (const { exported, resolved } of exports) {
    const declaration = resolved.declarations![0]!;
    if (isKept(resolved) || pairedTypes.has(resolved)) continue;
    const key = `${relative}#${exported.name}`;
    if (EXPORTED_FOR_ANOTHER_RULE.has(key)) continue;
    if (UNDECIDED.has(key)) {
      staleUndecided.delete(key);
      continue;
    }
    const { line } = file.getLineAndCharacterOfPosition(declaration.getStart());
    unread.push(`${relative}:${line + 1} ${exported.name}`);
  }
}

assert.deepEqual(
  unread.sort(),
  [],
  `These names are exported but neither public nor read by another file; drop the \`export\`:\n${unread.join("\n")}`,
);
assert.deepEqual(
  [...staleUndecided].sort(),
  [],
  `These UNDECIDED entries are read or gone now; take them out of the list:\n${[...staleUndecided].join("\n")}`,
);
