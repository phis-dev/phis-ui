import { PhiCmsRegionType } from "../constants/phi-cms";

import { PHI_PAGE, PHI_SPACE } from "../theme/antd-css-var-contract";
import { resolvePhiPageInset } from "./page-inset";
import type { PhiCmsLayoutNode, PhiResolvedCmsPageTree } from "../types/cms";
import {
  parsePhiCmsCarouselLayoutConfig,
  parsePhiCmsCollapsibleLayoutConfig,
  parsePhiCmsContentLayoutConfig,
  parsePhiCmsFlexLayoutConfig,
  parsePhiCmsFlexVerticalLayoutConfig,
  parsePhiCmsGridLayoutConfig,
  parsePhiCmsMasonryLayoutConfig,
  parsePhiCmsSplitCardLayoutConfig,
  parsePhiCmsStackLayoutConfig,
  parsePhiCmsThreeColumnLayoutConfig,
} from "../types/cms-config";
import { readPhiSurface } from "../types/surface";

/**
 * The Page rule as a check (THIRD_PARTY_MODULES.md, "6b. Laying out a Page").
 *
 * For presets -- what a package or Core writes in code, by hand or by an agent. A package runs it over the
 * trees its route presets build, in its own verify step, and treats a finding as an error. It is never run
 * on what an author saves in the Builder: there the scale is what the Inspector offers, and a value off it
 * is the author's to choose.
 *
 * It reads the stated config only and resolves nothing: a distance is a step of `PHI_SPACE` or nothing, and
 * a Layout's config is one its own parser takes -- a Grid of five columns is refused, for the Grid takes 1,
 * 2, 3, 4 or 6, and on a live page a Layout whose config is refused is left out without a message. Widget
 * configs are not parsed here; their parsers live with the Widgets.
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

/** The strict parser of each Layout type that has one in the contract layer (the plugins' `parseConfig`). */
const LAYOUT_CONFIG_PARSERS: Record<string, (config: Record<string, unknown>) => unknown> = {
  content: parsePhiCmsContentLayoutConfig,
  flex: parsePhiCmsFlexLayoutConfig,
  "flex-vertical": parsePhiCmsFlexVerticalLayoutConfig,
  masonry: parsePhiCmsMasonryLayoutConfig,
  stack: parsePhiCmsStackLayoutConfig,
  carousel: parsePhiCmsCarouselLayoutConfig,
  collapsible: parsePhiCmsCollapsibleLayoutConfig,
  grid: parsePhiCmsGridLayoutConfig,
  "three-column": parsePhiCmsThreeColumnLayoutConfig,
  "split-card": parsePhiCmsSplitCardLayoutConfig,
};

/*
 * The Theme's Page inset (`PHI_PAGE.padding`, THEME.md "Page padding") is a step of the spacing scale per
 * side and screen, chosen by the Theme: a distance like any other, at the preset level.
 */
const PAGE_INSET_REFERENCES = new Set<unknown>([...Object.values(PHI_PAGE.padding), ...Object.values(PHI_PAGE.signedInPadding)]);
const PAGE_INSET_SIDES = [["paddingTop", "top"], ["paddingRight", "right"], ["paddingBottom", "bottom"], ["paddingLeft", "left"]] as const;

function stepOf(value: unknown): string | null {
  if (value === 0 || value === "0") return "none";
  if (PAGE_INSET_REFERENCES.has(value)) return "page";
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
    /*
     * The Page's edge is the Theme's, on all four sides: a number, or a step of the scale, would stay what
     * it was the day the preset was written, whatever the Site's Theme says.
     */
    const inset = resolvePhiPageInset(tree.page?.areaMask);
    const scope = inset === PHI_PAGE.padding ? "PHI_PAGE.padding" : "PHI_PAGE.signedInPadding";
    if (PAGE_INSET_SIDES.some(([key, side]) => regionConfig[key] !== inset[side])) {
      findings.push({
        node: `region ${contentRegion.id}`,
        message: `The content Region is the Page's edge and states the Theme's inset on all four sides: \`paddingTop\` to \`paddingLeft\` from \`${scope}\`.`,
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
  /*
   * An Overlay's footer is the dialog's action row, built by `dialog` on `createPhiCmsPresetNodes` and held
   * to its own contract by the descriptor compiler (OVERLAYS.md, "Structured dialogs"): its inset is the
   * dialog's, not a Page Layout's, so the Surface rule below does not apply to it.
   */
  const overlayFooterIds = new Set(tree.overlays.flatMap((overlay) =>
    overlay.footerLayoutNodeId == null ? [] : [overlay.footerLayoutNodeId]));
  for (const node of tree.layoutNodes) {
    const config = (node.config ?? {}) as Record<string, unknown>;
    const typeKey = typeKeyOf(node);
    const surface = readPhiSurface(config.surface);

    const parse = Object.hasOwn(LAYOUT_CONFIG_PARSERS, typeKey) ? LAYOUT_CONFIG_PARSERS[typeKey] : undefined;
    if (parse) {
      try {
        parse(config);
      } catch (error) {
        findings.push({
          node: nameOf(node),
          message: `its config is refused: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

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

    if (!surface && typeKey !== "content" && !overlayFooterIds.has(node.id)) {
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
