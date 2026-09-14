import type { PhiShadow } from "./layout-style";
import type { PhiCmsBackgroundWidgetConfig } from "../components/widgets/config/background";

export type PhiSiteRemSettings = {
  rootValue?: number | null;
};

/**
 * The Theme Root Background (SHELL.md "Root Background and Shell Backdrop Layers"): painted once at
 * the document root, independently per mode, using the canonical structured Phi Background contract.
 * An unconfigured mode falls back to the resolved Ant Design layout background.
 */
export type PhiSiteThemeRoot = {
  background?: {
    light?: PhiCmsBackgroundWidgetConfig | null;
    dark?: PhiCmsBackgroundWidgetConfig | null;
  } | null;
  /**
   * The Shell Chrome Overlay (SHELL.md "Root Background and Shell Backdrop Layers"): the ground the
   * Header, Sider and Footer Regions share, independently per mode, using the same canonical
   * structured Phi Background contract as the Root Background.
   *
   * Site-owned like the Root Background, and for the same reason: it is one continuous surface across
   * the whole Shell frame, not a value a single Region owns. Content and Hero never take it -- the
   * overlay would paint over their content, and the frame is exactly what is left when both are taken
   * out. A Region that authors its own Background or Effect paints over it.
   */
  chrome?: {
    light?: PhiCmsBackgroundWidgetConfig | null;
    dark?: PhiCmsBackgroundWidgetConfig | null;
    /**
     * The Shadow each Chrome pane casts at its own outside edge, on the canonical Shadow contract
     * (SHELL.md): `none`, a shared preset, or an explicit custom value.
     *
     * One entry per family rather than one for the frame, because a Shadow cannot point in three
     * directions at once: the Header casts down onto the Page, a Sider sideways at its outer inline
     * edge, and the Footer up towards the Content. It sits beside the ground rather than in it because
     * it is not a mode value -- the frame is one surface in either mode, and a Shadow that changed with
     * the mode would be a second ground, not an edge.
     */
    shadow?: {
      header?: PhiShadow | null;
      sider?: PhiShadow | null;
      footer?: PhiShadow | null;
    } | null;
  } | null;
};

/**
 * One piece of the Wordmark.
 *
 * The Wordmark is a sequence of parts rather than a string because a two-tone name is one word in two
 * colours, and there is nowhere in a string to say that. A name in one colour is the same shape with
 * one part in it.
 */
export type PhiSiteThemeWordmarkPart = {
  text: string;
  color?: string | null;
  fontWeight?: number | string | null;
};

/**
 * The Site's name as it is set, with the typography that belongs to the name rather than to the text
 * around it -- a Wordmark is usually not the body face, and it usually does not track like running text.
 * What each part says for itself wins over what the Wordmark says for all of them.
 */
export type PhiSiteThemeWordmark = {
  fontFamily?: string | null;
  fontWeight?: number | string | null;
  /** Slanting, which is its own axis: a name is regularly both bold and italic. */
  fontStyle?: "normal" | "italic" | null;
  letterSpacing?: string | null;
  parts?: PhiSiteThemeWordmarkPart[] | null;
};

/** A line the Site carries in its frame: what it says, and the icon in front of it. */
export type PhiSiteThemeBrandLine = {
  label?: string | null;
  icon?: string | null;
};

/**
 * Who this Site says it is: the Logo, the Wordmark and the two lines that accompany them.
 *
 * Site identity, so it lives in the Theme record and never in an Area Preset -- a Preset is shared by
 * every Site that follows it, and a brand in there would be the brand of all of them. What a Preset
 * decides is whether and how the Brand Widget appears; what it shows is decided here.
 */
export type PhiSiteThemeBrand = {
  /** Where the Brand Widget leads when it is clicked. The Site root where nothing says otherwise. */
  homeHref?: string | null;
  /** The small line above the Wordmark, for Sites whose name needs a word of context. */
  eyebrow?: string | null;
  /** The Logo, as an asset of this Site's own Media library. */
  logoAssetId?: number | null;
  /**
   * The delivered form of `logoAssetId`, resolved when the Site config is read and never authored.
   *
   * It is part of this shape rather than a second one because every reader wants the resolved record,
   * and a Brand that carried only the id would make each of them build the URL again. Authoring
   * surfaces write `logoAssetId` and leave this alone; where they need to show the picture before the
   * Site has resolved anything, `buildPhiMediaAssetContentDeliveryUrl` builds the same address.
   */
  logoUrl?: string | null;
  /** What the Logo says to somebody who cannot see it. Falls back to the asset's own alt text. */
  logoAlt?: string | null;
  slogan?: PhiSiteThemeBrandLine | null;
  location?: PhiSiteThemeBrandLine | null;
  wordmark?: PhiSiteThemeWordmark | null;
};

/** The one way to reach whoever runs this Site, as the frame offers it. */
export type PhiSiteThemeContact = {
  label?: string | null;
  href?: string | null;
  icon?: string | null;
};

export type PhiWidgetFontFamilyKey =
  | "inherit"
  | "system"
  | "body"
  | "mono"
  | "serif"
  | "accent"
  | "display";

export type PhiWidgetFontSizeKey =
  | "inherit"
  | "xs"
  | "sm"
  | "base"
  | "lg"
  | "xl";

// Theme font slots stay stable even if the underlying loading strategy changes later.
// The current shared baseline is body=Fira Sans, mono=Fira Mono, serif=Lora.
// Accent and display remain open slots and currently fall back to body and serif.
export type PhiSiteFontSlots = {
  body?: string | null;
  mono?: string | null;
  serif?: string | null;
  accent?: string | null;
  display?: string | null;
};
