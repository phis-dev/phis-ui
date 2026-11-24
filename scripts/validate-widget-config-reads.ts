import path from "node:path";

import ts from "typescript";

import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import type { PhiCmsConfigField } from "../types/cms-plugins";
import { writtenConfigPaths } from "./lib/config-field-keys";
import { repositoryRoot } from "./lib/repo-root.mjs";
import { forEachDescendant } from "./lib/ts-ast";

/*
 * Every key a Widget's config offers is read where the Widget is drawn.
 *
 * A key is offered when the Inspector writes it (`fields`, a composite field by the keys it writes), when
 * a new placement starts with it (`defaultConfig`), or when `parseConfig` hands it on (a property of the
 * type it returns). The parser turns a stored value into a typed one, the canvas shows it, the Inspector
 * edits it -- and none of that is the page. `area-upload`'s `folderPath` was offered, parsed and shown on
 * the canvas and read by nothing that uploads (AUDIT-2026-10-19, section 5, point 5). Typecheck cannot
 * see it: an optional property nobody reads is not an error.
 *
 * So the compiler answers, per Widget:
 *
 * - Its render graph: the files its `loadRuntime`/`loadPreview` import and the other files of its folder,
 *   followed through value imports (static, dynamic, re-exports), and the Render Client every
 *   `PhiRuntimeModuleRenderClientHost` in it names, found by `type` in the Render Client manifests. Authoring adapters and canvas editors are not
 *   entered: a key only the canvas shows is the finding. Nor are the parsers: the functions a
 *   `parseConfig` names and those they call.
 * - A read: a property access, an element access with a literal key, a destructuring or an `in` test, in
 *   that graph, resolved by the checker to the property's declaration. A config typed by the same type, or
 *   one picked from it, is followed by that alone.
 * - A hand-off: a config passed on whole (`config={config}`, a helper's argument, `{ config }`) or spread
 *   (`{...config}`, `<Control {...config} />`) into a target typed by declarations of its own -- a
 *   component's props, a helper's parameter, a Render Client's props -- links each key to the target's
 *   property of the same name, which then has to be read. A key spread into an open record (an index
 *   signature with no property of that name) cannot be followed and counts as read.
 *
 * The block envelope (`PhiRenderableBlockBase`: visibility, size, surface, ...) is the block renderer's
 * and not checked here. Three lists name the rest, each entry with its reason, and all shrink with the
 * code: an entry whose key is read now, or that the Widget no longer offers, fails as well.
 *
 * `--explain <typeKey>.<key>[,...]` prints the way a key is read, hand-off by hand-off.
 */

/** Read, but not where this check can see it: by a name computed at run time, or by a reader of every config. */
const READ_ELSEWHERE: Readonly<Record<string, string>> = {
  "quick-links.textSource":
    "server-helpers/cms-widget-texts.ts reads every Widget's stored textSource to choose the translation store",
  "result.textSource":
    "server-helpers/cms-widget-texts.ts reads every Widget's stored textSource to choose the translation store",
};

/*
 * Parsed and read by nothing, found when this check was written (2026-11-21) and waiting for the
 * operator's decision -- read each one or remove it (TODOS.md, "Widget config keys nothing renders
 * reads"). Empty is the normal state; nothing is added here to make a new key pass.
 */
const UNDECIDED: Readonly<Record<string, string>> = {};

/*
 * Offered and parsed on purpose, read by nothing yet: a key the operator keeps for a use that is decided
 * and not built. Each names that use; an entry is removed when the key is read.
 */
const STACK_CHOICE_PREPARED =
  "prepared for the stack choice Controls' presentation variants (operator, 2026-11-24); drawn by none of them yet";
const PREPARED: Readonly<Record<string, string>> = {
  "segmented.description": STACK_CHOICE_PREPARED,
  "segmented.presentation": STACK_CHOICE_PREPARED,
  "steps.description": STACK_CHOICE_PREPARED,
  "tab-bar.label": STACK_CHOICE_PREPARED,
  "tab-bar.description": STACK_CHOICE_PREPARED,
  "tab-bar.presentation": STACK_CHOICE_PREPARED,
};
const LISTED: ReadonlyMap<string, string> = new Map([
  ...Object.keys(READ_ELSEWHERE).map((entry) => [entry, "READ_ELSEWHERE"] as const),
  ...Object.keys(UNDECIDED).map((entry) => [entry, "UNDECIDED"] as const),
  ...Object.keys(PREPARED).map((entry) => [entry, "PREPARED"] as const),
]);
const offeredEntries = new Set<string>();

