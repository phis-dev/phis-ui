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
