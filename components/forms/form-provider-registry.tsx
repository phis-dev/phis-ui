"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";
import type { Rule } from "antd/es/form";

import type {
  PhiFormFieldDescriptor,
  PhiFormFieldTypeProviderDescriptor,
  PhiFormProviderKey,
  PhiFormValidationProviderDescriptor,
  PhiFormValidationRuleDescriptor,
} from "../../types/form-descriptor";
import type { PhiControlOption } from "../controls/phi-control-options";

export type PhiFormFieldProviderProps = {
  field: PhiFormFieldDescriptor;
  label?: string;
  description?: string;
  controlLabel?: string;
  labels?: Readonly<Record<string, string>>;
  placeholder?: string;
  options?: readonly PhiControlOption[];
  value?: unknown;
  checked?: boolean;
  onChange?: (...args: unknown[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  /** Reports what has been typed. Absent where the field's provider is not searchable. */
  onSearch?: (search: string) => void;
  /** `false` where the provider answered the search itself, so the control must not filter it again. */
  filterOptionsLocally?: boolean;
  formContext?: {
    getValues(): Record<string, unknown>;
    setValues(values: Record<string, unknown>): void;
  };
};

export type PhiFormFieldTypeProvider = PhiFormFieldTypeProviderDescriptor & {
  Control: ComponentType<PhiFormFieldProviderProps>;
  valuePropName?: string;
};

export type PhiFormValidationContext = {
  field: PhiFormFieldDescriptor;
  rule: PhiFormValidationRuleDescriptor;
  message?: string;
};

export type PhiFormValidationProvider = PhiFormValidationProviderDescriptor & {
  createRule: (context: PhiFormValidationContext) => Rule;
};

export type PhiFormProviderRegistry = {
  fieldTypesByKey: ReadonlyMap<PhiFormProviderKey, PhiFormFieldTypeProvider>;
  validationRulesByKey: ReadonlyMap<PhiFormProviderKey, PhiFormValidationProvider>;
};

const PhiFormProviderRegistryContext =
  createContext<PhiFormProviderRegistry | null>(null);

function createUniqueProviderMap<TProvider extends { key: PhiFormProviderKey }>(
  kind: string,
  providers: readonly TProvider[],
) {
  const entries = new Map<PhiFormProviderKey, TProvider>();
  for (const provider of providers) {
    if (entries.has(provider.key)) {
      throw new Error(`Duplicate form ${kind} provider "${provider.key}".`);
    }
    entries.set(provider.key, provider);
  }
  return entries;
}

export function createPhiFormProviderRegistry({
  fieldTypes = [],
  validationRules = [],
}: {
  fieldTypes?: readonly PhiFormFieldTypeProvider[];
  validationRules?: readonly PhiFormValidationProvider[];
}): PhiFormProviderRegistry {
  return {
    fieldTypesByKey: createUniqueProviderMap("field type", fieldTypes),
    validationRulesByKey: createUniqueProviderMap("validation", validationRules),
  };
}

export function extendPhiFormProviderRegistry(
  ...registries: readonly PhiFormProviderRegistry[]
): PhiFormProviderRegistry {
  return createPhiFormProviderRegistry({
    fieldTypes: registries.flatMap((registry) => [...registry.fieldTypesByKey.values()]),
    validationRules: registries.flatMap((registry) => [...registry.validationRulesByKey.values()]),
  });
}

export function PhiFormProviderRegistryProvider({
  registry,
  children,
}: {
  registry: PhiFormProviderRegistry;
  children: ReactNode;
}) {
  const parent = useContext(PhiFormProviderRegistryContext);
  const composed = useMemo(
    () => parent ? extendPhiFormProviderRegistry(parent, registry) : registry,
    [parent, registry],
  );

  return (
    <PhiFormProviderRegistryContext.Provider value={composed}>
      {children}
    </PhiFormProviderRegistryContext.Provider>
  );
}

export function usePhiFormProviderRegistry() {
  return useContext(PhiFormProviderRegistryContext);
}
