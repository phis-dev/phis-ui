import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeModulesDirectory = path.join(root, "plugins/runtime-modules");

function readOwnerProjectionFiles(fileName) {
  return fs.readdirSync(runtimeModulesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(runtimeModulesDirectory, entry.name, fileName)))
    .map((entry) => `plugins/runtime-modules/${entry.name}/${fileName}`)
    .sort();
}

const firstPartyOwnerDirectories = fs.readdirSync(runtimeModulesDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(runtimeModulesDirectory, entry.name, "definition.ts")))
  .map((entry) => entry.name)
  .sort();

for (const owner of firstPartyOwnerDirectories) {
  const ownerDirectory = path.join(runtimeModulesDirectory, owner);
  for (const requiredFile of ["ids.ts", "definition.ts", "module.ts", "server.ts"]) {
    if (!fs.existsSync(path.join(ownerDirectory, requiredFile))) {
      throw new Error(`Runtime module owner "${owner}" is missing ${requiredFile}.`);
    }
  }
  const definitionSource = fs.readFileSync(path.join(ownerDirectory, "definition.ts"), "utf8");
  if (/controllerType:\s+PHI_[A-Z0-9_]+_CONTROLLER_TYPE,/u.test(definitionSource) &&
    !fs.existsSync(path.join(ownerDirectory, "client.ts"))) {
    throw new Error(`Controller-owning Runtime module "${owner}" is missing client.ts.`);
  }
  if (fs.existsSync(path.join(ownerDirectory, "widgets.ts")) &&
    !fs.existsSync(path.join(ownerDirectory, "authoring-widgets.ts"))) {
    throw new Error(`Widget-owning Runtime module "${owner}" is missing authoring-widgets.ts.`);
  }
  const liveClientPath = path.join(ownerDirectory, "client.ts");
  if (fs.existsSync(liveClientPath) && /authoring-client|authoring-widgets/.test(fs.readFileSync(liveClientPath, "utf8"))) {
    throw new Error(`Runtime module "${owner}" live Client projection reaches Authoring code.`);
  }
}

for (const projectionRoot of ["area-contributions", "client-area-contributions", "client-authoring-providers"]) {
  const directory = path.join(runtimeModulesDirectory, projectionRoot);
  for (const file of fs.readdirSync(directory).filter((entry) => /\.[cm]?[jt]sx?$/.test(entry))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const owner of firstPartyOwnerDirectories) {
      if (new RegExp(`runtime-modules/${owner}/(?:definition|widgets|presets)|\\.\\./${owner}/(?:definition|widgets|presets)`).test(source)) {
        throw new Error(`${projectionRoot}/${file}: owner module "${owner}" must be consumed through a projection.`);
      }
    }
  }
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readImportedNames(relativePath, predicate) {
  const sourceText = readSource(relativePath);
  const source = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const names = [];

  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }

    for (const element of statement.importClause.namedBindings.elements) {
      if (predicate(element.name.text)) {
        names.push(element.name.text);
      }
    }
  }

  return names;
}

function assertSameMembers(label, expectedMembers, actualMembers) {
  const expected = new Set(expectedMembers);
  const actual = new Set(actualMembers);
  const missing = [...expected].filter((member) => !actual.has(member)).sort();
  const extra = [...actual].filter((member) => !expected.has(member)).sort();

  if (missing.length > 0 || extra.length > 0) {
    throw new Error([
      `${label} is out of sync.`,
      ...(missing.length > 0 ? [`Missing: ${missing.join(", ")}`] : []),
      ...(extra.length > 0 ? [`Extra: ${extra.join(", ")}`] : []),
    ].join("\n"));
  }
}

function assertUnique(label, members) {
  const seen = new Set();
  const duplicates = new Set();
  for (const member of members) {
    if (seen.has(member)) {
      duplicates.add(member);
    }
    seen.add(member);
  }

  if (duplicates.size > 0) {
    throw new Error(`${label} contains duplicates: ${[...duplicates].sort().join(", ")}`);
  }
}

