"use client";

import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { Col, Divider, Layout, Row } from "antd";

import { resolvePhiNavHref } from "../../../../../helpers/locale";
import type { PhiClientBlockBaseProps, PhiBlockRuntime } from "../../../../../types";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiNavItem } from "../../../../../components/shell/shell-types";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

const { Footer } = Layout;

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  color: "inherit",
} satisfies CSSProperties;

export type PhiFooterWidgetContactItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  href?: string;
};

export type PhiFooterWidgetLabels = {
  linksTitle: ReactNode;
  contactTitle: ReactNode;
};

export type PhiFooterWidgetClientProps = PhiClientBlockBaseProps<
  PhiFooterWidgetLabels,
  Record<string, never>,
  Pick<PhiBlockRuntime, "locale" | "area">
> & {
  brandTitle: ReactNode;
  brandText?: ReactNode;
  links: PhiNavItem[];
  contactItems: PhiFooterWidgetContactItem[];
  note?: ReactNode;
};

export function PhiFooterWidgetClient({
  runtime,
  labels,
  brandTitle,
  brandText,
  links,
  contactItems,
  note,
}: PhiFooterWidgetClientProps) {
  const { token } = usePhiConfig();

  return (
    <Footer
      style={{
        background: token.colorBgContainer,
        color: token.colorText,
        paddingInline: token.paddingLG,
        paddingBlock: token.paddingLG,
        width: "100%",
        minWidth: 0,
      }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <PhiTypographyControl presentation="title" level={5} style={{ color: token.colorText }}>
            {brandTitle}
          </PhiTypographyControl>
          {brandText ? (
            <PhiTypographyControl presentation="paragraph" style={{ color: token.colorText }}>{brandText}</PhiTypographyControl>
          ) : null}
        </Col>
        <Col xs={24} md={8}>
          <PhiTypographyControl presentation="title" level={5} style={{ color: token.colorText }}>
            {labels.linksTitle}
          </PhiTypographyControl>
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            {links
              .filter((item): item is PhiNavItem & { href: string } => Boolean(item.href))
              .map((item) => (
              <Link
                key={item.key}
                href={resolvePhiNavHref(runtime?.locale.current ?? "en", runtime?.area ?? "public", item.href)}
                target={item.newTab ? "_blank" : undefined}
                rel={item.newTab ? "noreferrer" : undefined}
                style={linkStyle}
              >
                {item.label}
              </Link>
              ))}
          </div>
        </Col>
        <Col xs={24} md={8}>
          <PhiTypographyControl presentation="title" level={5} style={{ color: token.colorText }}>
            {labels.contactTitle}
          </PhiTypographyControl>
          <div style={{ display: "grid", gap: 12 }}>
            {contactItems.map((item) => (
              <PhiTypographyControl presentation="paragraph" key={item.key} style={{ marginBottom: 0, color: token.colorText }}>
                <PhiTypographyControl style={{ color: token.colorText }}>{item.label}: </PhiTypographyControl>
                {item.href ? (
                  <Link href={item.href} style={linkStyle}>
                    {item.value}
                  </Link>
                ) : (
                  <PhiTypographyControl style={{ color: token.colorText }}>{item.value}</PhiTypographyControl>
                )}
              </PhiTypographyControl>
            ))}
          </div>
        </Col>
      </Row>
      {note ? (
        <>
          <Divider style={{ borderColor: token.colorBorderSecondary }} />
          <PhiTypographyControl style={{ color: token.colorTextTertiary }}>{note}</PhiTypographyControl>
        </>
      ) : null}
    </Footer>
  );
}
