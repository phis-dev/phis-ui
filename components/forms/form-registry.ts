import type { PhiFormDefinitionLike } from "./form-resolution";
import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiFormId } from "../../types/form-id";
import { isPhiFormId, normalizePhiFormId } from "../../types/form-id";
import { parsePhiFormDescriptor } from "./form-descriptor-contract";

/**
 * What a Form does for the platform, where the platform needs a Form that does it and cannot name one.
 *
 * Core asks for these by purpose rather than by id, because the Module that supplies them can be
 * replaced: a Site that swaps the Auth Module for another still has to let an account set the password
 * an administrator asked for. Whichever active Module registers a Form with the purpose supplies it.
 */
export const PHI_FORM_PURPOSES = {
  /** Sets the signed-in account's password; its success clears an outstanding password change. */
  accountPasswordChange: "account-password-change",
} as const;

export type PhiFormPurpose = (typeof PHI_FORM_PURPOSES)[keyof typeof PHI_FORM_PURPOSES];

const PHI_FORM_PURPOSE_VALUES = new Set<string>(Object.values(PHI_FORM_PURPOSES));

/**
 * A Form as a Module ships it: the definition every Form has (`PhiFormDefinitionLike`), without the
 * database's row id and status, under a namespaced id and with the Areas it belongs to.
 */
export type PhiRuntimeModuleFormDefinition =
  Omit<PhiFormDefinitionLike, "id" | "status" | "formId"> & {
  /**
   * The Areas this Form belongs to.
   *
   * A Form is not machinery the way a Widget is. A Card renders whatever it is pointed at and belongs
   * everywhere; a Form is one transaction with one handler and one audience, and "create an
   * installation" has no business in an App picker. So a Form states where it belongs and the Area
   * projection cuts it like a route.
   */
  areas: readonly PhiCmsAreaKey[];
  formId: PhiFormId;
  /** The platform role this Form fills, if any; see `PHI_FORM_PURPOSES`. */
  purpose?: PhiFormPurpose;
};

/** The fields a Module may leave out of a Form it defines, because nearly every Form leaves them empty. */
type PhiRuntimeModuleFormDefaultedField =
  | "confirmHandlerKey"
  | "previewHandlerKey"
  | "defaultConfig"
  | "variant"
  | "config"
  | "previewUpstreamPath";

/**
 * What `definePhiRuntimeModuleForm` takes: a `PhiRuntimeModuleFormDefinition` whose defaulted fields
 * may be left out. The factory fills them in, so every defined Form still carries all of them.
 */
export type PhiRuntimeModuleFormDefinitionInput =
  Omit<PhiRuntimeModuleFormDefinition, PhiRuntimeModuleFormDefaultedField>
  & Partial<Pick<PhiRuntimeModuleFormDefinition, PhiRuntimeModuleFormDefaultedField>>;

/** The Form an active Module supplies for a purpose, or `null` where none does. */
export function findPhiFormDefinitionByPurpose(
  definitions: Iterable<PhiRuntimeModuleFormDefinition>,
  purpose: PhiFormPurpose,
) {
  for (const definition of definitions) {
    if (definition.purpose === purpose) return definition;
  }
  return null;
}

/**
 * Checks a Module's Form and fills in the fields it left out: no confirm or preview handler, no
 * preview upstream, empty `defaultConfig` and `config`, variant `"default"`. An explicit value, `null`
 * included, is kept.
 */
export function definePhiRuntimeModuleForm(
  input: PhiRuntimeModuleFormDefinitionInput,
): PhiRuntimeModuleFormDefinition {
  const {
    confirmHandlerKey = null,
    previewHandlerKey = null,
    defaultConfig = {},
    variant = "default",
    config = {},
    previewUpstreamPath = null,
    ...rest
  } = input;
  const definition: PhiRuntimeModuleFormDefinition = {
    ...rest,
    confirmHandlerKey,
    previewHandlerKey,
    defaultConfig,
    variant,
    config,
    previewUpstreamPath,
  };
  const formId = normalizePhiFormId(definition.formId);
  if (!isPhiFormId(formId)) {
    throw new Error(`Invalid namespaced Form id "${definition.formId}".`);
  }
  if (definition.areas.length === 0 || definition.areas.some((area) => !isPhiCmsAreaKey(area))) {
    throw new Error(`Form "${formId}" must name the Areas it belongs to.`);
  }
  const descriptor = parsePhiFormDescriptor(definition.descriptor);
  if (descriptor.key !== formId) {
    throw new Error(
      `Form descriptor key "${descriptor.key}" must match formId "${formId}".`,
    );
  }
  if (!Number.isInteger(definition.version) || definition.version < 1) {
    throw new Error(`Form "${formId}" must declare a positive integer version.`);
  }
  if (definition.purpose !== undefined && !PHI_FORM_PURPOSE_VALUES.has(definition.purpose)) {
    throw new Error(`Form "${formId}" declares an unknown purpose "${String(definition.purpose)}".`);
  }
  return {
    ...definition,
    descriptor,
    formId,
  };
}
