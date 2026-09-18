"use client";

import { Typography } from "antd";
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
 * A pass-through, like `PhiFlexControl`. Across the tree the props in use are `type`, `level`, `style`,
 * `title`, `strong` and `copyable` -- nothing that wants a platform vocabulary of its own. What it buys
 * is that Ant Design is replaceable in principle, and this is the file that would change instead of the
 * sixty-odd that imported `Typography` directly.
 */
export type PhiTypographyControlProps =
  | ({ presentation?: "text" } & TextProps)
  | ({ presentation: "title" } & TitleProps)
  | ({ presentation: "paragraph" } & ParagraphProps)
  | ({ presentation: "link" } & LinkProps);

/**
 * `presentation` is ours and not Ant Design's, so it must not reach the element.
 *
 * Typography spreads what it does not recognize onto the DOM node, which would put an unknown attribute
 * on every line of text on the Site and a React warning beside it. Copying and deleting rather than
 * destructuring, because a discriminated union has to be narrowed before it is destructured -- doing it
 * per branch means four bindings that exist only to be discarded.
 */
function withoutPresentation<TProps extends { presentation?: unknown }>(props: TProps) {
  const rest = { ...props };
  delete rest.presentation;
  return rest;
}

export function PhiTypographyControl(props: PhiTypographyControlProps) {
  /*
   * Text is the default because it is what most of a page is: 410 of the 476 sites this replaced were
   * `Typography.Text`. A default that matches the common case is also what keeps the other three
   * legible -- a `presentation` that appears only on a heading says something, where one on every line
   * would say nothing.
   */
  if (props.presentation === "title") {
    return <Typography.Title {...withoutPresentation(props)} />;
  }
  if (props.presentation === "paragraph") {
    return <Typography.Paragraph {...withoutPresentation(props)} />;
  }
  if (props.presentation === "link") {
    return <Typography.Link {...withoutPresentation(props)} />;
  }
  return <Typography.Text {...withoutPresentation(props)} />;
}
