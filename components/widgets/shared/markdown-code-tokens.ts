/**
 * What a fenced code block is made of, for a reader rather than for a compiler.
 *
 * A code sample on a page is read, not run, and what a reader needs from colour is small: where the
 * prose in the comments is, where a literal value stands, which word is the language's own. That is
 * the handful of kinds below, and it is deliberately not a grammar. This scans once, left to right,
 * and knows only comments, strings, numbers, words and everything else -- no parser, no scopes, no
 * idea what a type or a JSX element is.
 *
 * Said this way, and not with a highlighter off the shelf, for two reasons. The colours have to be
 * the Site's: every kind here resolves against the Theme palette's own seeds in the Markdown Client,
 * so a Site that repaints its palette repaints its samples and both halves of the Theme come out
 * right. A packaged highlighter brings its own palette and its own class names, and every one of
 * them would have to be mapped back onto these kinds anyway. And this package installs unbundled
 * into every Site, so a dependency here is a dependency everywhere.
 *
 * What it cannot do, plainly: no tag-aware HTML or JSX, no interpolation inside a template literal,
 * no here-documents, no regular-expression literals. Those come out as ordinary text -- the same
 * answer an unnamed language gets, and the same answer this file will keep giving until somebody has
 * a reason to trade it for a real grammar.
 */

/** Every kind a token can have. The Markdown Client gives each one a colour; nothing else reads them. */
export const PHI_CODE_TOKEN_KINDS = [
  "plain",
  "comment",
  "string",
  "number",
  "keyword",
  "literal",
  "function",
  "property",
  "punctuation",
] as const;

export type PhiCodeTokenKind = (typeof PHI_CODE_TOKEN_KINDS)[number];

export type PhiCodeToken = {
  kind: PhiCodeTokenKind;
  text: string;
};

type PhiCodeLanguageRule = {
  /** Every other spelling a fence may use for this language. The canonical name is the record key. */
  aliases: readonly string[];
  /** The language's own words. Matched whole, lowercased first where the language ignores case. */
  keywords: readonly string[];
  /** Words that are a value rather than an instruction: `true`, `null`, `NULL`. */
  literals: readonly string[];
  /** Markers that comment out the rest of the line. */
  lineComments: readonly string[];
  /** Opening and closing marker of a comment that spans lines, where the language has one. */
  blockComment: readonly [string, string] | null;
  /** The quote characters that open a string. */
  quotes: readonly string[];
  /**
   * The quotes a string may cross a line break inside.
   *
   * Every other quote ends with its line even when it is never closed. A sample is often a fragment,
   * and one apostrophe in a fragment must not paint the rest of the block as a string.
   */
  multilineQuotes: readonly string[];
  /** Whether a backslash inside a string escapes the character after it. */
  backslashEscapes: boolean;
  /**
   * Whether a hyphen belongs to the word around it.
   *
   * True where a name is written with one and reads as a whole: a CSS custom property, a YAML key, a
   * long command-line flag. False where a hyphen between two words is arithmetic.
   */
  hyphenatedWords: boolean;
  /**
   * Whether a word or string that a colon follows is a key.
   *
   * True for the languages that are mostly keys and values. Not for the ones where a colon is also a
   * type annotation or a ternary, where it would colour half the identifiers on the page.
   */
  colonMakesProperty: boolean;
  /** Whether the language's own words may be written in any case. SQL says yes. */
  caseInsensitiveWords: boolean;
};

const JS_LIKE_KEYWORDS = [
  "abstract", "accessor", "as", "asserts", "async", "await", "break", "case", "catch", "class",
  "const", "continue", "declare", "default", "delete", "do", "else", "enum", "export", "extends",
  "finally", "for", "from", "function", "get", "if", "implements", "import", "in", "infer",
  "instanceof", "interface", "is", "keyof", "let", "namespace", "new", "of", "override", "private",
  "protected", "public", "readonly", "return", "satisfies", "set", "static", "super", "switch",
  "this", "throw", "try", "type", "typeof", "var", "void", "while", "with", "yield",
] as const;

/**
 * The languages a code fence can name.
 *
 * Six, because these are the six a Phi installation is written about in: the Site's own code, the
 * configuration it reads, the commands an operator types, the schema underneath, and the stylesheet.
 * A fence naming anything else is printed as it was written -- see `resolvePhiCodeLanguage`.
 */
