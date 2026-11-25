// @vitest-environment happy-dom
import { $createLinkNode, $isLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { LinkExtension } from "@lexical/link";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode, defineExtension, type LexicalEditor } from "lexical";
import { describe, expect, it } from "vitest";

import { createPhiPageReference, createPhiPageUri } from "../../../types/references";
import { sanitizePhiHtmlWidgetMarkup } from "../helpers/html-content";
import { PhiHtmlLinkNode, PHI_HTML_LINK_NODE_REPLACEMENT } from "./html-editor-link-node";

const pageUri = createPhiPageUri(createPhiPageReference({ kind: "site", pageScopeId: 17 }));

function editor() {
  let instance: LexicalEditor | undefined;
  function Capture() {
    [instance] = useLexicalComposerContext();
    return null;
  }
  const extension = defineExtension({
    name: "phi/link-test",
    dependencies: [LinkExtension],
    nodes: [PhiHtmlLinkNode, PHI_HTML_LINK_NODE_REPLACEMENT],
    init(config) {
      config.namespace = "page-link-test";
      config.onError = (error) => { throw error; };
    },
  });
  const view = render(createElement(LexicalExtensionComposer, { extension }, createElement(Capture)));
  if (!instance) throw new Error("Missing editor");
  return { instance, dispose: view.unmount };
}

function exportHtml(instance: LexicalEditor) {
  return instance.getEditorState().read(() => sanitizePhiHtmlWidgetMarkup(
    $generateHtmlFromNodes(instance), { allowInternalReferences: true },
  ));
}

function firstLink() {
  const paragraph = $getRoot().getFirstChild();
  return $isElementNode(paragraph) ? paragraph.getFirstChild() : null;
}

function href(html: string) {
  return new DOMParser().parseFromString(html, "text/html").querySelector("a")?.getAttribute("href");
}

function createLink(instance: LexicalEditor, url: string) {
  instance.update(() => {
    const link = $createLinkNode(url, { title: "Target", target: "_blank", rel: "noopener" });
    expect(link).toBeInstanceOf(PhiHtmlLinkNode);
    expect($isLinkNode(link)).toBe(true);
    $getRoot().clear();
    $getRoot().append($createParagraphNode().append(link.append($createTextNode("Page"))));
  }, { discrete: true });
}

describe("HTML Page links", () => {
  it.each([
    pageUri,
    createPhiPageUri(createPhiPageReference({ kind: "module", ownerModuleId: "@phis/ui", presetKey: "example" })),
    createPhiPageUri(createPhiPageReference({ kind: "site", pageScopeId: 17 }), "Über uns"),
    "https://example.com/path?q=value#part",
    "mailto:example@example.com",
    "tel:+4912345",
  ])("preserves %s through export, sanitizer, HTML and JSON import", (url) => {
    const { instance, dispose } = editor();
    createLink(instance, url);
    const html = exportHtml(instance);
    expect(href(html)).toBe(url);
    const { instance: reopened, dispose: disposeReopened } = editor();
    reopened.update(() => {
      $getRoot().clear();
      $getRoot().append(...$generateNodesFromDOM(reopened, new DOMParser().parseFromString(html, "text/html")));
      expect(firstLink()).toBeInstanceOf(PhiHtmlLinkNode);
    }, { discrete: true });
    expect(href(exportHtml(reopened))).toBe(url);
    const json = instance.getEditorState().toJSON();
    reopened.setEditorState(reopened.parseEditorState(json));
    expect(href(exportHtml(reopened))).toBe(url);
    reopened.update(() => {
      const node = firstLink();
      if (!$isLinkNode(node)) throw new Error("Missing link");
      node.setTitle("Changed"); // exercises clone on a committed custom node
      expect(node.getLatest()).toBeInstanceOf(PhiHtmlLinkNode);
      expect(node.getRel()).toBe("noopener");
      expect(node.getTarget()).toBe("_blank");
    }, { discrete: true });
    expect(href(exportHtml(reopened))).toBe(url);
    dispose();
    disposeReopened();
  });

  it("replaces LinkNode for TOGGLE_LINK_COMMAND and retains its transforms", () => {
    const { instance, dispose } = editor();
    instance.update(() => {
      $getRoot().clear();
      const text = $createTextNode("Selected");
      $getRoot().append($createParagraphNode().append(text));
      text.select(0, 8);
      expect(instance.dispatchCommand(TOGGLE_LINK_COMMAND, pageUri)).toBe(true);
      expect(instance.hasNodes([LinkNode])).toBe(true);
      expect(firstLink()).toBeInstanceOf(PhiHtmlLinkNode);
    }, { discrete: true });
    expect(href(exportHtml(instance))).toBe(pageUri);
    dispose();
  });

  it.each([
    "javascript:alert(1)", "java\u0000script:alert(1)", "java\nscript:alert(1)",
    "data:text/html,bad", "about:blank", "phis:asset/17", "phis:table/example",
    "phis:page/invalid", "phis:page/v1s17#%ZZ", "phis:page/v1s17#\ud800", "PHIS:page/v1s17",
    " phis:page/v1s17", "phis%3Apage/v1s17", "ph\nis:page/v1s17",
  ])("does not allow unsafe or non-Page URI %s through the sanitizer", (url) => {
    const { instance, dispose } = editor();
    createLink(instance, url);
    expect(href(exportHtml(instance))).not.toBe(url);
    expect(href(exportHtml(instance)) ?? "").not.toMatch(/^(?:phis:|javascript:|data:|about:)/i);
    dispose();
  });
});
