"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Result, Typography } from "antd";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiSignalAddress } from "../../../types";
import type { PhiFormDescriptor } from "../../../types/form-descriptor";
import { usePhiConfig } from "../../root/phi-config-provider";
import { usePhiRuntimeFormClient } from "../../forms/runtime-form-client";
import { PhiFormControl, type PhiFormControlHandle } from "../../controls/phi-form-control";
import {
  PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR,
  PHI_RESET_PASSWORD_FORM_DESCRIPTOR,
} from "../../forms/shared-form-descriptors";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiButtonControl } from "../../controls/phi-button-control";

type ResetPasswordRequestFormValues = {
  email: string;
};

type ResetPasswordConfirmFormValues = {
  token: string;
  password: string;
  confirmPassword: string;
};

export type PhiResetPasswordFormClientProps = PhiClientBlockBaseProps<
  {
    request: {
      email: {
        label: string;
        placeholder: string;
        required: string;
        invalid: string;
      };
      submitLabel: string;
      pendingLabel: string;
      introText: string;
      success: {
        title: string;
        text: string;
      };
      error: {
        title: string;
        text: string;
      };
    };
    confirm: {
      token: {
        label: string;
        required: string;
      };
      password: {
        label: string;
        placeholder: string;
        required: string;
        minLength: string;
      };
      confirmPassword: {
        label: string;
        placeholder: string;
        required: string;
        mismatch: string;
      };
      submitLabel: string;
      pendingLabel: string;
      success: {
        title: string;
        text: string;
      };
      error: {
        title: string;
        text: string;
      };
    };
  },
  Record<string, never>,
  Pick<PhiBlockRuntime, "locale">
> & {
  formId?: string;
  formControllerAddress?: PhiSignalAddress | null;
  requestDescriptor?: PhiFormDescriptor;
  descriptorLabels?: Readonly<Record<string, string>>;
};

function parseError(payload: Record<string, unknown> | null, fallback: string) {
  return typeof payload?.error === "string" && payload.error.trim()
    ? payload.error
    : fallback;
}

export function PhiResetPasswordFormClient(props: PhiResetPasswordFormClientProps) {
  const requestFormRef = useRef<PhiFormControlHandle | null>(null);
  const confirmFormRef = useRef<PhiFormControlHandle | null>(null);
  const { token } = usePhiConfig();
  const searchParams = useSearchParams();
  const formController = usePhiRuntimeFormClient({
    controllerAddress: props.formControllerAddress,
  });
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";
  const hasTokenFlow = tokenFromUrl.length > 0;
  const [requestDone, setRequestDone] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [confirmDone, setConfirmDone] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  async function handleRequest(values: ResetPasswordRequestFormValues) {
    setRequestError("");

    try {
      const result = await formController.submit({
        formId: props.formId ?? PHI_SHARED_FORM_IDS.resetPassword,
        values: {
          email: values.email,
          locale: props.runtime?.locale.current ?? "en",
        },
      });

      if (!result.ok) {
        setRequestError(parseError(result.payload, props.labels.request.error.text));
        return;
      }

      setRequestDone(true);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : props.labels.request.error.text);
    }
  }

  async function handleConfirm(values: ResetPasswordConfirmFormValues) {
    setConfirmError("");

    try {
      const result = await formController.submit({
        formId: props.formId ?? PHI_SHARED_FORM_IDS.resetPassword,
        values,
        phase: "confirm",
      });

      if (!result.ok) {
        setConfirmError(parseError(result.payload, props.labels.confirm.error.text));
        return;
      }

      setConfirmDone(true);
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : props.labels.confirm.error.text);
    }
  }

  if (hasTokenFlow) {
    if (confirmDone) {
      return (
        <Result key="result" status="success" title={props.labels.confirm.success.title} subTitle={props.labels.confirm.success.text} />
      );
    }

    return (
      <div style={{ display: "grid", gap: token.paddingLG, width: "100%" }}>
          {confirmError ? (
            <PhiAlertControl
              level="error"
              showIcon
              title={props.labels.confirm.error.title}
              description={confirmError}
            />
          ) : null}
          <PhiFormControl
            ref={confirmFormRef}
            descriptor={PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR}
            labels={props.descriptorLabels}
            initialValues={{
              token: tokenFromUrl,
              password: "",
              confirmPassword: "",
            }}
            onSubmit={(values) => handleConfirm(values as ResetPasswordConfirmFormValues)}
          />
          <PhiButtonControl
            type="primary"
            label={props.labels.confirm.submitLabel}
            onClick={() => confirmFormRef.current?.submit()}
          />
      </div>
    );
  }

  if (requestDone) {
    return (
      <Result key="result" status="success" title={props.labels.request.success.title} subTitle={props.labels.request.success.text} />
    );
  }

  return (
    <div style={{ display: "grid", gap: token.paddingLG, width: "100%" }}>
        <Typography.Paragraph
          style={{ marginBottom: 0, color: token.colorTextSecondary, fontSize: token.fontSize }}
        >
          {props.labels.request.introText}
        </Typography.Paragraph>
        {requestError ? (
          <PhiAlertControl
            level="error"
            showIcon
            title={props.labels.request.error.title}
            description={requestError}
          />
        ) : null}
        <PhiFormControl
          ref={requestFormRef}
          descriptor={props.requestDescriptor ?? PHI_RESET_PASSWORD_FORM_DESCRIPTOR}
          labels={props.descriptorLabels}
          onSubmit={(values) => handleRequest(values as ResetPasswordRequestFormValues)}
        />
        <PhiButtonControl
          type="primary"
          label={props.labels.request.submitLabel}
          onClick={() => requestFormRef.current?.submit()}
        />
    </div>
  );
}