const explainIndex = process.argv.indexOf("--explain");
const explain = new Set(explainIndex >= 0 ? (process.argv[explainIndex + 1] ?? "").split(",") : []);

const tsconfig = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(repositoryRoot, "tsconfig.json"), ts.sys.readFile).config,
  ts.sys,
  repositoryRoot,
);
const program = ts.createProgram(tsconfig.fileNames, tsconfig.options);
const checker = program.getTypeChecker();
const relative = (fileName: string) => path.relative(repositoryRoot, fileName);
const isOwn = (file: ts.SourceFile) =>
  !file.isDeclarationFile && file.fileName.startsWith(`${repositoryRoot}/`) && !file.fileName.includes("/node_modules/");
const problems: string[] = [];

// --- Files and imports ------------------------------------------------------------------------------

/** An authoring adapter or a canvas editor: what it reads is the Builder's, not the page's. */
function isAuthoringFile(file: ts.SourceFile): boolean {
  const relativePath = relative(file.fileName);
  const base = path.basename(relativePath).replace(/\.[cm]?[jt]sx?$/u, "");
  if (/(?:^|[-.])authoring(?:[-.]|$)/u.test(base)) return true;
  return /\/widgets\/[^/]+\//u.test(relativePath) && /(?:^|-)editor$/u.test(base);
}

function aliasTarget(symbol: ts.Symbol | undefined): ts.Symbol | undefined {
  return symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isSatisfiesExpression(current) || ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function resolveImport(specifier: string, from: ts.SourceFile): ts.SourceFile | undefined {
  const resolved = ts.resolveModuleName(specifier, from.fileName, tsconfig.options, ts.sys).resolvedModule;
  const file = resolved && program.getSourceFile(resolved.resolvedFileName);
  return file && isOwn(file) ? file : undefined;
}

function dynamicImportsIn(node: ts.Node, from: ts.SourceFile): ts.SourceFile[] {
  const files: ts.SourceFile[] = [];
  forEachDescendant(node, (candidate) => {
    if (
      ts.isCallExpression(candidate) &&
      candidate.expression.kind === ts.SyntaxKind.ImportKeyword &&
      candidate.arguments[0] &&
      ts.isStringLiteralLike(candidate.arguments[0])
    ) {
      const file = resolveImport(candidate.arguments[0].text, from);
      if (file) files.push(file);
    }
  });
  return files;
}

const valueImportCache = new Map<ts.SourceFile, ts.SourceFile[]>();
/** The files a file loads at run time: value imports, re-exports and `import()`, not `import type`. */
function valueImportsOf(file: ts.SourceFile): ts.SourceFile[] {
  const cached = valueImportCache.get(file);
  if (cached) return cached;
  const files: ts.SourceFile[] = [];
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && !statement.importClause?.isTypeOnly) {
      const target = resolveImport((statement.moduleSpecifier as ts.StringLiteral).text, file);
      if (target) files.push(target);
    } else if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.moduleSpecifier &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      const target = resolveImport(statement.moduleSpecifier.text, file);
      if (target) files.push(target);
    }
  }
  files.push(...dynamicImportsIn(file, file));
  valueImportCache.set(file, files);
  return files;
}

// --- The registered Widgets ---------------------------------------------------------------------------

type WidgetSource = {
  definitionFile: ts.SourceFile;
  parsedType: ts.Type;
  roots: ts.SourceFile[];
  where: string;
};

/** The string literals a `typeKey` can be: one, or a union of them (`spec.typeKey` of an `as const` list). */
function literalValues(type: ts.Type): string[] | null {
  const members = type.isUnion() ? type.types : [type];
  const values = members.map((member) => (member.isStringLiteral() ? member.value : null));
  return values.every((value): value is string => value !== null) ? values : null;
}

