import { createPhiFormLabelSetLoader } from "../../../components/forms/shared-form-loaders";
import type { PhiFormDescriptor, PhiFormFieldDescriptor } from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { phiFormLabel as label } from "../../../components/forms/form-descriptor-text";
import { PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS, PHI_CDN_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CDN_ARCH_KEYS, PHI_CDN_OS_KEYS, type PhiCdnArchKey, type PhiCdnOsKey } from "./platform";
import { PHI_CDN_UPLOAD_FIELD_KEYS, PHI_CDN_UPLOAD_PATTERN_SOURCES } from "./upload-fields";

export const PHI_CDN_FORM_IDS = {
  upload: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "cdn/upload"),
} as const;

const UPLOAD_LABEL_SET_KEY = "@phis/ui/modules/cdn/labels/upload" as const;

/** The source words of the platform choices, as the upload widget's Label Set has them. */
const OS_NAMES: Readonly<Record<PhiCdnOsKey, string>> = {
  linux: "Linux",
  windows: "Windows",
  macos: "macOS",
  android: "Android",
  ios: "iOS and iPadOS",
  chromeos: "ChromeOS",
  other: "Other",
};

const ARCH_NAMES: Readonly<Record<PhiCdnArchKey, string>> = {
  x64: "x64",
  arm64: "arm64",
  x86: "x86",
  arm32: "arm32",
  riscv64: "RISC-V 64",
};

function pattern(source: string, key: string, fallback: string) {
  return {
    providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.pattern,
    message: label(key, fallback),
    config: { source, flags: "u" },
  };
}

const REQUIRED = label("required", "Required.");

/** Required, and not spaces only: the upload sends the segment trimmed. */
function presentRules() {
  return [
    { providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required, message: REQUIRED },
    pattern(PHI_CDN_UPLOAD_PATTERN_SOURCES.blank, REQUIRED.key, REQUIRED.fallback),
  ];
}

const INVALID_SEGMENT = [
  PHI_CDN_UPLOAD_PATTERN_SOURCES.segment,
  "invalidSegment",
  "Letters, digits and . _ + ~ - only, no slash, and not starting with a dot or a tilde.",
] as const;

/**
 * The CDN's upload: what a file is published under -- its name, version and file name, the three
 * segments of its address -- and the platform it is for. A registered Form, so its fields stand where the
 * Form's template puts them (FORMS.md, "A field draws no label layout of its own"), and drawn by the
 * `cdn-upload` widget in front of the file it holds (`PhiFormControl`), because what sends it is the
 * Media library's upload surface and not a handler: the bytes are divided, hashed and sent from the
 * browser before anything could be submitted. So the Form has no handler and no submit; its values are
 * what the widget sends to Core's `POST /api/site/admin/cdn/uploads`.
 *
 * The rules are Core's (`PHIS_CDN_KEY_SEGMENT_PATTERN`, `PHIS_CDN_KEY_VERSION_PATTERN`, `api` reserved),
 * each refusal its own sentence; the widget's Upload stays disabled on the same rules
 * (`isPhiCdnUploadDraftComplete`). OS and architecture start from the picked file's name and are a guess
 * the person corrects.
 */
const uploadFields: PhiFormFieldDescriptor[] = [
  { key: PHI_CDN_UPLOAD_FIELD_KEYS.heldFile, fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
  {
    key: PHI_CDN_UPLOAD_FIELD_KEYS.name,
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
    label: label("name", "Name"),
    description: label(
      "nameHint",
      "What the file belongs to, the first part of its address: pick a name the CDN holds or type a new one.",
    ),
    optionsProvider: { providerKey: PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS.names },
    config: { allowCustom: true },
    validation: [
      ...presentRules(),
      pattern(...INVALID_SEGMENT),
      pattern(PHI_CDN_UPLOAD_PATTERN_SOURCES.reservedName, "reservedName", "The name api is reserved."),
    ],
  },
  {
    key: PHI_CDN_UPLOAD_FIELD_KEYS.version,
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("version", "Version"),
    validation: [
      ...presentRules(),
      pattern(
        PHI_CDN_UPLOAD_PATTERN_SOURCES.version,
        "invalidVersion",
        "Letters, digits and . _ + ~ : - only, no slash, and not starting with a dot, a tilde or a colon.",
      ),
    ],
  },
  {
    key: PHI_CDN_UPLOAD_FIELD_KEYS.fileName,
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
    label: label("fileFileName", "File name"),
    disabledWhen: { source: "form", valuePath: PHI_CDN_UPLOAD_FIELD_KEYS.heldFile, operator: "falsy" },
    validation: [...presentRules(), pattern(...INVALID_SEGMENT)],
  },
  {
    key: PHI_CDN_UPLOAD_FIELD_KEYS.os,
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.checkboxGroup,
    label: label("os", "Operating systems"),
    options: PHI_CDN_OS_KEYS.map(([key]) => ({ value: key, label: label(`osNames.${key}`, OS_NAMES[key]) })),
  },
  {
    key: PHI_CDN_UPLOAD_FIELD_KEYS.arch,
    fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.checkboxGroup,
    label: label("arch", "Architectures"),
    options: PHI_CDN_ARCH_KEYS.map(([key]) => ({ value: key, label: label(`archNames.${key}`, ARCH_NAMES[key]) })),
  },
];

const uploadDescriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_CDN_FORM_IDS.upload,
  labelSetKey: UPLOAD_LABEL_SET_KEY,
  fields: uploadFields,
};

/** The upload widget's own Label Set, whose keys the descriptor names as they are. */
const loadUploadLabels = createPhiFormLabelSetLoader(
  () => import("./widgets/upload/labels").then((module) => module.getPhiCdnUploadWidgetLabels),
);

export const PHI_CDN_UPLOAD_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_CDN_RUNTIME_MODULE_ID,
  areas: ["admin"],
  formId: PHI_CDN_FORM_IDS.upload,
  version: 1,
  flags: 0,
  title: "CDN upload",
  description: "The name, version, file name and platform a file is published under in the Site's CDN.",
  category: "forms",
  tags: ["cdn", "upload"],
  descriptor: uploadDescriptor,
  submitHandlerKey: null,
  loadLabels: loadUploadLabels,
});

export const PHI_CDN_RUNTIME_MODULE_FORMS = [PHI_CDN_UPLOAD_FORM];
