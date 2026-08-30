"use client";

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { AppstoreOutlined } from "@ant-design/icons";
import { Empty, Flex, Typography } from "antd";
import type { PhiControlSize } from "../../types/control";

import { PhiIcon } from "../shell/phi-icon";
import { usePhiConfig } from "../root/phi-config-provider";
import {
  PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS,
  type PhiIconPickerControlLabels,
} from "./phi-icon-picker-labels";
import type { PhiButtonType } from "./phi-button-types";
import type {
  PhiPickerPlacement,
  PhiPickerTransactionCallbacks,
} from "./phi-picker-control-contract";
import { PhiPopoverControl } from "./phi-popover-control";
import { PhiButtonControl } from "./phi-button-control";
import { PhiSegmentedControl } from "./phi-segmented-control";
import { PhiTextControl } from "./phi-text-control";
import { usePhiImmediatePicker } from "./use-phi-immediate-picker";
import { PHI_Z_INDEX } from "../../theme/phi-tokens";

type PhiIconifySetKey = "mdi" | "ph" | "ant-design";
type PhiIconPickerControlMode = "standard" | "iconify";
type PhiIconifySearchResponse = {
  icons?: string[];
  total?: number;
  limit?: number;
  start?: number;
};

const STANDARD_ICON_CHOICES = [
  { value: "antd:mail-outlined", label: "Mail" },
  { value: "antd:user-outlined", label: "User" },
  { value: "antd:setting-outlined", label: "Setting" },
  { value: "antd:home-outlined", label: "Home" },
  { value: "antd:question-circle-outlined", label: "Help" },
  { value: "antd:info-circle-outlined", label: "Info" },
  { value: "antd:notification-outlined", label: "Notice" },
  { value: "antd:shopping-outlined", label: "Shop" },
  { value: "antd:picture-outlined", label: "Image" },
  { value: "antd:star-outlined", label: "Star" },
  { value: "antd:translation-outlined", label: "Locale" },
  { value: "antd:team-outlined", label: "Team" },
  { value: "antd:appstore-outlined", label: "Apps" },
  { value: "antd:dashboard-outlined", label: "Dashboard" },
  { value: "antd:code-outlined", label: "Code" },
  { value: "antd:download-outlined", label: "Download" },
  { value: "antd:read-outlined", label: "Read" },
  { value: "antd:environment-outlined", label: "Location" },
  { value: "antd:branches-outlined", label: "Branches" },
  { value: "antd:profile-outlined", label: "Profile" },
  { value: "antd:skin-outlined", label: "Theme" },
  { value: "antd:api-outlined", label: "API" },
  { value: "antd:file-text-outlined", label: "File" },
  { value: "antd:logout-outlined", label: "Logout" },
] as const;

const ICONIFY_SET_OPTIONS: ReadonlyArray<{ label: string; value: PhiIconifySetKey }> = [
  { label: "Phosphor", value: "ph" },
  { label: "MDI", value: "mdi" },
  { label: "Ant Design", value: "ant-design" },
];

const ICONIFY_CHOICES: Readonly<Record<PhiIconifySetKey, ReadonlyArray<{ name: string; label: string }>>> = {
  mdi: [
    { name: "email-outline", label: "Email" },
    { name: "account-outline", label: "Account" },
    { name: "cog-outline", label: "Cog" },
    { name: "home-outline", label: "Home" },
    { name: "help-circle-outline", label: "Help" },
    { name: "information-outline", label: "Info" },
    { name: "bell-outline", label: "Bell" },
    { name: "shopping-outline", label: "Shopping" },
    { name: "image-outline", label: "Image" },
    { name: "star-outline", label: "Star" },
    { name: "translate", label: "Translate" },
    { name: "account-group-outline", label: "Group" },
  ],
  ph: [
    { name: "envelope", label: "Envelope" },
    { name: "user", label: "User" },
    { name: "gear", label: "Gear" },
    { name: "house", label: "House" },
    { name: "question", label: "Question" },
    { name: "info", label: "Info" },
    { name: "bell", label: "Bell" },
    { name: "shopping-cart", label: "Cart" },
    { name: "image", label: "Image" },
    { name: "star", label: "Star" },
    { name: "translate", label: "Translate" },
    { name: "users", label: "Users" },
  ],
  "ant-design": [
    { name: "mail-outlined", label: "Mail" },
    { name: "user-outlined", label: "User" },
    { name: "setting-outlined", label: "Setting" },
    { name: "home-outlined", label: "Home" },
    { name: "question-circle-outlined", label: "Help" },
    { name: "info-circle-outlined", label: "Info" },
    { name: "notification-outlined", label: "Notice" },
    { name: "shopping-outlined", label: "Shop" },
    { name: "picture-outlined", label: "Image" },
    { name: "star-outlined", label: "Star" },
    { name: "translation-outlined", label: "Locale" },
    { name: "team-outlined", label: "Team" },
  ],
};

