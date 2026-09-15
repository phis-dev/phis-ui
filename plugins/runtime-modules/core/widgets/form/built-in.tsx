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
import {
  readPhiRuntimeConditionValue,
  type PhiRuntimeFeatureState,
} from "../../../../../types/runtime-condition";

export type PhiFormWidgetConfig = Record<string, unknown>;

export type PhiFormWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale"> &
    Partial<Pick<PhiBlockRuntime, "area">>;
  registry: Pick<PhiCmsRuntimeRenderRegistry, "formDefinitionsById" | "uiProvidersByModuleId">;
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

  const Provider = registry.uiProvidersByModuleId.get(resolvedForm.definition.ownerModuleId);

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
   * Every form body is wrapped the same way. The submit and the ways out belong to the Widget, so no
   * body may carry either: a body offers a way to submit, and this frame decides whether there is a
   * button at all, what it says, and which column it and the links stand in.
   */
  const wrapFormUiProvider = (node: ReactNode) => {
    const framed = (
      <PhiFormWidgetFrame submit={config?.submit ?? null} links={resolvedLinks}>
        {node}
      </PhiFormWidgetFrame>
    );
    return Provider ? <Provider>{framed}</Provider> : framed;
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
