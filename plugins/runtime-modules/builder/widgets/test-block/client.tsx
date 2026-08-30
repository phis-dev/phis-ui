import type { PhiBlockBaseProps, PhiRenderableBlockBase } from "../../../../../types";

export type PhiTestBlockWidgetLabels = {
  text: string;
};

export type PhiTestBlockWidgetConfig = PhiRenderableBlockBase & {
  backgroundColor?: string;
  color?: string;
};

export type PhiTestBlockWidgetProps = PhiBlockBaseProps<PhiTestBlockWidgetLabels, PhiTestBlockWidgetConfig>;

export function PhiTestBlockWidget({ labels, config }: PhiTestBlockWidgetProps) {
  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        background: config?.backgroundColor ?? "#f97316",
        color: config?.color ?? "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        border: "1px solid var(--ant-color-primary)",
      }}
    >
      {labels.text}
    </div>
  );
}
