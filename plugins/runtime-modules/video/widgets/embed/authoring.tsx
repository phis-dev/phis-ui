"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import { usePhiRuntimeModuleState } from "../../../../../components/runtime/runtime-module-context";
import { parsePhiVideoEmbedParams, resolvePhiVideoAddress, resolvePhiVideoId } from "../../../../../types/video";
import { PHI_VIDEO_EMBED_WIDGET_DEFINITION, type PhiVideoEmbedWidgetConfig } from "./config";

/**
 * What the Builder says about the provider and the id that were entered.
 *
 * A Widget that renders nothing is right on a public page -- a visitor is not shown our diagnostics -- and
 * useless to the person who just typed something. So the silence ends here: the editor resolves the same
 * way the live half will, against the same registry, and names which of the several possible reasons
 * applies. Without this, "nothing appeared" and "I pasted the wrong thing" look identical.
 */
function PhiVideoEmbedWidgetEditorSummary({ config }: { config: PhiVideoEmbedWidgetConfig | undefined }) {
  const { videoProviderDescriptorsByKey } = usePhiRuntimeModuleState();
  const providerKey = config?.providerKey;
  const entered = config?.videoId?.trim();

  if (!providerKey) {
    return <>Choose a provider, then enter the video&apos;s id. A visitor sees a still and a button, and nothing is fetched until they press it.</>;
  }

  const provider = videoProviderDescriptorsByKey.get(providerKey);
  if (!provider) {
    return (
      <>
        <code>{providerKey}</code> is not among the providers this Area activates, so the Widget renders
        nothing. Switch the Module that owns it back on, or pick another provider.
      </>
    );
  }

  if (!entered) {
    return (
      <>
        Enter the id of the video at {provider.title} — <code>{provider.idExample}</code>. A whole link
        works too; only the id is kept.
      </>
    );
  }

  const videoId = resolvePhiVideoId(provider, entered);
  if (!videoId) {
    // A link for a provider other than the selected one is the one wrong value worth naming precisely.
    const elsewhere = resolvePhiVideoAddress([...videoProviderDescriptorsByKey.values()], entered);
    return elsewhere ? (
      <>
        That is a {elsewhere.provider.title} video, but {provider.title} is selected, so the Widget renders
        nothing. Switch the provider, or enter a {provider.title} id.
      </>
    ) : (
      <>
        <code>{entered}</code> is not a {provider.title} id, so the Widget renders nothing. One looks like{" "}
        <code>{provider.idExample}</code>, and a whole link to the video works as well.
      </>
    );
  }

  const { rejected } = parsePhiVideoEmbedParams(provider, config?.params);

  return (
    <>
      {provider.title}, video <code>{videoId}</code>. A visitor sees a still and a button; the request
      reaches {provider.recipient} only once they press it.
      {rejected.length > 0 ? (
        <>
          {" "}Dropped from the playback parameters:{" "}
          {rejected.map((rejection, index) => (
            <span key={rejection.name}>
              {index > 0 ? ", " : ""}
              <code>{rejection.name}</code>{" "}
              {rejection.reason === "reserved"
                ? `(${provider.title} sets it)`
                : rejection.reason === "name"
                  ? "(not a parameter name)"
                  : rejection.reason === "value"
                    ? "(value too long)"
                    : "(too many parameters)"}
            </span>
          ))}
          .
        </>
      ) : null}
    </>
  );
}

export const PHI_VIDEO_EMBED_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiVideoEmbedWidgetConfig> = {
  ...PHI_VIDEO_EMBED_WIDGET_DEFINITION,
  /*
   * A placeholder rather than the live Widget, because the Builder canvas is not where a request should
   * leave for a provider. What the Widget looks like is what the preview is for; what the editor owes is
   * an answer about the provider and the id.
   */
  renderEditor: ({ widget, config }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_VIDEO_EMBED_WIDGET_DEFINITION.title}
      summary={<PhiVideoEmbedWidgetEditorSummary config={config ?? undefined} />}
    />
  ),
};
