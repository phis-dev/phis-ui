"use client";

import type { ReactNode } from "react";
import { formatPhisMoney, type PhisPaymentMoney } from "@phis/contracts/payments";

import { formatPhiDate, formatPhiDateTime } from "../../../../helpers/format-date-time";
import { readPhiInternalPath } from "../../../../helpers/internal-path";
import { readPhiMoneyValues } from "../../../../helpers/money-amount";
import { formatPhiInterval, readPhiIntervalValue, type PhiIntervalLabels } from "../../label-types/interval";
import { usePhiIntlLocale, usePhiIntlTimeZone } from "../../../root/phi-intl-locale";
import type {
  PhiTableTagColor,
  PhiTableTagVariant,
  PhiTableValueRenderer,
} from "../../../../types/table-widget";
import { PhiFlexControl } from "../../../controls/phi-flex-control";
import { PhiTagControl } from "../../../controls/phi-tag-control";
import { PhiTruncatedHoverText } from "../../../controls/phi-truncated-hover-text";
import { PhiTypographyControl } from "../../../controls/phi-typography-control";
import { PhiLink } from "../../../navigation/phi-link";
import { PhiIcon } from "../../../shell/phi-icon";
import { usePhiConfig } from "../../../root/phi-config-provider";
import { isPhiRecord } from "../../../../helpers/is-record";
import { PHI_COLOR, PHI_SPACE } from "../../../../theme/antd-css-var-contract";

/**
 * How one value out of a Provider is drawn: a date as a date, an address as a link, a set of words as
 * tags, a flag as a switch.
 *
 * **It is the table's vocabulary, and it was the table's alone.** A record of the same rows -- the same
 * Provider, the same fields, one row instead of many -- would have had to write every one of these out
 * again, which is how `observability/widgets/log-detail` came to format its own timestamp, pick its own
 * tag colour and stringify its own JSON for nine values the table beside it already knew how to draw.
 * Two implementations of `datetime` are two answers to when something happened.
 */
export type PhiRenderedValueDefinition = {
  renderer?: PhiTableValueRenderer;
  /** What a stored value is called when it is shown -- a status code as a word. */
  valueMap?: Readonly<Record<string, string>>;
  tagColorMap?: Readonly<Record<string, PhiTableTagColor>>;
  tagVariant?: PhiTableTagVariant;
  /** What is drawn where there is no value -- `null`, `""` or `[]` -- whatever the renderer. */
  emptyText?: string;
};

/**
 * The words a renderer needs that are not in the value: Core's, from a Label Set the Widget's server
 * half read in the page's language. Only `interval` has any.
 */
export type PhiRenderedValueLabels = {
  interval: PhiIntervalLabels;
};

/**
 * Where the value stands, which only `json` cares about.
 *
 * A `cell` shares its line with a dozen others and gets one line, so an object is stringified flat. A
 * `block` has the width of a record to itself, so the same object is indented and wrapped -- which is
 * what the log detail wrote by hand as `JSON.stringify(meta, null, 2)` inside a `<pre>`, and the reason
 * it could not have simply called the table's renderer.
 */
export type PhiRenderedValuePresentation = "cell" | "block";

/**
 * **A flag being read is a mark, not a switch.**
 *
 * `switch` and `checkbox` drew the Controls of those names with `readOnly`, which cost twice. A switch
 * nobody can throw still looks like one, and a screen reader announces it as an operable widget; and the
 * import put two editing Controls into the bundle of every Widget that shows a value, which is why
 * `validate-area-client-reach.mjs` could not list the record Widget among the ones that only display.
 *
 * The two renderers draw the same mark here, and that is the truth rather than a loss: read-only, a
 * switch and a checkbox both say the same thing -- this flag is set. Their difference is how you operate
 * them, and where a cell can be operated the table hands it to `EditableTableCell`, which still draws the
 * Control the author asked for.
 */

function normalizePhiRenderedText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(normalizePhiRenderedText).filter(Boolean).join(", ");
  return isPhiRecord(value) ? JSON.stringify(value) : "";
}

function resolveTagColor(color: PhiTableTagColor | undefined) {
  return typeof color === "object" ? color.value : color;
}

const PHI_RENDERED_TAG_STYLE = { maxWidth: "100%", minWidth: 0 } as const;
const PHI_RENDERED_TAG_TEXT_STYLE = {
  display: "inline-block",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  // Top, not baseline: a box that hides its overflow sits on its bottom edge and would make the row taller.
  verticalAlign: "top",
} as const;

