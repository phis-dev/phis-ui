"use client";

import { Flex } from "antd";
import type { FlexProps } from "antd";

/**
 * Flex arrangement inside one Widget or Layout.
 *
 * A pass-through, and deliberately nothing more. There is no state here, no `onChange`, and no token
 * decision worth centralizing -- the whole prop surface in use across the tree is `gap`, `vertical`,
 * `align`, `justify`, `wrap`, `style` and `flex`. Inventing a vocabulary over that would give the
 * platform a second way to describe spacing beside the Layout contract, which is the outcome
 * TODOS.md warns about.
 *
 * What it buys is the one thing a wrapper can buy: `Flex` is an Ant Design primitive, Ant Design is
 * replaceable in principle, and this is the single file that would have to change. Sixty files
 * importing it directly would have made that a tree-wide edit.
 *
 * **This is not the Layout contract.** Composing several Widgets is `PhiLayout` slots
 * ([LAYOUTING.md](../../LAYOUTING.md)); this arranges the parts *inside* one leaf. Reaching for it to
 * place Widgets beside each other is the mistake it cannot prevent.
 */
export type PhiFlexControlProps = FlexProps;

export function PhiFlexControl(props: PhiFlexControlProps) {
  return <Flex {...props} />;
}
