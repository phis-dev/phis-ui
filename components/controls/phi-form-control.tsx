"use client";

import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Form,
  theme as antdTheme,
  type FormProps,
  type FormInstance,
} from "antd";

import type {
  PhiFormDescriptor,
  PhiFormFieldDescriptor,
} from "../../types/form-descriptor";
import { PHI_FORM_GRID_TRACKS } from "../../types/form-descriptor";
import {
  collectPhiRuntimeValueConditions,
  evaluatePhiRuntimeConditionExpression,
} from "../../types/runtime-condition";
import type {
  PhiFormFieldProviderProps,
  PhiFormFieldTypeProvider,
  PhiFormProviderRegistry,
} from "../forms/form-provider-registry";
import {
  extendPhiFormProviderRegistry,
  usePhiFormProviderRegistry,
} from "../forms/form-provider-registry";
import { PhiAlertControl } from "./phi-alert-control";
import { PhiDescriptionHint } from "./phi-description-tooltip-icon";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "../forms/form-provider-contract";
import {
  phiFormCellOpensColumn,
  phiFormControlGridColumn,
  phiFormFieldFollowsLayoutColumns,
  phiFormLabelGridColumn,
  resolvePhiFormGridPlacement,
  resolvePhiFormLayout,
  PHI_FORM_RESPONSIVE_MODES,
  resolvePhiFormText,
  shouldPhiFormSubmitOnKeyDown,
} from "../forms/form-descriptor-contract";
import { PHI_SHARED_FORM_PROVIDER_REGISTRY } from "../forms/shared-form-provider-registry";
import {
  resolvePhiControlOptionsDependencies,
  usePhiControlOptionsProvider,
} from "./phi-options-provider";

export type PhiFormControlProps = {
  descriptor: PhiFormDescriptor;
  registry?: PhiFormProviderRegistry;
  labels?: Readonly<Record<string, string>>;
  /** What the Widget was placed with, for text a field takes from its placement rather than its form. */
  formConfig?: Readonly<Record<string, unknown>>;
  initialValues?: Record<string, unknown>;
  /**
   * Whether Enter in a single-line field submits this form. The placement's answer, never assumed:
   * a page with a search beside a form, or two forms, has more than one thing Enter could mean.
   */
  submitOnEnter: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  conditionControllerStates?: Readonly<Record<string, Record<string, unknown>>>;
  form?: PhiFormControlFormInstance;
  onValuesChange?: (
    changedValues: Record<string, unknown>,
    allValues: Record<string, unknown>,
  ) => void;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onSubmittingChange?: (submitting: boolean) => void;
  onValidationFailed?: (value: { valid: false; errors: Record<string, readonly string[]> }) => void;
  onFormReady?: (form: PhiFormControlFormInstance) => void;
  onStateChange?: (state: { dirty: boolean; valid: boolean }) => void;
  onBlurCapture?: () => void;
};

/** The id Ant Design gives a Form Item's control: the form's name and the field's key, joined by `_`. */
function resolvePhiFormFieldDomId(formDomName: string, fieldKey: string) {
  return `${formDomName}_${fieldKey}`;
}

export type PhiFormControlFormInstance = FormInstance<Record<string, unknown>>;

export type PhiFormControlHandle = {
  submit(): void;
  reset(): void;
};

function resolveFieldRules(field: PhiFormFieldDescriptor) {
  return [...(field.validation ?? [])];
}

function renderLabel(
  field: PhiFormFieldDescriptor,
  label: string,
  labels?: Readonly<Record<string, string>>,
  formConfig?: Readonly<Record<string, unknown>>,
) {
  if (!field.description) {
    return label;
  }

  const description = resolvePhiFormText(field.description, labels, formConfig);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35em" }}>
      <span>{label}</span>
      <PhiDescriptionHint description={description} />
    </span>
  );
}

function resolveHoneypotStyle(
  presentation: "control" | "hidden" | "honeypot",
) {
  if (presentation === "hidden") {
    return { display: "none" } satisfies React.CSSProperties;
  }
  if (presentation !== "honeypot") {
    return undefined;
  }

  return {
    position: "absolute",
    insetInlineStart: "-9999px",
    width: 1,
    height: 1,
    overflow: "hidden",
  } satisfies React.CSSProperties;
}

