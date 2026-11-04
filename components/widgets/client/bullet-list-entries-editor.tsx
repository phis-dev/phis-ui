"use client";

import { useRef, useState, type CSSProperties } from "react";

import { PhiBulletListControl } from "../../controls/phi-bullet-list-control";
import { PhiTextControl } from "../../controls/phi-text-control";
import {
  buildPhiBulletListTree,
  nextPhiBulletListEntryState,
  resolvePhiBulletListLevel,
  type PhiBulletListEntry,
  type PhiResolvedBulletListStyle,
} from "../shared/bullet-list-vocabulary";

export type PhiBulletListEntriesEditorProps = {
  entries: readonly PhiBulletListEntry[];
  listStyle: PhiResolvedBulletListStyle;
  /** Absent, the entries are only shown: a read-only canvas. */
  onCommit?: (entries: PhiBulletListEntry[]) => void;
  /** Whether a click on an entry's marker steps its state on (`PHI_BULLET_LIST_ENTRY_STATES`). */
  states?: boolean;
  /** Each entry's field, apart from what every field here is: borderless, its text's own type. */
  fieldStyle?: CSSProperties;
};

/**
 * A list written in place, entry by entry, as the Widgets that carry one edit it.
 *
 * Every entry is a text field standing where the entry stands, so the list is set as it will be read.
 * What is typed stays here until the field is left, and the Builder's history records one change per
 * entry rather than one per keystroke. What changes the list's shape is written at once, with what was
 * typed so far: Enter opens an entry after this one, Backspace in an empty entry removes it, Tab and
 * Shift+Tab move an entry a level down and up, and -- where the list has `states` -- a click on the
 * marker steps the entry from included to excluded to neither. Waiting for the blur would let the entry
 * jump back while the tree is drawn again.
 *
 * A list with no entries still offers one empty field, so there is something to type into.
 */
export function PhiBulletListEntriesEditor({
  entries,
  listStyle,
  onCommit,
  states = false,
  fieldStyle,
}: PhiBulletListEntriesEditorProps) {
  const [draftState, setDraftState] = useState(() => ({ source: entries, value: [...entries] }));
  const draft = draftState.source === entries ? draftState.value : [...entries];
  const shown: PhiBulletListEntry[] = draft.length > 0 || !onCommit ? draft : [{ text: "" }];
  const listRef = useRef<HTMLDivElement>(null);

  function focusEntry(index: number) {
    requestAnimationFrame(() => {
      const field = listRef.current?.querySelectorAll("textarea")[index];
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
    });
  }

  function commit(next: PhiBulletListEntry[]) {
    // The empty field an empty list offers is not an entry until something is typed into it.
    if (entries.length === 0 && next.length === 1 && next[0]!.text === "" && !next[0]!.state) return;
    setDraftState({ source: entries, value: next });
    if (JSON.stringify(next) !== JSON.stringify(entries)) onCommit?.(next);
  }

  function updateText(index: number, text: string) {
    const next = [...shown];
    next[index] = { ...next[index], text };
    setDraftState({ source: entries, value: next });
  }

  function shiftLevel(index: number, delta: number) {
    const entry = shown[index];
    if (!entry) return;
    const level = resolvePhiBulletListLevel((entry.level ?? 1) + delta);
    if (level === (entry.level ?? 1)) return;
    const { level: _level, ...rest } = entry;
    void _level;
    commit(shown.map((item, itemIndex) => (itemIndex === index ? (level > 1 ? { ...rest, level } : rest) : item)));
    focusEntry(index);
  }

  function insertAfter(index: number) {
    const entry = shown[index];
    const level = entry?.level;
    commit([...shown.slice(0, index + 1), { text: "", ...(level ? { level } : {}) }, ...shown.slice(index + 1)]);
    focusEntry(index + 1);
  }

  function remove(index: number) {
    commit(shown.filter((_, itemIndex) => itemIndex !== index));
    focusEntry(Math.max(0, index - 1));
  }

  function stepState(index: number) {
    const entry = shown[index];
    if (!entry) return;
    const { state: _state, ...rest } = entry;
    void _state;
    const state = nextPhiBulletListEntryState(entry.state);
    commit(shown.map((item, itemIndex) => (itemIndex === index ? (state === "neutral" ? rest : { ...rest, state }) : item)));
  }

  return (
    <div ref={listRef} style={{ width: "100%", minWidth: 0 }}>
      <PhiBulletListControl
        listStyle={listStyle}
        // Each entry is a borderless text field, whose first line stands at the field's height.
        markerLineHeight="var(--ant-control-height)"
        items={buildPhiBulletListTree(
          shown,
          (item, index) => (
            <PhiTextControl
              presentation="textarea"
              value={item.text}
              readOnly={!onCommit}
              variant="borderless"
              placeholder={`Item ${index + 1}`}
              autoSize={{ minRows: 1, maxRows: 6 }}
              onChange={(value) => updateText(index, value ?? "")}
              onBlur={() => commit(shown)}
              onKeyDown={(event) => {
                if (!onCommit) return;
                if (event.key === "Tab") {
                  event.preventDefault();
                  shiftLevel(index, event.shiftKey ? -1 : 1);
                } else if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  insertAfter(index);
                } else if (event.key === "Backspace" && item.text === "" && shown.length > 1) {
                  event.preventDefault();
                  remove(index);
                }
              }}
              style={{
                paddingInline: 0,
                paddingBlock: 0,
                borderRadius: 0,
                borderWidth: 0,
                backgroundColor: "transparent",
                resize: "none",
                color: "inherit",
                ...fieldStyle,
              }}
            />
          ),
          states && onCommit ? (_entry, index) => stepState(index) : undefined,
        )}
      />
    </div>
  );
}
