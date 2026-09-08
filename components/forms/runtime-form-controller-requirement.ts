import type {
  PhiCmsWidgetRuntimeControllerRequirementResolver,
  PhiRuntimeControllerRequirement,
} from "../../types";
import { PHI_FORM_CONTROLLER_TYPE } from "./runtime-form-controller-address";
import { resolvePhiRuntimeConditionControllerRequirements } from "../../types/runtime-condition";
import type { PhiCmsFormWidgetConfig } from "../../plugins/runtime-modules/core/widgets/form/config";

/**
 * How a Widget's Form Controller is named, written once and read back once.
 *
 * A Form Controller mounted for a Widget carries that Widget's id as its instance key. It was a
 * convention four call sites spelled out for themselves; naming it lets the Controller find its way
 * back to the Widget it belongs to, which is what the state it answers with has to be addressed at.
 */
export const PHI_FORM_CONTROLLER_WIDGET_INSTANCE_PREFIX = "widget-";

export function createPhiRuntimeFormWidgetInstanceKey(widgetId: string | number) {
  return `${PHI_FORM_CONTROLLER_WIDGET_INSTANCE_PREFIX}${widgetId}`;
}

/** The Widget a Form Controller was mounted for, or null when it was mounted for something else. */
export function readPhiRuntimeFormControllerWidgetId(instanceKey: string | number | null | undefined) {
  const key = instanceKey == null ? "" : String(instanceKey);
  return key.startsWith(PHI_FORM_CONTROLLER_WIDGET_INSTANCE_PREFIX)
    ? key.slice(PHI_FORM_CONTROLLER_WIDGET_INSTANCE_PREFIX.length)
    : null;
}

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
  createPhiRuntimeFormControllerRequirement(createPhiRuntimeFormWidgetInstanceKey(widget.id)),
  ...resolvePhiRuntimeConditionControllerRequirements(config.signalRoutes),
];