/**
 * The typeKeys a registered definition stands for, read from its declaration: the definition object's
 * own `typeKey`, or the `typeKey` handed to the factory that builds it. `null` when neither is a literal.
 */
function typeKeysOf(definition: ts.Expression): string[] | null {
  const typeKeySymbol = checker.getTypeAtLocation(definition).getProperty("typeKey");
  const own = typeKeySymbol && literalValues(checker.getTypeOfSymbolAtLocation(typeKeySymbol, definition));
  if (own) return own;
  const declaration = aliasTarget(checker.getSymbolAtLocation(definition))?.valueDeclaration;
  if (!declaration || !ts.isVariableDeclaration(declaration) || !declaration.initializer) return null;
  const initializer = unwrapExpression(declaration.initializer);
  const objectLiteral = ts.isObjectLiteralExpression(initializer)
    ? initializer
    : ts.isCallExpression(initializer) && initializer.arguments[0] && ts.isObjectLiteralExpression(initializer.arguments[0])
      ? initializer.arguments[0]
      : undefined;
  const typeKeyProperty = objectLiteral?.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === "typeKey",
  );
  return typeKeyProperty ? literalValues(checker.getTypeAtLocation(typeKeyProperty.initializer)) : null;
}

type RegisteredCall = WidgetSource & { typeKeys: string[] | null };
const registeredCallsByRegister = new Map<string, RegisteredCall[]>();

for (const file of program.getSourceFiles()) {
  if (!isOwn(file) || !/^plugins\/runtime-modules\/[^/]+\/widgets\.ts$/u.test(relative(file.fileName))) continue;
  forEachDescendant(file, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    if (node.expression.text !== "definePhiFirstPartyWidget") return;
    const argument = node.arguments[0];
    if (!argument || !ts.isObjectLiteralExpression(argument)) return;
    const where = `${relative(file.fileName)}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`;
    const roots: ts.SourceFile[] = [];
    let definitionExpression: ts.Expression | undefined;
    for (const property of argument.properties) {
      const name = property.name && ts.isIdentifier(property.name) ? property.name.text : undefined;
      if (name === "loadRuntime" || name === "loadPreview") roots.push(...dynamicImportsIn(property, file));
      if (name === "definition") {
        definitionExpression = ts.isPropertyAssignment(property)
          ? property.initializer
          : ts.isShorthandPropertyAssignment(property) ? property.name : undefined;
      }
    }
    const parseSymbol = definitionExpression && checker.getTypeAtLocation(definitionExpression).getProperty("parseConfig");
    const parseType = parseSymbol && checker.getTypeOfSymbolAtLocation(parseSymbol, definitionExpression!);
    const parseSignature = parseType && checker.getNonNullableType(parseType).getCallSignatures()[0];
    const declaration =
      definitionExpression && aliasTarget(checker.getSymbolAtLocation(definitionExpression))?.valueDeclaration;
    if (!definitionExpression || !parseSignature || !declaration) {
      problems.push(`${where}: the registered definition has no parseConfig this check can read.`);
      return;
    }
    const calls = registeredCallsByRegister.get(file.fileName) ?? [];
    calls.push({
      where,
      roots,
      typeKeys: typeKeysOf(definitionExpression),
      definitionFile: declaration.getSourceFile(),
      parsedType: checker.getNonNullableType(parseSignature.getReturnType()),
    });
    registeredCallsByRegister.set(file.fileName, calls);
  });
}

/*
 * A definition built by a factory from a list (the Builder's Inspector sections) names no literal
 * typeKey in its declaration. The register itself, loaded, says which typeKeys it holds; the ones no
 * other call of that register claims belong to its one such call. Two such calls in one register are
 * refused rather than guessed.
 */