const PHI_CODE_LANGUAGES: Record<string, PhiCodeLanguageRule> = {
  typescript: {
    aliases: ["ts", "tsx", "js", "jsx", "javascript", "mjs", "cjs", "mts", "cts"],
    keywords: JS_LIKE_KEYWORDS,
    literals: ["true", "false", "null", "undefined", "NaN", "Infinity"],
    lineComments: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'", "`"],
    multilineQuotes: ["`"],
    backslashEscapes: true,
    hyphenatedWords: false,
    colonMakesProperty: false,
    caseInsensitiveWords: false,
  },
  json: {
    aliases: ["jsonc", "json5"],
    keywords: [],
    literals: ["true", "false", "null"],
    lineComments: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"'],
    multilineQuotes: [],
    backslashEscapes: true,
    hyphenatedWords: false,
    colonMakesProperty: true,
    caseInsensitiveWords: false,
  },
  bash: {
    aliases: ["sh", "shell", "zsh", "console", "shell-session"],
    keywords: [
      "case", "declare", "do", "done", "elif", "else", "esac", "exit", "export", "fi", "for",
      "function", "if", "in", "local", "readonly", "return", "select", "set", "shift", "source",
      "then", "trap", "unset", "until", "while",
    ],
    literals: ["true", "false"],
    lineComments: ["#"],
    blockComment: null,
    quotes: ['"', "'"],
    multilineQuotes: [],
    backslashEscapes: true,
    hyphenatedWords: true,
    colonMakesProperty: false,
    caseInsensitiveWords: false,
  },
  sql: {
    aliases: ["postgresql", "postgres", "psql"],
    keywords: [
      "all", "alter", "and", "as", "asc", "begin", "between", "by", "cascade", "case", "check",
      "commit", "constraint", "create", "default", "delete", "desc", "distinct", "drop", "else",
      "end", "exists", "foreign", "from", "full", "group", "having", "if", "in", "index", "inner",
      "insert", "into", "is", "join", "key", "left", "like", "limit", "not", "offset", "on",
      "or", "order", "outer", "primary", "references", "returning", "right", "rollback", "select",
      "set", "table", "then", "union", "unique", "update", "using", "values", "view", "when",
      "where", "with",
    ],
    literals: ["null", "true", "false"],
    lineComments: ["--"],
    blockComment: ["/*", "*/"],
    quotes: ["'", '"'],
    multilineQuotes: [],
    backslashEscapes: false,
    hyphenatedWords: false,
    colonMakesProperty: false,
    caseInsensitiveWords: true,
  },
  yaml: {
    aliases: ["yml"],
    keywords: [],
    literals: ["true", "false", "null", "yes", "no", "on", "off"],
    lineComments: ["#"],
    blockComment: null,
    quotes: ['"', "'"],
    multilineQuotes: [],
    backslashEscapes: true,
    hyphenatedWords: true,
    colonMakesProperty: true,
    caseInsensitiveWords: false,
  },
  css: {
    aliases: ["scss", "less"],
    keywords: [],
    literals: [],
    lineComments: ["//"],
    blockComment: ["/*", "*/"],
    quotes: ['"', "'"],
    multilineQuotes: [],
    backslashEscapes: true,
    hyphenatedWords: true,
    colonMakesProperty: true,
    caseInsensitiveWords: false,
  },
};

/**
 * Which language a fence names, or nothing.
 *
 * Markdown puts the whole info string after the backticks and remark hands over its first word as
 * `lang`. An empty fence and a fence naming a language this file does not know both answer `null`,
 * and such a block is printed as it was written. That is the answer, not a shortfall to paper over:
 * colouring a sample by guessing at its language is worse than not colouring it.
 */
export function resolvePhiCodeLanguage(fence: string | null | undefined): string | null {
  const name = (fence ?? "").trim().toLowerCase();

  if (name.length === 0) {
    return null;
  }

  if (Object.hasOwn(PHI_CODE_LANGUAGES, name)) {
    return name;
  }

  for (const [canonical, rule] of Object.entries(PHI_CODE_LANGUAGES)) {
    if (rule.aliases.includes(name)) {
      return canonical;
    }
  }

  return null;
}

function isDigit(char: string) {
  return char >= "0" && char <= "9";
}

function isWordStart(char: string, rule: PhiCodeLanguageRule) {
  return /[A-Za-z_$]/.test(char) || (rule.hyphenatedWords && char === "-");
}

function isWordPart(char: string, rule: PhiCodeLanguageRule) {
  return /[A-Za-z0-9_$]/.test(char) || (rule.hyphenatedWords && char === "-");
}

/** Where the quoted run that opens at `start` ends, past the closing quote where there is one. */
function readStringEnd(text: string, start: number, quote: string, rule: PhiCodeLanguageRule) {
  const multiline = rule.multilineQuotes.includes(quote);
  let index = start + quote.length;

  while (index < text.length) {
    const char = text[index]!;

    if (rule.backslashEscapes && char === "\\") {
      index += 2;
      continue;
    }

    if (!multiline && char === "\n") {
      return index;
    }

    if (text.startsWith(quote, index)) {
      return index + quote.length;
    }

    index += 1;
  }

  return text.length;
}

