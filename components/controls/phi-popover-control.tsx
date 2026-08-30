"use client";

import type { CSSProperties, ReactNode } from "react";
import { Popover } from "antd";
import type { PopoverProps } from "antd";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import type { PhiSpacingToken } from "../../types/spacing";
import type { PhiPickerPlacement } from "./phi-picker-control-contract";

export type PhiPopoverPadding = Exclude<PhiSpacingToken, "none" | "xxl">;

export type PhiPopoverControlProps = {
  open?: boolean;
  content: ReactNode;
  children: ReactNode;
  title?: ReactNode;
  trigger?: "click" | "hover" | "focus";
  placement?: PhiPickerPlacement;
  disabled?: boolean;
  destroyOnHidden?: boolean;
  arrow?: false | "point-at-center";
  padding?: PhiPopoverPadding;
  popupContentStyle?: CSSProperties;
  zIndex?: number;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  rootClassName?: string;
  onOpenChange?: (open: boolean) => void;
};

export function PhiPopoverControl({
  open,
  content,
  children,
  title,
  trigger = "click",
  placement,
  disabled = false,
  destroyOnHidden = false,
  arrow,
  padding = "sm",
  popupContentStyle,
  zIndex,
  getPopupContainer,
  rootClassName,
  onOpenChange,
}: PhiPopoverControlProps) {
  return (
    <Popover
      open={disabled ? false : open}
      content={content}
      title={title}
      trigger={trigger}
      placement={(placement === "auto" ? undefined : placement) as PopoverProps["placement"]}
      destroyOnHidden={destroyOnHidden}
      arrow={arrow === false ? false : arrow === "point-at-center" ? { pointAtCenter: true } : undefined}
      styles={{
        container: {
          ...popupContentStyle,
          padding: PHI_SPACE[padding],
        },
        content: { padding: 0 },
        title: { padding: 0 },
      }}
      zIndex={zIndex}
      getPopupContainer={getPopupContainer}
      rootClassName={rootClassName}
      onOpenChange={disabled ? undefined : onOpenChange}
    >
      {children}
    </Popover>
  );
}
