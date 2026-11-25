import { LinkNode, type SerializedLinkNode } from "@lexical/link";
import { $applyNodeReplacement, type DOMConversionMap, type LexicalNodeReplacement } from "lexical";

import { createPhiPageUri, readPhiInternalReference } from "../../../types/references";

/** Keeps Page identity in authoring HTML; only the server render resolves it to an address. */
export class PhiHtmlLinkNode extends LinkNode {
  static getType() {
    return "phi-html-link";
  }

  static clone(node: PhiHtmlLinkNode) {
    return new PhiHtmlLinkNode(node.__url, {
      rel: node.__rel,
      target: node.__target,
      title: node.__title,
    }, node.__key);
  }

  static importJSON(serializedNode: SerializedLinkNode) {
    return $applyNodeReplacement(new PhiHtmlLinkNode()).updateFromJSON(serializedNode);
  }

  static importDOM(): DOMConversionMap {
    return {
      a: () => ({
        priority: 2,
        conversion: (element) => {
          if (!(element instanceof HTMLAnchorElement)) return null;
          return {
            node: $applyNodeReplacement(new PhiHtmlLinkNode(element.getAttribute("href") ?? "", {
              rel: element.getAttribute("rel"),
              target: element.getAttribute("target"),
              title: element.getAttribute("title"),
            })),
          };
        },
      }),
    };
  }

  sanitizeUrl(url: string) {
    const reference = readPhiInternalReference(url);
    if (reference?.kind === "page") {
      try {
        if (createPhiPageUri(reference.reference, reference.fragment) === url) return url;
      } catch {
        // A malformed Unicode fragment cannot be emitted by the canonical factory.
      }
    }
    return super.sanitizeUrl(url);
  }
}

/** Factories, commands and imports must all create the same node, including LinkNode transforms. */
export const PHI_HTML_LINK_NODE_REPLACEMENT: LexicalNodeReplacement = {
  replace: LinkNode,
  with: (node: LinkNode) => new PhiHtmlLinkNode(node.getURL(), {
    rel: node.getRel(),
    target: node.getTarget(),
    title: node.getTitle(),
  }),
  withKlass: PhiHtmlLinkNode,
};