const widgetSources = new Map<string, WidgetSource>();
for (const [registerFile, calls] of registeredCallsByRegister) {
  const register = (await import(registerFile)) as {
    PHI_RUNTIME_MODULE_WIDGETS?: readonly { definition: { typeKey: string } }[];
  };
  const registered = (register.PHI_RUNTIME_MODULE_WIDGETS ?? []).map((widget) => widget.definition.typeKey);
  const claimed = new Set(calls.flatMap((call) => call.typeKeys ?? []));
  const unresolved = calls.filter((call) => call.typeKeys === null);
  if (unresolved.length > 1) {
    problems.push(
      `${relative(registerFile)}: ${unresolved.length} registered definitions name no literal typeKey ` +
        `(${unresolved.map((call) => call.where).join(", ")}); give each a literal typeKey.`,
    );
    continue;
  }
  if (unresolved[0]) unresolved[0].typeKeys = registered.filter((typeKey) => !claimed.has(typeKey));
  for (const { typeKeys, ...source } of calls) {
    for (const typeKey of typeKeys ?? []) widgetSources.set(typeKey, source);
  }
}

// --- Render Client manifests -------------------------------------------------------------------------

const HOST_COMPONENT = "PhiRuntimeModuleRenderClientHost";
type HostKey = ts.Symbol | string;

/** What a `type` names: a literal, or the constant it is, through `const` aliases and both arms of a `?:`. */
function hostKeysOf(expression: ts.Expression, depth = 0): HostKey[] {
  const node = unwrapExpression(expression);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isConditionalExpression(node)) return [...hostKeysOf(node.whenTrue, depth), ...hostKeysOf(node.whenFalse, depth)];
  const symbol = aliasTarget(checker.getSymbolAtLocation(ts.isPropertyAccessExpression(node) ? node.name : node));
  if (!symbol) return [];
  const declaration = symbol.valueDeclaration;
  if (
    depth < 4 &&
    declaration &&
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer &&
    !ts.isCallExpression(unwrapExpression(declaration.initializer)) &&
    ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.Const
  ) {
    return hostKeysOf(declaration.initializer, depth + 1);
  }
  return [symbol];
}

/*
 * Every `[type, dynamic(() => import("...").then((module) => module.Client))]` pair, wherever the list is
 * written: in a manifest call or in a constant a manifest spreads in. The Client is the last
 * `module.Name` read in the loader; its first parameter is what `componentProps` arrives as.
 */
type RenderClient = { file: ts.SourceFile; props: ts.Type };
const renderClientsByKey = new Map<HostKey, RenderClient[]>();
for (const file of program.getSourceFiles()) {
  if (!isOwn(file) || isAuthoringFile(file)) continue;
  forEachDescendant(file, (entry) => {
    if (!ts.isArrayLiteralExpression(entry) || entry.elements.length !== 2) return;
    const [keyExpression, loader] = entry.elements as unknown as [ts.Expression, ts.Expression];
    if (ts.isSpreadElement(keyExpression)) return;
    const [clientFile] = dynamicImportsIn(loader, file);
    if (!clientFile) return;
    let client: ts.Expression | undefined;
    forEachDescendant(loader, (candidate) => {
      if (ts.isPropertyAccessExpression(candidate) && ts.isIdentifier(candidate.expression)) client = candidate;
    });
    const signature = client && checker.getTypeAtLocation(client).getCallSignatures()[0];
    const props = signature?.parameters[0] && checker.getTypeOfSymbolAtLocation(signature.parameters[0], client!);
    if (!props) return;
    for (const key of hostKeysOf(keyExpression)) {
      renderClientsByKey.set(key, [...(renderClientsByKey.get(key) ?? []), { file: clientFile, props }]);
    }
  });
}

function jsxAttribute(element: ts.JsxSelfClosingElement | ts.JsxOpeningElement, name: string) {
  const attribute = element.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name,
  );
  return attribute?.initializer && ts.isJsxExpression(attribute.initializer) ? attribute.initializer.expression : undefined;
}

/** The Render Clients a host mounts; `null` when its `type` names one no manifest holds. */
function hostClients(element: ts.JsxSelfClosingElement | ts.JsxOpeningElement): RenderClient[] | null {
  const type = jsxAttribute(element, "type");
  const keys = type ? hostKeysOf(type) : [];
  if (keys.length === 0 || keys.some((key) => !renderClientsByKey.has(key))) return null;
  return keys.flatMap((key) => renderClientsByKey.get(key)!);
}

