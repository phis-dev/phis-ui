import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../../gateway/label-set";
import { PHI_CDN_RUNTIME_MODULE_IDENTITY } from "../../ids";
import type { PhiCdnUploadWidgetLabels } from "./label-types";

const PHI_CDN_UPLOAD_WIDGET_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_CDN_RUNTIME_MODULE_IDENTITY, {
  key: "widget:cdn-upload",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    name: "Name",
    name_hint: definePhiMessageLabel("What the file belongs to, the first part of its address: pick a name the CDN holds or type a new one."),
    version: "Version",
    file_file_name: "File name",
    os: "Operating systems",
    arch: "Architectures",
    os_linux: "Linux",
    os_windows: "Windows",
    os_macos: "macOS",
    os_android: "Android",
    os_ios: "iOS and iPadOS",
    os_chromeos: "ChromeOS",
    os_other: "Other",
    arch_x64: "x64",
    arch_arm64: "arm64",
    arch_x86: "x86",
    arch_arm32: "arm32",
    arch_riscv64: "RISC-V 64",
    step_checksum: "Computing checksum",
    step_verify: "Verifying",
    start: "Upload",
    cancel: "Cancel",
    required: definePhiMessageLabel("Required."),
    invalid_segment: definePhiMessageLabel("Letters, digits and . _ + ~ - only, no slash, and not starting with a dot or a tilde."),
    invalid_version: definePhiMessageLabel("Letters, digits and . _ + ~ : - only, no slash, and not starting with a dot, a tilde or a colon."),
    reserved_name: definePhiMessageLabel("The name api is reserved."),
    checksum_unavailable: definePhiMessageLabel("This browser cannot compute the file's checksum here; open the page over https."),
  },
});

export async function getPhiCdnUploadWidgetLabels(options: PhiGlobalTranslatorOptions): Promise<PhiCdnUploadWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_CDN_UPLOAD_WIDGET_LABEL_SET);
  return {
    name: labels.name,
    nameHint: labels.name_hint,
    version: labels.version,
    fileFileName: labels.file_file_name,
    os: labels.os,
    arch: labels.arch,
    osNames: {
      linux: labels.os_linux,
      windows: labels.os_windows,
      macos: labels.os_macos,
      android: labels.os_android,
      ios: labels.os_ios,
      chromeos: labels.os_chromeos,
      other: labels.os_other,
    },
    archNames: {
      x64: labels.arch_x64,
      arm64: labels.arch_arm64,
      x86: labels.arch_x86,
      arm32: labels.arch_arm32,
      riscv64: labels.arch_riscv64,
    },
    steps: { checksum: labels.step_checksum, verify: labels.step_verify },
    start: labels.start,
    cancel: labels.cancel,
    required: labels.required,
    invalidSegment: labels.invalid_segment,
    invalidVersion: labels.invalid_version,
    reservedName: labels.reserved_name,
    checksumUnavailable: labels.checksum_unavailable,
  };
}
