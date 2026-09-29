"use client";

import type { PhiClientBlockBaseProps } from "../../../types";
import type { PhiCmsSearchWidgetConfig } from "../config/search-shared";
import type { PhiSearchWidgetLabels } from "../label-types/search";
import { PhiTextControl } from "../../controls/phi-text-control";
import { usePhiSearchDraft } from "./shared/phi-search-draft";

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
  const placeholder = config?.placeholder?.trim() || labels.placeholder;
  const allowClear = config?.allowClear ?? true;
  const minQueryLength = Math.max(1, config?.minQueryLength ?? 3);
  const submitOnEnter = config?.submitOnEnter ?? true;
  const { draft, setDraft, settle } = usePhiSearchDraft({
    query: query ?? config?.value ?? defaultQuery,
    onQueryChange: (nextQuery) => onQueryChange?.(nextQuery),
    debounceMs: config?.debounceMs ?? 250,
    minQueryLength,
  });

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
      value={draft}
      onChange={(nextValue) => setDraft(nextValue ?? "")}
      onClear={() => {
        setDraft("");
        onQueryClear?.();
      }}
      onFocus={onQueryFocus}
      onBlur={onQueryBlur}
      onPressEnter={() => {
        if (!submitOnEnter) {
          return;
        }

        // An empty or too-short box is not a submit; the draft already takes the search back.
        const trimmed = draft.trim();
        if (trimmed.length >= minQueryLength) {
          settle();
          onQuerySubmit?.(trimmed);
        }
      }}
    />
  );
}
