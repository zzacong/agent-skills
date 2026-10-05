/**
 * Focused tests for the Markdown wrapper.
 *
 * Run with: bun test
 */

import { describe, expect, test } from "bun:test";

import { textWidth } from "./text-width.ts";
import { splitLines, unifiedDiff } from "./unified-diff.ts";
import { wrapMarkdown } from "./wrap-markdown.ts";

const wrap = wrapMarkdown;

describe("verbatim blocks", () => {
  // Anything that is not prose must survive byte for byte.
  const unchanged = (text: string) => expect(wrap(text, 80)).toBe(text);

  test("front matter", () => {
    unchanged(
      "---\ntitle: A very long front matter value that would definitely be reflowed by a naive wrapper\n---\n\nProse.\n",
    );
  });

  test("fenced code", () => {
    unchanged(
      '```ts\nconst x = "a very long line that must never be touched here";\n```\n',
    );
  });

  test("tilde fence", () => {
    unchanged(
      "~~~md\na very long line inside a tilde fence that must not be touched at all\n~~~\n",
    );
  });

  test("math fence", () => {
    unchanged(
      "$$\na very long line inside a math fence that must not be touched at all\n$$\n",
    );
  });

  test("unclosed fence runs to end of file", () => {
    unchanged(
      "```\nstill code, and a very long line that must not be wrapped at all here\n",
    );
  });

  test("indented code", () => {
    unchanged(
      "    an indented code block line that is long and must not be reflowed\n",
    );
  });

  test("table", () => {
    unchanged(
      "| a | b |\n| --- | --- |\n| a very long cell value | another long cell |\n",
    );
  });

  test("headings and breaks", () => {
    unchanged(
      "# A heading long enough that a careless wrapper would reflow it badly\n\n---\n",
    );
  });

  test("setext heading", () => {
    unchanged(
      "A setext heading that is long enough to be reflowed by a careless wrapper\n===\n",
    );
  });

  test("html block", () => {
    unchanged(
      "<div>\n  <p>raw html that is long enough to be reflowed by a careless wrapper</p>\n</div>\n",
    );
  });

  test("directive fence", () => {
    unchanged(
      ":::note\nA directive body line long enough to be reflowed by a careless wrapper\n:::\n",
    );
  });

  test("link reference definition", () => {
    unchanged(
      "[ref]: https://example.com/a/very/long/reference/definition/target\n",
    );
  });

  test("line with pipe is left alone", () => {
    unchanged(
      "a paragraph line that contains a | pipe character and stays exactly as it is\n",
    );
  });
});

describe("prose wrapping", () => {
  test("paragraph is filled to width", () => {
    const out = wrap(
      "one two three four five six seven eight nine ten eleven twelve\n",
      20,
    );
    expect(out).toBe(
      "one two three four\nfive six seven eight\nnine ten eleven\ntwelve\n",
    );
    expect(splitLines(out).every((line) => line.length <= 20)).toBe(true);
  });

  test("single word longer than width is not broken", () => {
    const url = "https://example.com/" + "a".repeat(60);
    expect(wrap(`see ${url}\n`, 20)).toContain(url);
  });

  test("hard break with two spaces is preserved", () => {
    expect(wrap("alpha beta  \ngamma delta\n", 80)).toBe(
      "alpha beta  \ngamma delta\n",
    );
  });

  test("hard break with backslash is preserved", () => {
    expect(wrap("alpha beta\\\ngamma delta\n", 80)).toBe(
      "alpha beta\\\ngamma delta\n",
    );
  });

  test("idempotent", () => {
    const once = wrap(
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu\n",
      40,
    );
    expect(wrap(once, 40)).toBe(once);
  });

  test("cjk counts as two columns", () => {
    const out = splitLines(
      wrap("中文文字测试 中文文字测试 中文文字测试 中文文字测试\n", 20),
    );
    expect(out.length).toBeGreaterThan(1);
    for (const line of out) expect(textWidth(line)).toBeLessThanOrEqual(20);
  });

  test("unspaced cjk run wraps at character boundaries", () => {
    const out = splitLines(wrap("中文字符测试中文字符测试中文字符测试\n", 12));
    expect(out.length).toBeGreaterThan(1);
    for (const line of out) expect(textWidth(line)).toBeLessThanOrEqual(12);
    expect(out.join("")).toBe("中文字符测试中文字符测试中文字符测试");
  });

  test("astral emoji is measured once, not twice", () => {
    // A surrogate pair is two UTF-16 units but one code point and two columns.
    expect(textWidth("🎉")).toBe(2);
    expect(textWidth("a🎉")).toBe(3);
  });

  test("combining marks take no columns", () => {
    expect(textWidth("é")).toBe(1);
  });
});

