"use client";

import { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Form,
  Tooltip,
  theme as antdTheme,
  type FormProps,
  type FormInstance,
} from "antd";

import type {
  PhiFormDescriptor,
  PhiFormFieldDescriptor,
} from "../../types/form-descriptor";
import { PHI_FORM_GRID_TRACKS } from "../../types/form-descriptor";
import { evaluatePhiRuntimeConditionExpression } from "../../types/runtime-condition";
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
import { PHI_DESCRIPTION_TOOLTIP_ICON } from "./phi-description-tooltip-icon";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "../forms/form-provider-contract";
import {
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
  initialValues?: Record<string, unknown>;
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
) {
  if (!field.description) {
    return label;
  }

  const description = resolvePhiFormText(field.description, labels);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35em" }}>
      <span>{label}</span>
      <Tooltip title={description}>
        <span role="img" aria-label={description} style={{ display: "inline-flex", cursor: "help" }}>
          {PHI_DESCRIPTION_TOOLTIP_ICON}
        </span>
      </Tooltip>
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

function PhiResolvedFormFieldControl({
  provider,
  field,
  label,
  description,
  labels,
  placeholder,
  disabled,
  readOnly,
  value,
  checked,
  onChange,
  formContext,
  formValues,
}: {
  provider: PhiFormFieldTypeProvider;
  field: PhiFormFieldDescriptor;
  /** The live values of this form, for a field whose options depend on a sibling. */
  formValues?: Record<string, unknown> | null;
  label?: string;
  description?: string;
  labels?: Readonly<Record<string, string>>;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
} & Pick<PhiFormFieldProviderProps, "value" | "checked" | "onChange" | "formContext">) {
  const staticOptions = useMemo(
    () => field.options?.map((option) => ({
      ...option,
      label: resolvePhiFormText(option.label, labels),
      description: option.description
        ? resolvePhiFormText(option.description, labels)
        : undefined,
    })),
    [field.options, labels],
  );
  // Raw text only: how long it has to be, whether it is used at all, and who filters is declared on
  // the field and applied by the hook, so every control that resolves options obeys the same rules.
  const [searchDraft, setSearchDraft] = useState("");
  const resolvedOptions = usePhiControlOptionsProvider({
    options: staticOptions,
    optionsProvider: field.optionsProvider,
    sourceConfig: field.config,
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
  const lastRequiredDependencyKey = useRef(requiredDependencyKey);
  useEffect(() => {
    if (lastRequiredDependencyKey.current === requiredDependencyKey) return;
    lastRequiredDependencyKey.current = requiredDependencyKey;
    if (value != null && value !== "") onChange?.(undefined);
  }, [onChange, requiredDependencyKey, value]);
  const Control = provider.Control;
  const controlLabel = field.controlLabel
    ? resolvePhiFormText(field.controlLabel, labels)
    : undefined;

  return (
    <>
      <Control
        field={field}
        label={label}
        description={description}
        controlLabel={controlLabel}
        labels={labels}
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

export const PhiFormControl = forwardRef<PhiFormControlHandle, PhiFormControlProps>(function PhiFormControl({
  descriptor,
  registry,
  labels,
  initialValues,
  disabled = false,
  readOnly = false,
  conditionControllerStates = {},
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
  const resolvedInitialValues = useMemo(
    () => ({
      ...Object.fromEntries(descriptor.fields.flatMap((field) =>
        field.initialValue === undefined ? [] : [[field.key, field.initialValue]])),
      ...(initialValues ?? {}),
    }),
    [descriptor.fields, initialValues],
  );
  useEffect(() => {
    const fieldValues = Object.fromEntries(descriptor.fields.map((field) => [field.key, resolvedInitialValues[field.key]]));
    form.setFieldsValue(fieldValues);
  }, [descriptor.fields, form, resolvedInitialValues]);

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
    onStateChange?.({ dirty: form.isFieldsTouched(), valid: false });
    onValidationFailed?.({ valid: false, errors });
  };

  const formValues = Form.useWatch((values) => values, { form, preserve: true }) ?? resolvedInitialValues;
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
    const inFlow = descriptor.fields.filter((field) =>
      activeRegistry.fieldTypesByKey.get(field.fieldProviderKey)?.presentation === "control");
    return inFlow.length === 0 ? null : inFlow[inFlow.length - 1].key;
  }, [activeRegistry, descriptor.fields]);

  const placementByMode = useMemo(() => {
    const entries = descriptor.fields.map((field) => ({
      key: field.key,
      placement: field.placement,
      inFlow: activeRegistry.fieldTypesByKey.get(field.fieldProviderKey)?.presentation === "control",
    }));
    return {
      compact: resolvePhiFormGridPlacement(layout, entries, "compact"),
      medium: resolvePhiFormGridPlacement(layout, entries, "medium"),
      wide: resolvePhiFormGridPlacement(layout, entries, "wide"),
    };
  }, [activeRegistry, descriptor.fields, layout]);

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <Form
      className="phi-form-descriptor"
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
        if (!target || !shouldPhiFormSubmitOnKeyDown({
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
      {descriptor.fields.map((field) => {
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
        const labelText = field.label
          ? resolvePhiFormText(field.label, labels)
          : field.key;
        const providerLabel = field.label ? labelText : undefined;
        const providerDescription = field.description
          ? resolvePhiFormText(field.description, labels)
          : undefined;
        const renderedFieldLabel = labelText
          ? renderLabel(field, labelText, labels)
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
        const visibility = field.visibleWhen
          ? evaluatePhiRuntimeConditionExpression(field.visibleWhen, {
              form: formValues,
              controllers: conditionControllerStates,
            })
          : "matched";
        if (visibility !== "matched") return null;
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
              ? resolvePhiFormText(rule.message, labels)
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
                htmlFor={field.key}
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
                messageVariables={{ label: labelText }}
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
                  placeholder={
                    field.placeholder
                      ? resolvePhiFormText(field.placeholder, labels)
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
