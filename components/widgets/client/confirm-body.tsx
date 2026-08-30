"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Descriptions, Result, Space, Typography } from "antd";
import type { PhiFormPreviewDescriptor } from "../../../gateway/form-submit";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import type { PhiDataSource } from "../../../gateway/data-source";
import { buildPhiDataSourceUrl } from "../../../gateway/data-source";
import type { PhiSignalAddress } from "../../../types";
import type { PhiFormDescriptor } from "../../../types/form-descriptor";
import { usePhiRuntimeFormClient } from "../../forms/runtime-form-client";
import { PhiFormControl, type PhiFormControlHandle } from "../../controls/phi-form-control";
import { PhiButtonControl } from "../../controls/phi-button-control";
import { PHI_CONFIRM_FORM_DESCRIPTOR } from "../../forms/shared-form-descriptors";

const PHI_COLOR_TEXT_SECONDARY = "var(--ant-color-text-secondary)";
const PHI_COLOR_TEXT = "var(--ant-color-text)";
const PHI_LABEL_WIDTH = "7.5rem";
const PHI_FONT_SIZE_BASE = "1rem";
const PHI_SPACE_LG = "var(--ant-padding-lg)";

export type ConfirmPreviewStatus =
  | "pending"
  | "already_confirmed"
  | "invalid_token"
  | "invalid_state"
  | "expired"
  | null;

export type PhiConfirmFormClientProps = {
  token: string;
  previewStatus: ConfirmPreviewStatus;
  previewName: string;
  previewEmail: string;
  previewCompany: string | null;
  previewDescriptor?: PhiFormPreviewDescriptor;
  previewDataSource?: PhiDataSource;
  formId?: string;
  formControllerAddress?: PhiSignalAddress | null;
  descriptor?: PhiFormDescriptor;
  descriptorLabels?: Readonly<Record<string, string>>;
  confirmLabel: string;
  pendingLabel: string;
  successTitle: string;
  successText: string;
  alreadyTitle: string;
  alreadyText: string;
  invalidTitle: string;
  invalidText: string;
  expiredTitle: string;
  expiredText: string;
  genericErrorTitle: string;
  genericErrorText: string;
  detailsTitle: string;
  nameLabel: string;
  emailLabel: string;
  companyLabel: string;
  pendingIntro: string;
  alreadyIntro: string;
  missingTokenTitle: string;
  missingTokenText: string;
  loginLabel: string;
  loginHref: string;
  backHref: string;
  backLabel: string;
};

function buildPreviewDisplayName(preview?: {
  fullName?: string;
  firstName?: string;
  lastName?: string;
} | null) {
  const fullName = preview?.fullName?.trim() ?? "";
  if (fullName) {
    return fullName;
  }

  return [preview?.firstName?.trim() ?? "", preview?.lastName?.trim() ?? ""]
    .filter(Boolean)
    .join(" ")
    .trim();
}

type ConfirmState =
  | "idle"
  | "pending"
  | "confirmed"
  | "already_confirmed"
  | "invalid"
  | "expired"
  | "error";