describe("containers", () => {
  test("blockquote keeps marker and wraps", () => {
    const out = splitLines(
      wrap("> alpha beta gamma delta epsilon zeta eta theta iota kappa\n", 20),
    );
    expect(out.every((line) => line.startsWith("> "))).toBe(true);
    for (const line of out) expect(line.length).toBeLessThanOrEqual(20);
  });

  test("blank quote line keeps marker", () => {
    expect(wrap("> alpha\n>\n> beta\n", 80)).toBe("> alpha\n>\n> beta\n");
  });

  test("list item hanging indent", () => {
    expect(
      wrap("- alpha beta gamma delta epsilon zeta eta theta iota kappa\n", 20),
    ).toBe(
      "- alpha beta gamma\n  delta epsilon\n  zeta eta theta\n  iota kappa\n",
    );
  });

  test("ordered list marker width counts toward limit", () => {
    const out = splitLines(
      wrap("1. alpha beta gamma delta epsilon zeta eta theta iota kappa\n", 20),
    );
    for (const line of out) expect(line.length).toBeLessThanOrEqual(20);
  });

  test("loose item keeps inner paragraph indented", () => {
    const out = wrap(
      "1. alpha\n\n   beta gamma delta epsilon zeta eta theta iota kappa\n",
      20,
    );
    expect(out).toContain("   beta");
    for (const line of splitLines(out))
      expect(line.length).toBeLessThanOrEqual(20);
  });

  test("hard break inside list item survives", () => {
    // A list item's continuation lines must not be right-stripped, or the two
    // trailing spaces that encode a hard break are lost.
    expect(wrap("- alpha beta gamma delta  \n  epsilon zeta\n", 80)).toBe(
      "- alpha beta gamma delta  \n  epsilon zeta\n",
    );
  });

  test("hard break ending a wrapped item line", () => {
    const out = wrap(
      "- alpha beta gamma delta epsilon zeta eta theta iota  \n  kappa\n",
      20,
    );
    expect(splitLines(out).some((line) => line.endsWith("  "))).toBe(true);
  });

  test("blockquote inside list item", () => {
    const out = wrap(
      "- alpha\n\n  > beta gamma delta epsilon zeta eta theta iota kappa\n",
      20,
    );
    expect(splitLines(out).some((line) => line.trim().startsWith(">"))).toBe(
      true,
    );
    for (const line of splitLines(out))
      expect(line.length).toBeLessThanOrEqual(20);
  });

  test("nested blockquote", () => {
    const out = splitLines(
      wrap(
        "> > alpha beta gamma delta epsilon zeta eta theta iota kappa\n",
        24,
      ),
    );
    expect(out.every((line) => line.startsWith("> > "))).toBe(true);
    for (const line of out) expect(line.length).toBeLessThanOrEqual(24);
  });
});

describe("file fidelity", () => {
  test("crlf is preserved", () => {
    expect(wrap("alpha beta\r\n\r\ngamma\r\n", 80)).toBe(
      "alpha beta\r\n\r\ngamma\r\n",
    );
  });

  test("missing final newline is preserved", () => {
    expect(wrap("alpha beta", 80)).toBe("alpha beta");
  });

  test("empty file", () => {
    expect(wrap("", 80)).toBe("");
  });
});

describe("unified diff", () => {
  const diff = (before: string, after: string) =>
    unifiedDiff(splitLines(before), splitLines(after), {
      fromFile: "f.md",
      toFile: "f.md",
    });

  test("identical input produces no diff", () => {
    expect(diff("a\nb\n", "a\nb\n")).toBe("");
  });

  test("headers and hunk marker", () => {
    expect(diff("a\n", "b\n")).toBe(
      "--- f.md\n+++ f.md\n@@ -1 +1 @@\n-a\n+b\n",
    );
  });

  test("single-line ranges omit the count", () => {
    expect(diff("a\n", "z\n")).toContain("@@ -1 +1 @@");
  });

  test("counts appear for multi-line ranges", () => {
    expect(diff("a\nb\nc\n", "a\nB\nc\n")).toContain("@@ -1,3 +1,3 @@");
  });

  test("hunks are separated by more than 2x context", () => {
    const before = Array.from({ length: 40 }, (_, i) => `line ${i}`);
    const after = [...before];
    after[0] = "changed head";
    after[39] = "changed tail";
    const output = diff(before.join("\n") + "\n", after.join("\n") + "\n");
    expect(output.match(/^@@/gm)?.length).toBe(2);
  });

  test("additions shift the to-range", () => {
    const output = diff("a\nb\n", "a\nnew\nb\n");
    expect(output).toContain("@@ -1,2 +1,3 @@");
    expect(output).toContain("+new");
  });
});
