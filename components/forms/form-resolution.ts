import "server-only";

import type { PhiBlockRuntime, PhiSignalAddress } from "../../types";
import type { PhiFormDescriptor } from "../../types/form-descriptor";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";

export type PhiFormDefinitionSource = "shared" | "db";

export type PhiFormRenderOptions = {
  config?: Record<string, unknown>;
  formControllerAddress?: PhiSignalAddress | null;
  formInstanceKey?: string | null;
};

export type PhiFormRenderContext = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale"> &
    Partial<Pick<PhiBlockRuntime, "area">>;
  resolvedForm: PhiResolvedFormDefinition<PhiFormDefinitionLike> | null;
  options?: PhiFormRenderOptions;
};

/**
 * Values a form needs from the server before anyone can fill it in.
 *
 * A guard token is the case that made this a contract: it is minted per render, it cannot be asked for
 * from the browser without giving away what it protects, and the form is worthless without it. Reading
 * it used to mean the form brought its own render function, and everything the Form Widget offers --
 * signals, execution mode, submit -- was lost with that branch. This reads the values and nothing else.
 */
export type PhiFormInitialValuesLoader = (
  context: PhiFormRenderContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>;
export type PhiFormLabelSetLoader = (
  context: PhiFormRenderContext,
) => Readonly<Record<string, string>> | Promise<Readonly<Record<string, string>>>;

export async function resolvePhiFormLabels(context: PhiFormRenderContext) {
  const definition = context.resolvedForm?.definition;
  if (!definition?.descriptor.labelSetKey) {
    return {};
  }
  if (!definition.loadLabels) {
    throw new Error(
      `Form label set "${definition.descriptor.labelSetKey}" has no loader in the active form definition.`,
    );
  }
  return definition.loadLabels(context);
}

export type PhiFormDefinitionLike = {
  id?: number;
  ownerModuleId: PhiRuntimeModuleId;
  formId: string;
  version: number;
  status?: number;
  flags: number;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  descriptor: PhiFormDescriptor;
  submitHandlerKey: string | null;
  confirmHandlerKey: string | null;
  previewHandlerKey: string | null;
  defaultConfig: Record<string, unknown>;
  variant: string | null;
  config: Record<string, unknown>;
  previewUpstreamPath: string | null;
  loadLabels?: PhiFormLabelSetLoader;
  loadInitialValues?: PhiFormInitialValuesLoader;
};

export type PhiFormRenderTarget = {
  key: string;
  id: number | null;
  ownerModuleId: PhiRuntimeModuleId;
  formId: string;
  version: number;
  source: PhiFormDefinitionSource;
};

export type PhiResolvedFormDefinition<TDefinition extends PhiFormDefinitionLike = PhiFormDefinitionLike> = {
  source: PhiFormDefinitionSource;
  presetDefinition: TDefinition | null;
  overrideDefinition: TDefinition | null;
  definition: TDefinition;
  renderTarget: PhiFormRenderTarget;
  effectiveConfig: Record<string, unknown>;
};

type AnyRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMergeRecords(base: AnyRecord, override: AnyRecord): AnyRecord {
  const result: AnyRecord = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    const baseValue = result[key];
    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      result[key] = deepMergeRecords(baseValue, overrideValue);
      continue;
    }

    result[key] = overrideValue;
  }

  return result;
}

function normalizeFormId(value: string) {
  return value.trim().toLowerCase();
}

export function buildPhiFormRenderTarget<TDefinition extends PhiFormDefinitionLike>(
  definition: TDefinition,
  source: PhiFormDefinitionSource,
): PhiFormRenderTarget {
  return {
    key: definition.formId,
    id: definition.id ?? null,
    ownerModuleId: definition.ownerModuleId,
    formId: normalizeFormId(definition.formId),
    version: definition.version,
    source,
  };
}

export function resolvePhiFormDefinition<TDefinition extends PhiFormDefinitionLike>({
  presetDefinition,
  overrideDefinition,
}: {
  presetDefinition: TDefinition | null;
  overrideDefinition?: TDefinition | null;
}): PhiResolvedFormDefinition<TDefinition> | null {
  if (!presetDefinition && !overrideDefinition) {
    return null;
  }

  const resolvedSource: PhiFormDefinitionSource = overrideDefinition ? "db" : "shared";
  const baseDefinition = overrideDefinition ?? presetDefinition;
  if (!baseDefinition) {
    return null;
  }

  const resolvedDefinition = overrideDefinition && presetDefinition
    ? ({
        ...presetDefinition,
        ...overrideDefinition,
        id: overrideDefinition.id,
        ownerModuleId: overrideDefinition.ownerModuleId,
        formId: normalizeFormId(overrideDefinition.formId || presetDefinition.formId),
        title: overrideDefinition.title || presetDefinition.title,
        description: overrideDefinition.description ?? presetDefinition.description,
        category: overrideDefinition.category ?? presetDefinition.category,
        tags: overrideDefinition.tags.length > 0 ? overrideDefinition.tags : presetDefinition.tags,
        descriptor: overrideDefinition.descriptor,
        submitHandlerKey: overrideDefinition.submitHandlerKey || presetDefinition.submitHandlerKey,
        confirmHandlerKey:
          overrideDefinition.confirmHandlerKey ?? presetDefinition.confirmHandlerKey,
        previewHandlerKey:
          overrideDefinition.previewHandlerKey ?? presetDefinition.previewHandlerKey,
        defaultConfig: deepMergeRecords(
          presetDefinition.defaultConfig,
          overrideDefinition.defaultConfig,
        ),
        variant: overrideDefinition.variant ?? presetDefinition.variant,
        config: deepMergeRecords(
          deepMergeRecords(presetDefinition.defaultConfig, presetDefinition.config),
          deepMergeRecords(overrideDefinition.defaultConfig, overrideDefinition.config),
        ),
        loadLabels: overrideDefinition.loadLabels ?? presetDefinition.loadLabels,
        loadInitialValues:
          overrideDefinition.loadInitialValues ?? presetDefinition.loadInitialValues,
        previewUpstreamPath:
          overrideDefinition.previewUpstreamPath ?? presetDefinition.previewUpstreamPath,
        status: overrideDefinition.status,
        flags: overrideDefinition.flags,
        version: overrideDefinition.version || presetDefinition.version,
      } as TDefinition)
    : baseDefinition;

  return {
    source: resolvedSource,
    presetDefinition,
    overrideDefinition: overrideDefinition ?? null,
    definition: resolvedDefinition,
    renderTarget: buildPhiFormRenderTarget(resolvedDefinition, resolvedSource),
    effectiveConfig: resolvedDefinition.config,
  };
}
