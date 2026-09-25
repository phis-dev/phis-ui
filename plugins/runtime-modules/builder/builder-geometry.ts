import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import {
  resolvePhiRenderableBlockGeometry,
  type PhiRenderableBlockGeometryInput,
  type PhiResolvedBlockGeometry,
} from "../../../types/renderable-block-geometry";

/**
 * The custom properties the root scaffold stylesheet reads, from the root node's geometry read once.
 *
 * The fallbacks are the scaffold's own and stay stated here: `100%` for an absent width, `auto` or the
 * Region's fallback band for an absent height, `0` and `none` for absent constraints. Whether they
 * become the general answers or stay this scaffold's exception is an open question (TODOS.md, block
 * geometry). A root that states a size on either axis stops flexing, and says so in `--phi-root-scaffold-flex`.
 */
export function resolvePhiRootScaffoldProperties(
  geometry: PhiResolvedBlockGeometry,
  fallbackBlockSize: string | null | undefined,
  fallbackMinBlockSize: string | null | undefined,
): Record<`--phi-root-scaffold-${string}`, string> {
  return {
    "--phi-root-scaffold-width": geometry.inline.size?.css ?? "100%",
    "--phi-root-scaffold-height": geometry.block.size?.css ?? fallbackBlockSize ?? "auto",
    "--phi-root-scaffold-min-width": geometry.inline.min?.css ?? "0",
    "--phi-root-scaffold-min-height": geometry.block.min?.css ?? fallbackMinBlockSize ?? "0",
    "--phi-root-scaffold-max-width": geometry.inline.max?.css ?? "none",
    "--phi-root-scaffold-max-height": geometry.block.max?.css ?? "none",
    "--phi-root-scaffold-flex": geometry.explicitInline || geometry.explicitBlock ? "0 0 auto" : "1 1 auto",
    "--phi-root-scaffold-explicit-width": geometry.inline.size?.css ?? "auto",
    "--phi-root-scaffold-explicit-height": geometry.block.size?.css ?? "auto",
  };
}

/**
 * The width the Canvas gives a sider Region, from the draft's geometry read once: its stated width,
 * else its minimum, else the house sidebar width -- the same order the live Shell falls through.
 */
export function resolvePhiBuilderSiderWidth(draft: PhiRenderableBlockGeometryInput | null | undefined) {
  const geometry = resolvePhiRenderableBlockGeometry(draft);
  return geometry.inline.size?.css ?? geometry.inline.min?.css ?? `${PHI_LAYOUT.sidebarWidth}px`;
}
