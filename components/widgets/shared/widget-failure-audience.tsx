"use client";

import { createContext, useContext, type ReactNode } from "react";

/*
 * Whether the person looking at a live page is Staff, for the one question a live page asks it: does a
 * Widget that failed say so (`widget-failure.tsx`)?
 *
 * Decided once, on the server, by the Area's boundary from the viewer it already resolved
 * (`canPhiViewerReadWidgetFailures`), and handed down here: no request asks for it, and a Widget does
 * not have to carry the viewer to know. Absent -- a page outside an Area boundary, a test -- it is a
 * visitor, who is shown nothing. A Public page rendered once for everybody is rendered for a visitor; a
 * signed-in viewer is never served that render (STATIC_RENDERING.md), so Staff get theirs.
 */
const PhiWidgetFailureStaffContext = createContext(false);

export function PhiWidgetFailureAudienceProvider({ staff, children }: { staff: boolean; children: ReactNode }) {
  return <PhiWidgetFailureStaffContext.Provider value={staff}>{children}</PhiWidgetFailureStaffContext.Provider>;
}

/** That the viewer is Staff, who read a Widget's failure on a live page too. */
export function usePhiWidgetFailureStaff() {
  return useContext(PhiWidgetFailureStaffContext);
}
