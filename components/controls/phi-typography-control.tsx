"use client";

import { createElement, lazy, Suspense, type ReactNode } from "react";
import type { LinkProps } from "antd/es/typography/Link";
import type { ParagraphProps } from "antd/es/typography/Paragraph";
import type { TextProps } from "antd/es/typography/Text";
import type { TitleProps } from "antd/es/typography/Title";

/**
 * Text, headings, paragraphs and links.
 *
 * `presentation` rather than four exported components, because that is how this package already
 * resolves a primitive with several shapes: `PhiTextControl presentation="textarea"` stands in for
 * `Input.TextArea`. One name to import, one place to change, and the four shapes stay distinguishable
 * in the type -- `level` is offered on a title and nowhere else, `href` on a link and nowhere else.
 *
 * It is named `PhiTypographyControl` because `PhiTextControl` is taken: that one is Ant Design `Input`.
 * The near-miss is worth the sentence, since "text control" is what somebody reaching for this would
 * guess and they would land on a form field.
 *
 * It draws the element itself -- the same elements and class shape Ant Design's Typography produces,
 * styled from the same tokens in `styles/controls.css` ("Typography") -- and loads the primitive only
 * for what it alone does: `copyable`, `ellipsis` and `editable` (`phi-typography-control-adapter.tsx`).
 * The primitive imports its inline editor and its ellipsis tooltip unconditionally, and with them Ant
 * Design's Input and the whole Form library: every page with a line of text, the Landing among them,
 * shipped a Form engine it never ran. Until the primitive has loaded, such a text is drawn plainly.
 */
export type PhiTypographyControlProps =
  | ({ presentation?: "text" } & TextProps)
  | ({ presentation: "title" } & TitleProps)
  | ({ presentation: "paragraph" } & ParagraphProps)
  | ({ presentation: "link" } & LinkProps);

const PhiTypographyControlAdapter = lazy(() =>
  import("./phi-typography-control-adapter")
    .then((module) => ({ default: module.PhiTypographyControlAdapter })));

type PhiTypographyDecorations = {
  strong?: boolean;
  underline?: boolean;
  delete?: boolean;
  code?: boolean;
  mark?: boolean;
  keyboard?: boolean;
  italic?: boolean;
};

/** The decorations as nested elements, in the order the primitive nests them. */
function decorate(content: ReactNode, decorations: PhiTypographyDecorations): ReactNode {
  let current = content;
  const wrap = (tag: string, needed: boolean | undefined) => {
    if (needed) current = createElement(tag, null, current);
  };
  wrap("strong", decorations.strong);
  wrap("u", decorations.underline);
  wrap("del", decorations.delete);
  wrap("code", decorations.code);
  wrap("mark", decorations.mark);
  wrap("kbd", decorations.keyboard);
  wrap("i", decorations.italic);
  return current;
}

function PhiTypographyElement(props: PhiTypographyControlProps) {
  const {
    presentation = "text",
    children,
    className,
    type,
    disabled,
    strong,
    underline,
    delete: deleted,
    code,
    mark,
    keyboard,
    italic,
    copyable: _copyable,
    ellipsis: _ellipsis,
    editable: _editable,
    level,
    ...rest
  } = props as PhiTypographyControlProps & PhiTypographyDecorations & {
    type?: string;
    disabled?: boolean;
    copyable?: unknown;
    ellipsis?: unknown;
    editable?: unknown;
    level?: number;
    className?: string;
    children?: ReactNode;
  };
  const tag = presentation === "title"
    ? `h${level && level >= 1 && level <= 5 ? level : 1}`
    : presentation === "paragraph"
      ? "div"
      : presentation === "link"
        ? "a"
        : "span";
  const classes = [
    "phi-typography",
    presentation === "link" ? "phi-typography--link" : null,
    type ? `phi-typography--${type}` : null,
    disabled ? "phi-typography--disabled" : null,
    className ?? null,
  ].filter(Boolean).join(" ");
  const linkRest = rest as { target?: string; rel?: string };
  const elementProps = {
    ...rest,
    className: classes,
    ...(presentation === "link" && linkRest.rel === undefined && linkRest.target === "_blank"
      ? { rel: "noopener noreferrer" }
      : {}),
    ...(disabled && presentation === "link" ? { "aria-disabled": true } : {}),
  };
  const decorations = { strong, underline, delete: deleted, code, mark, keyboard, italic };
  return createElement(tag, elementProps, decorate(children, decorations));
}

export function PhiTypographyControl(props: PhiTypographyControlProps) {
  const special = props as { copyable?: unknown; ellipsis?: unknown; editable?: unknown };
  if (!special.copyable && !special.ellipsis && !special.editable) {
    return <PhiTypographyElement {...props} />;
  }
  return (
    <Suspense fallback={<PhiTypographyElement {...props} />}>
      <PhiTypographyControlAdapter {...props} />
    </Suspense>
  );
}