function readDefinitionTypeKeys(relativeDirectory, definitionSuffix) {
  const unwrapExpression = (expression) => {
    let current = expression;
    while (
      ts.isSatisfiesExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current)
    ) {
      current = current.expression;
    }
    return current;
  };
  const typeKeys = new Map();
  const directory = path.join(root, relativeDirectory);
  const files = fs.readdirSync(directory)
    .filter((name) => name.endsWith(".ts"))
    .sort()
    .map((name) => `${relativeDirectory}/${name}`);
  // A module that owns a Widget keeps its config beside the Widget's other files rather than in the
  // shared family directory. Both places are read until every Widget has moved.
  for (const owner of firstPartyOwnerDirectories) {
    const widgetsDirectory = path.join(runtimeModulesDirectory, owner, "widgets");
    if (!fs.existsSync(widgetsDirectory)) continue;
    for (const widget of fs.readdirSync(widgetsDirectory).sort()) {
      const configPath = path.join(widgetsDirectory, widget, "config.ts");
      if (fs.existsSync(configPath)) {
        files.push(`plugins/runtime-modules/${owner}/widgets/${widget}/config.ts`);
      }
    }
  }
  for (const relativePath of files) {
    const source = ts.createSourceFile(
      relativePath,
      readSource(relativePath),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const stringConstants = new Map();
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          ts.isStringLiteral(unwrapExpression(declaration.initializer))
        ) {
          stringConstants.set(
            declaration.name.text,
            unwrapExpression(declaration.initializer).text,
          );
        }
      }
    }

    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }
      for (const declaration of statement.declarationList.declarations) {
        if (
          !ts.isIdentifier(declaration.name) ||
          !declaration.name.text.endsWith(`_${definitionSuffix}`) ||
          !declaration.initializer
        ) {
          continue;
        }
        const definitionName = declaration.name.text;
        const initializer = unwrapExpression(declaration.initializer);
        const object = ts.isObjectLiteralExpression(initializer)
          ? initializer
          : ts.isCallExpression(initializer) &&
              initializer.arguments.length > 0 &&
              ts.isObjectLiteralExpression(initializer.arguments[0])
            ? initializer.arguments[0]
            : null;
        const callTypeKey = ts.isCallExpression(initializer) &&
            initializer.arguments.length > 0 &&
            ts.isStringLiteral(initializer.arguments[0])
          ? initializer.arguments[0].text
          : undefined;
        const typeKeyProperty = object?.properties.find((property) =>
          ts.isPropertyAssignment(property) &&
          ts.isIdentifier(property.name) &&
          property.name.text === "typeKey"
        );
        const typeKey = callTypeKey ?? (typeKeyProperty && ts.isPropertyAssignment(typeKeyProperty)
          ? ts.isStringLiteral(typeKeyProperty.initializer)
            ? typeKeyProperty.initializer.text
            : ts.isIdentifier(typeKeyProperty.initializer)
              ? stringConstants.get(typeKeyProperty.initializer.text)
              : undefined
          : undefined);
        if (!typeKey) {
          throw new Error(`${relativePath}: ${definitionName} has no literal typeKey.`);
        }
        if (typeKeys.has(definitionName)) {
          throw new Error(`Duplicate ${definitionSuffix} export "${definitionName}".`);
        }
        typeKeys.set(definitionName, typeKey);
      }
    }
  }
  return typeKeys;
}

const widgetManifestFiles = fs.readdirSync(runtimeModulesDirectory)
  .filter((file) => file.endsWith("-widgets.ts"))
  .sort()
  .map((file) => `plugins/runtime-modules/${file}`)
  .concat(readOwnerProjectionFiles("widgets.ts"));

