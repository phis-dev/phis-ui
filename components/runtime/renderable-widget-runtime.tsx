"use client";

import { mergeRenderableBlockDefaults } from "../../helpers/renderable-block-serialization";
import type { PhiRenderableBlockBase } from "../../types/renderable-block";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import type { PhiBlockRuntime } from "../../types/widget-runtime";
import {
  usePhiRenderableBlockRuntime,
  type PhiRenderableBlockReceiver,
  type PhiRenderableBlockRuntimeController,
  type PhiRenderableBlockRuntimeState,
} from "./renderable-block-runtime";

/*
 * The runtime for a Widget that hands over its whole config, merged with the block defaults first.
 *
 * Apart from `renderable-block-runtime.tsx` because only the input Widgets use it, and the merge it
 * needs is the defaults merge with every normalizer behind it: in the shared runtime file it rode along
 * on every page that draws a block.
 */
export type PhiRenderableWidgetRuntimeInput<TConfig extends Record<string, unknown> = Record<string, unknown>> = {
  blockId: PhiCmsInstanceId | null | undefined;
  receiver?: PhiRenderableBlockReceiver | null | undefined;
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area">;
  config?: TConfig | null;
};

function resolvePhiRenderableWidgetRuntimeInput<TConfig extends Record<string, unknown> = Record<string, unknown>>(
  input: PhiRenderableWidgetRuntimeInput<TConfig>,
): Partial<PhiRenderableBlockRuntimeState> {
  const normalizedConfig = mergeRenderableBlockDefaults(input.config as Partial<PhiRenderableBlockBase> | null | undefined);

  return {
    blockId: input.blockId ?? null,
    receiver: input.receiver ?? null,
    runtime: {
      siteKey: input.runtime.site.key,
      publicUrl: input.runtime.site.publicUrl ?? null,
      defaultLang: input.runtime.locale.current,
      area: input.runtime.area,
    },
    ...normalizedConfig,
  };
}

export function usePhiRenderableWidgetRuntime<TConfig extends Record<string, unknown> = Record<string, unknown>>(
  input: PhiRenderableWidgetRuntimeInput<TConfig>,
): PhiRenderableBlockRuntimeController {
  return usePhiRenderableBlockRuntime(resolvePhiRenderableWidgetRuntimeInput(input));
}