export function PhiConfirmFormClient(props: PhiConfirmFormClientProps) {
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const searchParams = useSearchParams();
  const formController = usePhiRuntimeFormClient({
    controllerAddress: props.formControllerAddress,
  });
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";
  const effectiveToken = useMemo(
    () => props.token.trim() || tokenFromUrl,
    [props.token, tokenFromUrl],
  );
  const [previewStatus, setPreviewStatus] = useState<ConfirmPreviewStatus>(props.previewStatus);
  const [previewName, setPreviewName] = useState(props.previewName);
  const [previewEmail, setPreviewEmail] = useState(props.previewEmail);
  const [previewCompany, setPreviewCompany] = useState<string | null>(props.previewCompany);
  const previewDescriptor = props.previewDescriptor;
  const previewDataSource = useMemo<PhiDataSource | null>(
    () =>
      props.previewDataSource ??
      (previewDescriptor
        ? {
            kind: "api",
            upstreamPath: "/api/site/forms",
            endpointKey: "preview",
            method: "GET",
            transport: "site" as const,
            requestShape: {
              queryMap: {
                phase: "phase",
                formId: "formId",
                token: "token",
              },
            },
            cache: {
              mode: "no-store" as const,
            },
          }
        : null),
    [previewDescriptor, props.previewDataSource],
  );
  const initialState: ConfirmState = !effectiveToken
    ? "invalid"
    : props.previewStatus === "already_confirmed"
      ? "already_confirmed"
    : props.previewStatus === "expired"
      ? "expired"
        : props.previewStatus === "invalid_token" || props.previewStatus === "invalid_state"
          ? "invalid"
          : "idle";
  const [state, setState] = useState<ConfirmState>(initialState);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!effectiveToken || previewStatus !== null) {
      return;
    }

    let active = true;

    async function loadPreview() {
      try {
        const previewUrl =
          previewDataSource?.kind === "api"
            ? buildPhiDataSourceUrl(previewDataSource, {
                query: {
                  phase: "preview",
                  formId: previewDescriptor?.formId ?? PHI_SHARED_FORM_IDS.confirm,
                  token: effectiveToken,
                },
              })
            : "";

        if (!previewUrl) {
          setState("invalid");
          setPreviewStatus("invalid_token");
          return;
        }

        const response = await fetch(
          previewUrl,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              ok?: boolean;
              status?: ConfirmPreviewStatus;
              code?: ConfirmPreviewStatus;
              preview?: {
                fullName?: string;
                firstName?: string;
                lastName?: string;
                email?: string;
                companyName?: string | null;
              };
            }
          | null;

        if (!active) {
          return;
        }

        if (payload?.ok && (payload.status === "pending" || payload.status === "already_confirmed")) {
          setPreviewStatus(payload.status);
          setPreviewName(buildPreviewDisplayName(payload.preview));
          setPreviewEmail(payload.preview?.email?.trim() || "");
          setPreviewCompany(payload.preview?.companyName?.trim() || null);
          if (payload.status === "already_confirmed") {
            setState("already_confirmed");
          }
          return;
        }

        if (payload?.code === "expired") {
          setPreviewStatus("expired");
          setState("expired");
          return;
        }

        setPreviewStatus("invalid_token");
        setState("invalid");
      } catch {
        if (!active) {
          return;
        }
        setState("error");
      }
    }

    void loadPreview();

    return () => {
      active = false;
    };
  }, [
    effectiveToken,
    previewStatus,
    previewDescriptor?.formId,
    previewDataSource,
  ]);

  const detailsNode =
    previewName || previewEmail || previewCompany ? (
      <Descriptions
        title={props.detailsTitle}
        column={1}
        size="small"
        styles={{
          label: { width: PHI_LABEL_WIDTH, color: PHI_COLOR_TEXT_SECONDARY, fontWeight: 500 },
          content: { color: PHI_COLOR_TEXT },
        }}
      >
        {previewName ? (
          <Descriptions.Item label={props.nameLabel}>{previewName}</Descriptions.Item>
        ) : null}
        {previewEmail ? (
          <Descriptions.Item label={props.emailLabel}>{previewEmail}</Descriptions.Item>
        ) : null}
        {previewCompany ? (
          <Descriptions.Item label={props.companyLabel}>{previewCompany}</Descriptions.Item>
        ) : null}
      </Descriptions>
    ) : null;

  async function handleConfirm() {
    setState("pending");
    setErrorText("");

    try {
      const result = await formController.submit({
        formId: props.formId ?? PHI_SHARED_FORM_IDS.confirm,
        values: { token: effectiveToken },
      });

      const payload = result.payload as
        | { ok?: boolean; status?: string; code?: string; error?: string }
        | null;

      if (payload?.ok && payload.status === "confirmed") {
        setState("confirmed");
        return;
      }

      if (payload?.ok && payload.status === "already_confirmed") {
        setState("already_confirmed");
        return;
      }

      if (payload?.code === "expired") {
        setState("expired");
        return;
      }

      if (payload?.code === "invalid_token" || payload?.code === "invalid_state") {
        setState("invalid");
        return;
      }

      setErrorText(payload?.error || props.genericErrorText);
      setState("error");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : props.genericErrorText);
      setState("error");
    }
  }

  if (!effectiveToken) {
    return (
      <Result key="result" status="warning" title={props.missingTokenTitle} subTitle={props.missingTokenText} extra={<Link href={props.backHref}>{props.backLabel}</Link>} />
    );
  }

  if (state === "idle" || state === "pending") {
    return (
      <div style={{ display: "grid", gap: PHI_SPACE_LG, width: "100%" }}>
          <Typography.Paragraph
            style={{ marginBottom: 0, color: PHI_COLOR_TEXT_SECONDARY, fontSize: PHI_FONT_SIZE_BASE }}
          >
            {props.pendingIntro}
          </Typography.Paragraph>
          {detailsNode}
          <PhiFormControl
            ref={formRef}
            descriptor={props.descriptor ?? PHI_CONFIRM_FORM_DESCRIPTOR}
            labels={props.descriptorLabels}
            initialValues={{ token: effectiveToken }}
            disabled={state === "pending"}
            onSubmit={handleConfirm}
          />
          <PhiButtonControl
            type="primary"
            label={state === "pending" ? props.pendingLabel : props.confirmLabel}
            loading={state === "pending"}
            onClick={() => formRef.current?.submit()}
          />
      </div>
    );
  }

  if (state === "confirmed") {
    return (
      <Result key="result" status="success" title={props.successTitle} subTitle={props.successText} extra={<Link href={props.loginHref}>{props.loginLabel}</Link>} />
    );
  }

  if (state === "already_confirmed") {
    return (
      <Space key="content" orientation="vertical" size={20} style={{ width: "100%" }}>
          <Result
            status="info"
            title={props.alreadyTitle}
            subTitle={props.alreadyText}
            extra={<Link href={props.loginHref}>{props.loginLabel}</Link>}
          />
          {detailsNode}
      </Space>
    );
  }

  if (state === "expired") {
    return (
      <Result key="result" status="warning" title={props.expiredTitle} subTitle={props.expiredText} extra={<Link href={props.backHref}>{props.backLabel}</Link>} />
    );
  }

  if (state === "invalid") {
    return (
      <Result key="result" status="error" title={props.invalidTitle} subTitle={props.invalidText} extra={<Link href={props.backHref}>{props.backLabel}</Link>} />
    );
  }

  return (
    <Result key="result" status="error" title={props.genericErrorTitle} subTitle={errorText || props.genericErrorText} extra={<Link href={props.backHref}>{props.backLabel}</Link>} />
  );
}
