"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PHIS_CDN_KEY_SEGMENT_PATTERN,
  PHIS_CDN_KEY_VERSION_PATTERN,
} from "@phis/contracts/addon";

import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiCheckboxGroupControl } from "../../../../../components/controls/phi-checkbox-group-control";
import { PhiFileDropControl } from "../../../../../components/controls/phi-file-drop-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiLabeledControl } from "../../../../../components/controls/phi-labeled-control";
import { PhiProgressControl } from "../../../../../components/controls/phi-progress-control";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiStepsControl } from "../../../../../components/controls/phi-steps-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import {
  emitPhiSignalCapability,
  usePhiSignalEmitter,
} from "../../../../../components/runtime/runtime-signal-identity";
import { formatPhiTranslation } from "../../../../../helpers/translation-format";
import {
  PHI_CDN_ARCH_KEYS,
  PHI_CDN_OS_KEYS,
  guessPhiCdnPlatform,
  readPhiCdnArchKeys,
  readPhiCdnOsKeys,
  writePhiCdnArchBits,
  writePhiCdnOsBits,
} from "../../platform";
import { formatPhiCdnBytes } from "../../bytes";
import { usePhiIntlLocale } from "../../../../../components/root/phi-intl-locale";
import {
  PHI_CDN_UPLOAD_DISCARD,
  PhiCdnUploadError,
  loadPhiCdnNames,
  runPhiCdnUpload,
  type PhiCdnUploadProgress,
} from "../../services/upload";
import type { PhiCdnUploadWidgetConfig } from "./config";
import type { PhiCdnUploadWidgetLabels } from "./label-types";

type Draft = { name: string; version: string; fileName: string; os: string[]; arch: string[] };

type Run =
  | { phase: "idle" }
  | { phase: "running"; progress: PhiCdnUploadProgress }
  | { phase: "published"; key: string }
  | { phase: "failed"; message: string };

/*
 * What a file was last started with, remembered in this browser by the file's name, size and date, so
 * picking the same file after a reload fills the fields it was started with -- the same key, the same
 * size and the same digests are what make Core answer with the open session and its parts. A convenience
 * of this browser only; without storage the fields start from the file name as usual.
 */
/** The three text fields as wide as the dialog, the label beside each (`PhiLabeledControl`'s `fill`). */
const FIELD_STYLE = { width: "100%" } as const;

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