const widgetTypeKeysByDefinition = readDefinitionTypeKeys(
  "components/widgets/config",
  "WIDGET_DEFINITION",
);
const ownedWidgetDefinitions = widgetManifestFiles.flatMap((file) => {
  const source = readSource(file);
  const importedDefinitions = readImportedNames(file, (name) => name.endsWith("_WIDGET_DEFINITION"));
  const declaredDefinitions = [...source.matchAll(/definition:\s+(PHI_[A-Z0-9_]+_WIDGET_DEFINITION),/g)]
    .map((match) => match[1]);
  assertSameMembers(`${file} imports`, importedDefinitions, declaredDefinitions);
  return declaredDefinitions;
});

assertUnique("Owned widget definitions", ownedWidgetDefinitions);
assertSameMembers(
  "Runtime module widget ownership",
  [...widgetTypeKeysByDefinition.keys()],
  ownedWidgetDefinitions,
);

const widgetDefinitionsByOwnerFile = new Map(widgetManifestFiles.map((file) => {
  const source = readSource(file);
  const definitions = [...source.matchAll(/defineFirstPartyWidget\(\{([\s\S]*?)\n\s*\}\),/g)]
    .map((match) => {
      const definition = match[1].match(/definition:\s+(PHI_[A-Z0-9_]+_WIDGET_DEFINITION),/);
      if (!definition) {
        throw new Error(`${file} contains a widget entry without a definition.`);
      }
      if (!/loadRuntime:\s*\(\) => import\(/.test(match[1])) {
        throw new Error(`${file} ${definition[1]} has no Runtime loader.`);
      }
      if (!/loadPreview:\s*\(\) => import\(/.test(match[1])) {
        throw new Error(`${file} ${definition[1]} has no Preview loader.`);
      }
      return definition[1];
    });
  return [file, definitions];
}));
const widgetDefinitionsFromOwners = [...widgetDefinitionsByOwnerFile.values()].flat();
for (const definition of widgetDefinitionsFromOwners) {
  if (!widgetTypeKeysByDefinition.has(definition)) {
    throw new Error(`Missing widget type key for ${definition}.`);
  }
}
const clientAuthoringFileByOwnerFile = new Map(widgetManifestFiles.map((ownerFile) => {
  if (path.basename(ownerFile) === "widgets.ts") {
    return [ownerFile, `${path.dirname(ownerFile)}/authoring-widgets.ts`];
  }
  const ownerKey = path.basename(ownerFile, "-widgets.ts");
  const clientKey = ownerKey === "runtime" ? "core" : ownerKey;
  return [
    ownerFile,
    `plugins/runtime-modules/client-authoring-widgets/${clientKey}.ts`,
  ];
}));
const clientAuthoringDefinitions = [...clientAuthoringFileByOwnerFile].flatMap(
  ([ownerFile, clientFile]) => {
    const definitions = [
      ...readSource(clientFile).matchAll(/\n\s+(PHI_[A-Z0-9_]+_WIDGET_DEFINITION),\n\s+\(\) => import/g),
    ].map((match) => match[1]);
    assertSameMembers(
      `${clientFile} owner module`,
      widgetDefinitionsByOwnerFile.get(ownerFile) ?? [],
      definitions,
    );
    return definitions;
  },
);

assertUnique("Owner widget definitions", widgetDefinitionsFromOwners);
assertUnique("Client authoring definitions", clientAuthoringDefinitions);
assertSameMembers(
  "Client authoring widget loaders",
  widgetDefinitionsFromOwners,
  clientAuthoringDefinitions,
);

for (const file of widgetManifestFiles) {
  if ((widgetDefinitionsByOwnerFile.get(file) ?? []).length === 0) {
    continue;
  }
  const moduleIds = [
    ...readSource(file).matchAll(/ownerModuleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID),/g),
  ].map((match) => match[1]);
  if (new Set(moduleIds).size !== 1) {
    throw new Error(`${file} must declare exactly one owner module id.`);
  }
}

const layoutManifestFiles = [
  "plugins/runtime-modules/core/layouts.ts",
  "plugins/runtime-modules/builder/layouts.ts",
];
const ownedLayoutPlugins = layoutManifestFiles.flatMap((file) => [
  ...readSource(file).matchAll(/module\.(PHI_[A-Z0-9_]+_LAYOUT_PLUGIN)\)/g),
].map((match) => match[1]));

