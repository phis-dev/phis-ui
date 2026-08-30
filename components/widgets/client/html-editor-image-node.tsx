"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Flex } from "antd";
import {
  $applyNodeReplacement,
  $getNodeByKey,
  DecoratorNode,
  SKIP_DOM_SELECTION_TAG,
  type DOMConversionMap,
  type DOMExportOutput,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { buildPhiMediaAssetContentDeliveryUrl } from "../../../constants/media";
import type { PhiCssLength } from "../../../types/length";
import {
  readPhiHtmlImageLength as readImageLength,
  readPhiHtmlImageTitle as readImageTitle,
  resolvePhiHtmlImageSizeForm,
  type PhiHtmlImageAttributes,
} from "./html-editor-image-attributes";
import { readPhiInternalReference } from "../../../types/references";
import { PhiButtonControl } from "../../controls/phi-button-control";
import { PhiDimensionControl } from "../../controls/phi-dimension-control";
import { PhiLabeledControl } from "../../controls/phi-labeled-control";
import { PhiPopoverControl } from "../../controls/phi-popover-control";
import { PhiTextControl } from "../../controls/phi-text-control";
import { PHI_Z_INDEX } from "../../../theme/phi-tokens";
import { usePhiWidgetScaffoldPopup } from "./shared/phi-widget-scaffold-popup";

export type SerializedPhiHtmlImageNode = Spread<{
  src: string;
  alt: string;
  title?: string | null;
  width?: PhiCssLength | null;
  height?: PhiCssLength | null;
}, SerializedLexicalNode>;

/**
 * The stored `src` stays the `phi:asset/<id>` reference the server resolves at render time; a browser
 * cannot load that scheme, so the authoring DOM shows the same Asset through the authorized delivery
 * endpoint the other authoring surfaces already read. Nothing here resolves a reference for a rendered
 * page.
 */
export function resolvePhiHtmlImageAuthoringSrc(src: string) {
  const reference = readPhiInternalReference(src);
  return reference?.kind === "asset" ? buildPhiMediaAssetContentDeliveryUrl(reference.assetId) ?? src : src;
}

function applyImageAttributes(image: HTMLImageElement, node: PhiHtmlImageNode) {
  if (node.__title == null) {
    image.removeAttribute("title");
  } else {
    image.setAttribute("title", node.__title);
  }

  const styleDeclarations: string[] = [];
  for (const [attribute, value] of [["width", node.__width], ["height", node.__height]] as const) {
    const form = resolvePhiHtmlImageSizeForm(value);
    if (form.attribute != null) {
      image.setAttribute(attribute, form.attribute);
      continue;
    }
    image.removeAttribute(attribute);
    if (form.declaration != null) {
      styleDeclarations.push(`${attribute}: ${form.declaration}`);
    }
  }
  if (styleDeclarations.length === 0) {
    image.removeAttribute("style");
  } else {
    image.setAttribute("style", `${styleDeclarations.join("; ")};`);
  }
}

function convertPhiHtmlImageElement(element: Node) {
  if (!(element instanceof HTMLImageElement)) return null;
  const src = element.getAttribute("src")?.trim() ?? "";
  if (!src) return null;
  return {
    node: $createPhiHtmlImageNode(src, element.getAttribute("alt") ?? "", {
      title: readImageTitle(element.getAttribute("title")),
      // Inline style outranks the attribute in CSS, so it outranks it here too.
      width: readImageLength(element.style.width) ?? readImageLength(element.getAttribute("width")),
      height: readImageLength(element.style.height) ?? readImageLength(element.getAttribute("height")),
    }),
  };
}

export class PhiHtmlImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __alt: string;
  __title: string | null;
  __width: PhiCssLength | null;
  __height: PhiCssLength | null;

  static getType() {
    return "phi-html-image";
  }

  static clone(node: PhiHtmlImageNode) {
    return new PhiHtmlImageNode(
      node.__src,
      node.__alt,
      { title: node.__title, width: node.__width, height: node.__height },
      node.__key,
    );
  }

  static importDOM(): DOMConversionMap {
    return {
      img: () => ({ conversion: convertPhiHtmlImageElement, priority: 2 }),
    };
  }

  static importJSON(serializedNode: SerializedPhiHtmlImageNode) {
    return $createPhiHtmlImageNode(serializedNode.src, serializedNode.alt, {
      title: readImageTitle(serializedNode.title),
      width: readImageLength(serializedNode.width),
      height: readImageLength(serializedNode.height),
    });
  }

  constructor(
    src: string,
    alt: string,
    attributes?: Partial<Omit<PhiHtmlImageAttributes, "alt">>,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__alt = alt;
    this.__title = attributes?.title ?? null;
    this.__width = attributes?.width ?? null;
    this.__height = attributes?.height ?? null;
  }

  getSrc() {
    return this.__src;
  }

  getAttributes(): PhiHtmlImageAttributes {
    return { alt: this.__alt, title: this.__title, width: this.__width, height: this.__height };
  }

  setAttributes(attributes: Partial<PhiHtmlImageAttributes>) {
    const writable = this.getWritable();
    if ("alt" in attributes) writable.__alt = typeof attributes.alt === "string" ? attributes.alt : "";
    if ("title" in attributes) writable.__title = readImageTitle(attributes.title);
    if ("width" in attributes) writable.__width = readImageLength(attributes.width);
    if ("height" in attributes) writable.__height = readImageLength(attributes.height);
    return writable;
  }

  /**
   * The host element carries no image state: the decorator renders the `img` so the same click that
   * selects it can open its attribute Popover, the way the link tool edits a link.
   */
  createDOM() {
    const host = document.createElement("span");
    host.className = "phi-html-widget-editor__image";
    host.style.display = "inline-block";
    host.style.maxWidth = "100%";
    return host;
  }

  updateDOM() {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const image = document.createElement("img");
    image.setAttribute("src", this.__src);
    image.setAttribute("alt", this.__alt);
    applyImageAttributes(image, this);
    return { element: image };
  }

  exportJSON(): SerializedPhiHtmlImageNode {
    return {
      ...super.exportJSON(),
      src: this.__src,
      alt: this.__alt,
      title: this.__title,
      width: this.__width,
      height: this.__height,
    };
  }

  getTextContent() {
    return this.__alt;
  }

  isInline() {
    return true;
  }

  decorate() {
    return (
      <PhiHtmlImageDecorator
        nodeKey={this.getKey()}
        src={this.__src}
        alt={this.__alt}
        title={this.__title}
        width={this.__width}
        height={this.__height}
      />
    );
  }
}

