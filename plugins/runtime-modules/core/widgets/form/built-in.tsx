import type { ReactNode } from "react";
import type { PhiBlockRuntime, PhiCmsRuntimeRenderRegistry } from "../../../../../types";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { getResolvedFormDefinition } from "../../../../../gateway/form-registry";
import type { PhiFormRenderOptions } from "../../../../../components/forms/form-resolution";
import { resolvePhiFormLabels } from "../../../../../components/forms/form-resolution";
import { createPhiRuntimeFormControllerAddress } from "../../../../../components/forms/runtime-form-controller-address";
import { PhiFormWidgetFrame } from "../../../../../components/forms/phi-form-widget-frame";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import type { PhiFormId } from "../../../../../types/form-id";
import type { PhiCmsFormWidgetConfig } from "./config";

export type PhiFormWidgetConfig = Record<string, unknown>;

export type PhiFormWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale"> &
    Partial<Pick<PhiBlockRuntime, "area">>;
  registry: Pick<PhiCmsRuntimeRenderRegistry, "formDefinitionsById" | "uiProvidersByModuleId">;
  formId: PhiFormId;
  formInstanceKey?: string | number | null;
  config?: PhiCmsFormWidgetConfig;
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

  const Provider = registry.uiProvidersByModuleId.get(resolvedForm.definition.ownerModuleId);
  /*
   * Every form body is wrapped the same way, whether it draws itself from a descriptor or brings its own
   * component. The submit belongs to the Widget, so no body may carry one: a body offers a way to submit
   * and this frame decides whether there is a button at all, what it says and where it sits.
   */
  const wrapFormUiProvider = (node: ReactNode) => {
    const framed = <PhiFormWidgetFrame submit={config?.submit ?? null}>{node}</PhiFormWidgetFrame>;
    return Provider ? <Provider>{framed}</Provider> : framed;
  };

  if (resolvedForm.definition.render) {
    return wrapFormUiProvider(await resolvedForm.definition.render({
      runtime,
      resolvedForm,
      options: renderOptions,
    }));
  }

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
