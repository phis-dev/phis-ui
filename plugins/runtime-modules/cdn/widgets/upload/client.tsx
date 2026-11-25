"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PHIS_CDN_KEY_SEGMENT_PATTERN,
  PHIS_CDN_KEY_VERSION_PATTERN,
  type PhisCdnAdminFileV1,
} from "@phis/contracts/addon";

import { PhiCheckboxGroupControl } from "../../../../../components/controls/phi-checkbox-group-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiLabeledControl } from "../../../../../components/controls/phi-labeled-control";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import {
  PhiAreaUploadBinding,
  type PhiAreaUploadModuleTarget,
} from "../../../../../components/media/phi-area-upload-widget";
import type { PhiAreaUploadWidgetLabels } from "../../../../../components/media/media-widget-labels";
import {
  PhiMediaUploadError,
  runPhiUploadSession,
} from "../../../../../components/media/media-upload-flow";
import {
  emitPhiSignalCapability,
  usePhiSignalEmitter,
} from "../../../../../components/runtime/runtime-signal-identity";
import {
  PHI_CDN_ARCH_KEYS,
  PHI_CDN_OS_KEYS,
  guessPhiCdnPlatform,
  readPhiCdnArchKeys,
  readPhiCdnOsKeys,
  writePhiCdnArchBits,
  writePhiCdnOsBits,
} from "../../platform";
import {
  PHI_CDN_UPLOAD_DISCARD,
  createPhiCdnUploadTarget,
  loadPhiCdnNames,
} from "../../services/upload";
import type { PhiCdnUploadWidgetConfig } from "./config";
import type { PhiCdnUploadWidgetLabels } from "./label-types";

/**
 * The CDN's upload: the Media library's upload surface (`PhiAreaUploadBinding`) with the CDN as its
 * target. The surface draws the drop area, the file on its way with its progress, its refusal and its
 * retry, and stops it when the dialog closes; what is the CDN's is in front of the file -- the name, the
 * version, the file name and the platform the file is published under -- and where it goes.
 */

type Draft = { name: string; version: string; fileName: string; os: string[]; arch: string[] };

const EMPTY_DRAFT: Draft = { name: "", version: "", fileName: "", os: [], arch: [] };

/** The three text fields as wide as the dialog, the label beside each (`PhiLabeledControl`'s `fill`). */
const FIELD_STYLE = { width: "100%" } as const;

/*
 * What a file was last started with, remembered in this browser by the file's name, size and date, so
 * picking the same file after a reload fills the fields it was started with -- the same key, size and
 * digests are what make Core answer with the open session and its parts. A convenience of this browser
 * only; without storage the fields start from the file name as usual.
 */
const DRAFT_STORAGE_KEY = "phi-cdn-upload-drafts";

function fileIdentity(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function readStoredDraft(file: File): Draft | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}") as Record<string, Draft>;
    return stored[fileIdentity(file)] ?? null;
  } catch {
    return null;
  }
}

function storeDraft(file: File, draft: Draft | null) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}") as Record<string, Draft>;
    if (draft) stored[fileIdentity(file)] = draft;
    else delete stored[fileIdentity(file)];
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage refused: nothing is remembered, and the upload is not affected.
  }
}

function draftFromFile(file: File, name: string): Draft {
  const platform = guessPhiCdnPlatform(file.name);
  return {
    name,
    version: "",
    fileName: file.name,
    os: readPhiCdnOsKeys(platform.os),
    arch: readPhiCdnArchKeys(platform.arch),
  };
}

/** What is wrong with one segment as the person typed it, before Core is asked; null where nothing is. */
export function readPhiCdnSegmentProblem(
  value: string,
  kind: "name" | "version" | "fileName",
  labels: Pick<PhiCdnUploadWidgetLabels, "required" | "invalidSegment" | "invalidVersion" | "reservedName">,
) {
  const trimmed = value.trim();
  if (!trimmed) return labels.required;
  if (kind === "version") return PHIS_CDN_KEY_VERSION_PATTERN.test(trimmed) ? null : labels.invalidVersion;
  if (!PHIS_CDN_KEY_SEGMENT_PATTERN.test(trimmed)) return labels.invalidSegment;
  return kind === "name" && trimmed === "api" ? labels.reservedName : null;
}

export type PhiCdnUploadWidgetClientProps = {
  config?: PhiCdnUploadWidgetConfig;
  labels: PhiCdnUploadWidgetLabels;
  /** The Media upload surface's own words. */
  uploadLabels: PhiAreaUploadWidgetLabels;
};

