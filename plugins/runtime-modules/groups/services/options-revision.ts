"use client";

import { createPhiOptionsRevisionStore } from "../../../../components/controls/phi-options-revision";

/**
 * What the Groups options providers read, and what says it has changed.
 *
 * One store for the Module rather than one per provider: creating a group changes the group lists, and
 * a membership write changes which groups this actor manages, so the three providers go stale together
 * more often than apart. Every writing path -- the Table's own mutations and the Controller, which is
 * where a Form's success already arrives -- announces through this.
 */
export const PHI_GROUPS_OPTIONS_REVISION = createPhiOptionsRevisionStore();
