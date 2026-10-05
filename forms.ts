/*
 * The Form contract a Server may read: descriptors, ids, labels, provider keys, Controller addresses and
 * definitions, and the gateway. The Client implementations -- the Form Control, the provider registry
 * and its context, the Form Controller mount and client hook -- are in `@phis/ui/forms/client`. While
 * they were here, a Module's Server file importing a Form helper from this door made every one of them a
 * client reference of every route reaching the Module: the Support Module's Form definitions put the
 * Form stack on the Public landing, an Area the Module does not even serve.
 */
export type {
  PhiFormAvailabilityProps,
  PhiFormGuardProps,
  PhiSubmitFormProps,
} from "./components/forms/contracts";
export type * from "./types/form-descriptor";
export type * from "./types/responsive";
export type * from "./types/runtime-condition";
export * from "./types/spacing";
export * from "./types/form-id";
export type {
  PhiFormRenderContext,
  PhiFormRenderOptions,
  PhiFormLabelSetLoader,
} from "./components/forms/form-resolution";
export { PHI_FORM_DESCRIPTOR_SCHEMA_VERSION } from "./types/form-descriptor";
export {
  definePhiRuntimeModuleForm,
} from "./components/forms/form-registry";
export {
  buildPhiFormRenderTarget,
  resolvePhiFormDefinition,
  resolvePhiFormLabels,
} from "./components/forms/form-resolution";
export {
  PHI_FORM_CONTROLLER_KEY,
  PHI_FORM_SIGNAL_CHANNELS,
  PHI_RUNTIME_FORM_CONTROLLER_EMITS,
  PHI_RUNTIME_FORM_CONTROLLER_LISTENS,
  createPhiRuntimeFormControllerAddress,
} from "./components/forms/runtime-form-controller-signals";
export {
  PHI_FORM_BUILDER_CONTROLLER_INSTANCE_KEY,
  PHI_FORM_BUILDER_CONTROLLER_KEY,
  PHI_FORM_BUILDER_CONTROLLER_PLUGIN_KEY,
  PHI_FORM_BUILDER_CONTROLLER_TYPE,
  createPhiFormBuilderControllerAddress,
} from "./components/forms/form-builder-controller-address";
export {
  PHI_FORM_BUILDER_CONTROLLER_DEFINITION,
  parsePhiFormBuilderControllerConfig,
} from "./components/forms/form-builder-controller-definition";
export {
  PHI_AUTH_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_HANDLER_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  PHI_SHARED_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
  PHI_SHARED_FORM_VALIDATION_PROVIDER_DESCRIPTORS,
  createPhiSharedFormProviderKey,
} from "./components/forms/form-provider-contract";
export {
  PHI_FORM_DEFAULT_LAYOUT,
  PHI_FORM_GRID_LAST_LINE,
  PHI_FORM_RESPONSIVE_MIN_WIDTH,
  PHI_FORM_RESPONSIVE_MODES,
  assertPhiFormLabelSetKey,
  createPhiFormLabelText,
  createPhiFormLiteralText,
  resolvePhiFormFieldExtent,
  resolvePhiFormFieldRanges,
  phiFormGridColumn,
  resolvePhiFormGridPlacement,
  phiFormGridRangesOverlap,
  resolvePhiFormLayout,
  resolvePhiFormResponsiveGridRange,
  resolvePhiFormText,
  parsePhiFormDescriptor,
} from "./components/forms/form-descriptor-contract";
export {
  PHI_CONFIRM_FORM_DESCRIPTOR,
  PHI_CONTACT_FORM_DESCRIPTOR,
  PHI_FORM_LABEL_SET_KEYS,
  PHI_LOGIN_FORM_DESCRIPTOR,
  PHI_REGISTRATION_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_FORM_DESCRIPTOR,
  PHI_UNSUBSCRIBE_FORM_DESCRIPTOR,
} from "./components/forms/shared-form-descriptors";
export { PHI_SHARED_FORM_IDS } from "./components/forms/shared-form-ids";
/*
 * What `loadLabels` has to return, for whoever supplies one.
 *
 * A Form's labels are reached by a flat dotted key, and a Module that declares a Form declares
 * `loadLabels` to produce them from its own label set. The flattener is the shape of that answer, so a
 * package without it either restates the flattening or hands in a nested object the Form cannot read.
 */