export function PhiCdnUploadWidgetClient({ config, labels, uploadLabels }: PhiCdnUploadWidgetClientProps) {
  const emitRoutes = useMemo(() => config?.signalRoutes?.emits ?? [], [config?.signalRoutes?.emits]);
  const emitSignal = usePhiSignalEmitter();
  const [names, setNames] = useState<readonly string[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  // The draft the runner sends with, read when it starts rather than captured when it was made.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    const abort = new AbortController();
    void loadPhiCdnNames(abort.signal).then(setNames, () => undefined);
    return () => abort.abort();
  }, []);

  const problems = {
    name: readPhiCdnSegmentProblem(draft.name, "name", labels),
    version: readPhiCdnSegmentProblem(draft.version, "version", labels),
    fileName: readPhiCdnSegmentProblem(draft.fileName, "fileName", labels),
  };

  const runSession = useCallback<PhiAreaUploadModuleTarget<PhisCdnAdminFileV1>["runSession"]>(
    async (file, onProgress, _options, signal, onPhase) => {
      const current = draftRef.current;
      const input = {
        name: current.name.trim(),
        version: current.version.trim(),
        fileName: current.fileName.trim(),
        os: writePhiCdnOsBits(current.os),
        arch: writePhiCdnArchBits(current.arch),
      };
      storeDraft(file, { ...current, name: input.name, version: input.version, fileName: input.fileName });
      try {
        const published = await runPhiUploadSession(createPhiCdnUploadTarget(input), file, {
          ...(onProgress ? { onProgress } : {}),
          ...(onPhase ? { onPhase } : {}),
          ...(signal ? { signal } : {}),
        });
        storeDraft(file, null);
        return { asset: published };
      } catch (error) {
        if (signal?.aborted && signal.reason === PHI_CDN_UPLOAD_DISCARD) storeDraft(file, null);
        throw error;
      }
    },
    [],
  );

  const moduleTarget = useMemo<PhiAreaUploadModuleTarget<PhisCdnAdminFileV1>>(() => ({
    ready: !problems.name && !problems.version && !problems.fileName,
    startLabel: labels.start,
    cancelLabel: labels.cancel,
    cancelReason: PHI_CDN_UPLOAD_DISCARD,
    phaseLabels: { checksum: labels.steps.checksum, finish: labels.steps.verify },
    runSession,
    readError: (error) => {
      if (error instanceof PhiMediaUploadError && error.code === "checksum-unavailable") return labels.checksumUnavailable;
      // Core words its refusals for a person (`{ error, message }`); a transport failure says what failed.
      return error instanceof PhiMediaUploadError && error.message ? error.message : null;
    },
    onFilePicked: (file) => setDraft((previous) => readStoredDraft(file) ?? draftFromFile(file, previous.name)),
    onUploaded: () => {
      setDraft(EMPTY_DRAFT);
      void loadPhiCdnNames().then(setNames, () => undefined);
      emitPhiSignalCapability(emitSignal, emitRoutes, "uploaded", null);
    },
    renderFields: ({ file, uploading }) => (
      <PhiFlexControl vertical gap={12}>
        <PhiSelectControl
          label={labels.name}
          description={(file && problems.name) || labels.nameHint}
          presentation="autocomplete"
          allowCustom
          style={FIELD_STYLE}
          value={draft.name}
          options={names.map((name) => ({ value: name, label: name }))}
          disabled={uploading}
          onChange={(name) => setDraft((previous) => ({ ...previous, name: typeof name === "string" ? name : "" }))}
        />
        <PhiTextControl
          label={labels.version}
          style={FIELD_STYLE}
          description={(file && problems.version) || undefined}
          value={draft.version}
          disabled={uploading}
          onChange={(version) => setDraft((previous) => ({ ...previous, version: version ?? "" }))}
        />
        <PhiTextControl
          label={labels.fileFileName}
          style={FIELD_STYLE}
          description={(file && problems.fileName) || undefined}
          value={draft.fileName}
          disabled={uploading || !file}
          onChange={(fileName) => setDraft((previous) => ({ ...previous, fileName: fileName ?? "" }))}
        />
        <PhiLabeledControl label={labels.os}>
          <PhiCheckboxGroupControl
            value={draft.os}
            options={PHI_CDN_OS_KEYS.map(([key]) => ({ value: key, label: labels.osNames[key] }))}
            disabled={uploading}
            onChange={(os) => setDraft((previous) => ({ ...previous, os: [...os] }))}
          />
        </PhiLabeledControl>
        <PhiLabeledControl label={labels.arch}>
          <PhiCheckboxGroupControl
            value={draft.arch}
            options={PHI_CDN_ARCH_KEYS.map(([key]) => ({ value: key, label: labels.archNames[key] }))}
            disabled={uploading}
            onChange={(arch) => setDraft((previous) => ({ ...previous, arch: [...arch] }))}
          />
        </PhiLabeledControl>
      </PhiFlexControl>
    ),
  }), [draft, emitRoutes, emitSignal, labels, names, problems.fileName, problems.name, problems.version, runSession]);

  return (
    <PhiAreaUploadBinding
      labels={uploadLabels}
      showFinished={false}
      config={{ allowDelete: false, multiple: false, accept: "*/*" }}
      moduleTarget={moduleTarget}
    />
  );
}