/**
 * One Tag of a `badge` or `tags` value, never wider than the place it stands in.
 *
 * A Tag does not wrap: it is one unbreakable box as wide as its word. Where the place is narrower -- a
 * `fixed` column, a `maxWidth`, a cell with `ellipsis`, a narrow record -- the box ran past it: over the
 * next cell, or clipped mid-letter by a cell that hides its overflow. The box now ends at the place's edge
 * and the word ends in an ellipsis, said whole in the house tooltip when pointed at. Where nothing narrows
 * it, as in a `content` column, the Tag is exactly as wide as before: a percentage cap adds nothing to the
 * width a column measures.
 */
function PhiRenderedTag({ text, color, variant }: {
  text: string;
  color: string | undefined;
  variant: PhiTableTagVariant;
}) {
  return (
    <PhiTagControl color={color} variant={variant} style={PHI_RENDERED_TAG_STYLE}>
      <PhiTruncatedHoverText title={text}>
        <span style={PHI_RENDERED_TAG_TEXT_STYLE}>{text}</span>
      </PhiTruncatedHoverText>
    </PhiTagControl>
  );
}

/** A component rather than a call, because the page's locale and the Site's zone are read from context. */
function PhiRenderedDate({ value, withTime }: { value: string; withTime: boolean }) {
  const locale = usePhiIntlLocale();
  const timeZone = usePhiIntlTimeZone();
  return withTime ? formatPhiDateTime(value, locale, timeZone) : formatPhiDate(value, locale, timeZone);
}

/** The reader's locale, not the server's or the browser's, and the currency's own places. */
/** One amount, or a price list's amounts in its order, side by side. */
function PhiRenderedMoney({ value }: { value: readonly PhisPaymentMoney[] }) {
  const locale = usePhiIntlLocale();
  return value.map((amount) => formatPhisMoney(amount, locale)).join(" · ");
}

/**
 * The square a picture is drawn in, in a cell and in a record alike: a line of a list. The server's `icon`
 * variant is 64 x 64, two device pixels for each of these on a high-density screen.
 */
const PHI_RENDERED_IMAGE_SIZE = 32;

/**
 * **A picture in a list is the address the server answered, drawn as it is.**
 *
 * The value is a Site-relative address that already names a variant cut to size and carries its cache
 * revision, so the browser loads it once and keeps it; anything else -- an absolute address, another
 * host, an Asset id -- draws nothing, so a Provider cannot make a list load pictures from elsewhere. A
 * plain `<img>` and not `next/image`: the variant is already the size it is shown at, and the optimiser
 * would fetch it again without the reader's session and cut it a second time. Lazy and decoded off the
 * main thread, because a page of a hundred rows holds a hundred of them.
 *
 * The `alt` is empty: in a list the picture stands beside the name it belongs to -- ahead of the value it
 * illustrates, or in a column whose heading says what it is, with the row's name in its own cell --
 * so it is decorative, and a screen reader that read a name again for it would read every row twice.
 * Fitted whole, never cropped: an icon or a logo that loses an edge is another mark. The corner is the
 * small step of the scale, as for any element inside a surface (THEME.md, "Control shape").
 */
function PhiRenderedImage({ address }: { address: string }) {
  const { token } = usePhiConfig();
  return (
    <img
      alt=""
      src={address}
      width={PHI_RENDERED_IMAGE_SIZE}
      height={PHI_RENDERED_IMAGE_SIZE}
      loading="lazy"
      decoding="async"
      style={{
        display: "block",
        flexShrink: 0,
        width: PHI_RENDERED_IMAGE_SIZE,
        height: PHI_RENDERED_IMAGE_SIZE,
        objectFit: "contain",
        borderRadius: token.borderRadiusSM,
      }}
    />
  );
}

/** The picture an address names, or nothing for a value that is no address on this Site. */
function renderPhiImage(value: unknown): ReactNode {
  const address = readPhiInternalPath(value);
  return address ? <PhiRenderedImage address={address} /> : null;
}

/**
 * What stands ahead of a value: a named icon (`iconFieldKey`) and a picture (`imageFieldKey`), read off
 * the same row. A name and the mark standing for it read as one thing, not as two columns that happen to
 * be adjacent. Neither there, the value is returned as it was.
 */
export type PhiRenderedValueLead = {
  icon?: unknown;
  image?: unknown;
};

export function renderPhiValueWithLead(content: ReactNode, lead: PhiRenderedValueLead): ReactNode {
  const icon = typeof lead.icon === "string" && lead.icon.trim() ? <PhiIcon name={lead.icon} /> : null;
  const image = renderPhiImage(lead.image);
  if (!icon && !image) return content;
  return (
    <PhiFlexControl align="center" gap={6} style={{ display: "inline-flex" }}>
      {image}
      {icon}
      {content}
    </PhiFlexControl>
  );
}

const PHI_RENDERED_STACK_STYLE = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  minWidth: 0,
} as const;

