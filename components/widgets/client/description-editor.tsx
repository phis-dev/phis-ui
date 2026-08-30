"use client";

import { useMemo, useState } from "react";

import { Flex, Tag } from "antd";

import type { PhiCmsDescriptionWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/description/config";
import { PhiTextControl } from "../../controls/phi-text-control";

type PhiDescriptionEditorConfig = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideItems: string[];
  footer: string;
};

export type PhiDescriptionWidgetEditorProps = {
  config?: PhiCmsDescriptionWidgetConfig | null;
  onChange?: (patch: Partial<PhiCmsDescriptionWidgetConfig>) => void;
};

function resolveEditorConfig(config?: PhiCmsDescriptionWidgetConfig | null): PhiDescriptionEditorConfig {
  return {
    eyebrow: config?.eyebrow ?? "",
    title: config?.title ?? "",
    description: config?.description ?? "",
    asideTitle: config?.asideTitle ?? "",
    asideItems: Array.isArray(config?.asideItems) ? [...config.asideItems] : [],
    footer: config?.footer ?? "",
  };
}

const EDITOR_TEXTAREA_STYLE = {
  paddingInline: 0,
  paddingBlock: 6,
  borderRadius: 0,
  borderWidth: 0,
  borderBottom: "1px solid var(--ant-color-border, rgba(0, 0, 0, 0.15))",
  backgroundColor: "transparent",
  resize: "none" as const,
};

