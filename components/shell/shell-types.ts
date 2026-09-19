import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiSignalRoute } from "../../types/signals";

/**
 * One Area in the account menu's list of the Areas this person may enter.
 *
 * It lives with the other menu shapes rather than beside the function that builds it: that function
 * reads every Area definition, and a Client menu importing its type would pull the whole Module graph
 * across the Server boundary with it -- a type import that is meant to disappear, from a module that
 * cannot.
 */
export type PhiAccountAreaEntry = {
  area: PhiCmsAreaKey;
  label: string;
  href: string;
  /** The one the reader is standing in: shown, so the menu says where they are, and not a link. */
  current: boolean;
};

export type PhiNavItem = {
  key: string;
  label: string;
  href?: string;
  icon?: string;
  external?: boolean;
  newTab?: boolean;
  disabled?: boolean;
  separator?: boolean;
  action?: "logout";
  /**
   * The Overlay this item opens, as a resolved `cms:` instance id.
   *
   * Present instead of `href`: there is nowhere to go, so the control renders a button and sends the
   * generic dialog open command. Mutually exclusive with `href` by construction -- an Overlay target
   * carries no path.
   */
  overlayInstanceId?: string;
  /**
   * What this entry sends when it is chosen, instead of going somewhere.
   *
   * The entry is the sender: its `key` is the resolved instance id, and a signal address is
   * `cms:<instanceId>`. A renderer that finds these draws a button and dispatches them; one that does
   * not understand them draws a label that leads nowhere, which is what an entry with no href is.
   */
  emits?: readonly PhiSignalRoute[];
  children?: PhiNavItem[];
};

export type PhiShellSide = "left" | "right";
export type PhiMenuTheme = "light" | "dark";
export type PhiShellLayoutType = "landing" | "public" | "docs" | "shop" | "account" | "admin";
export type PhiShellRegionKey =
  | "header"
  | "leftSidebar"
  | "content"
  | "rightSidebar"
  | "footer"
  | "drawer";

export type PhiShellRegionVariant = {
  background?: string | null;
  color?: string | null;
};

export type PhiShellRegionMetrics = {
  height?: number | null;
  width?: number | null;
  collapsedWidth?: number | null;
  sticky?: boolean | null;
  offsetTop?: number | null;
  zIndex?: number | null;
};

export type PhiShellRegionTheme = {
  light?: PhiShellRegionVariant | null;
  dark?: PhiShellRegionVariant | null;
} & PhiShellRegionMetrics;

export type PhiShellTheme = {
  contentMax?: number;
  light?: PhiShellRegionVariant | null;
  dark?: PhiShellRegionVariant | null;
  header?: {
    light?: PhiShellRegionVariant | null;
    dark?: PhiShellRegionVariant | null;
    top?: PhiShellRegionTheme | null;
    main?: PhiShellRegionTheme | null;
    bottom?: PhiShellRegionTheme | null;
  } & PhiShellRegionMetrics | null;
  sider?: {
    light?: PhiShellRegionVariant | null;
    dark?: PhiShellRegionVariant | null;
    left?: PhiShellRegionTheme | null;
    right?: PhiShellRegionTheme | null;
  } & PhiShellRegionMetrics | null;
  footer?: {
    light?: PhiShellRegionVariant | null;
    dark?: PhiShellRegionVariant | null;
    top?: PhiShellRegionTheme | null;
    main?: PhiShellRegionTheme | null;
    bottom?: PhiShellRegionTheme | null;
  } & PhiShellRegionMetrics | null;
};

export type PhiShellLayoutDefinition = {
  type: PhiShellLayoutType;
  regions: {
    header: boolean;
    leftSidebar: boolean;
    content: boolean;
    rightSidebar: boolean;
    footer: boolean;
    drawer: boolean;
  };
};

export const PHI_SHELL_LAYOUTS: Record<PhiShellLayoutType, PhiShellLayoutDefinition> = {
  landing: {
    type: "landing",
    regions: {
      header: true,
      leftSidebar: false,
      content: true,
      rightSidebar: false,
      footer: true,
      drawer: false,
    },
  },
  public: {
    type: "public",
    regions: {
      header: true,
      leftSidebar: true,
      content: true,
      rightSidebar: false,
      footer: true,
      drawer: false,
    },
  },
  docs: {
    type: "docs",
    regions: {
      header: true,
      leftSidebar: true,
      content: true,
      rightSidebar: true,
      footer: true,
      drawer: false,
    },
  },
  shop: {
    type: "shop",
    regions: {
      header: true,
      leftSidebar: true,
      content: true,
      rightSidebar: true,
      footer: true,
      drawer: true,
    },
  },
  account: {
    type: "account",
    regions: {
      header: true,
      leftSidebar: true,
      content: true,
      rightSidebar: true,
      footer: false,
      drawer: false,
    },
  },
  admin: {
    type: "admin",
    regions: {
      header: true,
      leftSidebar: true,
      content: true,
      rightSidebar: true,
      footer: false,
      drawer: true,
    },
  },
};
