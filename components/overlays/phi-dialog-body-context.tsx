"use client";

import { createContext, useContext, type ReactNode } from "react";

/*
 * Whether what renders here stands in a dialog's body -- a Modal Overlay, not a Drawer.
 *
 * A dialog asks one question, so a key there has one meaning: Enter in a Form is what the footer's
 * primary button does (FORMS.md, `submitOnEnter`). A page or a Drawer can hold several Forms and a
 * search, which is why Enter stays off there unless a placement says otherwise.
 */
const PhiDialogBodyContext = createContext(false);

export function PhiDialogBodyProvider({ children }: { children: ReactNode }) {
  return <PhiDialogBodyContext.Provider value>{children}</PhiDialogBodyContext.Provider>;
}

export function usePhiInDialogBody() {
  return useContext(PhiDialogBodyContext);
}
