import type { PhiCmsConfigField } from "./cms-plugins";
import type { PhiRuntimeModuleId } from "./cms-plugins";
import type { PhiControlOption } from "../components/controls/phi-control-options";
import type { PhiControlOptionsProviderConfig } from "../components/controls/phi-control-options";
import type { PhiResponsiveValue } from "./responsive";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";
import type { PhiSpacingToken } from "./spacing";
import type {
  PhiFormSubmitCategory,
  PhiFormSubmitMethod,
  PhiFormSubmitTransport,
} from "../gateway/form-submit";

export type PhiFormProviderKey = `${string}/${string}`;

export type PhiFormLabelSetKey = `${string}/${string}`;

export const PHI_FORM_DESCRIPTOR_SCHEMA_VERSION = 1 as const;

/**
 * Where a piece of a form's wording comes from.
 *
 * `literal` is the word itself. `label` is a key into the form's label set, which is how anything a
 * visitor reads gets translated. `config` is a value the Widget was placed with -- the target of a
 * consent link, say, which is a property of where the form stands rather than of the form: the same
 * registration form points at one site's terms in one Area and another's elsewhere, and only the
 * placement knows which, and in which language's path.
 */
export type PhiFormTextDescriptor =
  | {
      kind: "literal";
      value: string;
    }
  | {
      kind: "label";
      key: string;
      fallback: string;
    }
  | {
      kind: "config";
      key: string;
      fallback: string;
    };

/** The number of tracks every form grid is divided into. */
export const PHI_FORM_GRID_TRACKS = 24 as const;

/**
 * Where one element lies on the form grid, written the way CSS Grid writes it: `start` is the line the
 * element begins at and `end` is the line it stops before, both counted from 1, so the last line is 25.
 *
 * A range rather than a width, because a width can only say how much room something takes and never
 * where the room is. A label at 1-7 with an input at 7-19 leaves 19-25 empty, and a tool button can
 * then say 21-25 and stand in that gap on the same row -- neither of which a span can express. Ranges
 * also carry the responsive case without a second concept: a label at 1-25 above an input at 1-25 is
 * the stacked form, because two elements that both claim the whole width cannot share a row.
 */
export type PhiFormGridRange = {
  /** First line the element occupies, 1 to 24. */
  start: number;
  /** Line the element stops before, 2 to 25. Exclusive, as in CSS. */
  end: number;
};

export type PhiFormResponsiveGridRange = PhiResponsiveValue<PhiFormGridRange>;

export type PhiFormLogicalAlignment = "start" | "center" | "end";

/**
 * What a form's rows look like where a field says nothing of its own.
 *
 * There is no `columns` and no `labelPlacement` here any more: a two-column form is fields whose
 * ranges lie in 1-13 and 13-25, and a stacked form is a label whose range is the full width. One
 * mechanism decides all of it, and the responsive sets decide it per measured width.
 */
export type PhiFormLayoutDescriptor = {
  gap?: PhiResponsiveValue<PhiSpacingToken>;
  labelAlign?: Exclude<PhiFormLogicalAlignment, "center">;
  label?: PhiFormResponsiveGridRange;
  control?: PhiFormResponsiveGridRange;
};

/**
 * Where this one field's parts lie, overriding the layout's defaults.
 *
 * Elements are placed in declaration order and CSS Grid does not go back to fill a gap it has passed,
 * so a field meant to stand beside the one before it is declared after it and the row fills from the
 * inline start. That is the whole ordering rule.
 */
export type PhiFormFieldPlacementDescriptor = {
  label?: PhiFormResponsiveGridRange;
  control?: PhiFormResponsiveGridRange;
};

export type PhiFormValidationRuleDescriptor = {
  providerKey: PhiFormProviderKey;
  message?: PhiFormTextDescriptor;
  config?: Record<string, unknown>;
};

export type PhiFormOptionDescriptor = Omit<
  PhiControlOption,
  "label" | "description"
> & {
  label: PhiFormTextDescriptor;
  description?: PhiFormTextDescriptor;
};

export type PhiFormFieldDescriptor = {
  key: string;
  fieldProviderKey: PhiFormProviderKey;
  label?: PhiFormTextDescriptor;
  controlLabel?: PhiFormTextDescriptor;
  description?: PhiFormTextDescriptor;
  placeholder?: PhiFormTextDescriptor;
  autoComplete?: string;
  initialValue?: unknown;
  options?: readonly PhiFormOptionDescriptor[];
  optionsProvider?: PhiControlOptionsProviderConfig | null;
  validation?: readonly PhiFormValidationRuleDescriptor[];
  visibleWhen?: PhiRuntimeConditionExpression;
  disabledWhen?: PhiRuntimeConditionExpression;
  placement?: PhiFormFieldPlacementDescriptor;
  config?: Record<string, unknown>;
};

/**
 * What a form shows when a submit is accepted.
 *
 * Declared rather than coded, because every form that submits to a handler has this moment and each of
 * them used to answer it in its own component: the Contact form with a toast, the Registration with an
 * alert, each with its own wording and its own idea of whether the fields stay filled in.
 *
 * Absent means the form says nothing of its own. That is the right answer wherever something else is
 * listening -- a Controller that closes an Overlay on `submitSuccess`, a page that navigates away.
 */
export type PhiFormSuccessDescriptor = {
  title: PhiFormTextDescriptor;
  text?: PhiFormTextDescriptor;
  /** Whether the fields go back to their initial values, ready for another entry. */
  reset?: boolean;
};

export type PhiFormDescriptor = {
  schemaVersion: typeof PHI_FORM_DESCRIPTOR_SCHEMA_VERSION;
  key: string;
  labelSetKey?: PhiFormLabelSetKey;
  fields: readonly PhiFormFieldDescriptor[];
  layout?: PhiFormLayoutDescriptor;
  success?: PhiFormSuccessDescriptor;
  /**
   * Whether what has been typed survives leaving the page, for as long as the tab is open.
   *
   * For the long form somebody fills in once and would have to fill in again after following a link to
   * read the terms. Session storage, never local: a half-finished registration on a shared machine is
   * not something to leave behind, and it is cleared the moment the form is accepted.
   */
  persistDraft?: boolean;
};

export type PhiFormHandlerPhase = "submit" | "confirm" | "preview";
export type PhiFormHandlerCredentialPolicy = "none" | "site-session" | "auth-link";

export type PhiFormFieldTypeProviderDescriptor = {
  key: PhiFormProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
  valueType: "string" | "number" | "boolean" | "string[]" | "json";
  presentation: "control" | "hidden" | "honeypot";
  settingsFields?: readonly PhiCmsConfigField[];
};

export type PhiFormValidationProviderDescriptor = {
  key: PhiFormProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
  settingsFields?: readonly PhiCmsConfigField[];
};

export type PhiFormHandlerProviderDescriptor = {
  key: PhiFormProviderKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
  phase: PhiFormHandlerPhase;
  handlerKey: string;
  category: PhiFormSubmitCategory;
  transport: PhiFormSubmitTransport;
  method: PhiFormSubmitMethod;
  endpointKey: string | null;
  upstreamPath: string | null;
  csrfPath: string | null;
  requiresCsrf: boolean;
  credentialPolicy: PhiFormHandlerCredentialPolicy;
};

export type PhiRuntimeModuleFormProviderDescriptors = {
  fieldTypes?: readonly PhiFormFieldTypeProviderDescriptor[];
  validationRules?: readonly PhiFormValidationProviderDescriptor[];
  handlers?: readonly PhiFormHandlerProviderDescriptor[];
};
