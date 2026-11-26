"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PhisCdnAdminFileV1 } from "@phis/contracts/addon";

import {
  PhiFormControl,
  type PhiFormControlFormInstance,
} from "../../../../../components/controls/phi-form-control";
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
import type { PhiFormDescriptor } from "../../../../../types/form-descriptor";
import { writePhiCdnArchBits, writePhiCdnOsBits } from "../../platform";
import { PHI_CDN_UPLOAD_DISCARD, createPhiCdnUploadTarget } from "../../services/upload";
import {
  PHI_CDN_UPLOAD_EMPTY_DRAFT,
  PHI_CDN_UPLOAD_FIELD_KEYS,
  isPhiCdnUploadDraftComplete,
  readPhiCdnUploadDraft,
  readPhiCdnUploadDraftFromFile,
  type PhiCdnUploadDraft,
} from "../../upload-fields";
import type { PhiCdnUploadWidgetConfig } from "./config";
import type { PhiCdnUploadWidgetLabels } from "./label-types";

/**
 * The CDN's upload: the Media library's upload surface (`PhiAreaUploadBinding`) with the CDN as its
 * target. The surface draws the drop area, the file on its way with its progress, its refusal and its
 * retry, and stops it when the dialog closes; what is the CDN's is in front of the file -- the name, the
 * version, the file name and the platform the file is published under, the fields of the registered
 * upload Form (`forms.ts`) drawn by `PhiFormControl` -- and where it goes.
 *
 * The Form is never submitted: the surface's Upload sends the held file with what the Form holds, and is
 * enabled once that is what Core takes (`isPhiCdnUploadDraftComplete`, the descriptor's rules).
 */

type Draft = PhiCdnUploadDraft;

/** What the Form starts with, every field empty -- one object, so the Form never takes it for new values. */
const EMPTY_FORM_VALUES: Record<string, unknown> = { ...PHI_CDN_UPLOAD_EMPTY_DRAFT, [PHI_CDN_UPLOAD_FIELD_KEYS.heldFile]: "" };

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
    const stored = JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    const entry = stored[fileIdentity(file)];
    return entry && typeof entry === "object" ? readPhiCdnUploadDraft(entry as Record<string, unknown>) : null;
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

export type PhiCdnUploadWidgetClientProps = {
  config?: PhiCdnUploadWidgetConfig;
  labels: PhiCdnUploadWidgetLabels;
  /** The Media upload surface's own words. */
  uploadLabels: PhiAreaUploadWidgetLabels;
  /** The registered upload Form (`forms.ts`) and its words, read on the server in the page's language. */
  form: { descriptor: PhiFormDescriptor; labels: Readonly<Record<string, string>> };
};

function ignoreSubmit() {
  // Nothing submits this Form: the surface's Upload sends the file with what it holds.
}

export function PhiCdnUploadWidgetClient({ config, labels, uploadLabels, form }: PhiCdnUploadWidgetClientProps) {
  const emitRoutes = useMemo(() => config?.signalRoutes?.emits ?? [], [config?.signalRoutes?.emits]);
  const emitSignal = usePhiSignalEmitter();
  const [draft, setDraft] = useState<Draft>(PHI_CDN_UPLOAD_EMPTY_DRAFT);
  // The draft the runner sends with, read when it starts rather than captured when it was made.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  /*
   * The Form of the next file. Mounted anew once one was published, so it starts empty and its Name reads
   * the catalogue again -- the name just used is then among its choices.
   */
  const [formGeneration, setFormGeneration] = useState(0);
  const formRef = useRef<PhiFormControlFormInstance | null>(null);
  const onFormReady = useCallback((instance: PhiFormControlFormInstance) => {
    formRef.current = instance;
  }, []);
  const onValuesChange = useCallback((_changed: Record<string, unknown>, all: Record<string, unknown>) => {
    setDraft(readPhiCdnUploadDraft(all));
  }, []);

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
    ready: isPhiCdnUploadDraftComplete(draft),
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
    /*
     * The fields start from the picked file -- what it was started with before, or its name and the
     * platform its name states -- and say at once what is still missing, as they did when every problem
     * stood under its field from the moment a file was held.
     */
    onFilePicked: (file) => {
      const next = readStoredDraft(file) ?? readPhiCdnUploadDraftFromFile(file.name, draftRef.current.name);
      setDraft(next);
      const instance = formRef.current;
      if (!instance) return;
      instance.setFieldsValue({ ...next, [PHI_CDN_UPLOAD_FIELD_KEYS.heldFile]: file.name });
      void instance.validateFields().catch(() => undefined);
    },
    onUploaded: () => {
      setDraft(PHI_CDN_UPLOAD_EMPTY_DRAFT);
      setFormGeneration((generation) => generation + 1);
      emitPhiSignalCapability(emitSignal, emitRoutes, "uploaded", null);
    },
    renderFields: ({ uploading }) => (
      <PhiFormControl
        key={formGeneration}
        descriptor={form.descriptor}
        labels={form.labels}
        initialValues={EMPTY_FORM_VALUES}
        submitOnEnter={false}
        disabled={uploading}
        onFormReady={onFormReady}
        onValuesChange={onValuesChange}
        onSubmit={ignoreSubmit}
      />
    ),
  }), [draft, emitRoutes, emitSignal, form, formGeneration, labels, onFormReady, onValuesChange, runSession]);

  return (
    <PhiAreaUploadBinding
      labels={uploadLabels}
      showFinished={false}
      config={{ allowDelete: false, multiple: false, accept: "*/*" }}
      moduleTarget={moduleTarget}
    />
  );
}