function isHost(node: ts.Node): node is ts.JsxSelfClosingElement | ts.JsxOpeningElement {
  return (
    (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
    ts.isIdentifier(node.tagName) &&
    node.tagName.text === HOST_COMPONENT
  );
}

// --- Render graphs --------------------------------------------------------------------------------------

const hostClientFilesCache = new Map<ts.SourceFile, ts.SourceFile[]>();
function hostClientFilesIn(file: ts.SourceFile): ts.SourceFile[] {
  const cached = hostClientFilesCache.get(file);
  if (cached) return cached;
  const files: ts.SourceFile[] = [];
  forEachDescendant(file, (node) => {
    if (isHost(node)) files.push(...(hostClients(node) ?? []).map((client) => client.file));
  });
  hostClientFilesCache.set(file, files);
  return files;
}

/** A Widget's render graph: its plugin's imports and the Render Clients its hosts mount, transitively. */
function renderGraphOf(roots: readonly ts.SourceFile[]): Set<ts.SourceFile> {
  const graph = new Set<ts.SourceFile>();
  const pending = [...roots];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (graph.has(file) || isAuthoringFile(file)) continue;
    graph.add(file);
    pending.push(...valueImportsOf(file), ...hostClientFilesIn(file));
  }
  return graph;
}

/*
 * The Widget's own folder is part of its render graph too: a host whose `type` is built at run time
 * (`buildPhiCmsWidgetNamespacedTypeKey(...)`) names no manifest entry this check can match, and its
 * Client is the folder's `client.tsx`.
 */
function widgetFolderFiles(roots: readonly ts.SourceFile[]): ts.SourceFile[] {
  const folders = new Set(
    roots.map((root) => path.dirname(root.fileName)).filter((folder) => /\/widgets\/[^/]+$/u.test(folder)),
  );
  return program
    .getSourceFiles()
    .filter((file) => folders.has(path.dirname(file.fileName)) && isOwn(file) && !/\.test\.tsx?$/u.test(file.fileName));
}

const graphs = new Map<string, Set<ts.SourceFile>>();
const visited = new Set<ts.SourceFile>();
for (const [typeKey, source] of widgetSources) {
  const graph = renderGraphOf([...source.roots, ...widgetFolderFiles(source.roots)]);
  graphs.set(typeKey, graph);
  graph.forEach((file) => visited.add(file));
}

// --- Reads and hand-offs ------------------------------------------------------------------------------

/** The declarations behind a property symbol, through unions, intersections, mapped and generic types. */
function declarationsOf(symbol: ts.Symbol): ts.Declaration[] {
  return checker.getRootSymbols(symbol).flatMap((root) => root.getDeclarations() ?? []);
}

/** Where each declaration is read, and where a key is handed on to another declaration -- first node per file. */
const reads = new Map<ts.Declaration, Map<ts.SourceFile, ts.Node>>();
const handOffs = new Map<ts.Declaration, Map<ts.Declaration, Map<ts.SourceFile, ts.Node>>>();
let visiting: ts.Node | undefined;

function noteAt<T>(map: Map<T, Map<ts.SourceFile, ts.Node>>, key: T) {
  const byFile = map.get(key) ?? new Map<ts.SourceFile, ts.Node>();
  const file = visiting!.getSourceFile();
  if (!byFile.has(file)) byFile.set(file, visiting!);
  map.set(key, byFile);
}

function markRead(symbol: ts.Symbol | undefined) {
  if (symbol) declarationsOf(symbol).forEach((declaration) => noteAt(reads, declaration));
}

function propertiesOfType(type: ts.Type): ts.Symbol[] {
  const members = type.isUnion() ? type.types : [type];
  return members.flatMap((member) => checker.getPropertiesOfType(checker.getApparentType(member)));
}

function propertyOfType(type: ts.Type, name: string): ts.Symbol | undefined {
  return checker.getPropertyOfType(checker.getApparentType(checker.getNonNullableType(type)), name);
}

function takesAnyKey(type: ts.Type): boolean {
  const members = type.isUnion() ? type.types : [type];
  return members.some(
    (member) =>
      Boolean(member.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) ||
      checker.getIndexInfosOfType(checker.getApparentType(member)).length > 0,
  );
}

