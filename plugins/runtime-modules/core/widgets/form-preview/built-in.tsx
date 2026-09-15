import type { PhiBlockRuntime, PhiCmsRuntimeRenderRegistry } from "../../../../../types";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { getResolvedFormDefinition } from "../../../../../gateway/form-registry";
import { resolvePhiFormLabels } from "../../../../../components/forms/form-resolution";
import { buildPhiFormPreviewDescriptorFromDefinition } from "../../../../../gateway/form-submit";
import type { PhiApiDataSource } from "../../../../../gateway/data-source";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsInstanceId } from "../../../../../types";
import type { PhiCmsFormPreviewWidgetConfig } from "./config";

export type PhiFormPreviewWidgetProps = {
  blockId: PhiCmsInstanceId;
  runtime: Pick<PhiBlockRuntime, "site" | "locale"> & Partial<Pick<PhiBlockRuntime, "area">>;
  registry: Pick<PhiCmsRuntimeRenderRegistry, "formDefinitionsById">;
  config: PhiCmsFormPreviewWidgetConfig;
};

/**
 * Where the preview is read from: the form's own preview phase, on the Site's form route.
 *
 * The same shape the submit takes, one phase earlier -- which is why the form declares the handler and
 * this Widget only names the form.
 */
const PHI_FORM_PREVIEW_DATA_SOURCE: PhiApiDataSource = {
  kind: "api",
  upstreamPath: "/api/site/forms",
  endpointKey: "preview",
  method: "GET",
  transport: "site",
  requestShape: {
    queryMap: {
      phase: "phase",
      formId: "formId",
      token: "token",
    },
  },
  cache: {
    mode: "no-store",
  },
};

export async function PhiFormPreviewWidget({
  blockId,
  runtime,
  registry,
  config,
}: PhiFormPreviewWidgetProps) {
  if (!config.formId) {
    return null;
  }

  const rt = phiRuntime(runtime);
  const resolvedForm = await getResolvedFormDefinition({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: runtime.site.key,
    formId: config.formId,
    presetDefinitions: [...registry.formDefinitionsById.values()],
  });

  if (!resolvedForm) {
    throw new Error(`Form "${config.formId}" is not available from the active runtime modules.`);
  }

  const previewDescriptor = buildPhiFormPreviewDescriptorFromDefinition(resolvedForm.definition);
  if (!previewDescriptor) {
    throw new Error(`Form "${config.formId}" declares no preview handler to read.`);
  }

  const labels = await resolvePhiFormLabels({
    runtime,
    resolvedForm,
    options: { config: {}, formInstanceKey: String(blockId) },
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.FormPreview}
      componentProps={{
        blockId,
        formId: previewDescriptor.formId,
        tokenParam: config.tokenParam,
        dataSource: PHI_FORM_PREVIEW_DATA_SOURCE,
        labels,
        signalRoutes: config.signalRoutes,
      }}
    />
  );
}