/** How long a typed size waits for the next digit before it moves the image. */
const PHI_HTML_IMAGE_SIZE_SETTLE_MS = 500;

function stopEditorEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function PhiHtmlImageDecorator({
  nodeKey,
  src,
  alt,
  title,
  width,
  height,
}: { nodeKey: NodeKey } & PhiHtmlImageAttributes & { src: string }) {
  const [editor] = useLexicalComposerContext();
  const popup = usePhiWidgetScaffoldPopup();
  const [open, setOpen] = useState(false);
  const editable = editor.isEditable();
  // The scaffold keeps the Widget in authoring while one of its popups is open, so it has to learn
  // about this one -- including when losing editability closes it.
  const popoverOpen = editable && open;

  useEffect(() => {
    popup.setOpen(popoverOpen);
  }, [popoverOpen, popup]);

  /*
   * A size types digit by digit, and the first of them would be a real size: "480" passes through 4px,
   * where the image collapses and takes this Popover with it, because the image is what the Popover is
   * anchored to. The typed size is held briefly and applied once the author stops.
   */
  const [draftSize, setDraftSize] = useState<{ width: PhiCssLength | null; height: PhiCssLength | null } | null>(null);
  /*
   * While the Popover is open the image's own box is held at what it was when it opened. Otherwise a
   * typed size resizes the image, the line and everything after it move, and the Popover moves with
   * them -- no anchor within that flow can stay still. The image itself still shows the new size.
   */
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [heldBox, setHeldBox] = useState<{ width: number; height: number } | null>(null);
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const size = draftSize ?? { width, height };

  useEffect(() => {
    if (popoverOpen) {
      return undefined;
    }
    return () => {
      if (flushRef.current) {
        clearTimeout(flushRef.current);
        flushRef.current = null;
      }
    };
  }, [popoverOpen]);

  /*
   * Without the tag the reconciler answers an update whose pending selection is null by clearing the
   * window selection, which takes the caret out of the field being typed in: the field keeps focus,
   * every further keystroke goes nowhere, and only a second click revives it.
   */
  const patch = (attributes: Partial<PhiHtmlImageAttributes>) => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isPhiHtmlImageNode(node)) {
        node.setAttributes(attributes);
      }
    }, { tag: SKIP_DOM_SELECTION_TAG });
  };

  const image = (
    <img
      src={resolvePhiHtmlImageAuthoringSrc(src)}
      alt={alt}
      title={title ?? undefined}
      draggable={false}
      onClick={editable ? () => {
        const rect = hostRef.current?.getBoundingClientRect();
        setHeldBox(open || !rect ? null : { width: rect.width, height: rect.height });
        setOpen((current) => !current);
      } : undefined}
      style={{
        maxWidth: "100%",
        width: width ?? undefined,
        height: height ?? (width == null ? undefined : "auto"),
        cursor: editable ? "pointer" : undefined,
        verticalAlign: "bottom",
      }}
    />
  );

  if (!editable) {
    return image;
  }

  /*
   * The Popover hangs off a fixed point at the image's top-left corner rather than off the image: a
   * size applies while it is open, and an anchor that resizes with the image would take the Popover
   * along with every digit. The top-left is the corner the flow keeps still; the bottom rises as the
   * image shrinks.
   */
  return (
    <span
      ref={hostRef}
      style={{
        position: "relative",
        display: "inline-flex",
        maxWidth: "100%",
        width: heldBox?.width,
        height: heldBox?.height,
      }}
      onMouseDown={stopEditorEvent}
      onPointerDown={stopEditorEvent}
    >
      {image}
      <PhiPopoverControl
        open={popoverOpen}
        trigger="click"
        placement="bottomLeft"
        zIndex={PHI_Z_INDEX.authoringPopup}
        getPopupContainer={popup.getPopupContainer}
        rootClassName={popup.rootClassName}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setDraftSize(null);
          }
        }}
        content={
          <div
            style={{
              display: "grid",
              gap: 8,
              minWidth: 280,
              // 6/18 of the 24-column form grid, the same label ratio the Form layout uses.
              "--phi-labeled-control-label-width": "25%",
            } as CSSProperties & Record<`--${string}`, string>}
            /*
             * A portal keeps the DOM out of the contenteditable but not the React tree: an event here
             * still bubbles to the editor and the scaffold, which would take a click in a field for a
             * click on the Widget. The unit list mounts inside this body, so stopping here no longer
             * costs the Popover its own nesting.
             */
            onClick={stopEditorEvent}
            onMouseDown={stopEditorEvent}
            onPointerDown={stopEditorEvent}
            onKeyDown={stopEditorEvent}
          >
            <PhiTextControl
              size="small"
              label="Title"
              value={title}
              allowClear
              style={{ width: "100%" }}
              onChange={(nextValue) => patch({ title: nextValue })}
            />
            <PhiTextControl
              size="small"
              label="Alt text"
              value={alt}
              style={{ width: "100%" }}
              onChange={(nextValue) => patch({ alt: nextValue ?? "" })}
            />
            <PhiLabeledControl label="Size" fill>
              <PhiDimensionControl
                size="small"
                value={size}
                getPopupContainer={(triggerNode) => triggerNode.parentElement ?? triggerNode}
                onChange={(nextSize) => {
                  const next = {
                    width: readImageLength(nextSize?.width),
                    height: readImageLength(nextSize?.height),
                  };
                  setDraftSize(next);
                  if (flushRef.current) {
                    clearTimeout(flushRef.current);
                  }
                  flushRef.current = setTimeout(() => {
                    flushRef.current = null;
                    patch(next);
                  }, PHI_HTML_IMAGE_SIZE_SETTLE_MS);
                }}
              />
            </PhiLabeledControl>
            <Flex justify="flex-end">
              <PhiButtonControl
                size="small"
                danger
                label="Remove"
                onClick={() => {
                  setOpen(false);
                  editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    if ($isPhiHtmlImageNode(node)) {
                      node.remove();
                    }
                  });
                }}
              />
            </Flex>
          </div>
        }
      >
        <span
          aria-hidden
          style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0 }}
        />
      </PhiPopoverControl>
    </span>
  );
}

export function $createPhiHtmlImageNode(
  src: string,
  alt = "",
  attributes?: Partial<Omit<PhiHtmlImageAttributes, "alt">>,
) {
  return $applyNodeReplacement(new PhiHtmlImageNode(src, alt, attributes));
}

export function $isPhiHtmlImageNode(node: unknown): node is PhiHtmlImageNode {
  return node instanceof PhiHtmlImageNode;
}