const ICONIFY_SEARCH_PAGE_SIZE = 64;

const ICON_BUTTON_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 4,
  width: "100%",
} as const;

function stopOverlayEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function stopOverlayMouseEvent(event: { preventDefault?: () => void; stopPropagation: () => void }) {
  event.stopPropagation();
}

function parseIconValue(value: string | null | undefined): {
  mode: PhiIconPickerControlMode;
  setKey: PhiIconifySetKey;
  query: string;
} {
  if (typeof value === "string" && value.startsWith("iconify:")) {
    const [, setKey, ...rest] = value.split(":");
    const resolvedSetKey =
      setKey === "mdi" || setKey === "ph" || setKey === "ant-design"
        ? (setKey as PhiIconifySetKey)
        : "ph";

    return {
      mode: "iconify",
      setKey: resolvedSetKey,
      query: rest.join(":"),
    };
  }

  return {
    mode: "standard",
    setKey: "ph",
    query: "",
  };
}

export type PhiIconPickerControlProps = PhiPickerTransactionCallbacks<string | null> & {
  value?: string | null;
  buttonAriaLabel?: string;
  buttonIcon?: ReactNode;
  buttonLabel?: ReactNode;
  buttonType?: PhiButtonType;
  buttonSize?: PhiControlSize;
  buttonBlock?: boolean;
  disabled?: boolean;
  buttonStyle?: CSSProperties;
  placement?: PhiPickerPlacement;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  rootClassName?: string;
  labels?: PhiIconPickerControlLabels;
};