export function PhiDescriptionWidgetEditor({
  config,
  onChange,
}: PhiDescriptionWidgetEditorProps) {
  const resolvedConfig = useMemo(() => resolveEditorConfig(config), [config]);
  const [draftState, setDraftState] = useState(() => ({ source: config, value: resolvedConfig }));
  const draft = draftState.source === config ? draftState.value : resolvedConfig;

  const previewLabels = useMemo(
    () => ({
      eyebrow: draft.eyebrow,
      title: draft.title,
      description: draft.description,
      asideTitle: draft.asideTitle,
      asideItems: draft.asideItems,
      footer: draft.footer,
    }),
    [draft],
  );

  function updateField<Key extends keyof PhiDescriptionEditorConfig>(
    key: Key,
    value: PhiDescriptionEditorConfig[Key],
  ) {
    setDraftState((current) => {
      const currentDraft = current.source === config ? current.value : resolvedConfig;
      return { source: config, value: { ...currentDraft, [key]: value } };
    });
    onChange?.({ [key]: value } as Partial<PhiCmsDescriptionWidgetConfig>);
  }

  function updateAsideItem(index: number, value: string) {
    setDraftState((current) => {
      const currentDraft = current.source === config ? current.value : resolvedConfig;
      const nextItems = [...currentDraft.asideItems];
      nextItems[index] = value;
      return {
        source: config,
        value: {
          ...currentDraft,
          asideItems: nextItems,
        },
      };
    });
    onChange?.({
      asideItems: draft.asideItems.map((item, itemIndex) => (itemIndex === index ? value : item)),
    });
  }

  return (
    <Flex
      vertical
      gap={16}
      style={{ width: "100%", minWidth: 0 }}
    >
      <Flex vertical gap={10} style={{ width: "100%", minWidth: 0 }}>
        {previewLabels.eyebrow ? (
          <Tag
            color="default"
            style={{
              width: "fit-content",
              borderRadius: 999,
              paddingInline: "var(--ant-padding-sm)",
              paddingBlock: "var(--ant-padding-xxs)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "var(--ant-color-text-tertiary)",
              borderColor: "var(--ant-color-border-secondary)",
              background: "var(--ant-color-fill-quaternary)",
            }}
          >
            <PhiTextControl
              presentation="textarea"
              value={draft.eyebrow}
              readOnly={!onChange}
              variant="borderless"
              placeholder="Eyebrow"
              autoSize={{ minRows: 1, maxRows: 2 }}
              onChange={(value) => updateField("eyebrow", value ?? "")}
              style={{ ...EDITOR_TEXTAREA_STYLE, borderBottom: "none", paddingBlock: 0 }}
            />
          </Tag>
        ) : (
          <PhiTextControl
            presentation="textarea"
            value={draft.eyebrow}
            readOnly={!onChange}
            variant="borderless"
            placeholder="Eyebrow"
            autoSize={{ minRows: 1, maxRows: 2 }}
            onChange={(value) => updateField("eyebrow", value ?? "")}
            style={EDITOR_TEXTAREA_STYLE}
          />
        )}
        {previewLabels.title || previewLabels.description ? (
          <div>
            <PhiTextControl
              presentation="textarea"
              value={draft.title}
              readOnly={!onChange}
              variant="borderless"
              placeholder="Title"
              autoSize={{ minRows: 1, maxRows: 4 }}
              onChange={(value) => updateField("title", value ?? "")}
              style={{
                ...EDITOR_TEXTAREA_STYLE,
                fontSize: "var(--ant-font-size-heading-2, 2rem)",
                lineHeight: 1.2,
                fontWeight: 600,
                marginBottom: draft.description ? "var(--ant-padding-xs)" : 0,
              }}
            />
            <PhiTextControl
              presentation="textarea"
              value={draft.description}
              readOnly={!onChange}
              variant="borderless"
              placeholder="Description"
              autoSize={{ minRows: 2, maxRows: 8 }}
              onChange={(value) => updateField("description", value ?? "")}
              style={{
                ...EDITOR_TEXTAREA_STYLE,
                color: "var(--ant-color-text-secondary)",
                fontSize: "1.125rem",
                lineHeight: 1.6,
              }}
            />
          </div>
        ) : null}
        {previewLabels.asideTitle || previewLabels.asideItems?.length ? (
          <Flex vertical gap={12} style={{ width: "100%" }}>
            <PhiTextControl
              presentation="textarea"
              value={draft.asideTitle}
              readOnly={!onChange}
              variant="borderless"
              placeholder="Aside title"
              autoSize={{ minRows: 1, maxRows: 3 }}
              onChange={(value) => updateField("asideTitle", value ?? "")}
              style={{
                ...EDITOR_TEXTAREA_STYLE,
                color: "var(--ant-color-text-heading)",
                fontWeight: 600,
              }}
            />
            <Flex vertical gap={8} style={{ width: "100%" }}>
              {draft.asideItems.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--ant-padding-xs)",
                    padding: "var(--ant-padding-sm) var(--ant-padding)",
                    borderRadius: "var(--ant-border-radius-lg)",
                    background: "var(--ant-color-bg-container)",
                    border: "1px solid var(--ant-color-border-secondary)",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: "var(--ant-padding-xs)",
                      height: "var(--ant-padding-xs)",
                      // the item text is a borderless auto-sizing textarea, so the first
                      // text line sits at the control's own height, not at the raw line box
                      marginTop:
                        "calc((var(--ant-control-height) - var(--ant-padding-xs)) / 2)",
                      borderRadius: "50%",
                      background: "var(--ant-color-primary)",
                      flexShrink: 0,
                    }}
                  />
                  <PhiTextControl
                    presentation="textarea"
                    value={item}
                    readOnly={!onChange}
                    variant="borderless"
                    placeholder={`Item ${index + 1}`}
                    autoSize={{ minRows: 1, maxRows: 6 }}
                    onChange={(value) => updateAsideItem(index, value ?? "")}
                    style={{
                      ...EDITOR_TEXTAREA_STYLE,
                      borderBottom: "none",
                      paddingBlock: 0,
                    }}
                  />
                </div>
              ))}
            </Flex>
          </Flex>
        ) : null}
        <PhiTextControl
          presentation="textarea"
          value={draft.footer}
          readOnly={!onChange}
          variant="borderless"
          placeholder="Footer"
          autoSize={{ minRows: 1, maxRows: 5 }}
          onChange={(value) => updateField("footer", value ?? "")}
          style={{
            ...EDITOR_TEXTAREA_STYLE,
            color: "var(--ant-color-text-tertiary)",
          }}
        />
      </Flex>
    </Flex>
  );
}