/**
 * The form fields whose values the descriptor reads: everything a `visibleWhen` or `disabledWhen` asks
 * of the form, and every options dependency that points into it. Top-level keys, because that is what
 * a form store is keyed by and what a watch can be narrowed to.
 */
function collectPhiFormWatchedKeys(fields: PhiFormDescriptor["fields"]): readonly string[] {
  const keys = new Set<string>();
  for (const field of fields) {
    for (const expression of [field.visibleWhen, field.disabledWhen]) {
      if (!expression) continue;
      for (const condition of collectPhiRuntimeValueConditions(expression)) {
        if (condition.source === "form") keys.add(condition.valuePath.split(".")[0] ?? "");
      }
    }
    for (const dependency of field.optionsProvider?.dependencies ?? []) {
      if (dependency.source === "form") keys.add(dependency.valuePath.split(".")[0] ?? "");
    }
  }
  keys.delete("");
  return [...keys].sort();
}

function pickPhiFormWatchedValues(
  values: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (values && key in values) picked[key] = values[key];
  }
  return picked;
}

function PhiResolvedFormFieldControl({
  id,
  provider,
  field,
  label,
  description,
  labels,
  formConfig,
  placeholder,
  disabled,
  readOnly,
  value,
  checked,
  onChange,
  formContext,
  formValues,
}: {
  /** Set by the Form Item this sits in, from the form's name and the field's key. */
  id?: string;
  provider: PhiFormFieldTypeProvider;
  field: PhiFormFieldDescriptor;
  /** The live values of this form, for a field whose options depend on a sibling. */
  formValues?: Record<string, unknown> | null;
  label?: string;
  description?: string;
  labels?: Readonly<Record<string, string>>;
  formConfig?: Readonly<Record<string, unknown>>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
} & Pick<PhiFormFieldProviderProps, "value" | "checked" | "onChange" | "formContext">) {
  const staticOptions = useMemo(
    () => field.options?.map((option) => ({
      ...option,
      label: resolvePhiFormText(option.label, labels, formConfig),
      description: option.description
        ? resolvePhiFormText(option.description, labels, formConfig)
        : undefined,
    })),
    [field.options, formConfig, labels],
  );
  // Raw text only: how long it has to be, whether it is used at all, and who filters is declared on
  // the field and applied by the hook, so every control that resolves options obeys the same rules.
  const [searchDraft, setSearchDraft] = useState("");
  /*
   * What the field says about itself, under what the placement says about this one form.
   *
   * The field's config is in the registered descriptor and reads the same on every Site; the
   * placement's is what this Page knows and the registry cannot -- which locales this Site offers, for
   * one. The more specific wins, as everywhere else in the cascade.
   *
   * It matters that both arrive here rather than through a route or a store: this resolves during the
   * render, the server's included, so a list the Page already holds is in the HTML it sends instead of
   * appearing once the browser has caught up.
   */
  const sourceConfig = useMemo(
    () => ({ ...field.config, ...formConfig }),
    [field.config, formConfig],
  );
  const resolvedOptions = usePhiControlOptionsProvider({
    options: staticOptions,
    optionsProvider: field.optionsProvider,
    sourceConfig,
    searchDraft,
    formValues,
  });
  /*
   * A required parent changed, so what this field holds was chosen from a list that no longer applies.
   * Cleared rather than kept: the value would still submit, and it would be a value from the wrong
   * parent. Only required dependencies do this -- an optional one narrows a list without invalidating
   * what is already in it.
   */
  const requiredDependencyKey = JSON.stringify(
    // The same resolver the hook uses, over the required form dependencies alone: what a parent
    // resolves to is one question, and it is answered in one place.
    resolvePhiControlOptionsDependencies(
      (field.optionsProvider?.dependencies ?? [])
        .filter((dependency) => dependency.required && dependency.source === "form"),
      { form: formValues },
    ).values,
  );
  /*
   * Only a parent that changed on its own clears the child. Where the value changed in the same update
   * -- the server answering with both, a draft restored, `setValues` from a sibling -- the value was
   * chosen for the new parent, and clearing it threw away the one answer that fits.
   */
  const lastRequiredDependency = useRef({ key: requiredDependencyKey, value });
  useEffect(() => {
    const last = lastRequiredDependency.current;
    lastRequiredDependency.current = { key: requiredDependencyKey, value };
    if (last.key === requiredDependencyKey || !Object.is(last.value, value)) return;
    if (value != null && value !== "") onChange?.(undefined);
  }, [onChange, requiredDependencyKey, value]);
  const Control = provider.Control;
  const controlLabel = field.controlLabel
    ? resolvePhiFormText(field.controlLabel, labels, formConfig)
    : undefined;

  return (
    <>
      <Control
        id={id}
        field={field}
        label={label}
        description={description}
        controlLabel={controlLabel}
        labels={labels}
        formConfig={formConfig}
        placeholder={placeholder}
        options={resolvedOptions.options}
        onSearch={resolvedOptions.search.enabled ? setSearchDraft : undefined}
        filterOptionsLocally={resolvedOptions.search.filterLocally}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        checked={checked}
        onChange={onChange}
        formContext={formContext}
      />
      {resolvedOptions.warning ? (
        <PhiAlertControl level="warning" showIcon title={resolvedOptions.warning} />
      ) : null}
    </>
  );
}