function draftFromFile(file: File): Draft {
  const platform = guessPhiCdnPlatform(file.name);
  return {
    name: "",
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

function readFailure(error: unknown, labels: PhiCdnUploadWidgetLabels) {
  if (error instanceof PhiCdnUploadError && error.code === "checksum-unavailable") return labels.checksumUnavailable;
  return error instanceof Error && error.message ? error.message : labels.failed;
}

export type PhiCdnUploadWidgetClientProps = {
  config?: PhiCdnUploadWidgetConfig;
  labels: PhiCdnUploadWidgetLabels;
};

export function PhiCdnUploadWidgetClient({ config, labels }: PhiCdnUploadWidgetClientProps) {
  const locale = usePhiIntlLocale();
  const emitRoutes = useMemo(() => config?.signalRoutes?.emits ?? [], [config?.signalRoutes?.emits]);
  const emitSignal = usePhiSignalEmitter();
  const [names, setNames] = useState<readonly string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", version: "", fileName: "", os: [], arch: [] });
  const [touched, setTouched] = useState(false);
  const [run, setRun] = useState<Run>({ phase: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    void loadPhiCdnNames(abort.signal).then(setNames, () => undefined);
    return () => abort.abort();
  }, []);

  // Leaving the dialog stops the upload and keeps the session, so the same file picked again resumes it.
  useEffect(() => () => controller.current?.abort(), []);

  const problems = {
    name: readPhiCdnSegmentProblem(draft.name, "name", labels),
    version: readPhiCdnSegmentProblem(draft.version, "version", labels),
    fileName: readPhiCdnSegmentProblem(draft.fileName, "fileName", labels),
  };
  const ready = file !== null && !problems.name && !problems.version && !problems.fileName;
  const running = run.phase === "running";

  const pick = useCallback((next: File) => {
    setFile(next);
    setTouched(false);
    setRun({ phase: "idle" });
    setDraft(readStoredDraft(next) ?? draftFromFile(next));
  }, []);

  const start = useCallback(async () => {
    setTouched(true);
    if (!file || !ready) return;
    const abort = new AbortController();
    controller.current = abort;
    const input = {
      file,
      name: draft.name.trim(),
      version: draft.version.trim(),
      fileName: draft.fileName.trim(),
      os: writePhiCdnOsBits(draft.os),
      arch: writePhiCdnArchBits(draft.arch),
    };
    storeDraft(file, { ...draft, name: input.name, version: input.version, fileName: input.fileName });
    setRun({ phase: "running", progress: { stage: "checksum" } });
    try {
      const published = await runPhiCdnUpload(input, {
        signal: abort.signal,
        onProgress: (progress) => setRun({ phase: "running", progress }),
      });
      storeDraft(file, null);
      setRun({ phase: "published", key: published.key });
      emitPhiSignalCapability(emitSignal, emitRoutes, "uploaded", null);
    } catch (error) {
      if (abort.signal.aborted) {
        if (abort.signal.reason === PHI_CDN_UPLOAD_DISCARD) storeDraft(file, null);
        setRun({ phase: "idle" });
        return;
      }
      setRun({ phase: "failed", message: readFailure(error, labels) });
    } finally {
      if (controller.current === abort) controller.current = null;
    }
  }, [draft, emitRoutes, emitSignal, file, labels, ready]);

  const cancel = useCallback(() => controller.current?.abort(PHI_CDN_UPLOAD_DISCARD), []);

  const reset = useCallback(() => {
    setFile(null);
    setTouched(false);
    setDraft({ name: "", version: "", fileName: "", os: [], arch: [] });
    setRun({ phase: "idle" });
    void loadPhiCdnNames().then(setNames, () => undefined);
  }, []);

  const nameOptions = useMemo(() => names.map((name) => ({ value: name, label: name })), [names]);
  const osOptions = useMemo(() => PHI_CDN_OS_KEYS.map(([key]) => ({ value: key, label: labels.osNames[key] })), [labels.osNames]);
  const archOptions = useMemo(() => PHI_CDN_ARCH_KEYS.map(([key]) => ({ value: key, label: labels.archNames[key] })), [labels.archNames]);
  const problemOf = (key: keyof typeof problems) => (touched ? problems[key] : null);

  if (run.phase === "published") {
    return (
      <PhiFlexControl vertical gap={12}>
        <PhiAlertControl level="success" showIcon title={formatPhiTranslation(labels.published, [run.key])} />
        <PhiFlexControl justify="flex-end">
          <PhiButtonControl label={labels.another} icon={<PhiIcon name="upload" />} onClick={reset} />
        </PhiFlexControl>
      </PhiFlexControl>
    );
  }

  const stage = run.phase === "running" ? run.progress.stage : null;
  const progress = run.phase === "running" && run.progress.stage === "uploading" ? run.progress : null;
  const current = stage === "checksum" ? 0 : stage === "uploading" ? 1 : 2;

  return (
    <PhiFlexControl vertical gap={12}>
      <PhiFileDropControl dropZone disabled={running} onFile={pick}>
        <PhiFlexControl vertical align="center" gap={4}>
          <PhiIcon name="cloud-upload" size={24} />
          <PhiTypographyControl>{file ? `${file.name} (${formatPhiCdnBytes(file.size, locale)})` : labels.fileDrop}</PhiTypographyControl>
        </PhiFlexControl>
      </PhiFileDropControl>
      <PhiSelectControl
        label={labels.name}
        description={problemOf("name") ?? labels.nameHint}
        presentation="autocomplete"
        allowCustom
        style={FIELD_STYLE}
        value={draft.name}
        options={nameOptions}
        disabled={running}
        onChange={(name) => setDraft((previous) => ({ ...previous, name: typeof name === "string" ? name : "" }))}
      />
      <PhiTextControl
        label={labels.version}
        style={FIELD_STYLE}
        description={problemOf("version") ?? undefined}
        value={draft.version}
        disabled={running}
        onChange={(version) => setDraft((previous) => ({ ...previous, version: version ?? "" }))}
      />
      <PhiTextControl
        label={labels.fileFileName}
        style={FIELD_STYLE}
        description={problemOf("fileName") ?? undefined}
        value={draft.fileName}
        disabled={running || !file}
        onChange={(fileName) => setDraft((previous) => ({ ...previous, fileName: fileName ?? "" }))}
      />
      <PhiLabeledControl label={labels.os}>
        <PhiCheckboxGroupControl
          value={draft.os}
          options={osOptions}
          disabled={running}
          onChange={(os) => setDraft((previous) => ({ ...previous, os: [...os] }))}
        />
      </PhiLabeledControl>
      <PhiLabeledControl label={labels.arch}>
        <PhiCheckboxGroupControl
          value={draft.arch}
          options={archOptions}
          disabled={running}
          onChange={(arch) => setDraft((previous) => ({ ...previous, arch: [...arch] }))}
        />
      </PhiLabeledControl>
      {stage ? (
        <PhiFlexControl vertical gap={8}>
          <PhiStepsControl
            current={current}
            size="small"
            items={[
              { key: "checksum", title: labels.steps.checksum },
              { key: "upload", title: labels.steps.upload },
              { key: "verify", title: labels.steps.verify },
            ]}
          />
          {progress ? (
            <PhiProgressControl percent={progress.totalBytes > 0 ? Math.floor((progress.loadedBytes / progress.totalBytes) * 100) : 100} />
          ) : null}
          {progress && progress.resumedParts > 0 ? (
            <PhiTypographyControl type="secondary">
              {formatPhiTranslation(labels.resumed, [progress.resumedParts, progress.partCount])}
            </PhiTypographyControl>
          ) : null}
        </PhiFlexControl>
      ) : null}
      {run.phase === "failed" ? <PhiAlertControl level="error" showIcon title={labels.failed} description={run.message} /> : null}
      <PhiFlexControl justify="flex-end" gap={8}>
        {running ? <PhiButtonControl label={labels.cancel} onClick={cancel} /> : null}
        <PhiButtonControl
          type="primary"
          label={run.phase === "failed" ? labels.retry : labels.start}
          icon={<PhiIcon name="upload" />}
          loading={running}
          disabled={!file || running}
          onClick={() => void start()}
        />
      </PhiFlexControl>
    </PhiFlexControl>
  );
}
