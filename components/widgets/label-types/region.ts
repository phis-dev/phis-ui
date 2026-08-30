export type PhiRegionWidgetLabelEntry = {
  title: string;
  subtitle: string;
};

export type PhiRegionWidgetLabels = {
  structure: {
    surface: {
      title: string;
      siderFullHeight: string;
      selectedPageHeaderBand: string;
      pageSidebar: string;
      contentTitle: string;
      contentDescription: string;
    };
  };
  regions: {
    headerTop: PhiRegionWidgetLabelEntry;
    headerMain: PhiRegionWidgetLabelEntry;
    headerBottom: PhiRegionWidgetLabelEntry;
    hero: PhiRegionWidgetLabelEntry;
    siderLeft: PhiRegionWidgetLabelEntry;
    siderRight: PhiRegionWidgetLabelEntry;
    footerTop: PhiRegionWidgetLabelEntry;
    footerMain: PhiRegionWidgetLabelEntry;
    footerBottom: PhiRegionWidgetLabelEntry;
    content: PhiRegionWidgetLabelEntry;
  };
};

export const PHI_REGION_WIDGET_DEFAULT_LABELS: PhiRegionWidgetLabels = {
  structure: {
    surface: {
      title: "Structure",
      siderFullHeight: "Sider full height",
      selectedPageHeaderBand: "Selected page header band",
      pageSidebar: "Page sidebar beside hero and content",
      contentTitle: "Page body viewport",
      contentDescription: "Placeholder for the page body rendered by the selected page.",
    },
  },
  regions: {
    headerTop: {
      title: "Header Top",
      subtitle: "Global utility and site branding",
    },
    headerMain: {
      title: "Header Main",
      subtitle: "Primary area toolbar and navigation",
    },
    headerBottom: {
      title: "Header Bottom",
      subtitle: "Secondary header controls",
    },
    hero: {
      title: "Hero",
      subtitle: "Page hero content",
    },
    siderLeft: {
      title: "Sider Left",
      subtitle: "Sidebar navigation",
    },
    siderRight: {
      title: "Sider Right",
      subtitle: "Sidebar tools and actions",
    },
    footerTop: {
      title: "Footer Top",
      subtitle: "Footer toolbar",
    },
    footerMain: {
      title: "Footer Main",
      subtitle: "Footer content and utility links",
    },
    footerBottom: {
      title: "Footer Bottom",
      subtitle: "Secondary footer details",
    },
    content: {
      title: "Content",
      subtitle: "Page body content",
    },
  },
};

export function getPhiRegionWidgetLabelEntry(
  regionKey: string | null,
  labels: PhiRegionWidgetLabels = PHI_REGION_WIDGET_DEFAULT_LABELS,
) {
  switch (regionKey) {
    case "header_top":
      return labels.regions.headerTop;
    case "header_main":
      return labels.regions.headerMain;
    case "header_bottom":
      return labels.regions.headerBottom;
    case "hero":
      return labels.regions.hero;
    case "sider_left":
      return labels.regions.siderLeft;
    case "sider_right":
      return labels.regions.siderRight;
    case "footer_top":
      return labels.regions.footerTop;
    case "footer_main":
      return labels.regions.footerMain;
    case "footer_bottom":
      return labels.regions.footerBottom;
    case "content":
      return labels.regions.content;
    default:
      return null;
  }
}
