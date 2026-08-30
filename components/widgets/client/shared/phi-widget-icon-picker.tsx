"use client";

import {
  PhiIconPickerControl,
  type PhiIconPickerControlProps,
} from "../../../controls/phi-icon-picker-control";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";

export type PhiWidgetIconPickerButtonProps = Omit<
  PhiIconPickerControlProps,
  "getPopupContainer" | "rootClassName" | "onOpenChange"
> & Pick<PhiIconPickerControlProps, "getPopupContainer">;

export function PhiWidgetIconPickerButton({
  getPopupContainer,
  ...props
}: PhiWidgetIconPickerButtonProps) {
  const popup = usePhiWidgetScaffoldPopup();
  return (
    <PhiIconPickerControl
      {...props}
      getPopupContainer={getPopupContainer ?? popup.getPopupContainer}
      rootClassName={popup.rootClassName}
      onOpenChange={popup.setOpen}
    />
  );
}
