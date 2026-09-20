"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ComponentType,
} from "react";

import {
  AppleOutlined,
  GithubOutlined,
  GoogleOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MailOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  QuestionCircleOutlined,
  ShoppingOutlined,
  StarOutlined,
  UserOutlined,
  WindowsOutlined,
} from "@ant-design/icons";
import Image from "next/image";

type PhiIconifyProps = {
  icon: string;
  width?: number | string;
  height?: number | string;
  inline?: boolean;
};

type PhiIconProps = {
  name?: string;
  size?: number | string;
};

let iconifyComponentLoader: Promise<ComponentType<PhiIconifyProps>> | null = null;

function loadIconifyComponent() {
  if (!iconifyComponentLoader) {
    iconifyComponentLoader = import("@iconify/react").then((module) => module.Icon as ComponentType<PhiIconifyProps>);
  }

  return iconifyComponentLoader;
}

const ANTD_ICON_REGISTRY = {
  home: HomeOutlined,
  "home-outlined": HomeOutlined,
  mail: MailOutlined,
  "mail-outlined": MailOutlined,
  location: EnvironmentOutlined,
  environment: EnvironmentOutlined,
  "environment-outlined": EnvironmentOutlined,
  global: GlobalOutlined,
  "global-outlined": GlobalOutlined,
  shopping: ShoppingOutlined,
  "shopping-outlined": ShoppingOutlined,
  star: StarOutlined,
  "star-outlined": StarOutlined,
  question: QuestionCircleOutlined,
  "question-circle": QuestionCircleOutlined,
  "question-circle-outlined": QuestionCircleOutlined,
  info: InfoCircleOutlined,
  "info-circle": InfoCircleOutlined,
  "info-circle-outlined": InfoCircleOutlined,
  logout: LogoutOutlined,
  "logout-outlined": LogoutOutlined,
  user: UserOutlined,
  "user-outlined": UserOutlined,
  /*
   * The sign-in providers' marks.
   *
   * Bundled rather than `iconify:`, although that prefix is supported and would have shorter names.
   * These are Core defaults on a public Login page, so every Site would ship them without anyone
   * choosing them -- and an Iconify icon is fetched from Iconify's API by the visitor's browser. A
   * Builder picking one for their own Widget opts into that; a default may not opt in on their behalf.
   */
  google: GoogleOutlined,
  "google-outlined": GoogleOutlined,
  apple: AppleOutlined,
  "apple-outlined": AppleOutlined,
  github: GithubOutlined,
  "github-outlined": GithubOutlined,
  windows: WindowsOutlined,
  "windows-outlined": WindowsOutlined,
} as const;

const LazyPhiManagementIcon = lazy(
  () => import("./phi-management-icon").then((module) => ({
    default: module.PhiManagementIcon,
  })),
);
const LazyPhiBuilderMotifIcon = lazy(
  () => import("./phi-builder-motif-icon").then((module) => ({
    default: module.PhiBuilderMotifIcon,
  })),
);

function renderIconFallback(size: number | string) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
      }}
    />
  );
}

function renderAntdIcon(key: string, size: number | string) {
  const Icon = ANTD_ICON_REGISTRY[key as keyof typeof ANTD_ICON_REGISTRY];
  return Icon ? (
    <Icon style={{ fontSize: size }} />
  ) : (
    <Suspense fallback={renderIconFallback(size)}>
      <LazyPhiManagementIcon name={key} size={size} />
    </Suspense>
  );
}

function renderBuilderIcon(
  namespace: string,
  motif: string,
  size: number | string,
) {
  const isLayoutNamespace = namespace.endsWith("/layouts");
  const isWidgetNamespace = namespace.endsWith("/widgets");

  if (!isLayoutNamespace && !isWidgetNamespace) {
    return null;
  }

  return (
    <Suspense fallback={renderIconFallback(size)}>
      <LazyPhiBuilderMotifIcon
        namespace={namespace}
        motif={motif}
        size={size}
      />
    </Suspense>
  );
}

function PhiIconifyIcon({ icon, size }: { icon: string; size: number | string }) {
  const [IconifyIcon, setIconifyIcon] = useState<ComponentType<PhiIconifyProps> | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadIconifyComponent()
      .then((component) => {
        if (!cancelled) {
          setIconifyIcon(() => component);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIconifyIcon(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!IconifyIcon) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        }}
      />
    );
  }

  return <IconifyIcon icon={icon} width={size} height={size} inline />;
}

export function PhiIcon({ name, size = 16 }: PhiIconProps) {
  if (!name) {
    return null;
  }
  const resolvedSize = size === "inherit" ? "1em" : size;

  const [namespace, ...rest] = name.split(":");
  const value = rest.join(":");

  if (!value) {
    return renderAntdIcon(name, resolvedSize);
  }

  const builderIcon = renderBuilderIcon(namespace, value, resolvedSize);
  if (builderIcon) {
    return builderIcon;
  }

  switch (namespace) {
    case "antd":
      return renderAntdIcon(value, resolvedSize);
    case "iconify":
      return value ? <PhiIconifyIcon icon={value} size={resolvedSize} /> : null;
    case "asset":
      return typeof resolvedSize === "number" ? (
        <Image
          src={value.startsWith("/") ? value : `/${value}`}
          alt=""
          width={resolvedSize}
          height={resolvedSize}
          aria-hidden="true"
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            width: resolvedSize,
            height: resolvedSize,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={value.startsWith("/") ? value : `/${value}`}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </span>
      );
    default:
      return null;
  }
}
