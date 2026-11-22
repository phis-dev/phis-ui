"use client";

import { useState } from "react";

import { usePhiControlOptionsProvider } from "../../controls/phi-options-provider";
import type { PhiTableFilterDefinition, PhiTableProviderFieldDefinition } from "../../../types/table-widget";

/**
 * The choices of one Table filter, resolved the way a Form field resolves its own.
 *
 * A select filter takes its static `options`, or its field's, or one Options Provider binding -- its
 * own or its field's. The options hook (`usePhiControlOptionsProvider`) is asked as `PhiFormControl`
 * asks it: with what the person typed into the filter's search box, debounced and held to the declared
 * minimum there, and with the value the filter holds as `selected`. So an Options Provider that answers
 * one page of a longer list (`loadMode: "server"`, `search`) is searched by the route rather than inside
 * the page it answered, and names a chosen value that is on no such page; the hook keeps the name a
 * chosen value was last seen with while a search leaves it out.
 *
 * `onSearch` is there only where the source declares a search; without one the filter narrows what it
 * holds, as before.
 */
export function usePhiTableFilterOptions({
  filter,
  field,
  sourceConfig,
  value,
}: {
  filter: PhiTableFilterDefinition;
  field?: PhiTableProviderFieldDefinition;
  sourceConfig?: Record<string, unknown>;
  /** What the filter holds now, as the Table's query holds it: one value, a list, or nothing. */
  value: unknown;
}) {
  const [searchDraft, setSearchDraft] = useState("");
  const select = filter.type === "select" ? filter : null;
  const fieldWithOptions = field?.type === "enum" || field?.type === "enum[]" ? field : null;
  const resolved = usePhiControlOptionsProvider<string | number>({
    options: select && (select.options?.length ?? 0) > 0 ? select.options : fieldWithOptions?.options,
    optionsProvider: select ? select.optionsProvider ?? fieldWithOptions?.optionsProvider : undefined,
    sourceConfig,
    searchDraft,
    selectedValues: select ? value : undefined,
  });
  return {
    options: resolved.options,
    warning: resolved.warning,
    onSearch: resolved.search.enabled ? setSearchDraft : undefined,
    filterOptionsLocally: resolved.search.filterLocally,
  };
}
