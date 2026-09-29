/*
 * The condition grammar is stored inside descriptors phis-server keeps -- a Form field's `visibleWhen`
 * among them -- so it is read and evaluated by `@phis/contracts/conditions`, one set of rules for the
 * server that accepts a condition and the renderer that applies it.
 */
export {
  PHI_RUNTIME_CONDITION_GROUP_MATCHES,
  PHI_RUNTIME_CONDITION_OPERATORS,
  PHI_RUNTIME_CONDITION_SOURCES,
  collectPhiRuntimeValueConditions,
  combinePhiRuntimeConditionExpressions,
  evaluatePhiRuntimeConditionExpression,
  matchesPhiRuntimeValueCondition,
  readPhiRuntimeConditionExpression,
  readPhiRuntimeConditionStateSignalValue,
  readPhiRuntimeConditionValue,
  readPhiRuntimeValueCondition,
  type PhiRuntimeConditionExpression,
  type PhiRuntimeConditionGroupMatch,
  type PhiRuntimeConditionOperator,
  type PhiRuntimeConditionResult,
  type PhiRuntimeConditionSource,
  type PhiRuntimeConditionSourceValues,
  type PhiRuntimeConditionStateSignalValue,
  type PhiRuntimeConditionValue,
  type PhiRuntimeFeatureState,
  type PhiRuntimePageConditionState,
  type PhiRuntimeValueCondition,
} from "@phis/contracts/conditions";

import {
  findPhiSignalRoutesByCapabilityId,
  readPhiControllerSignalAddressParts,
  type PhiSignalRouteSet,
} from "./signals";
import type { PhiRuntimeControllerRequirement } from "./cms-plugins";

/** The Controllers a Widget's conditions ask for state, which the page has to mount for it. */
export function resolvePhiRuntimeConditionControllerRequirements(
  signalRoutes: PhiSignalRouteSet | null | undefined,
): PhiRuntimeControllerRequirement[] {
  const requirements = new Map<string, PhiRuntimeControllerRequirement>();
  for (const route of findPhiSignalRoutesByCapabilityId(
    signalRoutes?.emits,
    "conditionStateRequest",
  )) {
    const parts = readPhiControllerSignalAddressParts(route.receiver);
    if (!parts) continue;
    requirements.set(`${parts.type}:${parts.instanceKey}`, {
      type: parts.type,
      instanceKey: parts.instanceKey,
      enabled: true,
    });
  }
  return [...requirements.values()];
}
