"use client";

import { QRCode } from "antd";
import type { QRCodeProps } from "antd";

/**
 * A value rendered as a square somebody points a phone at.
 *
 * One site: the enrollment URI an authenticator app reads when somebody adds a second factor. A
 * pass-through, with `value` and `type` the only props in use.
 *
 * Worth one sentence of care despite that. What it draws is a secret -- the shared key that second
 * factor is built on -- so it belongs on a page that is already behind a session and is never put
 * where a screenshot tool, a preview or a cache could keep it.
 */
export type PhiQrCodeControlProps = QRCodeProps;

export function PhiQrCodeControl(props: PhiQrCodeControlProps) {
  return <QRCode {...props} />;
}
