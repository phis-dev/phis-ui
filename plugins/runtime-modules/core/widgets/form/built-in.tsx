import type { ReactNode } from "react";
import type { PhiBlockRuntime, PhiCmsRuntimeRenderRegistry } from "../../../../../types";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { getResolvedFormDefinition } from "../../../../../gateway/form-registry";
import type { PhiFormRenderOptions } from "../../../../../components/forms/form-resolution";
import { resolvePhiFormLabels } from "../../../../../components/forms/form-resolution";
import { createPhiRuntimeFormControllerAddress } from "../../../../../components/forms/runtime-form-controller-address";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import type { PhiFormId } from "../../../../../types/form-id";
import type { PhiCmsFormWidgetConfig } from "./config";

export type PhiFormWidgetConfig = Record<string, unknown>;

export type PhiFormWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "phis"> &
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
  const wrapFormUiProvider = (node: ReactNode) =>
    Provider ? <Provider>{node}</Provider> : node;

  if (resolvedForm.definition.render) {
    return wrapFormUiProvider(await resolvedForm.definition.render({
      runtime,
      resolvedForm,
      options: renderOptions,
    }));
  }

  const labels = await resolvePhiFormLabels({ runtime, resolvedForm, options: renderOptions });

  return wrapFormUiProvider(
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.FormDescriptor}
      componentProps={{
        descriptor: resolvedForm.definition.descriptor,
        labels,
        formId: resolvedForm.definition.formId,
        formControllerAddress: renderOptions.formControllerAddress,
        widgetConfig: config,
      }}
    />
  );
}
