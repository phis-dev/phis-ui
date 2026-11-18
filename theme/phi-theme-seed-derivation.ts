/*
 * Which colour tokens Ant Design derives from which seed, as far as an author edits them: the seed the
 * Brand tab shows as a section, and the derived tokens it shows below it.
 *
 * The palette resolver reads it to decide what a seed the Site states takes over: a Theme's palette
 * block may state a derived colour outright (a hover tone, a container background) because it suits the
 * block's own seed. Once the Site states that seed, the block's derived colours of it no longer apply and
 * Ant Design derives them from the Site's seed instead (`resolvePhiThemeColorTokens`). The Brand tab
 * builds its sections from the same table, so what it offers below a seed is exactly what that seed
 * takes over.
 */
export const PHI_THEME_COLOR_SEED_DERIVATIONS = [
  {
    key: "colorPrimary",
    derived: [
      { key: "colorPrimaryBg", label: "Bg" },
      { key: "colorPrimaryBgHover", label: "Bg Hover" },
      { key: "colorPrimaryBorder", label: "Border" },
      { key: "colorPrimaryBorderHover", label: "Border Hover" },
      { key: "colorPrimaryHover", label: "Hover" },
      { key: "colorPrimaryActive", label: "Active" },
      { key: "colorPrimaryText", label: "Text" },
      { key: "colorPrimaryTextHover", label: "Text Hover" },
      { key: "colorPrimaryTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorInfo",
    derived: [
      { key: "colorInfoBg", label: "Bg" },
      { key: "colorInfoBgHover", label: "Bg Hover" },
      { key: "colorInfoBorder", label: "Border" },
      { key: "colorInfoBorderHover", label: "Border Hover" },
      { key: "colorInfoHover", label: "Hover" },
      { key: "colorInfoActive", label: "Active" },
      { key: "colorInfoText", label: "Text" },
      { key: "colorInfoTextHover", label: "Text Hover" },
      { key: "colorInfoTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorSuccess",
    derived: [
      { key: "colorSuccessBg", label: "Bg" },
      { key: "colorSuccessBgHover", label: "Bg Hover" },
      { key: "colorSuccessBorder", label: "Border" },
      { key: "colorSuccessBorderHover", label: "Border Hover" },
      { key: "colorSuccessHover", label: "Hover" },
      { key: "colorSuccessActive", label: "Active" },
      { key: "colorSuccessText", label: "Text" },
      { key: "colorSuccessTextHover", label: "Text Hover" },
      { key: "colorSuccessTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorWarning",
    derived: [
      { key: "colorWarningBg", label: "Bg" },
      { key: "colorWarningBgHover", label: "Bg Hover" },
      { key: "colorWarningBorder", label: "Border" },
      { key: "colorWarningBorderHover", label: "Border Hover" },
      { key: "colorWarningHover", label: "Hover" },
      { key: "colorWarningActive", label: "Active" },
      { key: "colorWarningText", label: "Text" },
      { key: "colorWarningTextHover", label: "Text Hover" },
      { key: "colorWarningTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorError",
    derived: [
      { key: "colorErrorBg", label: "Bg" },
      { key: "colorErrorBgHover", label: "Bg Hover" },
      { key: "colorErrorBgFilledHover", label: "Bg Filled Hover" },
      { key: "colorErrorBgActive", label: "Bg Active" },
      { key: "colorErrorBorder", label: "Border" },
      { key: "colorErrorBorderHover", label: "Border Hover" },
      { key: "colorErrorHover", label: "Hover" },
      { key: "colorErrorActive", label: "Active" },
      { key: "colorErrorText", label: "Text" },
      { key: "colorErrorTextHover", label: "Text Hover" },
      { key: "colorErrorTextActive", label: "Text Active" },
    ],
  },
  {
    key: "colorLink",
    derived: [
      { key: "colorLinkHover", label: "Hover" },
      { key: "colorLinkActive", label: "Active" },
    ],
  },
  {
    key: "colorTextBase",
    derived: [
      { key: "colorText", label: "Text" },
      { key: "colorTextSecondary", label: "Secondary" },
      { key: "colorTextTertiary", label: "Tertiary" },
      { key: "colorTextQuaternary", label: "Quaternary" },
      { key: "colorTextHeading", label: "Heading" },
      { key: "colorTextLabel", label: "Label" },
      { key: "colorTextDescription", label: "Description" },
      { key: "colorTextDisabled", label: "Disabled" },
      { key: "colorTextPlaceholder", label: "Placeholder" },
      { key: "colorTextLightSolid", label: "Light Solid" },
    ],
  },
  {
    key: "colorBgBase",
    derived: [
      { key: "colorBgLayout", label: "Layout" },
      { key: "colorBgContainer", label: "Container" },
      { key: "colorBgElevated", label: "Elevated" },
      { key: "colorBgSpotlight", label: "Spotlight" },
      { key: "colorBgContainerDisabled", label: "Container Disabled" },
      { key: "colorFill", label: "Fill" },
      { key: "colorFillSecondary", label: "Fill Secondary" },
      { key: "colorFillTertiary", label: "Fill Tertiary" },
      { key: "colorFillQuaternary", label: "Fill Quaternary" },
      { key: "colorBorder", label: "Border" },
      { key: "colorBorderSecondary", label: "Border Secondary" },
      { key: "colorBorderDisabled", label: "Border Disabled" },
    ],
  },
] as const;

/** Every derived token of the table, whichever seed it belongs to. */
export const PHI_THEME_COLOR_DERIVED_TOKEN_KEYS: ReadonlySet<string> = new Set(
  PHI_THEME_COLOR_SEED_DERIVATIONS.flatMap((seed) => seed.derived.map((item) => item.key)),
);
