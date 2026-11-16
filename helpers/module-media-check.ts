import type { PhiModuleMediaResolver } from "../types/module-media";

/** A name a preset asked for that the package does not declare in `phis.media`. */
export type PhiModuleMediaFinding = {
  kind: "asset" | "folder";
  key: string;
  message: string;
};

/**
 * The resolver a Module package hands its own `loadTree` in its verify step, where there is no Core
 * (THIRD_PARTY_MODULES.md, "Checking a Page preset").
 *
 * `assets` and `folders` are the keys the package declares in `phis.media`. A declared key answers a
 * placeholder id -- a stable positive integer, distinct from every other key's -- so the tree is built
 * as on a Site that has imported everything. An undeclared key answers `null` and is recorded: on a
 * real Site it would never resolve. Verify-time only, from `@phis/ui/module/page-check`.
 */
export function createPhiDeclaredMediaResolver(
  declared: { assets?: readonly string[]; folders?: readonly string[] } = {},
): { media: PhiModuleMediaResolver; findings(): PhiModuleMediaFinding[] } {
  const ids = new Map<string, number>();
  const found: PhiModuleMediaFinding[] = [];
  const answer = (kind: "asset" | "folder", declaredKeys: readonly string[] | undefined, key: string) => {
    if (!declaredKeys?.includes(key)) {
      if (!found.some((finding) => finding.kind === kind && finding.key === key)) {
        found.push({ kind, key, message: `${kind} \`${key}\` is not declared in the package's \`phis.media\`.` });
      }
      return null;
    }
    const id = `${kind}:${key}`;
    if (!ids.has(id)) ids.set(id, ids.size + 1);
    return ids.get(id)!;
  };
  return {
    media: {
      asset: async (key) => answer("asset", declared.assets, key),
      folder: async (key) => answer("folder", declared.folders, key),
    },
    findings: () => [...found],
  };
}
