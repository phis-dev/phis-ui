import { PhiCmsRegionType } from "../constants/phi-cms";

import { PHI_SPACE } from "../theme/antd-css-var-contract";
import type { PhiCmsLayoutNode, PhiResolvedCmsPageTree } from "../types/cms";
import { readPhiSurface } from "../types/surface";

/**
 * The Page rule as a check (THIRD_PARTY_MODULES.md, "6b. Laying out a Page").
 *
 * For presets -- what a package or Core writes in code, by hand or by an agent. A package runs it over the
 * trees its route presets build, in its own verify step, and treats a finding as an error. It is never run
 * on what an author saves in the Builder: there the scale is what the Inspector offers, and a value off it
 * is the author's to choose.
 *
 * It reads the stated config only and resolves nothing: a distance is a step of `PHI_SPACE` or nothing.
 */

export type PhiPageLayoutFinding = {
  /** The node's label, or its id where it has none. */
  node: string;
  message: string;
};

const SPACING_KEYS = ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "gap"] as const;
const PADDING_KEYS = SPACING_KEYS.filter((key) => key !== "gap");

/** The steps a preset may use for any distance; above them is the author's emphasis. */
const PRESET_STEPS = ["xxs", "xs", "sm", "base", "md"] as const;
const EMPHASIS_STEPS = ["lg", "xl", "xxl"] as const;

/** Layouts that bring a padding of their own by default (LAYOUTING.md): stated, or they keep it. */
const DEFAULT_PADDED_LAYOUTS = new Set(["grid", "masonry", "three-column"]);

function stepOf(value: unknown): string | null {
  if (value === 0 || value === "0") return "none";
  for (const [step, reference] of Object.entries(PHI_SPACE)) {
    if (value === reference) return step;
  }
  return null;
}

function typeKeyOf(node: { widgetType: string }) {
  return node.widgetType.split("/").at(-1) ?? node.widgetType;
}

function nameOf(node: { label?: string | null; id: unknown }) {
  return node.label?.trim() || String(node.id);
}

function hasPadding(config: Record<string, unknown>) {
  return PADDING_KEYS.some((key) => {
    const step = stepOf(config[key]);
    return config[key] != null && step !== "none";
  });
}

export function checkPhiPagePresetLayout(tree: PhiResolvedCmsPageTree): PhiPageLayoutFinding[] {
  const findings: PhiPageLayoutFinding[] = [];
  const contentRegion = tree.regions.find((region) => region.regionType === PhiCmsRegionType.Content);
  const heroRegion = tree.regions.find((region) => region.regionType === PhiCmsRegionType.Hero);
  const regionConfig = (contentRegion?.config ?? {}) as Record<string, unknown>;
  const heroOverlap = heroRegion ? regionConfig.heroOverlap : undefined;

  if (contentRegion) {
    const edge = stepOf(regionConfig.padding);
    if (edge !== "md") {
      findings.push({
        node: `region ${contentRegion.id}`,
        message: "The content Region is the Page's edge and states `padding: PHI_SPACE.md`.",
      });
    }
    if (heroOverlap != null && stepOf(heroOverlap) == null) {
      findings.push({ node: `region ${contentRegion.id}`, message: "`heroOverlap` is a step of `PHI_SPACE`." });
    }
  }

  const byId = new Map<unknown, PhiCmsLayoutNode>(tree.layoutNodes.map((node) => [node.id, node]));
  const childrenOf = (id: unknown) => tree.layoutNodes.filter((node) => node.parentLayoutNodeId === id);

  // The Page column: the content Region's root Layout holds one vertical Flex.
  const contentRoot = contentRegion ? byId.get(contentRegion.rootLayoutNodeId) : undefined;
  if (contentRoot) {
    const column = typeKeyOf(contentRoot) === "content" ? childrenOf(contentRoot.id)[0] : contentRoot;
    if (!column || typeKeyOf(column) !== "flex-vertical") {
      findings.push({
        node: nameOf(contentRoot),
        message: "The Page column under the content Region is one `flex-vertical`.",
      });
    }
  }

  const heroRootId = heroRegion?.rootLayoutNodeId;
  // A band under the Header keeps its sides on the small step without a Surface; nothing above or below.
  const headerBottomRootId = tree.regions
    .find((region) => region.regionType === PhiCmsRegionType.HeaderBottom)?.rootLayoutNodeId;
  for (const node of tree.layoutNodes) {
    const config = (node.config ?? {}) as Record<string, unknown>;
    const typeKey = typeKeyOf(node);
    const surface = readPhiSurface(config.surface);

    for (const key of SPACING_KEYS) {
      const value = config[key];
      if (value == null) continue;
      const step = stepOf(value);
      if (step == null) {
        findings.push({
          node: nameOf(node),
          message: `\`${key}\` is \`${String(value)}\`; a preset names a step of \`PHI_SPACE\`, never a number, a string or \`clamp()\`.`,
        });
        continue;
      }
      if ((EMPHASIS_STEPS as readonly string[]).includes(step)) {
        const heroBottom = node.id === heroRootId && key === "paddingBottom" && heroOverlap != null;
        if (!heroBottom) {
          findings.push({
            node: nameOf(node),
            message: `\`${key}\` is \`${step}\`. Above \`md\` is the author's emphasis; a preset stays at ${PRESET_STEPS.join(", ")} -- but a Hero's bottom beside \`heroOverlap\`.`,
          });
        }
      }
    }

    if (node.id === headerBottomRootId) {
      const sideSteps = ["paddingLeft", "paddingRight"].map((key) => stepOf(config[key]));
      const blocks = ["paddingTop", "paddingBottom"].map((key) => stepOf(config[key]));
      if (sideSteps.some((step) => step !== "sm") || blocks.some((step) => step != null && step !== "none")
        || (config.padding != null && stepOf(config.padding) !== "none")) {
        findings.push({
          node: nameOf(node),
          message: "A band under the Header states `padding: 0` and its sides `PHI_SPACE.sm`.",
        });
      }
      continue;
    }

    if (!surface && typeKey !== "content") {
      if (hasPadding(config)) {
        findings.push({
          node: nameOf(node),
          message: "Has a padding but no Surface. A Layout without a Surface only arranges; padding belongs to an edge one can see.",
        });
      } else if (DEFAULT_PADDED_LAYOUTS.has(typeKey) && config.padding == null) {
        findings.push({
          node: nameOf(node),
          message: `States no padding, so the ${typeKey} keeps its default inset; without a Surface it states \`padding: 0\`.`,
        });
      }
    }
  }

  return findings;
}