function isObjectLike(type: ts.Type): boolean {
  return Boolean(type.flags & ts.TypeFlags.Object) || type.isUnionOrIntersection();
}

/**
 * `source`'s keys travel on into `target`: each to the target's property of the same name. A key the
 * target has no property for is dropped there -- or, when `openReads` and the target takes any key, it
 * cannot be followed and counts as read.
 */
function handOn(source: ts.Type, target: ts.Type, openReads: boolean) {
  const open = takesAnyKey(target);
  for (const property of propertiesOfType(source)) {
    const received = propertyOfType(target, property.name);
    if (!received) {
      if (open && openReads) markRead(property);
      continue;
    }
    if (received === property) continue;
    const receivedDeclarations = declarationsOf(received);
    for (const declaration of declarationsOf(property)) {
      const targets = handOffs.get(declaration) ?? new Map<ts.Declaration, Map<ts.SourceFile, ts.Node>>();
      for (const receivedDeclaration of receivedDeclarations) {
        if (receivedDeclaration !== declaration) noteAt(targets, receivedDeclaration);
      }
      handOffs.set(declaration, targets);
    }
  }
}

/** `{...config}`, `<Control {...config} />`: into a target, or -- with no target -- into a plain object. */
function followSpread(spread: ts.Expression, target: ts.Type | undefined) {
  const source = checker.getNonNullableType(checker.getTypeAtLocation(spread));
  if (!target || target.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    propertiesOfType(source).forEach(markRead);
    return;
  }
  handOn(source, checker.getNonNullableType(target), true);
}

/** A config handed on whole: `config={config}`, `render(config)`, `{ config }`. `isPhiRecord(config)` reads no key. */
function followValue(expression: ts.Expression, target: ts.Type | undefined) {
  const node = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(node) || !target || target.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return;
  const source = checker.getNonNullableType(checker.getTypeAtLocation(node));
  if (isObjectLike(source)) handOn(source, checker.getNonNullableType(target), false);
}

/*
 * `componentProps` is an open record; what it carries arrives as the Render Client's props. A whole
 * value whose slot in the Client is open (`config: Record<string, unknown>`) hands every key it has on.
 */
const followedByHost = new Set<ts.Node>();
function handToClient(expression: ts.Expression, target: ts.Type) {
  const node = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      followedByHost.add(property);
      if (ts.isSpreadAssignment(property)) {
        followSpread(property.expression, target);
      } else if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
        const name = ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name) ? property.name.text : undefined;
        const received = name ? propertyOfType(target, name) : undefined;
        const value = ts.isPropertyAssignment(property) ? property.initializer : property.name;
        if (received) handToClient(value, checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(received, value)));
      }
    }
    return;
  }
  const source = checker.getNonNullableType(checker.getTypeAtLocation(node));
  if (isObjectLike(source)) handOn(source, target, true);
}

/*
 * The parsers: every function a `parseConfig` of a definition file names, and every function of this
 * package those call, transitively. What they read is the stored config, not the page; a render helper
 * beside them in the same file (`resolvePhiSimpleTextWidgetText`) is not one of them.
 */
function functionOf(expression: ts.Expression): ts.FunctionLikeDeclaration | undefined {
  const node = unwrapExpression(expression);
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return node;
  const declaration = aliasTarget(checker.getSymbolAtLocation(node))?.valueDeclaration;
  if (!declaration || !isOwn(declaration.getSourceFile())) return undefined;
  if (ts.isFunctionDeclaration(declaration)) return declaration;
  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    const initializer = unwrapExpression(declaration.initializer);
    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return initializer;
  }
  return undefined;
}
const parserFunctions = new Set<ts.Node>();
const pendingParsers: ts.FunctionLikeDeclaration[] = [];
for (const file of new Set([...widgetSources.values()].map((source) => source.definitionFile))) {
  forEachDescendant(file, (node) => {
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "parseConfig") {
      const parser = functionOf(node.initializer);
      if (parser) pendingParsers.push(parser);
    }
  });
}
while (pendingParsers.length > 0) {
  const parser = pendingParsers.pop()!;
  if (parserFunctions.has(parser)) continue;
  parserFunctions.add(parser);
  forEachDescendant(parser, (node) => {
    const callee = ts.isCallExpression(node) ? functionOf(node.expression) : undefined;
    if (callee) pendingParsers.push(callee);
  });
}