assertUnique("Owned layout plugins", ownedLayoutPlugins);

const registeredLayoutDefinitions = [
  ...readSource("components/layouts/layout-definitions.ts")
    .matchAll(/export const (PHI_[A-Z0-9_]+_LAYOUT_DEFINITION) = \{/g),
].map((match) => match[1]);
const layoutPluginFiles = fs.readdirSync(path.join(root, "components/layouts/plugins"))
  .filter((file) => file.endsWith("-layout-plugin.tsx"))
  .sort()
  .map((file) => `components/layouts/plugins/${file}`);
const layoutDefinitionPluginPairs = layoutPluginFiles.flatMap((file) => {
  const source = readSource(file);
  const plugin = source.match(/export const (PHI_[A-Z0-9_]+_LAYOUT_PLUGIN)[^=]*= \{/);
  const definition = source.match(/\.\.\.(PHI_[A-Z0-9_]+_LAYOUT_DEFINITION),/);
  if (!plugin || !definition) {
    throw new Error(`${file} must reuse one lightweight layout definition.`);
  }
  if (plugin[1].replace(/_PLUGIN$/, "_DEFINITION") !== definition[1]) {
    throw new Error(`${file} reuses the wrong lightweight layout definition.`);
  }
  return [{ plugin: plugin[1], definition: definition[1] }];
});
const ownedLayoutDefinitionsByManifest = new Map(layoutManifestFiles.map((file) => [
  file,
  [...readSource(file).matchAll(/define(?:Core|Builder)Layout\(\s*(PHI_[A-Z0-9_]+_LAYOUT_DEFINITION),/g)]
    .map((match) => match[1]),
]));
const ownedLayoutDefinitions = [...ownedLayoutDefinitionsByManifest.values()].flat();
const importedLayoutDefinitions = layoutManifestFiles.flatMap((file) =>
  readImportedNames(file, (name) => name.endsWith("_LAYOUT_DEFINITION")),
);

assertUnique("Registered layout definitions", registeredLayoutDefinitions);
assertUnique("Owned layout definitions", ownedLayoutDefinitions);
assertSameMembers(
  "Runtime module layout definition imports",
  importedLayoutDefinitions,
  ownedLayoutDefinitions,
);
assertSameMembers(
  "Runtime module layout definitions",
  registeredLayoutDefinitions,
  ownedLayoutDefinitions,
);
assertSameMembers(
  "Layout definition/plugin pairs",
  registeredLayoutDefinitions.map((name) => name.replace(/_DEFINITION$/, "_PLUGIN")),
  layoutDefinitionPluginPairs.map(({ plugin }) => plugin),
);
assertSameMembers(
  "Runtime module layout ownership",
  layoutDefinitionPluginPairs.map(({ plugin }) => plugin),
  ownedLayoutPlugins,
);
assertSameMembers(
  "Layout plugin definition reuse",
  registeredLayoutDefinitions,
  layoutDefinitionPluginPairs.map(({ definition }) => definition),
);

for (const file of layoutManifestFiles) {
  const moduleIds = [
    ...readSource(file).matchAll(/ownerModuleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID),/g),
  ].map((match) => match[1]);
  if (new Set(moduleIds).size !== 1) {
    throw new Error(`${file} must declare exactly one layout owner module id.`);
  }
}

// Es gibt kein Sammelverzeichnis mehr: jedes Modul haelt seine Definition selbst.
const moduleDefinitionFiles = readOwnerProjectionFiles("definition.ts");
const moduleDefinitionsSource = moduleDefinitionFiles.map(readSource).join("\n");
const moduleDefinitionNames = [
  ...moduleDefinitionsSource.matchAll(
    /export const (PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION) = (?:\{|definePhiAreaBaseRuntimeModuleDefinition\(\{)/g,
  ),
].map((match) => match[1]);
const areaContributionFiles = fs.readdirSync(path.join(runtimeModulesDirectory, "area-contributions"))
  .filter((file) => file.endsWith(".ts"))
  .sort()
  .map((file) => `plugins/runtime-modules/area-contributions/${file}`);
const areaContributionSources = areaContributionFiles
  .concat(readOwnerProjectionFiles("server.ts"))
  .map(readSource)
  .join("\n");
const catalogModuleDefinitionNames = [
  ...areaContributionSources.matchAll(/definition:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION),/g),
  ...areaContributionSources.matchAll(/\[(PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION),\s*"PHI_[A-Z0-9_]+_RUNTIME_MODULE"\]/g),
].map((match) => match[1]);
const serverControllerTypes = [
  // Only the module-level property; a nested one (authUiProvider) names the same controller on purpose.
  ...moduleDefinitionsSource.matchAll(/\n {2}controllerType:\s+(PHI_[A-Z0-9_]+_CONTROLLER_TYPE),/g),
].map((match) => match[1]);
const clientAreaContributionFiles = fs.readdirSync(path.join(runtimeModulesDirectory, "client-area-contributions"))
  .filter((file) => file.endsWith(".tsx"))
  .sort()
  .map((file) => `plugins/runtime-modules/client-area-contributions/${file}`);
const clientAreaContributionSources = clientAreaContributionFiles
  .concat(readOwnerProjectionFiles("client.ts"))
  .map(readSource)
  .join("\n");
const controllerClientManifestModuleIds = [
  ...clientAreaContributionSources.matchAll(/moduleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID)/g),
  ...readSource("plugins/runtime-modules/client-manifests/common.ts").matchAll(/\[\s*(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID),/g),
].map((match) => match[1]);
const authoringClientContributionFiles = fs.readdirSync(path.join(runtimeModulesDirectory, "client-authoring-providers"))
  .filter((file) => file.endsWith(".tsx"))
  .sort()
  .map((file) => `plugins/runtime-modules/client-authoring-providers/${file}`);
const authoringClientContributionSources = authoringClientContributionFiles
  .concat(readOwnerProjectionFiles("authoring-client.tsx"))
  .map(readSource)
  .join("\n");
const authoringClientManifestModuleIds = [
  ...authoringClientContributionSources.matchAll(/moduleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID)/g),
  ...authoringClientContributionSources.matchAll(/\[(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID),\s*"Phi[A-Za-z0-9]+RuntimeModuleAuthoringClient"\]/g),
].map((match) => match[1]);
const expectedClientModuleIds = moduleDefinitionNames.map((name) =>
  name.replace("_DEFINITION", "_ID"),
);
const expectedControllerClientModuleIds = moduleDefinitionFiles.flatMap((file) => {
  const source = readSource(file);
  if (!/controllerType:\s+PHI_[A-Z0-9_]+_CONTROLLER_TYPE,/u.test(source)) {
    return [];
  }
  return [
    ...source.matchAll(
      /export const (PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION) = (?:\{|definePhiAreaBaseRuntimeModuleDefinition\(\{)/g,
    ),
  ].map((match) => match[1].replace("_DEFINITION", "_ID"));
});
const expectedControllerClientModuleIdSet = new Set(expectedControllerClientModuleIds);

if (/loadAuthoring/.test(clientAreaContributionSources)) {
  throw new Error("Controller Client Area contributions must not contain Authoring import edges.");
}
if (/loadController/.test(authoringClientContributionSources)) {
  throw new Error("Authoring Client contributions must not contain Controller import edges.");
}

function screamingSnake(pascalCase) {
  return pascalCase.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

function readDirectServerAreaModuleIds(area) {
  const source = readSource(`plugins/runtime-modules/area-contributions/${area}.ts`);
  return [
    ...source.matchAll(/moduleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION)\.moduleId/g),
    ...source.matchAll(/\[(PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION),\s*"PHI_[A-Z0-9_]+_RUNTIME_MODULE"\]/g),
    ...source.matchAll(/^\s*(PHI_[A-Z0-9_]+_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION),?$/gm),
    // A module that serves more than one Area exports a factory instead of a constant, because the
    // routes it contributes are filtered per Area. The module id is read from the factory name.
    ...source.matchAll(/^\s*create(Phi[A-Za-z0-9]+?)RuntimeModuleServerAreaContribution\(/gm),
  ].map((match) => (match[1].startsWith("Phi") && !match[1].startsWith("PHI_")
    ? `${screamingSnake(match[1])}_RUNTIME_MODULE_ID`
    : match[1]
      .replace("_SERVER_AREA_CONTRIBUTION", "_ID")
      .replace("_DEFINITION", "_ID")));
}

function readDirectClientAreaModuleIds(area) {
  return [
    ...readSource(`plugins/runtime-modules/client-area-contributions/${area}.tsx`)
      .matchAll(/moduleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID)/g),
    ...readSource(`plugins/runtime-modules/client-area-contributions/${area}.tsx`)
      .matchAll(/^\s*(PHI_[A-Z0-9_]+_RUNTIME_MODULE_CONTROLLER_CLIENT_AREA_CONTRIBUTION),?$/gm),
  ].map((match) => match[1].replace("_CONTROLLER_CLIENT_AREA_CONTRIBUTION", "_ID"));
}

function readDirectAuthoringAreaModuleIds(area) {
  return [
    ...readSource(`plugins/runtime-modules/client-authoring-providers/${area}.tsx`)
      .matchAll(/moduleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID)/g),
    ...readSource(`plugins/runtime-modules/client-authoring-providers/${area}.tsx`)
      .matchAll(/^\s*(PHI_[A-Z0-9_]+_RUNTIME_MODULE_AUTHORING_CLIENT_CONTRIBUTION),?$/gm),
  ].map((match) => match[1].replace("_AUTHORING_CLIENT_CONTRIBUTION", "_ID"));
}

const commonClientModuleIds = [
  ...readDirectClientAreaModuleIds("common"),
  ...[
    ...readSource("plugins/runtime-modules/client-manifests/common.ts")
      .matchAll(/\[\s*(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID),/g),
  ].map((match) => match[1]),
];
const commonServerModuleIds = readDirectServerAreaModuleIds("common");
const commonAuthoringModuleIds = readDirectAuthoringAreaModuleIds("common");
const areaContributionFilesByArea = {
  public: "public",
  app: "app",
  accounting: "accounting",
  admin: "admin",
  editor: "editor",
  builder: "builder",
};
const areaModuleIds = Object.fromEntries(Object.entries(areaContributionFilesByArea).map(
  ([area, file]) => [area, [
    [...commonServerModuleIds, ...readDirectServerAreaModuleIds(file)],
    [...commonClientModuleIds, ...readDirectClientAreaModuleIds(file)],
  ]],
));
const areaAuthoringModuleIds = Object.fromEntries(Object.entries(areaContributionFilesByArea).map(
  ([area, file]) => [area, [
    ...commonAuthoringModuleIds,
    ...readDirectAuthoringAreaModuleIds(file),
  ]],
));
const builderServerAreaModuleIds = Object.values(areaContributionFilesByArea).flatMap(
  (file) => readDirectServerAreaModuleIds(file),
).concat(commonServerModuleIds);
const builderClientAreaModuleIds = Object.values(areaContributionFilesByArea).flatMap(
  (file) => readDirectClientAreaModuleIds(file),
).concat(commonClientModuleIds);
areaModuleIds.builder = [builderServerAreaModuleIds, builderClientAreaModuleIds];

const exclusiveAreaEntries = [
  ...moduleDefinitionFiles.flatMap((file) => [
    ...readSource(file).matchAll(
      /export const PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION = \{([\s\S]*?)\n\} satisfies PhiRuntimeModuleDefinition;/g,
    ),
  ].flatMap((match) => {
    const body = match[1];
    const moduleId = body.match(/moduleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID),/)?.[1];
    const exclusiveArea = body.match(/eligibleAreas:\s*\["([a-z]+)"\]/)?.[1];
    return moduleId && exclusiveArea ? [`${moduleId}:${exclusiveArea}`] : [];
  })),
  ...moduleDefinitionFiles.flatMap((file) => [
    ...readSource(file).matchAll(
      /export const PHI_[A-Z0-9_]+_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition\(\{([\s\S]*?)\n\}\);/g,
    ),
  ].flatMap((match) => {
    const body = match[1];
    const moduleId = body.match(/moduleId:\s+(PHI_[A-Z0-9_]+_RUNTIME_MODULE_ID),/)?.[1];
    const exclusiveArea = body.match(/area:\s*"([a-z]+)"/)?.[1];
    return moduleId && exclusiveArea ? [`${moduleId}:${exclusiveArea}`] : [];
  })),
];
const expectedExclusiveAreaEntries = [
  "PHI_PUBLIC_RUNTIME_MODULE_ID:public",
  "PHI_APP_RUNTIME_MODULE_ID:app",
  "PHI_AVATAR_RUNTIME_MODULE_ID:app",
  "PHI_ACCOUNTING_RUNTIME_MODULE_ID:accounting",
  "PHI_BUILDER_RUNTIME_MODULE_ID:builder",
  "PHI_FORM_BUILDER_RUNTIME_MODULE_ID:builder",
  "PHI_REVISIONS_RUNTIME_MODULE_ID:builder",
  "PHI_THEME_RUNTIME_MODULE_ID:builder",
  "PHI_ADMIN_RUNTIME_MODULE_ID:admin",
  "PHI_OBSERVABILITY_RUNTIME_MODULE_ID:admin",
  "PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID:admin",
  "PHI_EDITOR_RUNTIME_MODULE_ID:editor",
];
const dataProviderManifestFiles = readOwnerProjectionFiles("data-providers.ts");
const dataProviderKeys = dataProviderManifestFiles.flatMap((file) => [
  ...readSource(file).matchAll(/key:\s+(PHI_[A-Z0-9_]+_RUNTIME_DATA_PROVIDER_KEYS)\.([A-Za-z0-9_]+),/g),
].map((match) => `${match[1]}.${match[2]}`));
const dataProviderAuthoringModesByKey = new Map();
for (const file of dataProviderManifestFiles) {
  const definitions = [
    ...readSource(file).matchAll(/\{\s*key:\s+PHI_[A-Z0-9_]+_RUNTIME_DATA_PROVIDER_KEYS\.([A-Za-z0-9_]+),([\s\S]*?)\n\s*\},/g),
  ];
  for (const [, key, body] of definitions) {
    const executionMode = body.match(/executionMode:\s*"(static|live)"/)?.[1];
    const authoringMode = body.match(/authoringMode:\s*"(none|read|edit)"/)?.[1];
    if (!executionMode || !authoringMode) {
      throw new Error(`${file}: data provider "${key}" has no executionMode or authoringMode.`);
    }
    const keySymbol = readSource(file)
      .match(/PHI_[A-Z0-9_]+_RUNTIME_DATA_PROVIDER_KEYS/)?.[0];
    dataProviderAuthoringModesByKey.set(`${keySymbol}.${key}`, authoringMode);
  }
}
const dataProviderDescriptorSymbols = dataProviderManifestFiles.flatMap((file) => [
  ...readSource(file).matchAll(/export const (PHI_[A-Z0-9_]+_RUNTIME_DATA_PROVIDER_DESCRIPTORS)\s*=/g),
].map((match) => match[1]));
const moduleDefinitionDataProviderSymbols = [
  ...moduleDefinitionsSource.matchAll(/dataProviders:\s+(PHI_[A-Z0-9_]+_RUNTIME_DATA_PROVIDER_DESCRIPTORS),/g),
].map((match) => match[1]);
// A module keeps its data provider Clients beside its Client projection rather than inside it:
// authorable providers carry an authoring loader, and client.ts may not.
const dataProviderClientFiles = readOwnerProjectionFiles("client-data-providers.ts")
  .concat(readOwnerProjectionFiles("client.ts"));
const dataProviderClientKeys = dataProviderClientFiles.flatMap((file) => [
  ...readSource(file).matchAll(
    /key:\s+(PHI_[A-Z0-9_]+_RUNTIME_DATA_PROVIDER_KEYS)\.([A-Za-z0-9_]+),([\s\S]*?)\n\s*\},/g,
  ),
].map((match) => {
  const key = `${match[1]}.${match[2]}`;
  const authoringMode = dataProviderAuthoringModesByKey.get(key);
  const hasLiveLoader = /loadLive:\s*async/.test(match[3]);
  const hasAuthoringLoader = /loadAuthoring:\s*async/.test(match[3]);
  if (!hasLiveLoader) {
    throw new Error(`${file}: data provider "${key}" has no live Client loader.`);
  }
  if (authoringMode !== "none" && !hasAuthoringLoader) {
    throw new Error(`${file}: authorable data provider "${key}" has no authoring Client loader.`);
  }
  if (authoringMode === "none" && hasAuthoringLoader) {
    throw new Error(`${file}: live-only data provider "${key}" must not define an authoring Client loader.`);
  }
  return key;
}));

assertUnique("Runtime module definitions", moduleDefinitionNames);
assertSameMembers(
  "Runtime module catalog definitions",
  moduleDefinitionNames,
  catalogModuleDefinitionNames,
);
assertUnique("Runtime module controller ownership", serverControllerTypes);
assertSameMembers(
  "Runtime module Controller Client manifest union",
  expectedControllerClientModuleIds,
  controllerClientManifestModuleIds,
);
for (const [area, [serverModuleIds, clientModuleIds]] of Object.entries(areaModuleIds)) {
  if (area !== "builder") {
    assertUnique(`${area} Server Area contributions`, serverModuleIds);
    assertUnique(`${area} Controller Client Area contributions`, clientModuleIds);
  }
  assertSameMembers(
    `${area} Server/Controller Client Area contributions`,
    serverModuleIds.filter((moduleId) => expectedControllerClientModuleIdSet.has(moduleId)),
    clientModuleIds,
  );
}
assertSameMembers(
  "Builder target-Area Server union",
  moduleDefinitionNames.map((name) => name.replace("_DEFINITION", "_ID")),
  builderServerAreaModuleIds,
);
assertSameMembers(
  "Builder target-Area Controller Client union",
  expectedControllerClientModuleIds,
  builderClientAreaModuleIds,
);
assertSameMembers(
  "Builder target-Area Authoring Client union",
  expectedClientModuleIds,
  authoringClientManifestModuleIds,
);
for (const [area, file] of Object.entries(areaContributionFilesByArea)) {
  assertUnique(`${area} Authoring Client provider`, areaAuthoringModuleIds[area]);
  assertSameMembers(
    `${area} Runtime/Authoring Client Area contributions`,
    area === "builder"
      ? [...commonClientModuleIds, ...readDirectClientAreaModuleIds(file)]
      : [...commonServerModuleIds, ...readDirectServerAreaModuleIds(file)],
    areaAuthoringModuleIds[area],
  );
}
assertSameMembers(
  "Area-exclusive runtime modules",
  expectedExclusiveAreaEntries,
  exclusiveAreaEntries,
);
assertUnique("Runtime data provider keys", dataProviderKeys);
assertSameMembers(
  "Runtime data provider catalog descriptors",
  dataProviderDescriptorSymbols,
  moduleDefinitionDataProviderSymbols,
);
assertUnique("Runtime data provider Client loaders", dataProviderClientKeys);
assertSameMembers(
  "Runtime data provider descriptor/Client loader keys",
  dataProviderKeys,
  dataProviderClientKeys,
);

console.log(
  `Runtime module manifests valid: ${ownedWidgetDefinitions.length} widgets, ` +
  `${ownedLayoutDefinitions.length} layout definitions/plugins, ` +
  `${moduleDefinitionNames.length} modules/controllers, ` +
  `${dataProviderKeys.length} data providers.`,
);
