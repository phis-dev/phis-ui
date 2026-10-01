"use client";

/*
 * Ant Design's Typography, for the few texts that need what only it does: copying, ellipsis with its
 * tooltip, inline editing. `PhiTypographyControl` loads this file for those and draws everything else
 * itself -- the primitive imports its editor and its tooltip unconditionally, and with them the Input
 * and the whole Form library, on every page with a line of text.
 */

import { Typography } from "antd";

import type { PhiTypographyControlProps } from "./phi-typography-control";

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

export function PhiTypographyControlAdapter(props: PhiTypographyControlProps) {
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
