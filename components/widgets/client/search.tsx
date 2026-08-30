"use client";

import { useEffect, useRef, useState } from "react";

import type { PhiClientBlockBaseProps } from "../../../types";
import type { PhiCmsSearchWidgetConfig } from "../config/search-shared";
import type { PhiSearchWidgetLabels } from "../label-types/search";
import { PhiTextControl } from "../../controls/phi-text-control";

export type PhiSearchWidgetProps = PhiClientBlockBaseProps<
  PhiSearchWidgetLabels,
  PhiCmsSearchWidgetConfig,
  unknown
> & {
  query?: string;
  defaultQuery?: string;
  disabled?: boolean;
  readOnly?: boolean;
  onQueryChange?: (query: string) => void;
  onQuerySubmit?: (query: string) => void;
  onQueryFocus?: () => void;
  onQueryBlur?: () => void;
  onQueryClear?: () => void;
};

export function PhiSearchWidget({
  query,
  defaultQuery = "",
  disabled = false,
  readOnly = false,
  labels,
  config,
  onQueryChange,
  onQuerySubmit,
  onQueryFocus,
  onQueryBlur,
  onQueryClear,
}: PhiSearchWidgetProps) {
  const [draft, setDraft] = useState(() => query ?? config?.value ?? defaultQuery);
  const debounceTimerRef = useRef<number | null>(null);
  const currentQuery = draft;
  const placeholder = config?.placeholder?.trim() || labels.placeholder;
  const allowClear = config?.allowClear ?? true;
  const debounceMs = config?.debounceMs ?? 250;
  const minQueryLength = Math.max(1, config?.minQueryLength ?? 3);
  const submitOnEnter = config?.submitOnEnter ?? true;

  function clearDebounceTimer() {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // External query changes must resync the visible draft so resets and page switches stay in sync.
    clearDebounceTimer();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(query ?? config?.value ?? defaultQuery);
  }, [config?.value, defaultQuery, query]);

  function emitQuery(nextValue: string) {
    if (!onQueryChange) {
      return;
    }

    const trimmed = nextValue.trim();
    clearDebounceTimer();

    if (trimmed.length === 0) {
      onQueryChange("");
      return;
    }

    if (trimmed.length < minQueryLength) {
      return;
    }

    if (debounceMs <= 0) {
      onQueryChange(trimmed);
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      onQueryChange(trimmed);
      debounceTimerRef.current = null;
    }, debounceMs);
  }

  return (
    <PhiTextControl
      disabled={disabled}
      readOnly={readOnly}
      allowClear={allowClear}
      clearLabel={labels.clearLabel}
      ariaLabel={labels.ariaLabel}
      inputType="search"
      placeholder={placeholder}
      size={config?.controlSize}
      value={currentQuery}
      onChange={(nextValue) => {
        const resolvedValue = nextValue ?? "";
        setDraft(resolvedValue);
        emitQuery(resolvedValue);
      }}
      onClear={() => {
        clearDebounceTimer();
        setDraft("");
        onQueryClear?.();
        onQueryChange?.("");
      }}
      onFocus={onQueryFocus}
      onBlur={onQueryBlur}
      onPressEnter={() => {
        if (!submitOnEnter) {
          return;
        }

        const trimmed = currentQuery.trim();
        clearDebounceTimer();

        if (trimmed.length === 0) {
          onQueryChange?.("");
          return;
        }

        if (trimmed.length >= minQueryLength) {
          onQuerySubmit?.(trimmed);
        }
      }}
    />
  );
}
