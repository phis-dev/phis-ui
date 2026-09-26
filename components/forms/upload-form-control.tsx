"use client";

import { useMemo, useRef, useState } from "react";

import { PhiMediaKind } from "../../constants/media";
import type { PhiMediaKindValue } from "../../types/media";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiFileDropControl } from "../controls/phi-file-drop-control";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiProgressControl } from "../controls/phi-progress-control";
import { PhiTagControl } from "../controls/phi-tag-control";
import { PhiTypographyControl } from "../controls/phi-typography-control";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  usePhiMediaUpload,
  type PhiMediaUploadLabels,
} from "../media/phi-media-upload";
import { PHI_FORM_UPLOAD_LABEL_KEYS } from "./form-provider-contract";
import type { PhiFormFieldProviderProps } from "./form-provider-registry";

const DEFAULT_TRIGGER_LABEL = "Choose a file";
const DEFAULT_TOO_MANY_LABEL = "No more files fit here.";

const MEDIA_KINDS = new Set<string>(Object.values(PhiMediaKind));

/**
 * What the Form value is: the Media Asset ids the finished uploads left behind.
 *
 * Exported because a handler and a test read the same shape, and because the one thing a caller must not
 * do is guess it from a sample payload.
 */
export function readPhiFormUploadAssetIds(value: unknown): readonly number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is number => typeof entry === "number" && Number.isInteger(entry) && entry > 0,
  );
}

type PhiUploadFieldSettings = {
  kinds: readonly PhiMediaKindValue[] | undefined;
  maxFiles: number | null;
  maxBytes: number | undefined;
  space: string | null;
};

/**
 * The field's own narrowing of what the Site allows.
 *
 * An unknown kind is dropped rather than normalized: `normalizePhiMediaKind` answers "other" for anything
 * it does not recognize, which on a declaration would silently turn a typo into the catch-all and accept
 * more than the Form asked for.
 */
function readUploadSettings(config: Readonly<Record<string, unknown>> | undefined): PhiUploadFieldSettings {
  const declaredKinds = Array.isArray(config?.kinds)
    ? config.kinds.filter((entry): entry is PhiMediaKindValue =>
        typeof entry === "string" && MEDIA_KINDS.has(entry))
    : [];
  const maxFiles = typeof config?.maxFiles === "number" && config.maxFiles >= 1
    ? Math.trunc(config.maxFiles)
    : null;
  const maxBytes = typeof config?.maxBytes === "number" && config.maxBytes >= 1
    ? Math.trunc(config.maxBytes)
    : undefined;
  const space = typeof config?.space === "string" && config.space.trim() ? config.space.trim() : null;
  return { kinds: declaredKinds.length === 0 ? undefined : declaredKinds, maxFiles, maxBytes, space };
}

function resolveUploadLabels(labels: Readonly<Record<string, string>> | undefined): PhiMediaUploadLabels {
  const read = (key: string, fallback: string) => labels?.[key]?.trim() || fallback;
  return {
    errorGeneric: read(PHI_FORM_UPLOAD_LABEL_KEYS.errorGeneric, PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorGeneric),
    errorNetwork: read(PHI_FORM_UPLOAD_LABEL_KEYS.errorNetwork, PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorNetwork),
    errorTooLarge: read(PHI_FORM_UPLOAD_LABEL_KEYS.errorTooLarge, PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorTooLarge),
    errorDuplicate: read(PHI_FORM_UPLOAD_LABEL_KEYS.errorDuplicate, PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorDuplicate),
    errorTypeNotAllowed: read(
      PHI_FORM_UPLOAD_LABEL_KEYS.errorTypeNotAllowed,
      PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorTypeNotAllowed,
    ),
    errorQuotaExceeded: read(
      PHI_FORM_UPLOAD_LABEL_KEYS.errorQuotaExceeded,
      PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorQuotaExceeded,
    ),
    errorSpaceUnavailable: read(
      PHI_FORM_UPLOAD_LABEL_KEYS.errorSpaceUnavailable,
      PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorSpaceUnavailable,
    ),
    errorStorageUnreachable: read(
      PHI_FORM_UPLOAD_LABEL_KEYS.errorStorageUnreachable,
      PHI_MEDIA_UPLOAD_DEFAULT_LABELS.errorStorageUnreachable,
    ),
  };
}

