"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, type ReactNode } from "react";

export const PHI_WIDGET_SCAFFOLD_POPUP_CLASS_NAME = "phi-builder-widget-scaffold__popup";

type PhiWidgetScaffoldPopupContextValue = {
  setPopupOpen: (popupId: string, open: boolean) => void;
};

const PhiWidgetScaffoldPopupContext = createContext<PhiWidgetScaffoldPopupContextValue | null>(null);

function getPhiWidgetScaffoldPopupContainer(triggerNode: HTMLElement) {
  const rootNode = triggerNode.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    return rootNode.querySelector<HTMLElement>('[data-phi-root-layout="true"]')
      ?? triggerNode.parentElement
      ?? triggerNode;
  }
  return document.body;
}

export function PhiWidgetScaffoldPopupProvider({
  children,
  onOpenChange,
}: {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
}) {
  const openPopupIdsRef = useRef(new Set<string>());
  const setPopupOpen = useCallback((popupId: string, open: boolean) => {
    const openPopupIds = openPopupIdsRef.current;
    if (open) {
      openPopupIds.add(popupId);
    } else {
      openPopupIds.delete(popupId);
    }
    onOpenChange(openPopupIds.size > 0);
  }, [onOpenChange]);
  const value = useMemo(() => ({ setPopupOpen }), [setPopupOpen]);

  useEffect(() => () => {
    openPopupIdsRef.current.clear();
  }, []);

  return (
    <PhiWidgetScaffoldPopupContext.Provider value={value}>
      {children}
    </PhiWidgetScaffoldPopupContext.Provider>
  );
}

export function usePhiWidgetScaffoldPopup() {
  const context = useContext(PhiWidgetScaffoldPopupContext);
  const popupId = useId();
  const setOpen = useCallback((open: boolean) => {
    context?.setPopupOpen(popupId, open);
  }, [context, popupId]);

  useEffect(() => () => {
    context?.setPopupOpen(popupId, false);
  }, [context, popupId]);

  return useMemo(() => ({
    getPopupContainer: getPhiWidgetScaffoldPopupContainer,
    rootClassName: PHI_WIDGET_SCAFFOLD_POPUP_CLASS_NAME,
    setOpen,
  }), [setOpen]);
}
