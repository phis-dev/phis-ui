import { PHI_THEME_ALPINE_GROUND_IMAGE } from "./alpine-ground-image";
import type { PhiThemeGroundBlock, PhiThemeSetBlock } from "../../../../theme/phi-theme-blocks";

/**
 * A ground with a picture, and the Set that uses it.
 *
 * The core ground carries its picture inline so that the floor every Site falls back to depends on no
 * file. This is a Module's picture: a photograph, far too large to inline lightly, and the whole reason
 * a Theme can be handed over as a look rather than as a palette.
 *
 * The picture is stated as a plain source, the same shape an author's own image takes once it is in
 * the Media library. That is what makes the hand-over work: the moment somebody saves a Theme that
 * resolves to this ground, the workspace takes the whole ground over -- the picture into the Site's
 * own library, frame and shadow as values -- and the draft stands on its own. From then on the Site
 * owns it and switching this Module off costs nothing.
 *
 * The Chrome is frosted and tinted rather than clear: over a photograph, plain glass leaves the Header
 * legible only where the picture happens to be quiet.
 */
export const PHI_THEME_ALPINE_GROUND: PhiThemeGroundBlock = {
  key: "alpine",
  version: 1,
  title: "Alpine",
  description: "A photograph behind the Page, with a frosted frame over it.",
  root: {
    background: {
      light: {
        base: {
          kind: "image",
          sourceKind: "url",
          sourceUrl: PHI_THEME_ALPINE_GROUND_IMAGE,
          size: "cover",
          repeat: "no-repeat",
        },
        overlay: null,
        effect: null,
        motion: null,
      },
      dark: {
        base: {
          kind: "image",
          sourceKind: "url",
          sourceUrl: PHI_THEME_ALPINE_GROUND_IMAGE,
          size: "cover",
          repeat: "no-repeat",
        },
        overlay: null,
        effect: "dim",
        motion: null,
      },
    },
    chrome: {
      light: {
        base: { kind: "color", color: "rgba(255, 255, 255, 0.62)" },
        overlay: null,
        effect: "glass",
        motion: null,
      },
      dark: {
        base: { kind: "color", color: "rgba(6, 12, 20, 0.62)" },
        overlay: null,
        effect: "glass",
        motion: null,
      },
      shadow: { header: "soft", sider: "soft", footer: "soft" },
    },
  },
};

export const PHI_THEME_ALPINE_SET: PhiThemeSetBlock = {
  key: "alpine",
  version: 1,
  title: "Alpine",
  description: "The house colour over a mountain photograph.",
  palette: "phis",
  style: "phis",
  ground: "alpine",
  fonts: "phis",
};
