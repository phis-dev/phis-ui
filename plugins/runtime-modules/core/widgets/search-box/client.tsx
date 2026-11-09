"use client";

import { useState } from "react";
import { PHI_SEARCH_QUERY_PARAM } from "@phis/contracts/search";

import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import type { PhiSearchWidgetLabels } from "../../../../../components/widgets/label-types/search";
import type { PhiClientBlockBaseProps } from "../../../../../types";
import type { PhiControlSize } from "../../../../../types/control";

export type PhiSearchBoxWidgetClientConfig = {
  /** The results Page, as the form's address. */
  action: string;
  placeholder: string;
  size?: PhiControlSize;
  /** The query the page is answering, so the box shows what was searched for. */
  initialQuery: string;
};

export type PhiSearchBoxWidgetClientProps = PhiClientBlockBaseProps<PhiSearchWidgetLabels, PhiSearchBoxWidgetClientConfig>;

/**
 * A `GET` form around one search field (SEARCH.md).
 *
 * The browser submits it: Enter, or the keyboard's search key, sends `?q=` to the results Page without
 * a script, and a static Public page needs none. The field is the house's text Control with the form's
 * field name, so it clears, labels and sizes like every other field, and the form is a landmark a screen
 * reader lists.
 */
export function PhiSearchBoxWidgetClient({ labels, config }: PhiSearchBoxWidgetClientProps) {
  const [draft, setDraft] = useState(config?.initialQuery ?? "");

  return (
    <form method="get" action={config?.action} role="search" aria-label={labels.title} style={{ width: "100%" }}>
      <PhiTextControl
        name={PHI_SEARCH_QUERY_PARAM}
        inputType="search"
        ariaLabel={labels.ariaLabel}
        placeholder={config?.placeholder || labels.placeholder}
        clearLabel={labels.clearLabel}
        size={config?.size}
        value={draft}
        onChange={(value) => setDraft(value ?? "")}
        onClear={() => setDraft("")}
        style={{ width: "100%" }}
      />
    </form>
  );
}
