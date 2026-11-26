"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

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
import { PhiFormControl } from "../../controls/phi-form-control";
import { PhiPopoverControl } from "../../controls/phi-popover-control";
import { createPhiFormLiteralText } from "../../forms/form-descriptor-contract";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "../../forms/form-provider-contract";
import { PHI_FORM_DESCRIPTOR_SCHEMA_VERSION, type PhiFormDescriptor } from "../../../types/form-descriptor";
import { PHI_Z_INDEX } from "../../../theme/phi-tokens";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { usePhiWidgetScaffoldPopup } from "./shared/phi-widget-scaffold-popup";
import { PhiFlexControl } from "../../controls/phi-flex-control";

export type SerializedPhiHtmlImageNode = Spread<{
  src: string;
  alt: string;
  title?: string | null;
  width?: PhiCssLength | null;
  height?: PhiCssLength | null;
}, SerializedLexicalNode>;

/**
 * The stored `src` stays the `phis:asset/<id>` reference the server resolves at render time; a browser
 * cannot load that scheme, so the authoring DOM shows the same Asset through the authorized delivery
 * endpoint the other authoring surfaces already read. Nothing here resolves a reference for a rendered
 * page.
 */
function resolvePhiHtmlImageAuthoringSrc(src: string) {
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

/*
 * The image's attributes, as a small Form of descriptor fields (FORMS.md, "Size"): a popover builds no
 * label+input pairs of its own. Each change is written to the image as it is made, so there is no submit.
 * The words are English, as the editor's other tools are.
 */
const PHI_HTML_IMAGE_FORM: PhiFormDescriptor = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: "html-editor-image",
  fields: [
    {
      key: "title",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: createPhiFormLiteralText("Title"),
      config: { allowClear: true },
    },
    { key: "alt", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: createPhiFormLiteralText("Alt text") },
    { key: "size", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.dimension, label: createPhiFormLiteralText("Size") },
  ],
};

function submitNothing() {}

/** How long a typed size waits for the next digit before it moves the image. */
const PHI_HTML_IMAGE_SIZE_SETTLE_MS = 500;

type PhiHtmlImageSize = { width: PhiCssLength | null; height: PhiCssLength | null };

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
   * anchored to. The typed size is held briefly and applied once the author stops; the Form holds
   * what is typed meanwhile.
   */
  /*
   * Each opening counts, so the Form mounts afresh on the image as it now is: an undo while it was
   * closed would otherwise meet the values its fields were last left at.
   */
  const [openCount, setOpenCount] = useState(0);
  /*
   * While the Popover is open the image's own box is held at what it was when it opened. Otherwise a
   * typed size resizes the image, the line and everything after it move, and the Popover moves with
   * them -- no anchor within that flow can stay still. The image itself still shows the new size.
   *
   * The hold is read through `popoverOpen`, not cleared by each way of closing: a click beside the
   * Popover, Escape, the image clicked again, Remove, the editor turning read-only -- every one of them
   * ends the hold by ending `popoverOpen`, and no path can leave the box standing at its old size.
   */
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [heldBox, setHeldBox] = useState<{ width: number; height: number } | null>(null);
  const box = popoverOpen ? heldBox : null;
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSizeRef = useRef<PhiHtmlImageSize | null>(null);

  /*
   * A size still waiting for its next digit is written the moment the Popover closes, however it
   * closes, so the image the author returns to already has the size they typed. What is left
   * pending at unmount goes out on its timer: the node is looked up then, and a removed one is not
   * found.
   */
  useEffect(() => {
    if (popoverOpen) {
      return;
    }
    if (flushRef.current) {
      clearTimeout(flushRef.current);
      flushRef.current = null;
    }
    const pending = pendingSizeRef.current;
    pendingSizeRef.current = null;
    if (!pending) {
      return;
    }
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isPhiHtmlImageNode(node)) {
        node.setAttributes(pending);
      }
    }, { tag: SKIP_DOM_SELECTION_TAG });
  }, [editor, nodeKey, popoverOpen]);

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

  const openPopover = () => {
    setOpenCount((count) => count + 1);
    setOpen(true);
  };

  const closePopover = () => {
    setOpen(false);
  };

  const image = (
    <img
      src={resolvePhiHtmlImageAuthoringSrc(src)}
      alt={alt}
      title={title ?? undefined}
      draggable={false}
      onClick={editable ? () => {
        if (open) {
          closePopover();
          return;
        }
        const rect = hostRef.current?.getBoundingClientRect();
        setHeldBox(rect ? { width: rect.width, height: rect.height } : null);
        openPopover();
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
        width: box?.width,
        height: box?.height,
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
          if (nextOpen) {
            openPopover();
          } else {
            closePopover();
          }
        }}
        content={
          <div
            style={{ display: "grid", gap: PHI_SPACE.xs, minWidth: 280 }}
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
            {/* Mounted afresh with each opening, so it starts from the image as it now is. */}
            <PhiFormControl
              key={openCount}
              descriptor={PHI_HTML_IMAGE_FORM}
              size="small"
              getPopupContainer={popup.getNestedPopupContainer}
              submitOnEnter={false}
              initialValues={{ title: title ?? "", alt, size: { width, height } }}
              onSubmit={submitNothing}
              onValuesChange={(changed) => {
                if ("title" in changed) patch({ title: readImageTitle(changed.title) });
                if ("alt" in changed) patch({ alt: typeof changed.alt === "string" ? changed.alt : "" });
                if ("size" in changed) {
                  const nextSize = changed.size as { width?: unknown; height?: unknown } | null;
                  const next = {
                    width: readImageLength(nextSize?.width),
                    height: readImageLength(nextSize?.height),
                  };
                  pendingSizeRef.current = next;
                  if (flushRef.current) {
                    clearTimeout(flushRef.current);
                  }
                  flushRef.current = setTimeout(() => {
                    flushRef.current = null;
                    pendingSizeRef.current = null;
                    patch(next);
                  }, PHI_HTML_IMAGE_SIZE_SETTLE_MS);
                }
              }}
            />
            <PhiFlexControl justify="flex-end">
              <PhiButtonControl
                size="small"
                danger
                label="Remove"
                onClick={() => {
                  closePopover();
                  editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    if ($isPhiHtmlImageNode(node)) {
                      node.remove();
                    }
                  });
                }}
              />
            </PhiFlexControl>
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

function $isPhiHtmlImageNode(node: unknown): node is PhiHtmlImageNode {
  return node instanceof PhiHtmlImageNode;
}
