import {
  findPhiSignalRoutesByCapabilityId,
  readPhiControllerSignalAddress,
  readPhiControllerSignalAddressParts,
  type PhiControllerSignalAddress,
  type PhiSignalRouteSet,
} from "./signals";
import type { PhiRuntimeControllerRequirement } from "./cms-plugins";

export const PHI_RUNTIME_CONDITION_SOURCES = ["row", "form", "controller"] as const;
export const PHI_RUNTIME_CONDITION_OPERATORS = ["truthy", "falsy", "equals", "contains"] as const;
export const PHI_RUNTIME_CONDITION_GROUP_MATCHES = ["all", "any"] as const;

export type PhiRuntimeConditionSource = (typeof PHI_RUNTIME_CONDITION_SOURCES)[number];
export type PhiRuntimeConditionOperator = (typeof PHI_RUNTIME_CONDITION_OPERATORS)[number];
export type PhiRuntimeConditionGroupMatch = (typeof PHI_RUNTIME_CONDITION_GROUP_MATCHES)[number];
export type PhiRuntimeConditionValue = string;

export type PhiRuntimeValueCondition = {
  source: PhiRuntimeConditionSource;
  controllerAddress?: PhiControllerSignalAddress;
  valuePath: string;
  operator: PhiRuntimeConditionOperator;
  value?: PhiRuntimeConditionValue;
  reason?: string;
};

export type PhiRuntimeConditionExpression =
  | PhiRuntimeValueCondition
  | {
      match: PhiRuntimeConditionGroupMatch;
      conditions: readonly PhiRuntimeConditionExpression[];
    };

export type PhiRuntimeConditionResult = "matched" | "not-matched" | "unavailable";

export type PhiRuntimeConditionStateSignalValue = {
  state: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readConditionValue(value: unknown): PhiRuntimeConditionValue | undefined {
  return typeof value === "string" ? value : undefined;
}

export function readPhiRuntimeValueCondition(value: unknown): PhiRuntimeValueCondition | null {
  if (!isRecord(value)) return null;
  const source = value.source === "row" || value.source === "form" || value.source === "controller"
    ? value.source
    : null;
  const operator = value.operator === "truthy" || value.operator === "falsy" ||
    value.operator === "equals" || value.operator === "contains"
    ? value.operator
    : null;
  const valuePath = typeof value.valuePath === "string" ? value.valuePath.trim() : "";
  const controllerAddress = source === "controller"
    ? readPhiControllerSignalAddress(value.controllerAddress)
    : undefined;
  const conditionValue = readConditionValue(value.value);
  if (
    !source ||
    !operator ||
    !valuePath ||
    (source === "controller" && !controllerAddress) ||
    (operator !== "truthy" && operator !== "falsy" && conditionValue === undefined)
  ) {
    return null;
  }
  return {
    source,
    controllerAddress,
    valuePath,
    operator,
    value: operator === "truthy" || operator === "falsy" ? undefined : conditionValue,
    reason: typeof value.reason === "string" && value.reason.trim() ? value.reason.trim() : undefined,
  };
}

export function readPhiRuntimeConditionExpression(value: unknown): PhiRuntimeConditionExpression | null {
  const leaf = readPhiRuntimeValueCondition(value);
  if (leaf) return leaf;
  if (!isRecord(value) || (value.match !== "all" && value.match !== "any") || !Array.isArray(value.conditions)) {
    return null;
  }
  const conditions = value.conditions.map(readPhiRuntimeConditionExpression);
  if (conditions.length === 0 || conditions.some((condition) => condition == null)) {
    return null;
  }
  return {
    match: value.match,
    conditions: conditions as PhiRuntimeConditionExpression[],
  };
}

export function collectPhiRuntimeValueConditions(
  expression: PhiRuntimeConditionExpression | null | undefined,
): PhiRuntimeValueCondition[] {
  if (!expression) return [];
  if ("source" in expression) return [expression];
  return expression.conditions.flatMap(collectPhiRuntimeValueConditions);
}

export function combinePhiRuntimeConditionExpressions(
  match: PhiRuntimeConditionGroupMatch,
  expressions: readonly (PhiRuntimeConditionExpression | null | undefined)[],
): PhiRuntimeConditionExpression | undefined {
  const conditions = expressions.filter((entry): entry is PhiRuntimeConditionExpression => Boolean(entry));
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { match, conditions };
}

export function readPhiRuntimeConditionStateSignalValue(
  value: unknown,
): PhiRuntimeConditionStateSignalValue | null {
  return isRecord(value) && isRecord(value.state) ? { state: value.state } : null;
}

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

export function readPhiRuntimeConditionValue(input: unknown, valuePath: string): unknown {
  let current = input;
  for (const segment of valuePath.split(".").filter(Boolean)) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

export function matchesPhiRuntimeValueCondition(
  condition: PhiRuntimeValueCondition,
  sources: {
    row?: Record<string, unknown> | null;
    form?: Record<string, unknown> | null;
    controllers?: Readonly<Record<string, Record<string, unknown>>> | null;
  },
) {
  const source = condition.source === "row"
    ? sources.row
    : condition.source === "form"
      ? sources.form
    : condition.controllerAddress
      ? sources.controllers?.[condition.controllerAddress]
      : null;
  if (source == null) return false;
  const current = readPhiRuntimeConditionValue(source, condition.valuePath);
  if (condition.source === "controller" && current === undefined) return false;
  if (condition.operator === "truthy") return Boolean(current);
  if (condition.operator === "falsy") return !current;
  if (condition.operator === "equals") return Object.is(current, condition.value);
  return Array.isArray(current)
    ? current.some((entry) => typeof entry === "string" && entry === condition.value)
    : typeof current === "string" && typeof condition.value === "string"
      ? current.includes(condition.value)
      : false;
}

export function evaluatePhiRuntimeConditionExpression(
  expression: PhiRuntimeConditionExpression,
  sources: {
    row?: Record<string, unknown> | null;
    form?: Record<string, unknown> | null;
    controllers?: Readonly<Record<string, Record<string, unknown>>> | null;
  },
): PhiRuntimeConditionResult {
  if ("source" in expression) {
    const source = expression.source === "row"
      ? sources.row
      : expression.source === "form"
        ? sources.form
        : expression.controllerAddress
          ? sources.controllers?.[expression.controllerAddress]
          : null;
    if (source == null) return "unavailable";
    if (expression.source === "controller" && readPhiRuntimeConditionValue(source, expression.valuePath) === undefined) {
      return "unavailable";
    }
    return matchesPhiRuntimeValueCondition(expression, sources) ? "matched" : "not-matched";
  }

  const results = expression.conditions.map((condition) =>
    evaluatePhiRuntimeConditionExpression(condition, sources));
  if (expression.match === "all") {
    if (results.some((result) => result === "not-matched")) return "not-matched";
    return results.every((result) => result === "matched") ? "matched" : "unavailable";
  }
  if (results.some((result) => result === "matched")) return "matched";
  return results.every((result) => result === "not-matched") ? "not-matched" : "unavailable";
}
