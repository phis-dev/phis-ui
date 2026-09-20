"use client";

import type { ReactNode } from "react";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import type { PhiCmsMountPolicy } from "../../types/cms-mount-policy";
import type { PhiCmsOverlayMaskConfig, PhiOverlayCloseSource } from "../../types/cms-overlay";
import type { PhiControlSize } from "../../types/control";
import { PhiAlertControl, type PhiAlertControlProps } from "./phi-alert-control";
import { PhiButtonControl } from "./phi-button-control";
import type { PhiButtonType } from "./phi-button-types";
import { PhiFlexControl } from "./phi-flex-control";
import { PhiModalControl } from "./phi-modal-control";

/**
 * A Dialog built in code: a title, one subject, an optional notice above it, and the actions below.
 *
 * **This is the code-side counterpart to an Overlay's Body and Footer Layouts, and the reason it exists
 * is that they were missing.** `PhiModalControl` and `PhiDrawerControl` zero container, header, body and
 * footer by contract, because the Overlay container path (`components/overlays/`) fills those zones with
 * Layout nodes that carry their own padding. A tree Overlay therefore needs the shell to bring none. A
 * Dialog assembled in a component has no Layout nodes -- so every caller that reached for the shell
 * directly had to reinvent the inside, and the three that did disagreed: one set `padding: base`, one
 * set nothing and let its table touch the modal edge, and their action rows used two different gaps.
 *
 * So the rule is: **code reaches for this, the tree reaches for `PhiOverlayContainerClient`, and nobody
 * reaches for `PhiModalControl` directly.** A Dialog whose inside is a tree of Widgets is an Overlay and
 * belongs in a preset ([OVERLAYS.md](../../OVERLAYS.md)); a Dialog whose inside is one component belongs
 * here.
 *
 * The shape it renders is the one OVERLAYS.md describes for a tree Overlay, so the two paths land on the
 * same thing rather than on something similar: the Body is a vertical flex one `base` apart and one
 * `base` in from every edge, holding the notice first and the subject under it; the Footer anchors its
 * actions right, `xs` apart, `xs` from the fold and `base` from the sides. Both sides derive that from
 * the same tokens rather than from each other -- the Layout presets are creation defaults a Builder may
 * edit afterwards, which is not a constant to depend on.
 *
 * Modal only, on purpose. `PhiDrawerControl` zeroes its zones the same way and will want the same
 * treatment, but no Dialog in the house is built in code *and* drawn as a Drawer, and a branch with no
 * caller is a guess about the one that eventually arrives. When it arrives, `presentation` is the prop
 * it becomes, and its placement and size come with it.
 */

export type PhiDialogControlAction = {
  key: string;
  label: ReactNode;
  type?: PhiButtonType;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  onClick: () => void;
};

export type PhiDialogControlProps = {
  open: boolean;
  title?: ReactNode;
  /** The Dialog's subject: the one thing it is about. */
  children: ReactNode;
  /**
   * A notice above the subject -- a validation failure, a warning about what the action does.
   *
   * The Alert's own props rather than a second vocabulary for them, because the placement is the only
   * decision this Control is making: it belongs above the subject and inside the Body's padding, which
   * is exactly where a caller composing it by hand tended not to put it.
   */
  alert?: PhiAlertControlProps | null;
  /**
   * The Footer's buttons, in reading order, cancel-first.
   *
   * An empty list renders no Footer at all rather than an empty bar, because a Dialog that only informs
   * is dismissed by its close button and a strip of padding under the text is not an affordance.
   */
  actions?: readonly PhiDialogControlAction[];
  controlSize?: PhiControlSize;
  centered?: boolean;
  closable?: boolean;
  keyboard?: boolean;
  mask?: PhiCmsOverlayMaskConfig;
  mountPolicy?: PhiCmsMountPolicy;
  /** A styling hook for a surface that mounts the Dialog inside its own popup container. */
  rootClassName?: string;
  onDismiss?: (source: PhiOverlayCloseSource) => void;
  afterOpenChange?: (open: boolean) => void;
};

export function PhiDialogControl({
  open,
  title,
  children,
  alert,
  actions,
  controlSize = "medium",
  centered,
  closable,
  keyboard,
  mask,
  mountPolicy,
  rootClassName,
  onDismiss,
  afterOpenChange,
}: PhiDialogControlProps) {
  return (
    <PhiModalControl
      open={open}
      title={title}
      closable={closable}
      keyboard={keyboard}
      mask={mask}
      mountPolicy={mountPolicy}
      centered={centered}
      controlSize={controlSize}
      rootClassName={rootClassName}
      onDismiss={onDismiss}
      afterOpenChange={afterOpenChange}
      body={
        <PhiFlexControl
          vertical
          gap={PHI_SPACE.base}
          style={{ padding: PHI_SPACE.base, width: "100%", minWidth: 0 }}
        >
          {alert == null ? null : <PhiAlertControl {...alert} />}
          {children}
        </PhiFlexControl>
      }
      footer={actions == null || actions.length === 0 ? null : (
        <PhiFlexControl
          align="center"
          justify="end"
          wrap
          gap={PHI_SPACE.xs}
          style={{
            paddingBlock: PHI_SPACE.xs,
            paddingInline: PHI_SPACE.base,
            width: "100%",
            minWidth: 0,
          }}
        >
          {actions.map((action) => (
            <PhiButtonControl
              key={action.key}
              label={action.label}
              icon={action.icon}
              type={action.type}
              danger={action.danger}
              disabled={action.disabled}
              loading={action.loading}
              onClick={action.onClick}
            />
          ))}
        </PhiFlexControl>
      )}
    />
  );
}