/**
 * Where the number that opens at `start` ends, or `start` itself when no number opens there.
 *
 * One reading for every language, because none of the six disagree about what a number looks like.
 * Returning `start` is how the caller learns that a leading sign was arithmetic after all.
 */
function readNumberEnd(text: string, start: number) {
  let index = start;

  if (text[index] === "-" || text[index] === "+") {
    index += 1;
  }

  if (/^0[xbo]/i.test(text.slice(index, index + 2))) {
    index += 2;
    while (index < text.length && /[0-9A-Fa-f_]/.test(text[index]!)) index += 1;
    return index;
  }

  if (!isDigit(text[index] ?? "") && !(text[index] === "." && isDigit(text[index + 1] ?? ""))) {
    return start;
  }

  while (index < text.length && /[0-9_]/.test(text[index]!)) index += 1;

  if (text[index] === ".") {
    index += 1;
    while (index < text.length && /[0-9_]/.test(text[index]!)) index += 1;
  }

  if (/[eE]/.test(text[index] ?? "")) {
    const exponent = index + (/[+-]/.test(text[index + 1] ?? "") ? 2 : 1);
    if (isDigit(text[exponent] ?? "")) {
      index = exponent + 1;
      while (index < text.length && isDigit(text[index]!)) index += 1;
    }
  }

  if (text[index] === "n") index += 1;

  return index;
}

/** Whether `character` is the next thing on the line, spaces and tabs aside. */
function nextNonSpaceIs(text: string, from: number, character: string) {
  let index = from;
  while (index < text.length && (text[index] === " " || text[index] === "\t")) index += 1;
  return text[index] === character;
}

function classifyWord(word: string, text: string, end: number, rule: PhiCodeLanguageRule): PhiCodeTokenKind {
  const compared = rule.caseInsensitiveWords ? word.toLowerCase() : word;

  if (rule.literals.includes(compared)) return "literal";
  if (rule.keywords.includes(compared)) return "keyword";
  if (rule.colonMakesProperty && nextNonSpaceIs(text, end, ":")) return "property";
  if (nextNonSpaceIs(text, end, "(")) return "function";

  return "plain";
}

/**
 * One code block, in the pieces the Client colours.
 *
 * Neighbouring pieces of the same kind are one token -- whitespace joins the plain text around it --
 * and a block whose language is unknown comes back as a single plain one. The tokens concatenated are
 * always the text that went in, character for character: nothing is dropped, escaped or reflowed
 * here, because the Client puts it in a `<pre>` where every space still counts.
 */
export function tokenizePhiCode(text: string, language: string | null): PhiCodeToken[] {
  if (text.length === 0) {
    return [];
  }

  const rule = language == null ? null : PHI_CODE_LANGUAGES[language] ?? null;

  if (rule == null) {
    return [{ kind: "plain", text }];
  }

  const tokens: PhiCodeToken[] = [];
  const push = (kind: PhiCodeTokenKind, value: string) => {
    if (value.length === 0) return;
    const last = tokens.at(-1);
    if (last != null && last.kind === kind) {
      last.text += value;
      return;
    }
    tokens.push({ kind, text: value });
  };

  let index = 0;

  while (index < text.length) {
    if (rule.blockComment != null && text.startsWith(rule.blockComment[0], index)) {
      const closed = text.indexOf(rule.blockComment[1], index + rule.blockComment[0].length);
      const end = closed === -1 ? text.length : closed + rule.blockComment[1].length;
      push("comment", text.slice(index, end));
      index = end;
      continue;
    }

    const lineComment = rule.lineComments.find((marker) => text.startsWith(marker, index));
    if (lineComment != null) {
      const newline = text.indexOf("\n", index);
      const end = newline === -1 ? text.length : newline;
      push("comment", text.slice(index, end));
      index = end;
      continue;
    }

    const quote = rule.quotes.find((candidate) => text.startsWith(candidate, index));
    if (quote != null) {
      const end = readStringEnd(text, index, quote, rule);
      push(rule.colonMakesProperty && nextNonSpaceIs(text, end, ":") ? "property" : "string", text.slice(index, end));
      index = end;
      continue;
    }

    const numberEnd = readNumberEnd(text, index);
    if (numberEnd > index) {
      push("number", text.slice(index, numberEnd));
      index = numberEnd;
      continue;
    }

    const char = text[index]!;

    if (isWordStart(char, rule)) {
      let end = index + 1;
      while (end < text.length && isWordPart(text[end]!, rule)) end += 1;
      const word = text.slice(index, end);
      push(classifyWord(word, text, end, rule), word);
      index = end;
      continue;
    }

    if (/\s/.test(char)) {
      let end = index + 1;
      while (end < text.length && /\s/.test(text[end]!)) end += 1;
      push("plain", text.slice(index, end));
      index = end;
      continue;
    }

    push("punctuation", char);
    index += 1;
  }

  return tokens;
}
