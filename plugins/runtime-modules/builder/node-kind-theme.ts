export type PhiBuilderInspectableNodeKind = "region" | "layout" | "widget";

export type PhiBuilderNodeKindTheme = {
  label: string;
};

const PHI_BUILDER_NODE_KIND_THEMES: Record<PhiBuilderInspectableNodeKind, PhiBuilderNodeKindTheme> = {
  region: {
    label: "Region",
  },
  layout: {
    label: "Layout",
  },
  widget: {
    label: "Widget",
  },
};

export function resolvePhiBuilderNodeKindTheme(kind: PhiBuilderInspectableNodeKind): PhiBuilderNodeKindTheme {
  return PHI_BUILDER_NODE_KIND_THEMES[kind];
}
