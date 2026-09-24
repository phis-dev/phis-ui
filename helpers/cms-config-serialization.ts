import type {
  PhiRenderableBlockBase,
} from "../types";
import { mergeRenderableBlockDefaults } from "./renderable-block-serialization";

export function mergePhiCmsRenderableBlockConfigDefaults(
  value: Partial<PhiRenderableBlockBase> | null | undefined,
) {
  return mergeRenderableBlockDefaults(value);
}
