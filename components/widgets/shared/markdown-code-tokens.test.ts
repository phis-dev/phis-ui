import { describe, expect, it } from "vitest";

import { resolvePhiCodeLanguage, tokenizePhiCode, type PhiCodeToken } from "./markdown-code-tokens";

/**
 * Colouring a code sample, and the two promises that go with it.
 *
 * The first is that nothing is lost: whatever the tokens are, put back together they are the sample
 * that was written, down to the last space. A highlighter that quietly drops a character is worse
 * than none, because the reader copies what they see.
 *
 * The second is that a sample is usually a fragment. One apostrophe in a comment-less line, one
 * unclosed brace, one `-` that was arithmetic -- none of them may paint the rest of the block.
 */

function joined(tokens: PhiCodeToken[]) {
  return tokens.map((token) => token.text).join("");
}

/**
 * The kind of the token that covers where `needle` stands in the source.
 *
 * Asked by position rather than by text, because neighbouring pieces of the same kind are one token
 * on purpose: an ordinary identifier comes back inside the run of plain text around it, and looking
 * for it by its own spelling would find nothing.
 */
function kindAt(tokens: PhiCodeToken[], source: string, needle: string) {
  const offset = source.indexOf(needle);
  let start = 0;

  for (const token of tokens) {
    if (offset >= start && offset < start + token.text.length) {
      return token.kind;
    }
    start += token.text.length;
  }

  return null;
}

function kindsOf(tokens: PhiCodeToken[], text: string) {
  return tokens.filter((token) => token.text === text).map((token) => token.kind);
}

describe("which language a fence names", () => {
  it("takes the canonical name and every spelling of it", () => {
    expect(resolvePhiCodeLanguage("typescript")).toBe("typescript");
    expect(resolvePhiCodeLanguage("TSX")).toBe("typescript");
    expect(resolvePhiCodeLanguage(" yml ")).toBe("yaml");
    expect(resolvePhiCodeLanguage("console")).toBe("bash");
    expect(resolvePhiCodeLanguage("psql")).toBe("sql");
  });

  it("answers nothing for a fence that names nothing, and for one this house does not read", () => {
    expect(resolvePhiCodeLanguage(null)).toBeNull();
    expect(resolvePhiCodeLanguage("")).toBeNull();
    expect(resolvePhiCodeLanguage("   ")).toBeNull();
    expect(resolvePhiCodeLanguage("brainfuck")).toBeNull();
  });
});

describe("what a block comes back as", () => {
  it("is one plain token when no language was named", () => {
    const source = "const x = 1;\n// not read as TypeScript\n";
    expect(tokenizePhiCode(source, null)).toEqual([{ kind: "plain", text: source }]);
  });

  it("is nothing at all for an empty block", () => {
    expect(tokenizePhiCode("", "typescript")).toEqual([]);
  });

  it("never loses a character, in any of the languages", () => {
    const samples: [string, string][] = [
      ["typescript", "export const a = `x\n${y}`; // tail\n\tindented\n"],
      ["json", '{\n  "a": [1, 2.5e3, true, null]\n}\n'],
      ["bash", "phis site list --key skeleton # a comment\n"],
      ["sql", "SELECT count(*) FROM phis.sites WHERE key = 'skeleton';\n"],
      ["yaml", "database:\n  uri: 'postgres://x'\n  pool: 4\n"],
      ["css", ":root { --phi-slot-inline-margin-start: -8px; }\n"],
    ];

    for (const [language, source] of samples) {
      expect(joined(tokenizePhiCode(source, language))).toBe(source);
    }
  });

  it("never emits an empty token", () => {
    const tokens = tokenizePhiCode("const a = {};\n\n\n/* */ 0x1f 1_000n .5 +2 -3\n", "typescript");
    expect(tokens.every((token) => token.text.length > 0)).toBe(true);
  });
});

describe("what the kinds say", () => {
  it("reads TypeScript's own words, its values and its prose apart", () => {
    const source = "// why\nexport const count = readCount(42, true);\n";
    const tokens = tokenizePhiCode(source, "typescript");

    expect(kindsOf(tokens, "// why")).toEqual(["comment"]);
    expect(kindsOf(tokens, "export")).toEqual(["keyword"]);
    expect(kindsOf(tokens, "const")).toEqual(["keyword"]);
    expect(kindsOf(tokens, "readCount")).toEqual(["function"]);
    expect(kindAt(tokens, source, "count =")).toBe("plain");
    expect(kindsOf(tokens, "42")).toEqual(["number"]);
    expect(kindsOf(tokens, "true")).toEqual(["literal"]);
  });

  it("calls a JSON key a key and a JSON value a string", () => {
    const tokens = tokenizePhiCode('{ "uri": "postgres://x" }', "json");

    expect(kindsOf(tokens, '"uri"')).toEqual(["property"]);
    expect(kindsOf(tokens, '"postgres://x"')).toEqual(["string"]);
  });

  it("reads a YAML key without its quotes, hyphen and all", () => {
    const tokens = tokenizePhiCode("source-locale: en\nenabled: true\n", "yaml");

    expect(kindsOf(tokens, "source-locale")).toEqual(["property"]);
    expect(kindsOf(tokens, "true")).toEqual(["literal"]);
  });

  it("keeps a CSS custom property in one piece and still sees a negative length", () => {
    const tokens = tokenizePhiCode(":root { --phi-gap: -8px; }", "css");

    expect(kindsOf(tokens, "--phi-gap")).toEqual(["property"]);
    expect(kindsOf(tokens, "-8")).toEqual(["number"]);
  });

  it("keeps a long command-line flag in one piece", () => {
    const source = "phis site list --key skeleton";
    const tokens = tokenizePhiCode(source, "bash");

    expect(kindAt(tokens, source, "--key")).toBe("plain");
    expect(tokens.some((token) => token.text.includes("-"))).toBe(true);
    expect(tokens.some((token) => token.kind === "punctuation")).toBe(false);
  });

  it("reads SQL's words in whatever case they were written", () => {
    const source = "select * from sites where id = 1;";
    const tokens = tokenizePhiCode(source, "sql");

    expect(kindsOf(tokens, "select")).toEqual(["keyword"]);
    expect(kindsOf(tokens, "from")).toEqual(["keyword"]);
    expect(kindAt(tokens, source, "sites")).toBe("plain");
  });
});

describe("what a fragment must not do", () => {
  it("ends an unclosed quote with its line", () => {
    const tokens = tokenizePhiCode("const a = 'don\nconst b = 1;\n", "typescript");

    expect(kindsOf(tokens, "const").length).toBe(2);
    expect(kindsOf(tokens, "1")).toEqual(["number"]);
  });

  it("lets a template literal cross the line break it was written across", () => {
    const tokens = tokenizePhiCode("const a = `one\ntwo`;\nconst b = 2;\n", "typescript");

    expect(kindsOf(tokens, "`one\ntwo`")).toEqual(["string"]);
    expect(kindsOf(tokens, "2")).toEqual(["number"]);
  });

  it("reads an unclosed block comment to the end, because that is what it is", () => {
    const tokens = tokenizePhiCode("/* open\nstill open\n", "typescript");

    expect(tokens).toEqual([{ kind: "comment", text: "/* open\nstill open\n" }]);
  });

  it("does not read a hyphen between two words as part of them", () => {
    const source = "const a = b - c;";
    const tokens = tokenizePhiCode(source, "typescript");

    expect(kindsOf(tokens, "-")).toEqual(["punctuation"]);
    expect(kindAt(tokens, source, "b -")).toBe("plain");
  });
});
