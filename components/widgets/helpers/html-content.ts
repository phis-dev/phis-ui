import sanitizeHtml from "sanitize-html";

const PHI_HTML_WIDGET_ALLOWED_TAGS = [
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "img",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "u",
  "ul",
] as const;

const PHI_HTML_WIDGET_ALLOWED_ATTRIBUTES = {
  "*": ["style"],
  a: ["href", "rel", "target", "title", "style"],
  img: ["src", "alt", "title", "width", "height", "style"],
};

const PHI_HTML_WIDGET_ALLOWED_SCHEMES = ["http", "https", "mailto", "tel"];
const PHI_HTML_WIDGET_ALLOWED_COLOR_STYLES = [
  /^#[0-9a-fA-F]{3,8}$/,
  /^rgb(a)?\((?:[^()]|\([^()]*\))*\)$/,
  /^hsl(a)?\((?:[^()]|\([^()]*\))*\)$/,
];
const PHI_HTML_WIDGET_ALLOWED_TEXT_ALIGN_STYLES = [/^(left|center|right|justify)$/];
/**
 * An image sizes itself either through its HTML attributes, which take bare pixels, or -- for the
 * relative widths editorial layouts rely on -- through inline style. Only `img` may carry these, and
 * only as a bounded length: no `calc()`, no `var()`, no keyword, nothing that could reach outside the
 * element's own box. The authoritative copy of this policy is `sanitizePhiPersistedHtml` in
 * `phi-server`, which decides what is persisted; this one only decides what authoring shows, so the
 * two must stay in step or an author edits a size the write endpoint then drops.
 */
const PHI_HTML_WIDGET_ALLOWED_IMAGE_LENGTH_STYLES = [/^\d{1,5}(?:\.\d{1,4})?(?:px|%|em|rem|vw|vh)$/];
const PHI_HTML_WIDGET_TRAILING_EMPTY_BLOCKS_PATTERN =
  /(?:<(p|blockquote|pre)(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|\u00a0|\s)*<\/\1>\s*)+$/gi;

function trimPhiHtmlWidgetTrailingEmptyBlocks(value: string) {
  return value.replace(PHI_HTML_WIDGET_TRAILING_EMPTY_BLOCKS_PATTERN, "").trim();
}

export function sanitizePhiHtmlWidgetMarkup(
  value: string | null | undefined,
  options?: { allowInternalReferences?: boolean },
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }

  const sanitized = trimPhiHtmlWidgetTrailingEmptyBlocks(
    sanitizeHtml(value, {
    allowedTags: [...PHI_HTML_WIDGET_ALLOWED_TAGS],
    allowedAttributes: PHI_HTML_WIDGET_ALLOWED_ATTRIBUTES,
    allowedStyles: {
      "*": {
        color: PHI_HTML_WIDGET_ALLOWED_COLOR_STYLES,
        "text-align": PHI_HTML_WIDGET_ALLOWED_TEXT_ALIGN_STYLES,
      },
      img: {
        width: PHI_HTML_WIDGET_ALLOWED_IMAGE_LENGTH_STYLES,
        height: PHI_HTML_WIDGET_ALLOWED_IMAGE_LENGTH_STYLES,
      },
    },
    allowedSchemes: [
      ...PHI_HTML_WIDGET_ALLOWED_SCHEMES,
      ...(options?.allowInternalReferences ? ["phis"] : []),
    ],
    disallowedTagsMode: "discard",
    parseStyleAttributes: true,
    }),
  );

  if (sanitized.length === 0) {
    return "";
  }

  if (/<img\b/iu.test(sanitized)) {
    return sanitized;
  }

  const textOnly = sanitizeHtml(sanitized, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/gi, " ")
    .trim();

  return textOnly.length === 0 ? "" : sanitized;
}
