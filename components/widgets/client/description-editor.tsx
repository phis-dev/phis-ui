"use client";

import { useMemo, useState } from "react";

import { PhiTagControl } from "../../controls/phi-tag-control";

import type { PhiCmsDescriptionWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/description/config";
import { PhiTextControl } from "../../controls/phi-text-control";
import { PhiFlexControl } from "../../controls/phi-flex-control";
import { resolvePhiDescriptionEditorSections } from "./description-editor-sections";

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

  /*
   * The parts that stand follow the stored config, never the draft: a field that mounted or unmounted
   * as it was typed into would lose the caret on its first character, and one cleared to nothing
   * would be gone before its blur could write the empty value.
   */
  const sections = resolvePhiDescriptionEditorSections(resolvedConfig, Boolean(onChange));

  /*
   * Typing changes the draft and nothing else.
   *
   * Each of these fields is a textarea with an undo of its own, and it keeps it while it has the
   * focus. What leaves this Widget is one write per field, when that field is left -- so the
   * Builder's history holds "the title was changed", not one entry per character of it.
   */
  function updateField<Key extends keyof PhiDescriptionEditorConfig>(
    key: Key,
    value: PhiDescriptionEditorConfig[Key],
  ) {
    setDraftState((current) => {
      const currentDraft = current.source === config ? current.value : resolvedConfig;
      return { source: config, value: { ...currentDraft, [key]: value } };
    });
  }

  function commitField<Key extends keyof PhiDescriptionEditorConfig>(key: Key) {
    if (draft[key] === resolvedConfig[key]) {
      return;
    }
    onChange?.({ [key]: draft[key] } as Partial<PhiCmsDescriptionWidgetConfig>);
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
  }

  function commitAsideItems() {
    const items = draft.asideItems;
    const storedItems = resolvedConfig.asideItems;
    if (
      items.length === storedItems.length &&
      items.every((item, index) => item === storedItems[index])
    ) {
      return;
    }
    onChange?.({ asideItems: items });
  }

  return (
    <PhiFlexControl
      vertical
      gap={16}
      style={{ width: "100%", minWidth: 0 }}
    >
      <PhiFlexControl vertical gap={10} style={{ width: "100%", minWidth: 0 }}>
        {sections.eyebrowTag ? (
          <PhiTagControl
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
              onBlur={() => commitField("eyebrow")}
              style={{ ...EDITOR_TEXTAREA_STYLE, borderBottom: "none", paddingBlock: 0 }}
            />
          </PhiTagControl>
        ) : (
          <PhiTextControl
            presentation="textarea"
            value={draft.eyebrow}
            readOnly={!onChange}
            variant="borderless"
            placeholder="Eyebrow"
            autoSize={{ minRows: 1, maxRows: 2 }}
            onChange={(value) => updateField("eyebrow", value ?? "")}
            onBlur={() => commitField("eyebrow")}
            style={EDITOR_TEXTAREA_STYLE}
          />
        )}
        {sections.heading ? (
          <div>
            <PhiTextControl
              presentation="textarea"
              value={draft.title}
              readOnly={!onChange}
              variant="borderless"
              placeholder="Title"
              autoSize={{ minRows: 1, maxRows: 4 }}
              onChange={(value) => updateField("title", value ?? "")}
              onBlur={() => commitField("title")}
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
              onBlur={() => commitField("description")}
              style={{
                ...EDITOR_TEXTAREA_STYLE,
                color: "var(--ant-color-text-secondary)",
                fontSize: "1.125rem",
                lineHeight: 1.6,
              }}
            />
          </div>
        ) : null}
        {sections.aside ? (
          <PhiFlexControl vertical gap={12} style={{ width: "100%" }}>
            <PhiTextControl
              presentation="textarea"
              value={draft.asideTitle}
              readOnly={!onChange}
              variant="borderless"
              placeholder="Aside title"
              autoSize={{ minRows: 1, maxRows: 3 }}
              onChange={(value) => updateField("asideTitle", value ?? "")}
              onBlur={() => commitField("asideTitle")}
              style={{
                ...EDITOR_TEXTAREA_STYLE,
                color: "var(--ant-color-text-heading)",
                fontWeight: 600,
              }}
            />
            <PhiFlexControl vertical gap={8} style={{ width: "100%" }}>
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
                    onBlur={() => commitAsideItems()}
                    style={{
                      ...EDITOR_TEXTAREA_STYLE,
                      borderBottom: "none",
                      paddingBlock: 0,
                    }}
                  />
                </div>
              ))}
            </PhiFlexControl>
          </PhiFlexControl>
        ) : null}
        <PhiTextControl
          presentation="textarea"
          value={draft.footer}
          readOnly={!onChange}
          variant="borderless"
          placeholder="Footer"
          autoSize={{ minRows: 1, maxRows: 5 }}
          onChange={(value) => updateField("footer", value ?? "")}
          onBlur={() => commitField("footer")}
          style={{
            ...EDITOR_TEXTAREA_STYLE,
            color: "var(--ant-color-text-tertiary)",
          }}
        />
      </PhiFlexControl>
    </PhiFlexControl>
  );
}
