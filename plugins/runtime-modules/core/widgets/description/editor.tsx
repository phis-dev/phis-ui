"use client";

import { useMemo, useRef, useState } from "react";

import { PhiTagControl } from "../../../../../components/controls/phi-tag-control";

import type { PhiCmsDescriptionWidgetConfig } from "./config";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { resolvePhiDescriptionEditorSections } from "../../../../../components/widgets/client/description-editor-sections";
import { PhiBulletListControl } from "../../../../../components/controls/phi-bullet-list-control";
import {
  buildPhiBulletListTree,
  resolvePhiBulletListLevel,
  resolvePhiBulletListStyle,
  type PhiBulletListEntry,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";

type PhiDescriptionEditorConfig = {
  eyebrow: string;
  title: string;
  description: string;
  asideTitle: string;
  asideItems: PhiBulletListEntry[];
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
  const asideListRef = useRef<HTMLDivElement>(null);

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
      nextItems[index] = { ...nextItems[index], text: value };
      return {
        source: config,
        value: {
          ...currentDraft,
          asideItems: nextItems,
        },
      };
    });
  }

  function commitAsideItems(items = draft.asideItems) {
    if (JSON.stringify(items) === JSON.stringify(resolvedConfig.asideItems)) {
      return;
    }
    onChange?.({ asideItems: items });
  }

  /*
   * Tab moves an entry a level down and Shift+Tab a level up, as in every outline editor. The move is
   * written at once, with whatever was typed into the entry so far: it is a change of structure, and
   * waiting for the blur would let the entry jump back as the tree is drawn again.
   */
  function shiftAsideItemLevel(index: number, delta: number) {
    const items = draft.asideItems;
    const entry = items[index];
    if (!entry) return;
    const level = resolvePhiBulletListLevel((entry.level ?? 1) + delta);
    if (level === (entry.level ?? 1)) return;
    const { level: _level, ...rest } = entry;
    void _level;
    const next = items.map((item, itemIndex) => (itemIndex === index ? (level > 1 ? { ...rest, level } : rest) : item));
    setDraftState({ source: config, value: { ...draft, asideItems: next } });
    commitAsideItems(next);
    // The entry now hangs elsewhere in the tree and its field is a new one; the caret goes back into it.
    requestAnimationFrame(() => {
      const field = asideListRef.current?.querySelectorAll("textarea")[index];
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
    });
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
            <div ref={asideListRef} style={{ width: "100%", minWidth: 0 }}>
              <PhiBulletListControl
                listStyle={resolvePhiBulletListStyle(config?.asideList)}
                // Each entry is a borderless text field, whose first line stands at the field's height.
                markerLineHeight="var(--ant-control-height)"
                items={buildPhiBulletListTree(draft.asideItems, (item, index) => (
                  <PhiTextControl
                    presentation="textarea"
                    value={item.text}
                    readOnly={!onChange}
                    variant="borderless"
                    placeholder={`Item ${index + 1}`}
                    autoSize={{ minRows: 1, maxRows: 6 }}
                    onChange={(value) => updateAsideItem(index, value ?? "")}
                    onBlur={() => commitAsideItems()}
                    onKeyDown={(event) => {
                      if (event.key !== "Tab" || !onChange) return;
                      event.preventDefault();
                      shiftAsideItemLevel(index, event.shiftKey ? -1 : 1);
                    }}
                    style={{
                      ...EDITOR_TEXTAREA_STYLE,
                      borderBottom: "none",
                      paddingBlock: 0,
                    }}
                  />
                ))}
              />
            </div>
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
