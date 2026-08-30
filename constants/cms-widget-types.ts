function buildNamespacedTypeKey(pluginKey: string, typeKey: string) {
  return `${pluginKey}/${typeKey}`;
}

function defineWidgetType(pluginKey: string, typeKey: string) {
  return buildNamespacedTypeKey(pluginKey, typeKey);
}

const PHI_CMS_WIDGET_PLUGIN_KEY_BASE = "@phis/ui/modules";

/**
 * A Widget type is namespaced by the module that owns it, so loading a module loads its Widgets and
 * nothing else names them. The owner comes from the runtime module catalog, which refuses two modules
 * claiming one type.
 */
export const PHI_CMS_WIDGET_PLUGIN_KEYS = {
  "asset": `${PHI_CMS_WIDGET_PLUGIN_KEY_BASE}/asset/widgets`,
  "auth": `${PHI_CMS_WIDGET_PLUGIN_KEY_BASE}/auth/widgets`,
  "avatar": `${PHI_CMS_WIDGET_PLUGIN_KEY_BASE}/avatar/widgets`,
  "builder": `${PHI_CMS_WIDGET_PLUGIN_KEY_BASE}/builder/widgets`,
  "core": `${PHI_CMS_WIDGET_PLUGIN_KEY_BASE}/core/widgets`,
  "observability": `${PHI_CMS_WIDGET_PLUGIN_KEY_BASE}/observability/widgets`,
  "theme": `${PHI_CMS_WIDGET_PLUGIN_KEY_BASE}/theme/widgets`,
} as const;

const PHI_CMS_WIDGET_MODULE_BY_TYPE_KEY: Readonly<Record<string, keyof typeof PHI_CMS_WIDGET_PLUGIN_KEYS>> = {
  "account": "core",
  "account-avatar": "avatar",
  "account-avatar-picker": "avatar",
  "area-menu": "core",
  "area-upload": "asset",
  "asset-focal-rect": "asset",
  "auth-logout": "auth",
  "auth-security": "auth",
  "brand": "core",
  "breadcrumb": "core",
  "builder-brand-style-controls": "theme",
  "builder-brand-theme-controls": "theme",
  "builder-brand-theme-preview": "theme",
  "builder-chrome-controls": "builder",
  "builder-draft-status": "builder",
  "builder-inspector-header": "builder",
  "builder-layout-anchor-inspector": "builder",
  "builder-layout-background-inspector": "builder",
  "builder-layout-border-inspector": "builder",
  "builder-layout-fields-inspector": "builder",
  "builder-layout-settings-inspector": "builder",
  "builder-layout-shadow-inspector": "builder",
  "builder-layout-signals-inspector": "builder",
  "builder-layout-viewport-inspector": "builder",
  "builder-mode-switch": "builder",
  "builder-pages-workspace": "builder",
  "builder-region-background-inspector": "builder",
  "builder-region-border-inspector": "builder",
  "builder-region-geometry-inspector": "builder",
  "builder-region-padding-inspector": "builder",
  "builder-region-shadow-inspector": "builder",
  "builder-region-viewport-inspector": "builder",
  "builder-shells-workspace": "builder",
  "builder-widget-geometry-inspector": "builder",
  "builder-widget-settings-inspector": "builder",
  "builder-widget-signals-inspector": "builder",
  "builder-widget-viewport-inspector": "builder",
  "button": "core",
  "card": "core",
  "cascader": "core",
  "checkbox": "core",
  "checkbox-group": "core",
  "collection-view": "core",
  "color": "core",
  "command-toolbar": "core",
  "date-picker": "core",
  "description": "core",
  "developer-builder-pages-header": "builder",
  "dimension": "core",
  "footer": "core",
  "form": "core",
  "header-navigation": "core",
  "hello-world": "builder",
  "html": "core",
  "icon": "core",
  "image": "core",
  "image-inspector": "asset",
  "input": "core",
  "length": "core",
  "locale": "core",
  "markdown": "core",
  "markdown-toc": "core",
  "media-picker": "asset",
  "multi-select": "core",
  "number-input": "core",
  "observability-log-detail": "observability",
  "page-title": "core",
  "pagination": "core",
  "profile-email": "core",
  "profile-locale": "core",
  "profile-name": "core",
  "profile-overview": "core",
  "profile-password": "core",
  "quick-links": "core",
  "rate": "core",
  "result": "core",
  "segmented": "core",
  "select-box": "core",
  "sidebar-navigation": "core",
  "simple-text": "core",
  "slider": "core",
  "spacer": "core",
  "structure-region": "builder",
  "switch": "core",
  "tab-bar": "core",
  "table": "core",
  "test-block": "builder",
  "tree": "core",
};

