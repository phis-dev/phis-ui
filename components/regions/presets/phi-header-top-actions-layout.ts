import { PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import type { PhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsLayoutNode } from "../../../types/cms";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";

/**
 * The row of account actions at the right of a workspace Area's top Header (Admin, Editor, Builder).
 *
 * The three Areas carried the same node three times, and only its identity differs between them.
 *
 * The gap is the `sm` step of the spacing scale, so it follows a Theme that changes the scale. It was a
 * literal 12 in all three copies, a value the scale does not have.
 */
export function buildPhiHeaderTopActionsLayoutNode(
  nodes: PhiCmsPresetNodes,
  {
    id,
    parentLayoutNodeId,
    label,
  }: {
    id: PhiCmsInstanceId;
    /** The top Header's three-column Layout; the row sits in its right slot. */
    parentLayoutNodeId: PhiCmsInstanceId;
    label: string;
  },
): PhiCmsLayoutNode {
  return nodes.layout({
    typeKey: "flex",
    id,
    parentLayoutNodeId,
    slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
    sortOrder: 0,
    label,
    config: {
      anchor: { horizontal: "right", vertical: "middle" },
      gap: PHI_SPACE.sm,
      verticalSeparators: false,
      separatorBeforeFirst: true,
      separatorSpan: "50%",
      wrap: false,
    },
  });
}
