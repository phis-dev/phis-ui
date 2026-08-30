import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_REGION_WIDGET_DEFAULT_LABELS,
  type PhiRegionWidgetLabels,
} from "../label-types/region";

const PHI_REGION_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:region",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    structure_surface_title: PHI_REGION_WIDGET_DEFAULT_LABELS.structure.surface.title,
    structure_surface_sider_full_height: PHI_REGION_WIDGET_DEFAULT_LABELS.structure.surface.siderFullHeight,
    structure_surface_selected_page_header_band: PHI_REGION_WIDGET_DEFAULT_LABELS.structure.surface.selectedPageHeaderBand,
    structure_surface_page_sidebar: PHI_REGION_WIDGET_DEFAULT_LABELS.structure.surface.pageSidebar,
    structure_surface_content_title: PHI_REGION_WIDGET_DEFAULT_LABELS.structure.surface.contentTitle,
    structure_surface_content_description: PHI_REGION_WIDGET_DEFAULT_LABELS.structure.surface.contentDescription,
    header_top_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.headerTop.title,
    header_top_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.headerTop.subtitle,
    header_main_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.headerMain.title,
    header_main_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.headerMain.subtitle,
    header_bottom_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.headerBottom.title,
    header_bottom_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.headerBottom.subtitle,
    hero_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.hero.title,
    hero_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.hero.subtitle,
    sider_left_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.siderLeft.title,
    sider_left_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.siderLeft.subtitle,
    sider_right_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.siderRight.title,
    sider_right_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.siderRight.subtitle,
    footer_top_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.footerTop.title,
    footer_top_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.footerTop.subtitle,
    footer_main_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.footerMain.title,
    footer_main_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.footerMain.subtitle,
    footer_bottom_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.footerBottom.title,
    footer_bottom_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.footerBottom.subtitle,
    content_title: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.content.title,
    content_subtitle: PHI_REGION_WIDGET_DEFAULT_LABELS.regions.content.subtitle,
  },
});

export async function getPhiRegionWidgetLabels(options: PhiGlobalTranslatorOptions): Promise<PhiRegionWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_REGION_WIDGET_LABEL_SET);
  return {
    structure: {
      surface: {
        title: labels.structure_surface_title,
        siderFullHeight: labels.structure_surface_sider_full_height,
        selectedPageHeaderBand: labels.structure_surface_selected_page_header_band,
        pageSidebar: labels.structure_surface_page_sidebar,
        contentTitle: labels.structure_surface_content_title,
        contentDescription: labels.structure_surface_content_description,
      },
    },
    regions: {
      headerTop: {
        title: labels.header_top_title,
        subtitle: labels.header_top_subtitle,
      },
      headerMain: {
        title: labels.header_main_title,
        subtitle: labels.header_main_subtitle,
      },
      headerBottom: {
        title: labels.header_bottom_title,
        subtitle: labels.header_bottom_subtitle,
      },
      hero: {
        title: labels.hero_title,
        subtitle: labels.hero_subtitle,
      },
      siderLeft: {
        title: labels.sider_left_title,
        subtitle: labels.sider_left_subtitle,
      },
      siderRight: {
        title: labels.sider_right_title,
        subtitle: labels.sider_right_subtitle,
      },
      footerTop: {
        title: labels.footer_top_title,
        subtitle: labels.footer_top_subtitle,
      },
      footerMain: {
        title: labels.footer_main_title,
        subtitle: labels.footer_main_subtitle,
      },
      footerBottom: {
        title: labels.footer_bottom_title,
        subtitle: labels.footer_bottom_subtitle,
      },
      content: {
        title: labels.content_title,
        subtitle: labels.content_subtitle,
      },
    },
  };
}