function visitOutsideParsers(node: ts.Node, visit: (node: ts.Node) => void) {
  if (parserFunctions.has(node)) return;
  visit(node);
  ts.forEachChild(node, (child) => visitOutsideParsers(child, visit));
}

for (const file of visited) {
  visitOutsideParsers(file, (node) => {
    visiting = node;
    if (isHost(node)) {
      const props = jsxAttribute(node, "componentProps");
      for (const client of (props && hostClients(node)) ?? []) handToClient(props!, client.props);
    } else if (ts.isPropertyAccessExpression(node)) {
      const parent = node.parent;
      const isPlainWrite =
        ts.isBinaryExpression(parent) && parent.left === node && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
      if (!isPlainWrite) markRead(checker.getSymbolAtLocation(node.name));
    } else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      markRead(propertyOfType(checker.getTypeAtLocation(node.expression), node.argumentExpression.text));
    } else if (ts.isObjectBindingPattern(node)) {
      // A rest element keeps the remaining keys' own symbols; what reads the rest reads them.
      const patternType = checker.getTypeAtLocation(node);
      for (const element of node.elements) {
        const name = element.propertyName ?? element.name;
        const key = !element.dotDotDotToken && (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) ? name.text : undefined;
        if (key) markRead(propertyOfType(patternType, key));
      }
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.InKeyword &&
      ts.isStringLiteralLike(node.left)
    ) {
      markRead(propertyOfType(checker.getTypeAtLocation(node.right), node.left.text));
    } else if (followedByHost.has(node)) {
      // Handed to a Render Client above.
    } else if (ts.isSpreadAssignment(node)) {
      // Without a contextual type the literal keeps the spread keys' own symbols, so reads of it resolve.
      const target = checker.getContextualType(node.parent);
      if (target) followSpread(node.expression, target);
    } else if (ts.isJsxSpreadAttribute(node)) {
      followSpread(node.expression, checker.getContextualType(node.parent));
    } else if (ts.isJsxAttribute(node) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      followValue(node.initializer.expression, checker.getContextualType(node.initializer.expression));
    } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      for (const argument of node.arguments ?? []) {
        if (!ts.isSpreadElement(argument)) followValue(argument, checker.getContextualType(argument));
      }
    } else if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.parent)) {
      followValue(node.initializer, checker.getContextualType(node.initializer));
    } else if (ts.isShorthandPropertyAssignment(node)) {
      const literalTarget = checker.getContextualType(node.parent);
      const received = literalTarget ? propertyOfType(literalTarget, node.name.text) : undefined;
      if (received) followValue(node.name, checker.getTypeOfSymbolAtLocation(received, node.name));
    } else if (ts.isVariableDeclaration(node) && node.type && node.initializer) {
      followValue(node.initializer, checker.getTypeFromTypeNode(node.type));
    } else if (ts.isReturnStatement(node) && node.expression) {
      followValue(node.expression, checker.getContextualType(node.expression));
    }
  });
}

/** The way a declaration is read inside `graph`: the hand-offs on the way, then the read. `null` when unread. */
function readPath(declaration: ts.Declaration, graph: Set<ts.SourceFile>, seen = new Set<ts.Declaration>()): ts.Node[] | null {
  for (const [file, node] of reads.get(declaration) ?? []) {
    if (graph.has(file)) return [node];
  }
  if (seen.has(declaration)) return null;
  seen.add(declaration);
  for (const [target, at] of handOffs.get(declaration) ?? []) {
    for (const [file, node] of at) {
      if (!graph.has(file)) continue;
      const rest = readPath(target, graph, seen);
      if (rest) return [node, ...rest];
      break;
    }
  }
  return null;
}

function locate(node: ts.Node): string {
  const file = node.getSourceFile();
  return `${relative(file.fileName)}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`;
}

