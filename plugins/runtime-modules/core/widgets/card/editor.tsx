"use client";

import { useEffect, useRef, useState } from "react";

import { buildPhiMediaAssetContentDeliveryUrl } from "../../../../../constants/media";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { usePhiAuthoringAssetDetails } from "../../../../../components/media/use-authoring-asset-details";
import { PhiInlineTextEditor } from "../../../../../components/controls/phi-inline-text-editor";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import type { PhiCmsCardWidgetConfig } from "./config";
import {
  PhiCardWidgetClient,
  type PhiCardTextSlot,
} from "../../../../../components/widgets/shared/card-body-client";
import { PHI_CARD_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/card";

export type PhiCardWidgetEditorProps = {
  config: PhiCmsCardWidgetConfig;
  /** Set where the card may be edited; absent in a read-only canvas, where its words are only shown. */
  onChange?: (patch: Partial<PhiCmsCardWidgetConfig>) => void;
};

const PHI_CARD_TEXT_PLACEHOLDERS: Record<PhiCardTextSlot, string> = {
  eyebrow: "Eyebrow",
  title: "Title",
  description: "Description",
  meta: "Meta",
  value: "Value",
};

/*
 * Slots a card often goes without. Empty, they stand on the canvas only while the card is under the
 * pointer or being written in (`styles/layout.css`), so an empty card does not read as four empty lines.
 */
const PHI_CARD_OPTIONAL_TEXT_SLOTS: ReadonlySet<PhiCardTextSlot> = new Set(["eyebrow", "meta"]);

/**
 * One of the card's words, edited where it stands: underlined, in the type of the text it edits.
 *
 * What is typed is held here until the field is left, as the Simple Text holds it: the input has its own
 * undo while it has the focus, and the Builder's history records the change once, not per keystroke.
 */
function PhiCardInlineText({
  slot,
  text,
  onCommit,
}: {
  slot: PhiCardTextSlot;
  text: string;
  onCommit?: (text: string) => void;
}) {
  const [editedText, setEditedText] = useState<string | null>(null);
  return (
    <PhiInlineTextEditor
      value={editedText ?? text}
      variant="underlined"
      size="small"
      ariaLabel={PHI_CARD_TEXT_PLACEHOLDERS[slot]}
      placeholder={PHI_CARD_TEXT_PLACEHOLDERS[slot]}
      readOnly={!onCommit}
      allowClear={onCommit != null}
      fitContent
      onFocus={() => setEditedText(text)}
      onChange={(nextText) => setEditedText(nextText)}
      onCommit={(committedText) => {
        setEditedText(null);
        if (committedText !== text) onCommit?.(committedText);
      }}
      onCancel={() => setEditedText(null)}
      /*
       * The card's whole width, not the text's: a field as wide as its words leaves nothing to click
       * into beside them, and its wrapping is the card's own anyway. The text still wraps and aligns as
       * the card sets it.
       */
      style={{ width: "100%" }}
      /* The text's own type, and the page showing through: an edit in place reads like what it edits. */
      inputStyle={{
        paddingInline: 0,
        paddingBlock: 0,
        minHeight: 0,
        font: "inherit",
        letterSpacing: "inherit",
        textTransform: "inherit",
        textAlign: "inherit",
        color: "inherit",
        backgroundColor: "transparent",
      }}
    />
  );
}

/**
 * How wide the card stands on the canvas, so the editor can say when its picture is narrower.
 *
 * Only the canvas can know it: a card's width is its slot's, and the slot's is the Layout's and the
 * viewport's. A picture rendered wider than its variant is enlarged, and enlarged is soft.
 */
function useCanvasWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry ? Math.round(entry.contentRect.width) : null));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * The Editor draws the Card through the same presentation resolver the server render uses. Reading
 * the authoring Asset is what keeps the two equivalent: without the delivery revision the Editor
 * would keep the crop that was cached before a focal change while Live already shows the new one.
 *
 * The words are written in place, so the canvas draws no link at all: a click in the title is a click in
 * a field, and nothing on the canvas may lead out of the Builder. Live draws the link.
 */