export { flattenPhiFormLabels } from "./components/forms/form-labels";
export {
  PHI_RUNTIME_FORM_CONTROLLER_DEFINITION,
  parsePhiRuntimeFormControllerConfig,
} from "./components/forms/runtime-form-controller-definition";
export {
  fetchFormRegistry,
  getResolvedFormDefinition,
  listResolvedFormDefinitions,
} from "./gateway/form-registry";
export {
  buildPhiFormSubmitRoute,
  buildPhiFormPreviewDescriptor,
  buildPhiFormPreviewDescriptorFromDefinition,
  resolvePhiFormSubmitTarget,
} from "./gateway/form-submit";
export {
  buildPhiDataSourceUrl,
  normalizePhiDataSourceCacheMode,
  normalizePhiDataSourceTags,
} from "./gateway/data-source";
export {
  buildPhiMutationUrl,
  normalizePhiMutationMethod,
  normalizePhiMutationResponseShape,
  normalizePhiMutationTransport,
} from "./gateway/mutation";
export type {
  PhiRuntimeModuleFormDefinition,
  PhiRuntimeModuleFormDefinitionInput,
} from "./components/forms/form-registry";
export type {
  PhiFormDefinitionLike,
  PhiFormDefinitionSource,
  PhiFormRenderTarget,
  PhiResolvedFormDefinition,
} from "./components/forms/form-resolution";
export type {
  PhiRuntimeFormControllerConfig,
} from "./components/forms/runtime-form-controller-definition";
export type {
  PhiFormBuilderControllerConfig,
} from "./components/forms/form-builder-controller-definition";
export type {
  PhiFormFieldProviderProps,
  PhiFormFieldTypeProvider,
  PhiFormProviderRegistry,
  PhiFormValidationContext,
  PhiFormValidationProvider,
} from "./components/forms/form-provider-registry";
export type {
  PhiResolvedFormLayout,
  PhiResolvedFormResponsiveGridRange,
} from "./components/forms/form-descriptor-contract";
export type {
  PhiFormControlProps,
} from "./components/controls/phi-form-control";
export type {
  PhiRuntimeFormSubmitSignalValue,
  PhiRuntimeFormResultSignalValue,
  PhiRuntimeFormErrorSignalValue,
  PhiRuntimeFormControllerMountProps,
} from "./components/forms/runtime-form-controller-mount";
export type {
  PhiRuntimeFormClient,
  PhiRuntimeFormSubmitOptions,
  PhiRuntimeFormSubmitResult,
} from "./components/forms/runtime-form-client";
export type {
  PhiRuntimeFormFieldSignalValue,
  PhiRuntimeFormTouchedSignalValue,
  PhiRuntimeFormValiditySignalValue,
  PhiRuntimeFormValuesSignalValue,
} from "./components/forms/runtime-form-state";
export type {
  PhiFormRegistryRecord,
  GetResolvedFormDefinitionOptions,
  ListResolvedFormDefinitionsOptions,
} from "./gateway/form-registry";
export type {
  PhiFormPreviewDescriptor,
  PhiFormSubmitTarget,
} from "./gateway/form-submit";
export type {
  PhiFormSubmitCategory,
  PhiFormSubmitMethod,
  PhiFormSubmitRoute,
  PhiFormSubmitTransport,
} from "./types/form-submit-route";
export type {
  PhiDataLoadOptions,
  PhiDataQuery,
  PhiDataQueryValue,
  PhiDataResult,
  PhiDataSource,
  PhiDataSourceApiTransport,
  PhiDataSourceCache,
  PhiDataSourceCacheMode,
  PhiDataSourceRequestShape,
  PhiDataSourceResponseShape,
} from "./gateway/data-source";
export type {
  PhiMutation,
  PhiMutationFetchContext,
  PhiMutationLoadOptions,
  PhiMutationMethod,
  PhiMutationQuery,
  PhiMutationQueryValue,
  PhiMutationRequestShape,
  PhiMutationResponseShape,
  PhiMutationTransport,
} from "./gateway/mutation";
