"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Col,
  Form,
  Row,
  Tooltip,
  theme as antdTheme,
  type ColProps,
  type FormProps,
  type FormInstance,
} from "antd";

import type {
  PhiFormDescriptor,
  PhiFormFieldDescriptor,
  PhiFormResponsiveGridPlacement,
} from "../../types/form-descriptor";
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
  resolvePhiFormFieldCellPlacement,
  resolvePhiFormEffectiveColumnCount,
  resolvePhiFormLayout,
  resolvePhiFormResponsiveGridPlacement,
  resolvePhiFormText,
  shouldPhiFormSubmitOnKeyDown,
  type PhiFormResponsiveMode,
  type PhiResolvedFormResponsiveGridPlacement,
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

function resolveResponsivePlacement(
  placement: PhiResolvedFormResponsiveGridPlacement,
  mode: PhiFormResponsiveMode,
): Pick<ColProps, "span" | "offset" | "order"> {
  return placement[mode];
}

function resolveFieldGrid(
  placement: PhiFormResponsiveGridPlacement | undefined,
  fallback: PhiResolvedFormResponsiveGridPlacement,
  path: string,
  mode: PhiFormResponsiveMode,
) {
  return resolveResponsivePlacement(
    resolvePhiFormResponsiveGridPlacement(placement, fallback, path),
    mode,
  );
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const update = () => setContainerWidth((current) => {
      const next = node.clientWidth;
      return current === next ? current : next;
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const responsiveMode: PhiFormResponsiveMode = containerWidth != null && containerWidth >= token.screenLG
    ? "wide"
    : containerWidth != null && containerWidth >= token.screenSM
      ? "medium"
      : "compact";
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
  const currentRowGap = gapByToken[layout.gap[responsiveMode]];
  const effectiveColumnCount = resolvePhiFormEffectiveColumnCount(
    layout.columns[responsiveMode],
    responsiveMode,
  );
  const currentColumnGap = effectiveColumnCount > 1 ? currentRowGap : 0;
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

  return (
    <div ref={containerRef} style={{ width: "100%", minWidth: 0 }}>
      <Form
      className="phi-form-descriptor"
      form={form}
      layout={layout.labelPlacement === "top" ? "vertical" : "horizontal"}
      colon={false}
      labelAlign={layout.labelAlign === "start" ? "left" : "right"}
      labelWrap
      initialValues={resolvedInitialValues}
      disabled={disabled}
      style={{
        display: "grid",
        rowGap: currentRowGap,
        width: "100%",
        minWidth: 0,
      }}
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
      <Row gutter={[currentColumnGap, currentRowGap]}>
        {descriptor.fields.map((field) => {
          const provider = activeRegistry.fieldTypesByKey.get(
            field.fieldProviderKey,
          );
          const cellPlacement = field.placement?.cell == null
            ? { span: 24 / effectiveColumnCount }
            : resolveResponsivePlacement(resolvePhiFormFieldCellPlacement(
                layout,
                field.placement.cell,
              ), responsiveMode);
          if (!provider) {
            return (
              <Col key={field.key} {...cellPlacement}>
                <PhiAlertControl
                  level="error"
                  showIcon
                  title={`Form field is not renderable: ${field.key}`}
                  description={`Missing field provider: ${field.fieldProviderKey}`}
                />
              </Col>
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
          const labelCol =
            layout.labelPlacement === "top"
              ? undefined
              : resolveFieldGrid(
                  field.placement?.label,
                  layout.labelGrid,
                  `fields.${field.key}.placement.label`,
                  responsiveMode,
                );
          const wrapperCol =
            layout.labelPlacement === "top"
              ? undefined
              : resolveFieldGrid(
                  field.placement?.control,
                  layout.controlGrid,
                  `fields.${field.key}.placement.control`,
                  responsiveMode,
                );

          return (
            <Col
              key={field.key}
              {...cellPlacement}
              aria-hidden={honeypot || undefined}
              style={{
                minWidth: 0,
                maxWidth: "100%",
                ...resolveHoneypotStyle(provider.presentation),
              }}
            >
              <Form.Item
                name={field.key}
                label={
                  hidden || honeypot || field.controlLabel ||
                    field.fieldProviderKey === PHI_FORM_FIELD_PROVIDER_KEYS.table ||
                    field.fieldProviderKey === PHI_FORM_FIELD_PROVIDER_KEYS.tree
                    ? undefined
                    : renderedFieldLabel
                }
                messageVariables={{ label: labelText }}
                labelCol={labelCol}
                wrapperCol={wrapperCol}
                hidden={hidden}
                valuePropName={provider.valuePropName}
                dependencies={dependencies}
                required={rules.some(
                  (rule) =>
                    rule.providerKey ===
                    PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
                )}
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
            </Col>
          );
        })}
      </Row>
      </Form>
    </div>
  );
});
