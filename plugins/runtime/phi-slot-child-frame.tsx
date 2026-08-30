import type {
  CSSProperties,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from "react";

import type {
  PhiRenderableBlock,
  PhiRenderableBlockRuntime,
  PhiSignalScope,
  PhiSlotSizePolicy,
  PhiCmsInstanceId,
} from "../../types";
import type { PhiRenderableBlockReceiver } from "../../components/runtime/renderable-block-runtime";
import { createPhiSignalAddress } from "../../types/signals";
import {
  PhiSlotChildFrameView,
  requiresPhiSlotChildEffectsObserver,
} from "./phi-slot-child-frame-view";
import type { PhiSlotChildKind } from "./slot-size-policy";
import { PhiRuntimeModuleRenderClientHost } from "../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../constants/runtime-render-client-types";

export type PhiSlotChildFrameProps = {
  kind: PhiSlotChildKind;
  slotSizePolicy?: PhiSlotSizePolicy | null;
  blockId?: PhiCmsInstanceId | null;
  config?: Partial<PhiRenderableBlock> | null;
  runtime?: PhiRenderableBlockRuntime;
  signalScope?: PhiSignalScope | null;
  signalParticipant?: boolean;
  explicitInlineSize?: boolean;
  explicitBlockSize?: boolean;
  disableEffects?: boolean;
  runtimeSignalEmissionsEnabled?: boolean;
  className?: string;
  style?: CSSProperties;
  builderWidgetTitle?: string | null;
  builderWidgetSelected?: boolean;
  builderWidgetPopupOpen?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onClickCapture?: MouseEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
  chrome?: ReactNode;
  children: ReactNode;
};

function createPhiSlotChildReceiver(blockId: PhiCmsInstanceId | null | undefined) {
  return blockId == null
    ? null
    : createPhiSignalAddress("cms", blockId) as PhiRenderableBlockReceiver;
}

export function PhiSlotChildFrame(props: PhiSlotChildFrameProps) {
  const {
    kind,
    blockId,
    config,
    signalParticipant = false,
    runtimeSignalEmissionsEnabled = true,
    chrome,
    children,
  } = props;
  const requiresClientEnhancement =
    signalParticipant ||
    runtimeSignalEmissionsEnabled === false ||
    chrome != null ||
    props.onClick != null ||
    props.onClickCapture != null ||
    props.onPointerLeave != null ||
    requiresPhiSlotChildEffectsObserver(config, props.disableEffects);

  if (requiresClientEnhancement) {
    return (
      <PhiRuntimeModuleRenderClientHost
        type={PhiRuntimeRenderClientType.SlotChildFrameEnhancer}
        componentProps={{ ...props }}
        slotChildSizing={{
          kind,
          slotSizePolicy: props.slotSizePolicy,
          config,
        }}
      />
    );
  }

  const receiver = createPhiSlotChildReceiver(blockId);

  return (
    <PhiSlotChildFrameView
      kind={kind}
      slotSizePolicy={props.slotSizePolicy}
      blockId={blockId}
      receiver={receiver}
      config={config}
      explicitInlineSize={props.explicitInlineSize}
      explicitBlockSize={props.explicitBlockSize}
      disableEffects={props.disableEffects}
      className={props.className}
      style={props.style}
      builderWidgetTitle={props.builderWidgetTitle}
      builderWidgetSelected={props.builderWidgetSelected}
      builderWidgetPopupOpen={props.builderWidgetPopupOpen}
      onClick={props.onClick}
      onClickCapture={props.onClickCapture}
      onPointerLeave={props.onPointerLeave}
    >
      {children}
    </PhiSlotChildFrameView>
  );
}
