import type {
  PhiCmsWidgetRuntimeControllerRequirementResolver,
  PhiRuntimeControllerRequirement,
} from "../../types";
import { PHI_FORM_CONTROLLER_TYPE } from "./runtime-form-controller-address";
import { resolvePhiRuntimeConditionControllerRequirements } from "../../types/runtime-condition";
import type { PhiCmsFormWidgetConfig } from "../../plugins/runtime-modules/core/widgets/form/config";

export function createPhiRuntimeFormControllerRequirement(
  instanceKey: string | number,
): PhiRuntimeControllerRequirement {
  return {
    type: PHI_FORM_CONTROLLER_TYPE,
    instanceKey: String(instanceKey),
    enabled: true,
  };
}

export const requirePhiRuntimeFormControllerForWidget: PhiCmsWidgetRuntimeControllerRequirementResolver<
  PhiCmsFormWidgetConfig
> = ({ widget, config }) => [
  createPhiRuntimeFormControllerRequirement(`widget-${widget.id}`),
  ...resolvePhiRuntimeConditionControllerRequirements(config.signalRoutes),
];
