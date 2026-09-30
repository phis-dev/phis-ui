import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Every file that builds a preset tree, wherever it lives.
 *
 * The Foundation keeps the shared pieces in `components/regions/presets/`; each Module keeps its own
 * Pages, Area shells and overlays in `plugins/runtime-modules/<module>/trees/`; the shell presets of the
 * Area base Modules sit beside `area-base-presets.ts`. A validator reading presets reads all three.
 */
export function listPhiPresetTreeFiles(repositoryRoot: string): string[] {
  const isSource = (name: string) => /\.tsx?$/u.test(name) && !/\.test\.tsx?$/u.test(name);
  const inDirectory = (directory: string) =>
    existsSync(directory)
      ? readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isFile() && isSource(entry.name))
        .map((entry) => path.join(directory, entry.name))
      : [];
  const moduleRoot = path.join(repositoryRoot, "plugins/runtime-modules");
  return [
    ...inDirectory(path.join(repositoryRoot, "components/regions/presets")),
    ...readdirSync(moduleRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => inDirectory(path.join(moduleRoot, entry.name, "trees"))),
    ...inDirectory(moduleRoot).filter((file) => /-preset(-tree)?\.tsx?$/u.test(path.basename(file))),
  ];
}
