"use client";

import { useEffect, useMemo, useRef } from "react";

import { PhiSelectControl } from "../../../../components/controls/phi-select-control";
import {
  PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
  type PhiBuilderChromeWidgetLabels,
} from "../../../../components/widgets/label-types/builder-chrome";
import { resolvePhiBuilderActivePageCatalog } from "../../../../helpers/cms-page-catalog";
import type { PhiAreaRootRoute } from "../../../../helpers/cms-area-config";
import type { PhiPageReference } from "../../../../types/references";
import {
  setPhiDeveloperBuilderAreaRootRoute,
  usePhiDeveloperBuilderStateValue,
} from "../developer-workspace-store";
import type { PhiDeveloperBuilderArea } from "../developer-workspace-types";
import { collectPhiBuilderPageReferenceOptions } from "../page-reference-picker";

/**
 * Where an Area's `/` goes, as a Builder decision.
 *
 * The root is the one path drawn without the Shell around it, which leaves it two shapes: a page that
 * arrives alone, or a forward. This is where that is chosen, next to the Regions the same draft owns,
 * because it is a statement the Shell makes about itself rather than about any one Region.
 *
 * The third option is the one that is easy to leave out. Nothing stored means the code-owned preset
 * answers and forwards to the first entry of the Area's own navigation, which is what keeps a Module
 * safe to switch off -- so a Builder has to be able to choose it back, not only fall into it.
 *
 * The target is a Page reference and never a path, so the selector offers Pages rather than a text
 * field: a path typed here would be a fact about today's routing table, and it would rot the first time
 * a Page moved.
 */

type PhiBuilderAreaRootRouteMode = "automatic" | "landing" | "redirect";

function readMode(rootRoute: PhiAreaRootRoute | null | undefined): PhiBuilderAreaRootRouteMode {
  if (!rootRoute) {
    return "automatic";
  }
  return rootRoute.mode === "landing" ? "landing" : "redirect";
}

export function PhiBuilderAreaRootRouteControl({
  targetArea,
  persistedRootRoute,
  disabled = false,
  labels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.rootRoute,
}: {
  targetArea: PhiDeveloperBuilderArea;
  persistedRootRoute: PhiAreaRootRoute | null;
  disabled?: boolean;
  labels?: PhiBuilderChromeWidgetLabels["rootRoute"];
}) {
  const state = usePhiDeveloperBuilderStateValue("public", (value) => value);
  const draft = state.areaRootRouteDrafts?.[targetArea];
  const hydratedAreaRef = useRef<PhiDeveloperBuilderArea | null>(null);

  /*
   * The stored answer is seeded into the draft rather than only read from the server, because the
   * structure write states `config.shell` whole: a save that never touched the root route still has to
   * carry it, or publishing would remove it.
   */
  useEffect(() => {
    if (hydratedAreaRef.current === targetArea) {
      return;
    }
    hydratedAreaRef.current = targetArea;
    setPhiDeveloperBuilderAreaRootRoute(targetArea, persistedRootRoute);
  }, [persistedRootRoute, targetArea]);

  const pageOptions = useMemo(() => {
    const pages = resolvePhiBuilderActivePageCatalog(
      targetArea,
      state.modulePresetPagesByArea,
      state.customPages,
      state.persistedPageCatalogByArea,
    );
    return collectPhiBuilderPageReferenceOptions(targetArea, pages, pages);
  }, [state.customPages, state.modulePresetPagesByArea, state.persistedPageCatalogByArea, targetArea]);

  const mode = readMode(draft);
  const target = draft?.mode === "redirect" ? draft.target : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ color: "var(--ant-color-text-secondary)" }}>{labels.title}</span>
      <PhiSelectControl<PhiBuilderAreaRootRouteMode>
        ariaLabel={labels.title}
        value={mode}
        disabled={disabled}
        size="small"
        style={{ minWidth: 200 }}
        options={[
          { value: "automatic", label: labels.automatic },
          { value: "landing", label: labels.landing },
          { value: "redirect", label: labels.redirect },
        ]}
        onChange={(next) => {
          if (next === "automatic") {
            setPhiDeveloperBuilderAreaRootRoute(targetArea, null);
            return;
          }
          if (next === "landing") {
            setPhiDeveloperBuilderAreaRootRoute(targetArea, { mode: "landing" });
            return;
          }
          // A redirect without a destination is not one, so the mode is only stored once a Page is
          // picked. Until then the Area keeps whatever it had.
          if (target) {
            setPhiDeveloperBuilderAreaRootRoute(targetArea, { mode: "redirect", target });
          }
        }}
      />
      {mode === "redirect" || target ? (
        <PhiSelectControl<PhiPageReference>
          ariaLabel={labels.selectTarget}
          placeholder={pageOptions.length > 0 ? labels.selectTarget : labels.noTarget}
          value={target ?? undefined}
          disabled={disabled}
          size="small"
          style={{ minWidth: 240 }}
          popupMatchSelectWidth={320}
          options={pageOptions}
          onChange={(reference) => {
            setPhiDeveloperBuilderAreaRootRoute(targetArea, { mode: "redirect", target: reference });
          }}
        />
      ) : null}
    </div>
  );
}
