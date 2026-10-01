import type { ReactNode } from "react";
import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../types/cms-plugins";
import { phiRuntime } from "../../server-helpers/phi-runtime";
import { getResolvedFormDefinition } from "../../gateway/form-registry";
import type { PhiFormRenderOptions } from "./form-resolution";
import { resolvePhiFormLabels } from "./form-resolution";
import { createPhiRuntimeFormControllerAddress } from "./runtime-form-controller-address";
import type { PhiFormWidgetFrameProps } from "./phi-form-widget-frame";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../constants/runtime-render-client-types";
import type { PhiFormId } from "../../types/form-id";
import type { PhiCmsFormWidgetConfig } from "./form-widget-config";
import { resolvePhiFormText } from "./form-descriptor-contract";
import { PHI_FORM_DEFAULT_SUBMIT_LABEL } from "../../types/form-descriptor";
import {
  readPhiRuntimeConditionValue,
  type PhiRuntimeFeatureState,
} from "../../types/runtime-condition";
import { PhiRuntimeModuleUiProviderHost } from "../runtime/runtime-module-ui-provider-client-manifest";

export type PhiFormWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale"> &
    Partial<Pick<PhiBlockRuntime, "area">>;
  registry: Pick<PhiCmsRuntimeRenderRegistry, "formDefinitionsById" | "uiProviderModuleIds">;
  formId: PhiFormId;
  formInstanceKey?: string | number | null;
  config?: PhiCmsFormWidgetConfig;
  /** What the active Modules published about this Site, as the renderer already resolved it. */
  features?: PhiRuntimeFeatureState | null;
};

function normalizeFormId(value: string) {
  return value.trim().toLowerCase();
}

export async function PhiFormWidget({
  runtime,
  registry,
  formId,
  formInstanceKey,
  config,
  features = null,
}: PhiFormWidgetProps) {
  const normalizedFormId = normalizeFormId(formId);
  if (!normalizedFormId) {
    return null;
  }

  const rt = phiRuntime(runtime);
  const resolvedForm = await getResolvedFormDefinition({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: runtime.site.key,
    formId: normalizedFormId,
    presetDefinitions: [...registry.formDefinitionsById.values()],
  });

  if (!resolvedForm) {
    throw new Error(`Form "${normalizedFormId}" is not available from the active runtime modules.`);
  }

  const renderOptions: PhiFormRenderOptions = {
    config: config?.formConfig,
    formControllerAddress: createPhiRuntimeFormControllerAddress(
      formInstanceKey ?? `form-${normalizedFormId}`,
    ),
    formInstanceKey: String(formInstanceKey ?? `form-${normalizedFormId}`),
  };

  const ownerModuleId = resolvedForm.definition.ownerModuleId;
  const hasUiProvider = registry.uiProviderModuleIds.has(ownerModuleId);

  /*
   * Both reads happen here, on the server, and both are the form's own: what it is called, and what it
   * already knows. Asking for either after hydration is a blank card for as long as the page takes to
   * become interactive, which is the wait a visitor reads as a slow site.
   */
  const renderContext = { runtime, resolvedForm, options: renderOptions };
  const [labels, loadedInitialValues] = await Promise.all([
    resolvePhiFormLabels(renderContext),
    resolvedForm.definition.loadInitialValues?.(renderContext) ?? null,
  ]);

  /*
   * A link is offered only where it leads somewhere that exists: a Site with registration switched off
   * has no account to create. The fact is read from the same published Module state a node condition
   * reads, so the two cannot disagree about what this Site offers.
   */
  const resolvedLinks = (config?.links ?? []).flatMap((link) => {
    if (link.requiresFeature && !readPhiRuntimeConditionValue(features, link.requiresFeature)) {
      return [];
    }
    const label = labels[`actions.${link.key}Label`];
    return label ? [{ key: link.key, label, href: link.href }] : [];
  });

  /*
   * Every form body is wrapped the same way, and no body carries a submit or a way out: a body offers
   * a way to submit. Whether a button is drawn is this placement's `submit`; what it says and which
   * tracks it stands on are the descriptor's, resolved here where the form's labels already are.
   */
  const submitDescriptor = resolvedForm.definition.descriptor.submit;
  const submit = config?.submit === "inline"
    ? {
        label: resolvePhiFormText(
          submitDescriptor?.label ?? PHI_FORM_DEFAULT_SUBMIT_LABEL,
          labels,
          config.formConfig,
        ),
        align: submitDescriptor?.align ?? "start",
        ...(submitDescriptor?.control ? { control: submitDescriptor.control } : {}),
      }
    : null;
  const wrapFormUiProvider = (node: ReactNode) => {
    const frameProps: PhiFormWidgetFrameProps = {
      submit,
      card: config?.card ?? null,
      maxFormWidth: config?.maxFormWidth ?? null,
      links: resolvedLinks,
      layout: resolvedForm.definition.descriptor.layout,
      children: node,
    };
    const framed = (
      <PhiRuntimeModuleRenderClientHost
        type={PhiRuntimeRenderClientType.FormWidgetFrame}
        componentProps={frameProps}
      />
    );
    return hasUiProvider
      ? (
        <PhiRuntimeModuleUiProviderHost moduleId={ownerModuleId}>{framed}</PhiRuntimeModuleUiProviderHost>
      )
      : framed;
  };

  return wrapFormUiProvider(
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.FormDescriptor}
      componentProps={{
        descriptor: resolvedForm.definition.descriptor,
        labels,
        loadedInitialValues,
        formId: resolvedForm.definition.formId,
        formControllerAddress: renderOptions.formControllerAddress,
        widgetConfig: config,
      }}
    />
  );
}
