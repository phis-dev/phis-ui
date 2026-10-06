"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";
import type { PhiFormControlRule } from "../controls/phi-form-control-contract";

import type {
  PhiFormFieldDescriptor,
  PhiFormFieldTypeProviderDescriptor,
  PhiFormProviderKey,
  PhiFormValidationProviderDescriptor,
  PhiFormValidationRuleDescriptor,
} from "../../types/form-descriptor";
import type { PhiControlOption } from "../controls/phi-control-options";

export type PhiFormFieldProviderProps = {
  /**
   * The DOM id the form gives this field, unique on the page: the field's label points at it. A
   * Control that has an input to focus puts it there; one without leaves it unused.
   */
  id?: string;
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
    /**
     * Holds the Form's submit while this field's value is not complete yet, with the sentence the field
     * shows if somebody submits anyway; `null` releases it. For a value that only arrives later -- an
     * upload whose Asset id comes once the body is there. A submit while a hold stands does not reach
     * the handler: it fails the way a rule fails, on this field and through `onValidationFailed`.
     */
    holdSubmit(fieldKey: string, reason: string | null): void;
  };
  /** What the Widget was placed with, for text a field takes from its placement rather than its form. */
  formConfig?: Readonly<Record<string, unknown>>;
};

export type PhiFormFieldTypeProvider = Omit<PhiFormFieldTypeProviderDescriptor, "ownerModuleId"> & {
  Control: ComponentType<PhiFormFieldProviderProps>;
  valuePropName?: string;
};

export type PhiFormValidationContext = {
  field: PhiFormFieldDescriptor;
  rule: PhiFormValidationRuleDescriptor;
  message?: string;
};

export type PhiFormValidationProvider = Omit<PhiFormValidationProviderDescriptor, "ownerModuleId"> & {
  createRule: (context: PhiFormValidationContext) => PhiFormControlRule;
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