export function PhiIconPickerControl({
  value,
  onChange,
  buttonAriaLabel,
  buttonIcon,
  buttonLabel,
  buttonType = "text",
  buttonSize = "small",
  buttonBlock = false,
  disabled = false,
  buttonStyle,
  placement = "bottom",
  getPopupContainer,
  rootClassName,
  onOpenChange,
  onCommit,
  onDiscard,
  labels = PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS,
}: PhiIconPickerControlProps) {
  const { token } = usePhiConfig();
  const parsedCurrentIcon = parseIconValue(value);
  const picker = usePhiImmediatePicker({
    value: value ?? null,
    disabled,
    onChange,
    onCommit,
    onDiscard,
    onOpenChange,
  });
  const open = picker.open;
  const resolvedButtonIcon = buttonIcon ?? (picker.value?.trim()
    ? <PhiIcon name={picker.value} size="1em" />
    : <AppstoreOutlined />);
  const [mode, setMode] = useState<PhiIconPickerControlMode>(parsedCurrentIcon.mode);
  const [iconifySet, setIconifySet] = useState<PhiIconifySetKey>(parsedCurrentIcon.setKey);
  const [iconifyQuery, setIconifyQuery] = useState(parsedCurrentIcon.query);
  const [iconifySearchResults, setIconifySearchResults] = useState<string[]>([]);
  const [iconifySearchLoading, setIconifySearchLoading] = useState(false);
  const [iconifySearchError, setIconifySearchError] = useState<string | null>(null);
  const [iconifySearchHasMore, setIconifySearchHasMore] = useState(false);
  const [iconifySearchStart, setIconifySearchStart] = useState(0);
  const iconifySearchRequestKeyRef = useRef<string | null>(null);
  const iconifySearchTimeoutRef = useRef<number | null>(null);

  const resetIconifySearchState = () => {
    iconifySearchRequestKeyRef.current = null;
    if (iconifySearchTimeoutRef.current != null) {
      window.clearTimeout(iconifySearchTimeoutRef.current);
      iconifySearchTimeoutRef.current = null;
    }
    setIconifySearchResults([]);
    setIconifySearchLoading(false);
    setIconifySearchError(null);
    setIconifySearchHasMore(false);
    setIconifySearchStart(0);
  };

  const normalizedIconifyQuery = iconifyQuery.trim().toLowerCase();
  const shouldSearchIconify = normalizedIconifyQuery.length >= 2;

  const filteredIconifyChoices = useMemo(() => {
    const choices = ICONIFY_CHOICES[iconifySet];

    if (!normalizedIconifyQuery) {
      return choices;
    }

    return choices.filter(
      (entry) =>
        entry.name.includes(normalizedIconifyQuery) ||
        entry.label.toLowerCase().includes(normalizedIconifyQuery),
    );
  }, [iconifySet, normalizedIconifyQuery]);

  const executeIconifySearch = (
    nextSet: PhiIconifySetKey,
    nextQuery: string,
    start: number,
    append: boolean,
  ) => {
    const normalizedQuery = nextQuery.trim().toLowerCase();
    const requestKey = `${nextSet}:${normalizedQuery}`;
    iconifySearchRequestKeyRef.current = requestKey;
    setIconifySearchLoading(true);
    setIconifySearchError(null);

    fetch(
      `https://api.iconify.design/search?query=${encodeURIComponent(normalizedQuery)}&prefix=${encodeURIComponent(nextSet)}&limit=${ICONIFY_SEARCH_PAGE_SIZE}&start=${start}`,
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Iconify search failed with ${response.status}`);
        }

        return (await response.json()) as PhiIconifySearchResponse;
      })
      .then((result) => {
        if (iconifySearchRequestKeyRef.current !== requestKey) {
          return;
        }

        const icons = Array.isArray(result.icons) ? result.icons : [];
        const resolvedStart = typeof result.start === "number" ? result.start : start;
        const limit = typeof result.limit === "number" ? result.limit : icons.length;
        const total = typeof result.total === "number" ? result.total : resolvedStart + icons.length;

        setIconifySearchResults((current) =>
          append ? [...current, ...icons.filter((icon) => !current.includes(icon))] : icons,
        );
        setIconifySearchStart(resolvedStart + icons.length);
        setIconifySearchHasMore(resolvedStart + limit < total);
      })
      .catch((error: unknown) => {
        if (iconifySearchRequestKeyRef.current !== requestKey) {
          return;
        }

        if (!append) {
          setIconifySearchResults([]);
          setIconifySearchStart(0);
          setIconifySearchHasMore(false);
        }
        setIconifySearchError(error instanceof Error ? error.message : "Iconify search failed.");
      })
      .finally(() => {
        if (iconifySearchRequestKeyRef.current === requestKey) {
          setIconifySearchLoading(false);
        }
      });
  };

  const scheduleInitialIconifySearch = (nextSet: PhiIconifySetKey, nextQuery: string) => {
    const normalizedQuery = nextQuery.trim().toLowerCase();
    resetIconifySearchState();

    if (normalizedQuery.length < 2) {
      return;
    }

    setIconifySearchLoading(true);
    setIconifySearchError(null);
    iconifySearchTimeoutRef.current = window.setTimeout(() => {
      iconifySearchTimeoutRef.current = null;
      executeIconifySearch(nextSet, normalizedQuery, 0, false);
    }, 220);
  };

  const loadMoreIconifyResults = () => {
    if (!open || mode !== "iconify" || !shouldSearchIconify || iconifySearchLoading || !iconifySearchHasMore) {
      return;
    }
    executeIconifySearch(iconifySet, normalizedIconifyQuery, iconifySearchStart, true);
  };

  const applyIcon = (nextIcon: string | null, options?: { close?: boolean }) => {
    picker.changeValue(nextIcon);
    if (options?.close !== false) {
      picker.closePicker("commit");
    }
  };

  const openPicker = () => {
    if (disabled) {
      return;
    }
    const nextParsedIcon = parseIconValue(value);
    setMode(nextParsedIcon.mode);
    setIconifySet(nextParsedIcon.setKey);
    setIconifyQuery(nextParsedIcon.query);
    scheduleInitialIconifySearch(nextParsedIcon.setKey, nextParsedIcon.query);
    picker.openPicker();
  };

  const triggerButton = (
    <span
      onMouseDown={stopOverlayMouseEvent}
      onPointerDown={stopOverlayEvent}
      onClick={stopOverlayEvent}
      style={{ display: "inline-flex", width: buttonBlock ? "100%" : undefined }}
    >
      <PhiButtonControl
        type={buttonType}
        size={buttonSize}
        block={buttonBlock}
        disabled={disabled}
        ariaLabel={buttonAriaLabel ?? labels.buttonAriaLabel}
        icon={resolvedButtonIcon}
        label={buttonLabel}
        onClick={() => {
          if (!open) openPicker();
        }}
        style={buttonStyle}
      />
    </span>
  );

  return (
    <PhiPopoverControl
      open={open}
      trigger="click"
      placement={placement}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          const nextParsedIcon = parseIconValue(value);
          setMode(nextParsedIcon.mode);
          setIconifySet(nextParsedIcon.setKey);
          setIconifyQuery(nextParsedIcon.query);
          scheduleInitialIconifySearch(nextParsedIcon.setKey, nextParsedIcon.query);
        } else {
          resetIconifySearchState();
        }
        picker.handleOpenChange(nextOpen);
      }}
      getPopupContainer={getPopupContainer}
      rootClassName={rootClassName}
      zIndex={PHI_Z_INDEX.authoringPopup}
      content={(
        <Flex
          vertical
          gap={token.paddingXS}
          onClick={stopOverlayEvent}
          onMouseDown={stopOverlayMouseEvent}
          onPointerDown={stopOverlayEvent}
          style={{ width: 280 }}
        >
          <PhiSegmentedControl<PhiIconPickerControlMode>
            block
            size="small"
            value={mode}
            disabled={disabled}
            onChange={(nextMode) => {
              setMode(nextMode);
              if (nextMode === "iconify" && open) {
                scheduleInitialIconifySearch(iconifySet, iconifyQuery);
                return;
              }

              resetIconifySearchState();
            }}
            options={[
              { label: labels.modes.standard, value: "standard" },
              { label: labels.modes.iconify, value: "iconify" },
            ]}
          />

          {mode === "standard" ? (
            <div style={ICON_BUTTON_GRID_STYLE}>
              {STANDARD_ICON_CHOICES.map((entry) => (
                <PhiButtonControl
                  key={entry.value}
                  type={picker.value === entry.value ? "primary" : "default"}
                  size="small"
                  disabled={disabled}
                  ariaLabel={entry.label}
                  tooltip={entry.value}
                  icon={<PhiIcon name={entry.value} size={16} />}
                  onClick={() => applyIcon(entry.value)}
                  style={{ width: "100%", height: 36, padding: 0 }}
                />
              ))}
            </div>
          ) : (
            <Flex vertical gap={token.paddingXS}>
              <PhiSegmentedControl<PhiIconifySetKey>
                block
                size="small"
                value={iconifySet}
                disabled={disabled}
                onChange={(nextSet) => {
                  if (disabled) {
                    return;
                  }

                  setIconifySet(nextSet);
                  if (open) {
                    scheduleInitialIconifySearch(nextSet, iconifyQuery);
                  }
                }}
                options={[...ICONIFY_SET_OPTIONS]}
              />
              <PhiTextControl
                value={iconifyQuery}
                disabled={disabled}
                inputType="search"
                size="small"
                allowClear
                clearLabel={labels.actions.clear}
                description={labels.hints.iconifySearchMinChars}
                placeholder={labels.placeholders.iconName}
                onChange={(nextValue) => {
                  if (disabled) {
                    return;
                  }

                  const resolvedValue = nextValue ?? "";
                  setIconifyQuery(resolvedValue);
                  if (open) {
                    scheduleInitialIconifySearch(iconifySet, resolvedValue);
                  }
                }}
                onClear={() => {
                  setIconifyQuery("");
                  resetIconifySearchState();
                }}
                style={{ width: "100%" }}
              />
              {!shouldSearchIconify ? (
                <>
                  {filteredIconifyChoices.length > 0 ? (
                    <div style={ICON_BUTTON_GRID_STYLE}>
                      {filteredIconifyChoices.map((entry) => {
                        const entryValue = `iconify:${iconifySet}:${entry.name}`;
                        return (
                          <PhiButtonControl
                            key={entryValue}
                            type={picker.value === entryValue ? "primary" : "default"}
                            size="small"
                            disabled={disabled}
                            ariaLabel={entry.label}
                            tooltip={entryValue}
                            icon={<PhiIcon name={entryValue} size={16} />}
                            onClick={() => applyIcon(entryValue)}
                            style={{ width: "100%", height: 36, padding: 0 }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={labels.empty.curated} />
                  )}
                </>
              ) : (
                <div
                  style={{
                    maxHeight: 240,
                    overflowY: "auto",
                    paddingRight: 4,
                  }}
                  onScroll={(event) => {
                    const target = event.currentTarget;
                    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 48) {
                      loadMoreIconifyResults();
                    }
                  }}
                >
                  {iconifySearchResults.length > 0 ? (
                    <div style={ICON_BUTTON_GRID_STYLE}>
                      {iconifySearchResults.map((iconName) => {
                        const entryValue = `iconify:${iconName}`;
                        const shortName = iconName.split(":").pop() ?? iconName;
                        return (
                          <PhiButtonControl
                            key={entryValue}
                            type={picker.value === entryValue ? "primary" : "default"}
                            size="small"
                            disabled={disabled}
                            ariaLabel={shortName}
                            tooltip={entryValue}
                            icon={<PhiIcon name={entryValue} size={16} />}
                            onClick={() => applyIcon(entryValue)}
                            style={{ width: "100%", height: 36, padding: 0 }}
                          />
                        );
                      })}
                    </div>
                  ) : iconifySearchLoading ? (
                    <Flex justify="center" style={{ paddingBlock: 24 }}>
                      <Typography.Text type="secondary">{labels.status.loading}</Typography.Text>
                    </Flex>
                  ) : iconifySearchError ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={iconifySearchError} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={labels.empty.search} />
                  )}
                  {iconifySearchLoading && iconifySearchResults.length > 0 ? (
                    <Flex justify="center" style={{ paddingBlock: 12 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {labels.status.loadingMore}
                      </Typography.Text>
                    </Flex>
                  ) : null}
                  {!iconifySearchLoading && iconifySearchHasMore ? (
                    <Flex justify="center" style={{ paddingBlock: 12 }}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {labels.status.scrollMore}
                      </Typography.Text>
                    </Flex>
                  ) : null}
                </div>
              )}
            </Flex>
          )}

          <Flex align="center" justify="space-between" gap={8}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {picker.value ?? labels.hints.noneSelected}
            </Typography.Text>
            <PhiButtonControl
              size="small"
              disabled={disabled}
              label={labels.actions.clear}
              onClick={() => {
                setIconifyQuery("");
                resetIconifySearchState();
                applyIcon(null, { close: false });
              }}
            />
          </Flex>
        </Flex>
      )}
    >
      {triggerButton}
    </PhiPopoverControl>
  );
}