export function resolvePhiCmsWidgetPluginKey(typeKey: string): string {
  const moduleKey = PHI_CMS_WIDGET_MODULE_BY_TYPE_KEY[typeKey];
  if (!moduleKey) {
    throw new Error(`Unknown CMS widget type key "${typeKey}".`);
  }
  return PHI_CMS_WIDGET_PLUGIN_KEYS[moduleKey];
}

export const PhiCmsWidgetType = {
  Account: defineWidgetType(resolvePhiCmsWidgetPluginKey("account"), "account"),
  AreaMenu: defineWidgetType(resolvePhiCmsWidgetPluginKey("area-menu"), "area-menu"),
  Brand: defineWidgetType(resolvePhiCmsWidgetPluginKey("brand"), "brand"),
  Card: defineWidgetType(resolvePhiCmsWidgetPluginKey("card"), "card"),
  Breadcrumb: defineWidgetType(resolvePhiCmsWidgetPluginKey("breadcrumb"), "breadcrumb"),
  Button: defineWidgetType(resolvePhiCmsWidgetPluginKey("button"), "button"),
  Dimension: defineWidgetType(resolvePhiCmsWidgetPluginKey("dimension"), "dimension"),
  DatePicker: defineWidgetType(resolvePhiCmsWidgetPluginKey("date-picker"), "date-picker"),
  Length: defineWidgetType(resolvePhiCmsWidgetPluginKey("length"), "length"),
  Input: defineWidgetType(resolvePhiCmsWidgetPluginKey("input"), "input"),
  NumberInput: defineWidgetType(resolvePhiCmsWidgetPluginKey("number-input"), "number-input"),
  Slider: defineWidgetType(resolvePhiCmsWidgetPluginKey("slider"), "slider"),
  Rate: defineWidgetType(resolvePhiCmsWidgetPluginKey("rate"), "rate"),
  Checkbox: defineWidgetType(resolvePhiCmsWidgetPluginKey("checkbox"), "checkbox"),
  CheckboxGroup: defineWidgetType(resolvePhiCmsWidgetPluginKey("checkbox-group"), "checkbox-group"),
  MultiSelect: defineWidgetType(resolvePhiCmsWidgetPluginKey("multi-select"), "multi-select"),
  Cascader: defineWidgetType(resolvePhiCmsWidgetPluginKey("cascader"), "cascader"),
  Color: defineWidgetType(resolvePhiCmsWidgetPluginKey("color"), "color"),
  CommandToolbar: defineWidgetType(resolvePhiCmsWidgetPluginKey("command-toolbar"), "command-toolbar"),
  Image: defineWidgetType(resolvePhiCmsWidgetPluginKey("image"), "image"),
  Description: defineWidgetType(resolvePhiCmsWidgetPluginKey("description"), "description"),
  Footer: defineWidgetType(resolvePhiCmsWidgetPluginKey("footer"), "footer"),
  Form: defineWidgetType(resolvePhiCmsWidgetPluginKey("form"), "form"),
  HeaderNavigation: defineWidgetType(resolvePhiCmsWidgetPluginKey("header-navigation"), "header-navigation"),
  Locale: defineWidgetType(resolvePhiCmsWidgetPluginKey("locale"), "locale"),
  Markdown: defineWidgetType(resolvePhiCmsWidgetPluginKey("markdown"), "markdown"),
  MarkdownToc: defineWidgetType(resolvePhiCmsWidgetPluginKey("markdown-toc"), "markdown-toc"),
  TabBar: defineWidgetType(resolvePhiCmsWidgetPluginKey("tab-bar"), "tab-bar"),
  CollectionView: defineWidgetType(resolvePhiCmsWidgetPluginKey("collection-view"), "collection-view"),
  Table: defineWidgetType(resolvePhiCmsWidgetPluginKey("table"), "table"),
  Tree: defineWidgetType(resolvePhiCmsWidgetPluginKey("tree"), "tree"),
  AreaUpload: defineWidgetType(resolvePhiCmsWidgetPluginKey("area-upload"), "area-upload"),
  ImageInspector: defineWidgetType(resolvePhiCmsWidgetPluginKey("image-inspector"), "image-inspector"),
  AssetFocalRect: defineWidgetType(resolvePhiCmsWidgetPluginKey("asset-focal-rect"), "asset-focal-rect"),
  MediaPicker: defineWidgetType(resolvePhiCmsWidgetPluginKey("media-picker"), "media-picker"),
  AccountAvatar: defineWidgetType(resolvePhiCmsWidgetPluginKey("account-avatar"), "account-avatar"),
  AccountAvatarPicker: defineWidgetType(resolvePhiCmsWidgetPluginKey("account-avatar-picker"), "account-avatar-picker"),
  ProfileEmail: defineWidgetType(resolvePhiCmsWidgetPluginKey("profile-email"), "profile-email"),
  ProfileOverview: defineWidgetType(resolvePhiCmsWidgetPluginKey("profile-overview"), "profile-overview"),
  ProfileName: defineWidgetType(resolvePhiCmsWidgetPluginKey("profile-name"), "profile-name"),
  ProfileLocale: defineWidgetType(resolvePhiCmsWidgetPluginKey("profile-locale"), "profile-locale"),
  ProfilePassword: defineWidgetType(resolvePhiCmsWidgetPluginKey("profile-password"), "profile-password"),
  Result: defineWidgetType(resolvePhiCmsWidgetPluginKey("result"), "result"),
  Pagination: defineWidgetType(resolvePhiCmsWidgetPluginKey("pagination"), "pagination"),
  Segmented: defineWidgetType(resolvePhiCmsWidgetPluginKey("segmented"), "segmented"),
  SelectBox: defineWidgetType(resolvePhiCmsWidgetPluginKey("select-box"), "select-box"),
  Spacer: defineWidgetType(resolvePhiCmsWidgetPluginKey("spacer"), "spacer"),
  Switch: defineWidgetType(resolvePhiCmsWidgetPluginKey("switch"), "switch"),
  Html: defineWidgetType(resolvePhiCmsWidgetPluginKey("html"), "html"),
  SidebarNavigation: defineWidgetType(resolvePhiCmsWidgetPluginKey("sidebar-navigation"), "sidebar-navigation"),
  HelloWorld: defineWidgetType(resolvePhiCmsWidgetPluginKey("hello-world"), "hello-world"),
  TestBlock: defineWidgetType(resolvePhiCmsWidgetPluginKey("test-block"), "test-block"),
  Icon: defineWidgetType(resolvePhiCmsWidgetPluginKey("icon"), "icon"),
  SimpleText: defineWidgetType(resolvePhiCmsWidgetPluginKey("simple-text"), "simple-text"),
  PageTitle: defineWidgetType(resolvePhiCmsWidgetPluginKey("page-title"), "page-title"),
  QuickLinks: defineWidgetType(resolvePhiCmsWidgetPluginKey("quick-links"), "quick-links"),
} as const;

export function buildPhiCmsWidgetNamespacedTypeKey(pluginKey: string, typeKey: string) {
  return buildNamespacedTypeKey(pluginKey, typeKey);
}

export function splitPhiCmsWidgetNamespacedTypeKey(namespacedTypeKey: string) {
  const index = namespacedTypeKey.lastIndexOf("/");
  if (index <= 0 || index === namespacedTypeKey.length - 1) {
    throw new Error(`Invalid CMS widget type key "${namespacedTypeKey}".`);
  }

  return {
    pluginKey: namespacedTypeKey.slice(0, index),
    typeKey: namespacedTypeKey.slice(index + 1),
  };
}