// One empty object for every form without controllers, so the fields drawn are not recomputed on
// every render for a new `{}`.
const PHI_FORM_NO_CONTROLLER_STATES: Readonly<Record<string, Record<string, unknown>>> =
  Object.freeze({});

export const PhiFormControl = forwardRef<PhiFormControlHandle, PhiFormControlProps>(function PhiFormControl({
  descriptor,
  registry,
  labels,
  formConfig,
  initialValues,
  submitOnEnter,
  disabled = false,
  readOnly = false,
  conditionControllerStates = PHI_FORM_NO_CONTROLLER_STATES,
  form: providedForm,
  onValuesChange,
  onSubmit,
  onSubmittingChange,
  onValidationFailed,
  onFormReady,
  onStateChange,
  onBlurCapture,
}: PhiFormControlProps, ref) {
  const contributedRegistry = usePhiFormProviderRegistry();
  const activeRegistry = useMemo(
    () => registry ?? (
      contributedRegistry
        ? extendPhiFormProviderRegistry(PHI_SHARED_FORM_PROVIDER_REGISTRY, contributedRegistry)
        : PHI_SHARED_FORM_PROVIDER_REGISTRY
    ),
    [contributedRegistry, registry],
  );
  const [internalForm] = Form.useForm<Record<string, unknown>>();
  const form = providedForm ?? internalForm;
  /*
   * A name of its own for every mounted form. Ant Design builds each field's DOM id from it, and without
   * one the id was the field key alone: two forms with an `email` field on one page repeated the ids of
   * the field and its messages, and a label could only have pointed at whichever came first.
   */
  const formDomName = `phi-form-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  useImperativeHandle(ref, () => ({
    submit: () => form.submit(),
    reset: () => form.resetFields(),
  }), [form]);
  useEffect(() => {
    onFormReady?.(form);
  }, [form, onFormReady]);
  const [submitting, setSubmitting] = useState(false);
  const { token } = antdTheme.useToken();
  const layout = useMemo(
    () => resolvePhiFormLayout(descriptor.layout),
    [descriptor.layout],
  );
  const gapByToken = {
    none: 0,
    xxs: token.paddingXXS,
    xs: token.paddingXS,
    sm: token.paddingSM,
    base: token.padding,
    md: token.paddingMD,
    lg: token.paddingLG,
    xl: token.paddingXL,
    xxl: token.marginXXL,
  } as const;
  /*
   * Every width's answer is written at once and CSS picks between them, because the form is not
   * measured any more.
   *
   * It used to measure itself and re-render, which the server cannot do: with no width to go on, every
   * form was rendered at its narrowest -- labels above their inputs -- and only became what it should
   * be after hydration had run. What was delivered was never what was meant. A container query asks the
   * same question about the same element, in CSS, where the answer is already true at first paint.
   */
  const rowGapByMode = {
    compact: gapByToken[layout.gap.compact],
    medium: gapByToken[layout.gap.medium],
    wide: gapByToken[layout.gap.wide],
  } as const;
  /*
   * And the distance across, which is not the grid's `column-gap`: that one falls between every pair of
   * adjacent elements, so it would push a label away from its own control by the amount that separates
   * two fields. It is laid on the cell that opens a column instead (`phiFormCellOpensColumn`), so only
   * the boundary between two columns pays it.
   */
  const columnGapByMode = {
    compact: gapByToken[layout.columnGap.compact],
    medium: gapByToken[layout.columnGap.medium],
    wide: gapByToken[layout.columnGap.wide],
  } as const;
  const resolvedInitialValues = useMemo(
    () => ({
      ...Object.fromEntries(descriptor.fields.flatMap((field) =>
        field.initialValue === undefined ? [] : [[field.key, field.initialValue]])),
      ...(initialValues ?? {}),
    }),
    [descriptor.fields, initialValues],
  );
  /*
   * The placement's values, written into the mounted form when they change -- and only then.
   *
   * Ant Design reads `initialValues` once, at the first render of a `Form`, so a form that is already
   * mounted has to be told. This is that telling. It used to fire on the identity of the memo above,
   * which is a new object on every render whose props are new objects -- and a Server render is
   * exactly that: `router.refresh()` hands every Widget a fresh descriptor, so the effect ran and
   * overwrote whatever somebody had typed since, with values nobody had changed.
   *
   * Compared by value, in the order the fields are declared, because the question is whether the
   * Server now says something else, not whether React built another object.
   *
   * A field somebody has touched keeps what they put in it. The Server's answer is newer than the
   * render, but it is not newer than the person: a Page that comes back while a form is half filled
   * in is the ordinary case for a Settings panel that saves on change, and losing an entry to it is
   * worse than showing an entry that is one save behind.
   */
  const initialValuesKey = JSON.stringify(
    descriptor.fields.map((field) => [field.key, resolvedInitialValues[field.key] ?? null]),
  );
  const appliedInitialValuesRef = useRef<string | null>(null);
  useEffect(() => {
    if (appliedInitialValuesRef.current === initialValuesKey) {
      return;
    }
    const first = appliedInitialValuesRef.current == null;
    appliedInitialValuesRef.current = initialValuesKey;
    const fieldValues = Object.fromEntries(
      descriptor.fields
        .filter((field) => first || !form.isFieldTouched(field.key))
        .map((field) => [field.key, resolvedInitialValues[field.key]]),
    );
    form.setFieldsValue(fieldValues);
  }, [descriptor.fields, form, initialValuesKey, resolvedInitialValues]);

  async function submit(values: Record<string, unknown>) {
    setSubmitting(true);
    onSubmittingChange?.(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  const validationFailed: NonNullable<FormProps<Record<string, unknown>>["onFinishFailed"]> = ({ errorFields }) => {
    const errors = Object.fromEntries(errorFields.flatMap(({ name, errors: messages }) => {
      const fieldKey = String(name[0] ?? "");
      return fieldKey && messages.length > 0 ? [[fieldKey, messages]] : [];
    }));
    /*
     * A failed submit reports itself and nothing else.
     *
     * It used to also say the state had changed, which was a third way of saying what
     * `onValidationFailed` says here and what `onFieldsChange` says when the errors land on the
     * fields. Unlike those two it fired unconditionally, on every attempt, whether anything had
     * changed or not -- and a placement is free to read "the state changed" as "the person changed
     * something, save it". One such placement exists: a Settings panel that submits on change. There,
     * a rule that rejects the value turned into a submit that failed, said the state had changed, and
     * was submitted again, two hundred times a second.
     */
    onValidationFailed?.({ valid: false, errors });
  };

  /*
   * Only what the descriptor reads is watched. `useWatch` re-renders this whole form -- and with it every
   * field, its rules and its options resolution -- whenever the selected value changes, compared as JSON.
   * Watching every value made each keystroke in any field a render of all of them; watching the handful
   * of keys that conditions and options dependencies name makes it a render only when one of those moves.
   */
  const watchedFormKeys = useMemo(() => collectPhiFormWatchedKeys(descriptor.fields), [descriptor.fields]);
  const selectWatchedFormValues = useCallback(
    (values: Record<string, unknown>) => pickPhiFormWatchedValues(values, watchedFormKeys),
    [watchedFormKeys],
  );
  const watchedFormValues = Form.useWatch(selectWatchedFormValues, { form, preserve: true });
  const formValues = useMemo(
    () => watchedFormValues ?? pickPhiFormWatchedValues(resolvedInitialValues, watchedFormKeys),
    [resolvedInitialValues, watchedFormKeys, watchedFormValues],
  );
  const fieldFormContext = useMemo(() => ({
    getValues: () => form.getFieldsValue(true),
    setValues: (values: Record<string, unknown>) => {
      form.setFields(Object.entries(values).map(([name, value]) => ({ name, value, touched: true })));
      onValuesChange?.(values, form.getFieldsValue(true));
      onStateChange?.({
        dirty: true,
        valid: form.getFieldsError().every(({ errors }) => errors.length === 0),
      });
    },
  }), [form, onStateChange, onValuesChange]);

  /*
   * The fields that are drawn: every field whose `visibleWhen` holds, and every field whose provider is
   * missing, because that one draws the alert saying so. The grid placement and the trailing gap are
   * worked out over these alone -- a field hidden by its condition takes no row, and the last field
   * drawn is the one that must not keep a gap for a field that is not there.
   */
  const renderedFields = useMemo(() => descriptor.fields.filter((field) =>
    !activeRegistry.fieldTypesByKey.has(field.fieldProviderKey) ||
    !field.visibleWhen ||
    evaluatePhiRuntimeConditionExpression(field.visibleWhen, {
      form: formValues,
      controllers: conditionControllerStates,
    }) === "matched"),
  [activeRegistry, conditionControllerStates, descriptor.fields, formValues]);

  /*
   * Where every part of every field lies, at each of the three widths, worked out before anything is
   * drawn. Labels and controls are direct children of the form's grid and name their own row and
   * columns; CSS then picks the set that matches the form's measured width.
   */
  /*
   * The last field in flow carries no trailing gap.
   *
   * Whatever stands under the form -- a submit, a row of links -- brings its own spacing, and the gap
   * the last row kept for the next field was added to it, so everything below the form sat twice as far
   * away as everything inside it.
   */
  const lastInFlowFieldKey = useMemo(() => {
    const inFlow = renderedFields.filter((field) =>
      activeRegistry.fieldTypesByKey.get(field.fieldProviderKey)?.presentation === "control");
    return inFlow.length === 0 ? null : inFlow[inFlow.length - 1].key;
  }, [activeRegistry, renderedFields]);

  const placementByMode = useMemo(() => {
    const entries = renderedFields.map((field) => ({
      key: field.key,
      placement: field.placement,
      inFlow: activeRegistry.fieldTypesByKey.get(field.fieldProviderKey)?.presentation === "control",
      hasLabel: field.label != null && field.controlLabel == null,
    }));
    return {
      compact: resolvePhiFormGridPlacement(layout, entries, "compact"),
      medium: resolvePhiFormGridPlacement(layout, entries, "medium"),
      wide: resolvePhiFormGridPlacement(layout, entries, "wide"),
    };
  }, [activeRegistry, layout, renderedFields]);

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <Form
      className="phi-form-descriptor"
      name={formDomName}
      form={form}
      layout="vertical"
      colon={false}
      initialValues={resolvedInitialValues}
      disabled={disabled}
      /*
       * The form is the grid, and its tracks are the twenty-four every range is written against. Labels
       * and controls are not laid out by Ant Design here: a Form Item carries only its control and its
       * error, and where the two parts of a field lie is said by the descriptor and the Form Layout.
       */
      /*
       * The structure stays inline and only what changes with the width comes from the stylesheet.
       *
       * It was all moved into `:where()` rules once, which have no specificity at all, so a single Ant
       * Design rule on `.ant-form` was enough to take `display` back and the grid stopped being a grid.
       * Inline wins against every stylesheet; `grid-column` is deliberately not here, because that is
       * the one thing the container queries have to be able to decide.
       */
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${PHI_FORM_GRID_TRACKS}, minmax(0, 1fr))`,
        containerType: "inline-size",
        containerName: "phi-form",
        columnGap: 0,
        alignItems: "start",
        width: "100%",
        minWidth: 0,
        "--phi-form-row-gap-compact": `${rowGapByMode.compact}px`,
        "--phi-form-row-gap-medium": `${rowGapByMode.medium}px`,
        "--phi-form-row-gap-wide": `${rowGapByMode.wide}px`,
        "--phi-form-label-gutter-compact": `${Math.round(rowGapByMode.compact / 2)}px`,
        "--phi-form-label-gutter-medium": `${Math.round(rowGapByMode.medium / 2)}px`,
        "--phi-form-label-gutter-wide": `${Math.round(rowGapByMode.wide / 2)}px`,
        "--phi-form-column-gutter-compact": `${columnGapByMode.compact}px`,
        "--phi-form-column-gutter-medium": `${columnGapByMode.medium}px`,
        "--phi-form-column-gutter-wide": `${columnGapByMode.wide}px`,
        "--phi-form-label-min-height": `${token.controlHeight}px`,
      } as CSSProperties}
      onValuesChange={(changedValues, allValues) => {
        onValuesChange?.(changedValues, allValues);
      }}
      onFieldsChange={() => {
        onStateChange?.({ dirty: form.isFieldsTouched(), valid: form.getFieldsError().every(({ errors }) => errors.length === 0) });
      }}
      onBlurCapture={onBlurCapture}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement | null;
        if (!submitOnEnter || !target || !shouldPhiFormSubmitOnKeyDown({
          key: event.key,
          defaultPrevented: event.defaultPrevented,
          isComposing: event.nativeEvent.isComposing,
          multiline: target.tagName === "TEXTAREA",
          contentEditable: target.isContentEditable,
          managedKeyboardScope: Boolean(target.closest("[data-phi-form-keyboard-scope], [role='grid'], [role='tree'], .ant-select-dropdown, .ant-picker-dropdown")),
        })) {
          return;
        }
        event.preventDefault();
        form.submit();
      }}
      onFinish={submit}
      onFinishFailed={validationFailed}
    >
      {renderedFields.map((field) => {
        const provider = activeRegistry.fieldTypesByKey.get(
          field.fieldProviderKey,
        );
        const cellProperties = (part: "label" | "control") => Object.fromEntries(
          PHI_FORM_RESPONSIVE_MODES.flatMap((mode) => {
            const placed = placementByMode[mode].placements.get(field.key);
            if (!placed) return [];
            const range = part === "label" ? placed.label : placed.control;
            const followsLayout = phiFormFieldFollowsLayoutColumns({
              placement: field.placement,
              label: placed.label,
              control: placed.control,
              stacked: placed.stacked,
            });
            return [
              [`--phi-form-cell-row-${mode}`, String(part === "label" ? placed.labelRow : placed.controlRow)],
              [`--phi-form-cell-columns-${mode}`, part === "label"
                ? phiFormLabelGridColumn(range, followsLayout)
                : phiFormControlGridColumn(range, followsLayout)],
              [`--phi-form-cell-gap-${mode}`, part === "label"
                ? (placed.stacked ? `calc(var(--phi-form-row-gap-${mode}) / 4)` : "0px")
                : field.key === lastInFlowFieldKey ? "0px" : `var(--phi-form-row-gap-${mode})`],
              [`--phi-form-label-height-${mode}`, placed.stacked
                ? "auto"
                : "var(--phi-form-label-min-height)"],
              [`--phi-form-label-pad-${mode}`, placed.stacked
                ? "0px"
                : `var(--phi-form-label-gutter-${mode})`],
              [`--phi-form-cell-lead-${mode}`,
                phiFormCellOpensColumn(range, part === "label" ? placed.control : placed.labelSlot)
                  ? `var(--phi-form-column-gutter-${mode})`
                  : "0px"],
            ];
          }),
        ) as CSSProperties;

        if (!provider) {
          return (
            <div key={field.key} className="phi-form-cell phi-form-cell--control" style={cellProperties("control")}>
              <PhiAlertControl
                level="error"
                showIcon
                title={`Form field is not renderable: ${field.key}`}
                description={`Missing field provider: ${field.fieldProviderKey}`}
              />
            </div>
          );
        }

        const rules = resolveFieldRules(field);
        /*
         * A field says what its label is, or it has none. The key was standing in for one that was
         * never declared, so a consent field announced itself as "termsAccepted" -- an identifier read
         * by whoever had to fill the form in.
         */
        const labelText = field.label
          ? resolvePhiFormText(field.label, labels, formConfig)
          : undefined;
        const providerLabel = labelText;
        const providerDescription = field.description
          ? resolvePhiFormText(field.description, labels, formConfig)
          : undefined;
        const renderedFieldLabel = labelText
          ? renderLabel(field, labelText, labels, formConfig)
          : null;
        const dependencies = rules.flatMap((rule) => {
          const dependency =
            rule.providerKey ===
              PHI_FORM_VALIDATION_PROVIDER_KEYS.matchesField &&
            typeof rule.config?.field === "string"
              ? rule.config.field
              : null;
          return dependency ? [dependency] : [];
        });
        const hidden = provider.presentation === "hidden";
        const honeypot = provider.presentation === "honeypot";
        const fieldDisabled = field.disabledWhen
          ? evaluatePhiRuntimeConditionExpression(field.disabledWhen, {
              form: formValues,
              controllers: conditionControllerStates,
            })
          : "not-matched";
        const resolvedRules = rules.map((rule) => {
          const validationProvider = activeRegistry.validationRulesByKey.get(
            rule.providerKey,
          );
          if (!validationProvider) {
            return {
              async validator() {
                throw new Error(
                  `Missing validation provider: ${rule.providerKey}`,
                );
              },
            };
          }

          return validationProvider.createRule({
            field,
            rule,
            message: rule.message
              ? resolvePhiFormText(rule.message, labels, formConfig)
              : undefined,
          });
        });
        const required = rules.some(
          (rule) =>
            rule.providerKey === PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        );
        /*
         * A label of its own, not Ant Design's. Its own grid item cannot live inside the Form Item that
         * would draw it, and a field whose label carries its own range is the entire point of the
         * contract. What is lost with it -- the required marker and the link to the control -- is drawn
         * here instead.
         */
        const showLabel = !hidden && !honeypot && !field.controlLabel &&
          field.fieldProviderKey !== PHI_FORM_FIELD_PROVIDER_KEYS.table &&
          field.fieldProviderKey !== PHI_FORM_FIELD_PROVIDER_KEYS.tree &&
          renderedFieldLabel != null;

        return (
          <Fragment key={field.key}>
            {showLabel ? (
              <label
                htmlFor={resolvePhiFormFieldDomId(formDomName, field.key)}
                className="phi-form-cell phi-form-cell--label"
                style={{
                  ...cellProperties("label"),
                  justifyContent: layout.labelAlign === "end" ? "flex-end" : "flex-start",
                  color: token.colorTextHeading,
                  textAlign: layout.labelAlign === "end" ? "end" : "start",
                }}
              >
                {required ? (
                  <span aria-hidden style={{ color: token.colorError, marginInlineEnd: "0.25em" }}>
                    *
                  </span>
                ) : null}
                {renderedFieldLabel}
              </label>
            ) : null}
            <div
              className="phi-form-cell phi-form-cell--control"
              aria-hidden={honeypot || undefined}
              style={{
                ...cellProperties("control"),
                ...resolveHoneypotStyle(provider.presentation),
              }}
            >
              <Form.Item
                name={field.key}
                messageVariables={{ label: labelText ?? field.key }}
                hidden={hidden}
                valuePropName={provider.valuePropName}
                dependencies={dependencies}
                required={required}
                rules={resolvedRules.length === 0 ? undefined : resolvedRules}
                style={{ marginBottom: 0 }}
              >
                <PhiResolvedFormFieldControl
                  provider={provider}
                  field={field}
                  label={providerLabel}
                  description={providerDescription}
                  labels={labels}
                  formConfig={formConfig}
                  placeholder={
                    field.placeholder
                      ? resolvePhiFormText(field.placeholder, labels, formConfig)
                      : undefined
                  }
                  disabled={disabled || submitting || readOnly || field.config?.disabled === true || fieldDisabled !== "not-matched"}
                  readOnly={readOnly}
                  formContext={fieldFormContext}
                  formValues={formValues}
                />
              </Form.Item>
            </div>
          </Fragment>
        );
      })}
      </Form>
    </div>
  );
});
