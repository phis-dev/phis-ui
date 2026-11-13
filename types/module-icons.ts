/**
 * Icons a Module registers for itself, so its presets and Widget configs can name them.
 *
 * Plain data, because that is all an icon is: a drawing the Module bundles in its own source, filled
 * with `currentColor` so it follows the Theme. The definition carries it (`icons`), the resolved Module
 * set hands the active Modules' icons to the Area as props, and `PhiIcon` draws one by its name,
 * `module:<runtime module id>/<icon name>` (`createPhiModuleIconName`). Nothing is fetched, and an icon
 * of a Module that is not active where it is drawn is not there.
 */

/** One outline drawing: a view box and the path data drawn in it, filled with `currentColor`. */
export type PhiModuleIconDrawing = {
  viewBox: string;
  /** Every path is filled; several paths draw one mark. */
  paths: readonly string[];
  /** Ant Design draws some outlines with `evenodd`; the SVG default is `nonzero`. */
  fillRule?: "nonzero" | "evenodd";
};

/** An icon as the definition carries it. */
export type PhiModuleIcon = {
  /** One lower-case kebab segment, unique within the Module (`isPhiModuleIconName`). */
  name: string;
  /** What the Builder's icon picker shows beside it, in the Module's source locale. */
  label: string;
  drawing: PhiModuleIconDrawing;
};

/**
 * An Ant Design icon definition as `@ant-design/icons-svg` ships it -- the same data, under a structure
 * of its own. Typed here by shape so that neither this package nor a Module has to import that
 * package's types to hand one over. Only an outline or filled definition is a drawing; a two-tone one is
 * a function of two colours, and is refused.
 */
export type PhiModuleIconSvgDefinition = {
  name: string;
  theme: string;
  icon: PhiModuleIconSvgNode | ((primaryColor: string, secondaryColor: string) => PhiModuleIconSvgNode);
};

export type PhiModuleIconSvgNode = {
  tag: string;
  attrs: { readonly [key: string]: string };
  children?: readonly PhiModuleIconSvgNode[];
};

/** An icon as a Module writes it into `definePhiModuleIcons`: its own drawing, or an Ant Design one. */
export type PhiModuleIconInput = {
  name: string;
  label: string;
  drawing: PhiModuleIconDrawing | PhiModuleIconSvgDefinition;
};

/** One active Module's icons, as an Area or the Builder receives them. */
export type PhiModuleIconSet = {
  moduleId: `${string}/${string}`;
  /** The Module's title, which the icon picker groups the icons under. */
  title: string;
  icons: readonly PhiModuleIcon[];
};