/*
 * The line under a value: muted, a step smaller than the value it stands under, and set in by the
 * smallest step of the spacing scale, so it reads as said about the value rather than as one more value.
 * `smaller` and not a size of the scale: a Table's cells already write at the Theme's smallest text size
 * (`fontSizeSM`), and the line has to stand below whatever its cell writes at.
 */
const PHI_RENDERED_SECONDARY_STYLE = {
  color: PHI_COLOR.textSecondary,
  fontSize: "smaller",
  paddingInlineStart: PHI_SPACE.xxs,
  maxWidth: "100%",
} as const;

/**
 * A value with a second one under it (`PhiTableColumnSecondaryValue`): the value as it was drawn, and on a
 * line of its own the second, muted and smaller. Nothing to say under it -- no value and no `emptyText` --
 * and the value is returned as it was, so a row without the second field looks like a row of a column
 * that has none.
 */
export function renderPhiValueWithSecondary(content: ReactNode, secondary: ReactNode): ReactNode {
  if (secondary == null || secondary === "" || secondary === false) return content;
  return (
    <span style={PHI_RENDERED_STACK_STYLE}>
      <span style={{ maxWidth: "100%" }}>{content}</span>
      <span style={PHI_RENDERED_SECONDARY_STYLE}>{secondary}</span>
    </span>
  );
}

export function renderPhiValueContent(
  value: unknown,
  definition: PhiRenderedValueDefinition,
  labels: PhiRenderedValueLabels,
  presentation: PhiRenderedValuePresentation = "cell",
): ReactNode {
  /*
   * No value is no renderer's to draw: a `datetime` has no date to format and `valueMap` maps values,
   * not their absence. What the column says for it stands in their place, as text.
   */
  if (definition.emptyText && (value == null || value === "" || (Array.isArray(value) && value.length === 0))) {
    return definition.emptyText;
  }
  if (value == null || value === "") return null;
  /*
   * Read before anything is stringified: both are objects, and a value that is not one of them draws
   * nothing rather than its JSON -- a cell that says `{"currency":"CHF"}` is no amount of money.
   */
  if (definition.renderer === "money") {
    const money = readPhiMoneyValues(value);
    return money ? <PhiRenderedMoney value={money} /> : null;
  }
  if (definition.renderer === "interval") {
    const interval = readPhiIntervalValue(value);
    return interval ? formatPhiInterval(interval, labels.interval) : null;
  }
  if (definition.renderer === "image") return renderPhiImage(value);
  const normalizedValue = normalizePhiRenderedText(value);
  const displayValue = definition.valueMap?.[normalizedValue] ?? normalizedValue;
  if (definition.renderer === "email" || definition.renderer === "link") {
    const href = String(value);
    return <PhiLink href={definition.renderer === "email" ? `mailto:${href}` : href} markExternal>{displayValue}</PhiLink>;
  }
  if (definition.renderer === "tags") {
    const values = Array.isArray(value) ? value : [value];
    return (
      <PhiFlexControl align="center" gap={4} wrap style={{ display: "inline-flex", maxWidth: "100%" }}>
        {values.map((entry, index) => {
          const normalizedEntry = normalizePhiRenderedText(entry);
          return (
            <PhiRenderedTag
              color={resolveTagColor(definition.tagColorMap?.[normalizedEntry])}
              key={`${normalizedEntry}:${index}`}
              variant={definition.tagVariant ?? "outlined"}
              text={definition.valueMap?.[normalizedEntry] ?? normalizedEntry}
            />
          );
        })}
      </PhiFlexControl>
    );
  }
  if (definition.renderer === "date" || definition.renderer === "datetime") {
    return <PhiRenderedDate value={normalizedValue} withTime={definition.renderer === "datetime"} />;
  }
  if (definition.renderer === "json" && presentation === "block") {
    return (
      <PhiTypographyControl code style={{ display: "block", whiteSpace: "pre-wrap" }}>
        {JSON.stringify(value, null, 2)}
      </PhiTypographyControl>
    );
  }
  if (definition.renderer === "json" || definition.renderer === "code") {
    return <PhiTypographyControl code>{displayValue}</PhiTypographyControl>;
  }
  if (definition.renderer === "badge") {
    return (
      <PhiRenderedTag
        color={resolveTagColor(definition.tagColorMap?.[normalizedValue])}
        variant={definition.tagVariant ?? "outlined"}
        text={displayValue}
      />
    );
  }
  if (definition.renderer === "switch" || definition.renderer === "checkbox") {
    return <PhiIcon name={value === true ? "check" : "close"} />;
  }
  if (definition.renderer === "icon") return typeof value === "string" && value.trim() ? <PhiIcon name={value} /> : null;
  return displayValue;
}