// --- The check ----------------------------------------------------------------------------------------

const envelopeFile = program.getSourceFile(path.join(repositoryRoot, "types/renderable-block.ts"));
const envelopeSymbol =
  envelopeFile &&
  checker.getExportsOfModule(checker.getSymbolAtLocation(envelopeFile)!).find((symbol) => symbol.name === "PhiRenderableBlockBase");
if (!envelopeSymbol) throw new Error("types/renderable-block.ts exports no PhiRenderableBlockBase.");
const envelopeDeclarations = new Set(
  checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(envelopeSymbol)).flatMap((property) => declarationsOf(property)),
);

type CatalogWidget = { typeKey: string; fields?: readonly PhiCmsConfigField[]; defaultConfig?: Record<string, unknown> };
const catalogWidgets = new Map<string, CatalogWidget>();
for (const entry of PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()) {
  for (const widget of entry.widgets) catalogWidgets.set(widget.definition.typeKey, widget.definition as CatalogWidget);
}
for (const typeKey of catalogWidgets.keys()) {
  if (!widgetSources.has(typeKey)) {
    problems.push(`${typeKey}: in the first-party catalog, but no widgets.ts registers it with definePhiFirstPartyWidget.`);
  }
}

for (const [typeKey, source] of widgetSources) {
  const widget = catalogWidgets.get(typeKey);
  if (!widget) {
    problems.push(`${source.where}: registers "${typeKey}", which the first-party catalog does not hold.`);
    continue;
  }
  const offered = new Map<string, string>();
  for (const field of widget.fields ?? []) {
    for (const written of writtenConfigPaths(field)) offered.set(written.split(".")[0]!, "an Inspector field");
  }
  for (const key of Object.keys(widget.defaultConfig ?? {})) {
    if (!offered.has(key)) offered.set(key, "defaultConfig");
  }
  for (const property of propertiesOfType(source.parsedType)) {
    if (!offered.has(property.name)) offered.set(property.name, "parseConfig");
  }

  const graph = graphs.get(typeKey)!;
  const definitionFile = relative(source.definitionFile.fileName);
  for (const [key, origin] of offered) {
    const entry = `${typeKey}.${key}`;
    offeredEntries.add(entry);
    const property = propertyOfType(source.parsedType, key);
    if (!property) {
      problems.push(
        `${typeKey}.${key}: written by ${origin}, but parseConfig (${definitionFile}) does not return it, so the ` +
          "page never sees it. Parse it and read it where the Widget is drawn, or remove the field.",
      );
      continue;
    }
    const declarations = declarationsOf(property);
    if (declarations.some((declaration) => envelopeDeclarations.has(declaration))) continue;
    const path = declarations.map((declaration) => readPath(declaration, graph)).find(Boolean) ?? null;
    if (explain.has(entry)) {
      console.log(`${entry} ${path ? `is read: ${path.map(locate).join(" -> ")}` : "is read by nothing the Widget renders."}`);
    }
    const list = LISTED.get(entry);
    if (path && list) {
      problems.push(`${entry}: listed in ${list}, but the Widget's render graph reads it now; remove the entry.`);
    } else if (!path && !list) {
      problems.push(
        `${entry}: offered by ${origin} and parsed in ${definitionFile}, but nothing the Widget renders reads ` +
          "it -- only the parser, the canvas or the Inspector do. Read it in the Widget's server or client half " +
          "(or the component it hands the config to), or remove it from fields, defaultConfig and the config " +
          "type. Only a key read by a name computed at run time goes into READ_ELSEWHERE in " +
          "scripts/validate-widget-config-reads.ts, with its reason.",
      );
    }
  }
}
for (const [entry, list] of LISTED) {
  if (!offeredEntries.has(entry)) {
    problems.push(`${entry}: listed in ${list}, but no registered Widget offers that key any more; remove the entry.`);
  }
}

if (problems.length > 0) {
  console.error("Widget config keys that nothing the Widget renders reads:");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("Run with --explain <typeKey>.<key> to see where a key is read.");
  process.exit(1);
}

console.log(`Widget config reads validated: ${widgetSources.size} Widgets.`);
