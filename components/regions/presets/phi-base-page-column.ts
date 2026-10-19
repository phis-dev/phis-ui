import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiCmsPageNode } from "../../../types/cms";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { PHI_SURFACE_WASH } from "../../../helpers/surface-presets";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "./phi-base-page-layout";

/**
 * A module Page's content as one column on the base scaffold: the Region, the scaffold, and a vertical
 * Flex in it that stops at `maxWidth` and wears the wash (LAYOUTING.md; `CONTENT_ENTRIES.md`, The frame).
 *
 * The scaffold spans the content Region, carries the page's padding and anchors what stands in it to the
 * centre, so the column only says where it stops. The width is a maximum: on a phone the column fills the
 * screen. Its corners are the Theme's -- the wash states no line, and a Surface without its own line takes
 * the Site's surface step.
 *
 * A vertical Flex rather than the `content` Layout, because `content` has a single slot and a second
 * Widget placed in it is dropped without a word; a column of a page is a sequence. The caller places its
 * Widgets in the column by `columnId`, in slots from 0.
 */
export function buildPhiBasePageColumnFrame({
  page,
  regionId,
  columnId,
  label,
  maxWidth,
}: {
  page: PhiCmsPageNode;
  regionId: number;
  columnId: PhiCmsInstanceId;
  label: string;
  /** Where the column stops, a `PHI_LAYOUT` measure: `readingMax` for prose, `contentMaxWide` for a page. */
  maxWidth: number;
}) {
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId });
  return {
    regions: [scaffold.region],
    layoutNodes: [
      scaffold.layoutNode,
      createPhiCmsPresetNodes(page).layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: columnId,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label,
        config: {
          maxSize: { width: maxWidth },
          surface: PHI_SURFACE_WASH,
          padding: PHI_SPACE.md,
          // The house step between a preset's children; the Widgets keep their own air inside.
          gap: PHI_SPACE.sm,
        },
      }),
    ],
  };
}
