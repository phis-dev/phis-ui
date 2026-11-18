"use client";

import type { PhiMediaSourceClientDefinition } from "../../../types/media-source";

/**
 * The first-party media sources: none. No Module of ours offers a source; one comes from a Module
 * package of a Site (`mediaSources` of its client contributions) or from an Add-on on the server.
 */
export const PHI_CORE_MEDIA_SOURCE_CLIENT_DEFINITIONS = [] as const satisfies readonly PhiMediaSourceClientDefinition[];
