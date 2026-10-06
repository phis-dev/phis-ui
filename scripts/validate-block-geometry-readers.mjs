import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles } from "./lib/source-files.mjs";

/**
 * A block's geometry is read once.
 *
 * `size`, `minSize` and `maxSize` used to be read wherever a box was drawn, and each reader interpreted
 * them for itself -- one appended `px`, one let React append it, one took `typeof value === "number"`
 * for a type when it is a unit, and on an absent width there were as many answers as readers. The one
 * reader is `resolvePhiRenderableBlockGeometry` (types/renderable-block-geometry.ts), and this keeps it
 * the one: a file that draws geometry imports the resolver and is named here, and a file that touches
 * the three fields without drawing them is named here with the reason.
 *
 * Checked in both directions, the way `soleOwnerPrimitives` is. A reader that stops importing the
 * resolver fails, and an allowance that nothing uses any more fails too, so the lists stay an inventory
 * rather than a permission nobody rereads.
 */

const resolverPath = "types/renderable-block-geometry.ts";
const resolverImportPattern = /from\s+"[^"]*\/renderable-block-geometry"/;

/** The files that draw a block's geometry, and what each draws. Every one imports the resolver. */
const geometryReaders = new Map([
  ["plugins/runtime/slot-size-policy.ts", "the slot policy, and the constraints a child hands its parent"],
  ["plugins/runtime/phi-slot-child-frame-view.tsx", "the frame around every slot child"],
  ["components/layouts/phi-layout-contract.ts", "a Layout's own inner box"],
  ["components/regions/phi-cms-region-shell.ts", "a Shell Region, static and live alike"],
  ["plugins/runtime-modules/builder/builder-geometry.ts", "the Builder root scaffold's custom properties and the Canvas sider width"],
  ["plugins/runtime-modules/builder/render-root-node-preview.server.tsx", "the Builder root scaffold, server preview"],
  ["plugins/runtime-modules/builder/render-root-node-scaffold.tsx", "the Builder root scaffold"],
  ["plugins/runtime-modules/builder/widgets/structure-region/built-in.tsx", "a Region slot on the Structure Canvas"],
  ["plugins/runtime-modules/builder/widgets/hello-world/client.tsx", "the Hello World Widget's own minimum height"],
  ["plugins/runtime-modules/core/widgets/icon/client.tsx", "the glyph's measurement, which is the block's size field doing double duty"],
  ["plugins/runtime-modules/core/widgets/header-navigation/plugin.tsx", "the Header Region's height, handed to the navigation"],
  ["plugins/runtime-modules/core/widgets/header-navigation/authoring.tsx", "the Header Region's height, handed to the navigation editor"],
]);

/** The files that touch the three fields without drawing them, and why each may. */
const structuralReaders = new Map([
  ["components/cms/phi-cms-root-layout.tsx", "reads a Header band's height for the Chrome pane's sticky travel; it measures, it does not draw"],
  ["components/controls/phi-geometry-control.tsx", "the Inspector control that edits the three fields"],
  ["components/controls/phi-modal-control-adapter.tsx", "the Overlay's own `size`, a different vocabulary until the Overlay adopts block geometry (TODOS.md)"],
  ["plugins/runtime-modules/builder/controller/region-controller.ts", "Builder commands that ask whether a draft states a height"],
  ["plugins/runtime-modules/builder/region-hydration.ts", "copies a draft's geometry into a Region config, field for field"],
]);

const fieldReadPattern = /\b(size|minSize|maxSize|collapsedSizeHint)\??\.(width|height)\b/;

/** What a reader did before there was one reader; none of it may come back anywhere. */
const interpretationPatterns = [
  {
    name: "branches on typeof for a block length, which is a unit and not a type",
    pattern: /typeof\s+[\w.?]*\b(size|minSize|maxSize|collapsedSizeHint)\??\.(width|height)\s*[!=]==?\s*"number"/,
  },
  {
    name: "appends px to a block length",
    pattern: /\$\{[^}]*\b(size|minSize|maxSize|collapsedSizeHint)\??\.(width|height)[^}]*\}px/,
  },
];

const sourceFileOptions = {
  extensions: [".ts", ".tsx", ".mjs"],
  skipDirectories: ["node_modules", "dist", ".next", "scripts", ".git"],
  includeTests: false,
  includeDeclarations: true,
};

const failures = [];
const readersSeen = new Set();
const allowancesSeen = new Set();

for (const file of await listSourceFiles(repositoryRoot, sourceFileOptions)) {
  const relativePath = path.relative(repositoryRoot, file).split(path.sep).join("/");
  if (relativePath === resolverPath) {
    continue;
  }
  const source = await readFile(file, "utf8");
  const readsFields = fieldReadPattern.test(source);
  const importsResolver = resolverImportPattern.test(source);
  const isBarrel = relativePath === "types.ts";

  for (const { name, pattern } of interpretationPatterns) {
    if (pattern.test(source)) {
      failures.push(`${relativePath} ${name}; read the geometry through resolvePhiRenderableBlockGeometry.`);
    }
  }

  if (geometryReaders.has(relativePath)) {
    readersSeen.add(relativePath);
    if (!importsResolver) {
      failures.push(
        `${relativePath} draws ${geometryReaders.get(relativePath)} and no longer imports the resolver; `
          + "either read the geometry through it again, or remove the entry from geometryReaders.",
      );
    }
    if (readsFields) {
      failures.push(
        `${relativePath} still reads size, minSize, maxSize or collapsedSizeHint by field; `
          + "a geometry reader takes everything from the resolver.",
      );
    }
    continue;
  }

  if (structuralReaders.has(relativePath)) {
    allowancesSeen.add(relativePath);
    if (!readsFields) {
      failures.push(
        `${relativePath} no longer reads the geometry fields; remove it from structuralReaders rather than `
          + "leaving an allowance nobody uses.",
      );
    }
    continue;
  }

  if (importsResolver && !isBarrel) {
    failures.push(
      `${relativePath} imports the geometry resolver and is not named in geometryReaders; `
        + "name it with what it draws.",
    );
  }
  if (readsFields) {
    failures.push(
      `${relativePath} reads size, minSize, maxSize or collapsedSizeHint by field; read the geometry `
        + "through resolvePhiRenderableBlockGeometry, or name the file in structuralReaders with the reason.",
    );
  }
}

for (const [reader, draws] of geometryReaders) {
  if (!readersSeen.has(reader)) {
    failures.push(`${reader} (${draws}) is gone; remove it from geometryReaders.`);
  }
}
for (const [reader, reason] of structuralReaders) {
  if (!allowancesSeen.has(reader)) {
    failures.push(`${reader} (${reason}) is gone; remove it from structuralReaders.`);
  }
}

if (failures.length > 0) {
  console.error(`Block geometry reader validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Block geometry readers valid (${geometryReaders.size} readers through the resolver, ${structuralReaders.size} structural allowances).`,
);