export function PhiCardWidgetEditor({ config, onChange }: PhiCardWidgetEditorProps) {
  const assetId = config.sourceKind === "asset" ? config.assetId ?? null : null;
  const asset = usePhiAuthoringAssetDetails(assetId);
  const [canvasRef, canvasWidth] = useCanvasWidth();
  const presentation = resolvePhiImagePresentation({
    sourceKind: config.sourceKind,
    assetId,
    variantKey: config.sourceKind === "asset" ? config.variantKey : null,
    variantVersion: asset?.variantVersion ?? (config.sourceKind === "asset" ? config.variantVersion : null),
    deliveryRevision: asset?.deliveryRevision,
    originalUrl: assetId == null ? null : buildPhiMediaAssetContentDeliveryUrl(assetId),
    sourceUrl: config.sourceKind === "url" ? config.sourceUrl : undefined,
    focalRect: asset?.meta?.focalRect,
    sourceWidth: asset?.width,
    sourceHeight: asset?.height,
  });

  const pictureTooNarrow = presentation.url != null
    && presentation.width != null
    && canvasWidth != null
    && presentation.width < canvasWidth;

  return (
    <div ref={canvasRef} className="phi-card-editor" style={{ position: "relative", width: "100%" }}>
      <PhiCardWidgetClient
        labels={{
          eyebrow: config.eyebrow,
          title: config.title,
          description: config.description,
          meta: config.meta,
          actionLabel: config.actionLabel ?? PHI_CARD_WIDGET_DEFAULT_LABELS.actionLabel,
          value: config.value,
        }}
        renderText={(slot, text) => {
          if (slot === "value" && config.body !== "stat") return null;
          const field = (
            <PhiCardInlineText
              slot={slot}
              text={text ?? ""}
              {...(onChange ? { onCommit: (next: string) => onChange({ [slot]: next || undefined }) } : {})}
            />
          );
          return !text && PHI_CARD_OPTIONAL_TEXT_SLOTS.has(slot)
            ? <span className="phi-card-editor__optional">{field}</span>
            : field;
        }}
        config={{
          // A card that states no Surface has none, on the canvas as on the page: "None" is its contents.
          surface: config.surface ?? null,
          image: presentation.url
            ? {
                presentation,
                ...(config.imageOpacity == null ? {} : { opacity: config.imageOpacity / 100 }),
                source: config.sourceKind === "asset" ? "asset" : "url",
                alt: config.alt ?? asset?.altText ?? "",
                blurDataUrl: asset?.blurDataUrl ?? null,
              }
            : null,
          iconName: config.icon,
          iconPlacement: config.iconPlacement,
          iconColor: config.iconColor,
          iconBackground: config.iconBackground,
          textAlign: config.textAlign,
          headingLevel: config.headingLevel,
          /*
           * No addresses on the canvas: its words are fields, and a click in one must not leave the
           * Builder. The button is drawn whenever it is on, wherever it would lead.
           */
          action: config.actionEnabled === true
            ? { ...(config.actionIcon ? { icon: config.actionIcon } : {}), ariaLabel: PHI_CARD_WIDGET_DEFAULT_LABELS.actionLabel }
            : null,
          variant: config.variant,
          body: config.body,
          highlight: config.highlight,
          hoverEffect: config.linkTarget ? config.hoverEffect : undefined,
        }}
      />
      {pictureTooNarrow ? (
        <PhiTypographyControl
          style={{
            position: "absolute",
            left: "0.375rem",
            top: "0.375rem",
            zIndex: 3,
            color: "#fff",
            fontSize: 12,
            lineHeight: 1,
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.85)",
            pointerEvents: "none",
          }}
        >
          {`${presentation.width}px picture in a ${canvasWidth}px card: choose a larger variant`}
        </PhiTypographyControl>
      ) : null}
    </div>
  );
}