/**
 * The shared upload field Control: attach a file, watch it arrive, take it back out again.
 *
 * It owns no value of its own. Every upload that finishes appends its Asset id to the Form value and
 * every removal takes one out, which is what keeps `required`, a reset and a re-render honest -- the same
 * arrangement the compound Table field uses for the same reason. What it does keep locally is the part
 * that is not a value: the transfer in progress and the sentence that a refusal produced.
 *
 * Emptiness is `undefined` rather than `[]`. Ant Design's required rule accepts an empty array, so a
 * Form asking for a mandatory attachment would submit without one.
 *
 * The file name comes from the upload that is still in this Control's hands. An id that arrived as an
 * initial value has no name here, and inventing one would mean reading the Media Asset -- a second
 * contract inside a field provider, which is not this Control's to open.
 */
export function PhiUploadFormControl({
  field,
  value,
  onChange,
  placeholder,
  labels,
  disabled,
  readOnly,
  formContext,
}: PhiFormFieldProviderProps) {
  const settings = useMemo(() => readUploadSettings(field.config), [field.config]);
  const uploadLabels = useMemo(() => resolveUploadLabels(labels), [labels]);
  const [refusal, setRefusal] = useState<string | null>(null);
  const assetIds = readPhiFormUploadAssetIds(value);

  const inFlight = useRef(0);

  /*
   * The value as the Form holds it this instant, rather than as this render received it.
   *
   * Two files chosen at once finish independently, and a handler appending to the list its own render
   * started from would drop the other one's id. The Form store answers synchronously and is what
   * `formContext` exists for, so the second upload appends to the first one's result without either of
   * them keeping a copy. A host that renders a field Provider outside `PhiFormControl` passes no context;
   * there the render's value is all there is, and one upload at a time is all that holds.
   */
  const readAssetIdsNow = () =>
    formContext ? readPhiFormUploadAssetIds(formContext.getValues()[field.key]) : assetIds;

  const commit = (next: readonly number[]) => onChange?.(next.length === 0 ? undefined : [...next]);

  const acceptance = useMemo(
    () => ({ kinds: settings.kinds, maxBytes: settings.maxBytes, multiple: settings.maxFiles !== 1 }),
    [settings],
  );
  const initOptions = useMemo(() => ({ spaceAddress: settings.space }), [settings]);

  const { accept, items, upload } = usePhiMediaUpload({
    labels: uploadLabels,
    acceptance,
    initOptions,
    onUploaded: (asset) => {
      setRefusal(null);
      commit([...readAssetIdsNow(), asset.id]);
    },
    onRejected: (message) => setRefusal(message),
  });

  const nameByAssetId = new Map(
    items
      .filter((item) => item.assetId != null)
      .map((item) => [item.assetId as number, item.file.name] as const),
  );
  const transferring = items.filter((item) => item.status === "uploading");
  const full = settings.maxFiles != null && assetIds.length >= settings.maxFiles;

  return (
    <PhiFlexControl vertical gap="small">
      {assetIds.length === 0 ? null : (
        <PhiFlexControl wrap gap="small">
          {assetIds.map((assetId) => (
            <PhiTagControl
              key={assetId}
              closable={!disabled && !readOnly}
              onClose={() => commit(readAssetIdsNow().filter((entry) => entry !== assetId))}
            >
              {nameByAssetId.get(assetId) ?? `#${assetId}`}
            </PhiTagControl>
          ))}
        </PhiFlexControl>
      )}
      {transferring.map((item) => (
        <PhiProgressControl key={item.localId} percent={Math.round(item.progress)} size="small" />
      ))}
      {readOnly ? null : (
        <PhiFileDropControl
          accept={accept}
          multiple={settings.maxFiles !== 1}
          disabled={disabled || full}
          onFile={(file) => {
            /*
             * Counted rather than read off the items, because a multiple selection arrives file by file
             * within one tick and no state has moved yet when the second one is offered.
             */
            if (settings.maxFiles != null && readAssetIdsNow().length + inFlight.current >= settings.maxFiles) {
              setRefusal(labels?.[PHI_FORM_UPLOAD_LABEL_KEYS.tooMany]?.trim() || DEFAULT_TOO_MANY_LABEL);
              return;
            }
            inFlight.current += 1;
            void upload(file).finally(() => {
              inFlight.current -= 1;
            });
          }}
        >
          <PhiButtonControl
            label={placeholder?.trim()
              || labels?.[PHI_FORM_UPLOAD_LABEL_KEYS.trigger]?.trim()
              || DEFAULT_TRIGGER_LABEL}
            disabled={disabled || full}
            onClick={() => {}}
          />
        </PhiFileDropControl>
      )}
      {refusal ? <PhiTypographyControl type="danger">{refusal}</PhiTypographyControl> : null}
    </PhiFlexControl>
  );
}
