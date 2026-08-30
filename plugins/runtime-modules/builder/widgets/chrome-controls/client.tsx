"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

import {
  resolvePhiDeveloperBuilderRouteScope,
} from "../../../../../plugins/runtime-modules/builder/route-scope";
import {
  emitPhiBuilderChromeControlsSignal,
  usePhiDeveloperBuilderStateValue,
} from "../../../../../plugins/runtime-modules/builder/developer-workspace-store";
import { usePhiSignalDispatcher } from "../../../../../components/runtime/runtime-signal-bus";

type PhiBuilderChromeControlsWidgetConfig = {
  editorPreviewDisabled?: boolean;
  actionsDisabled?: boolean;
  debugDisabled?: boolean;
};

export function PhiBuilderChromeControlsWidgetClient({
  config,
}: {
  config?: PhiBuilderChromeControlsWidgetConfig | null;
}) {
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const pageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const emitSignal = usePhiSignalDispatcher();
  const pathname = usePathname();
  const routeScope = useMemo(
    () =>
      resolvePhiDeveloperBuilderRouteScope(pathname) ?? {
        area,
        pageKey,
      },
    [area, pageKey, pathname],
  );

  const editorPreviewDisabled = config?.editorPreviewDisabled === true;
  const actionsDisabled = config?.actionsDisabled === true;
  const debugDisabled = config?.debugDisabled === true;

  useEffect(() => {
    emitPhiBuilderChromeControlsSignal(
      emitSignal,
      routeScope,
      {
        editorPreviewDisabled,
        actionsDisabled,
        debugDisabled,
      },
    );

    return () => {
      emitPhiBuilderChromeControlsSignal(
        emitSignal,
        routeScope,
        {
          editorPreviewDisabled: false,
          actionsDisabled: false,
          debugDisabled: false,
        },
      );
    };
  }, [actionsDisabled, debugDisabled, editorPreviewDisabled, emitSignal, routeScope]);

  return null;
}
