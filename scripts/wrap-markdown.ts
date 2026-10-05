#!/usr/bin/env bun
/**
 * Reflow Markdown prose to a column limit without mangling anything else.
 *
 * Only paragraph text is rewrapped. Everything with meaning beyond its words is
 * copied through unchanged:
 *
 *   YAML/TOML front matter, ATX and setext headings, fenced and indented code
 *   blocks (``` ~~~ ::: $$), GFM pipe tables, HTML blocks, thematic breaks, link
 *   reference definitions, and any line containing a pipe character.
 *
 * Inside blockquotes and list items the container prefix ("> ", the bullet, and
 * its hanging indent) is preserved, and hard line breaks (two trailing spaces or
 * a trailing backslash) survive as break points with their original marker.
 *
 * Usage:
 *   wrap-markdown.ts FILE...            # rewrite in place
 *   wrap-markdown.ts --diff FILE...     # print a unified diff, change nothing
 *   wrap-markdown.ts --check FILE...    # exit 1 if any file needs wrapping
 *   wrap-markdown.ts --stdout FILE      # write wrapped output to stdout
 *   wrap-markdown.ts --width 100 ...    # column limit (default 80)
 *
 * Exit codes: 0 clean, 1 --check found work to do, 2 usage/IO error.
 */

import { isBreakable, splitBreakable, textWidth } from "./text-width.ts";
import { splitLines, unifiedDiff } from "./unified-diff.ts";

// --- block syntax patterns -------------------------------------------------

const FRONT_MATTER_OPEN = /^(---|\+\+\+)\s*$/;
const FRONT_MATTER_CLOSE = /^(---|\.\.\.|\+\+\+)\s*$/;
const FENCE_OPEN = /^(\s{0,3})(`{3,}|~{3,}|:{3,}|\$\$+)(.*)$/;
const ATX_HEADING = /^ {0,3}#{1,6}(\s|$)/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-{1,})\s*$/;
const THEMATIC_BREAK = /^ {0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/;
const BULLET_ITEM = /^( *)((?:[-*+])|(?:\d{1,9}[.)]))( +)(.*)$/;
const QUOTE_LINE = /^ {0,3}> ?(.*)$/;
const HTML_BLOCK = /^ {0,3}<\/?[A-Za-z!?/]/;
const LINK_DEF = /^ {0,3}\[[^\]]+\]:\s*\S/;
const TABLE_DELIMITER = /^ {0,3}\|?[\s|:-]*-[\s|:-]*$/;
const INDENTED_CODE = /^(?:\t| {4})/;
const HARD_BREAK = /((?: {2,})|\\)\s*$/;

/** One block-level chunk of a document.
 *
 * `kind` decides how `lines` is rendered. Container nodes (blockquote, list
 * item) parse their body into `children` so that prefixes nest the way the
 * surrounding Markdown expects.
 */
type Node = {
  kind: "verbatim" | "blank" | "paragraph" | "blockquote" | "list-item";
  lines: string[];
  children: Node[];
  /** For list items: the bullet itself. */
  bullet: string;
  /** For list items: the content indent below the bullet. */
  contentIndent: number;
};

const node = (
  kind: Node["kind"],
  lines: string[] = [],
  extra: Partial<Node> = {},
): Node => ({
  kind,
  lines,
  children: [],
  bullet: "",
  contentIndent: 0,
  ...extra,
});

// --- width-aware wrapping --------------------------------------------------

/** Greedy fill for one logical line of prose.
 *
 * `literal` is the original text, used only when the segment holds no wrappable
 * words (a lone image, a bare link, a definition-ish line).
 */
function fill(
  words: string[],
  literal: string,
  firstPrefix: string,
  contPrefix: string,
  width: number,
  suffix: string,
): string[] {
  if (words.length === 0) return [firstPrefix + literal];

  // Chop wide-character runs first, using the tighter of the two budgets so
  // every piece fits on whichever line it lands on.
  const budget =
    width - Math.max(textWidth(firstPrefix), textWidth(contPrefix));
  const tokens: string[] = [];
  for (const word of words) {
    if (textWidth(word) > budget && isBreakable(word))
      tokens.push(...splitBreakable(word, budget));
    else tokens.push(word);
  }

  const out: string[] = [];
  let prefix = firstPrefix;
  let line = "";
  let lineWidth = textWidth(prefix);

  for (const token of tokens) {
    const tokenWidth = textWidth(token);
    // The first token on a line needs no leading space.
    let separator = line ? 1 : 0;
    if (line && lineWidth + separator + tokenWidth > width) {
      out.push(prefix + line);
      prefix = contPrefix;
      line = "";
      lineWidth = textWidth(prefix);
      separator = 0;
    }
    line += (separator ? " " : "") + token;
    lineWidth += separator + tokenWidth;
  }

  out.push(prefix + line + suffix);
  return out;
}

/** Rewrap a run of paragraph lines, treating hard breaks as boundaries. */
function wrapParagraph(
  lines: string[],
  firstPrefix: string,
  contPrefix: string,
  width: number,
): string[] {
  const segments: Array<{ words: string[]; literal: string; suffix: string }> =
    [];
  let words: string[] = [];
  let literal: string[] = [];

  const flush = (suffix: string): void => {
    if (words.length > 0 || literal.length > 0) {
      segments.push({
        words: [...words],
        literal: literal.join(" ").trim(),
        suffix,
      });
    }
    words = [];
    literal = [];
  };

  for (const line of lines) {
    const match = HARD_BREAK.exec(line);
    const body = (match ? line.replace(HARD_BREAK, "") : line).trim();
    words.push(...body.split(/\s+/).filter(Boolean));
    literal.push(body);
    if (match) flush(match[1]!);
  }
  flush("");

  const out: string[] = [];
  segments.forEach((segment, index) => {
    out.push(
      ...fill(
        segment.words,
        segment.literal,
        index === 0 ? firstPrefix : contPrefix,
        contPrefix,
        width,
        segment.suffix,
      ),
    );
  });
  return out;
}

// --- parsing ---------------------------------------------------------------

function isTableDelimiter(line: string): boolean {
  return line.includes("|") || TABLE_DELIMITER.test(line);
}

/** True when the line at `index` starts a block that is not a paragraph. */
function opensBlock(lines: string[], index: number): boolean {
  const line = lines[index]!;
  if (line.trim() === "") return true;
  if (
    ATX_HEADING.test(line) ||
    SETEXT_UNDERLINE.test(line) ||
    THEMATIC_BREAK.test(line)
  )
    return true;
  if (FENCE_OPEN.test(line) || QUOTE_LINE.test(line) || HTML_BLOCK.test(line))
    return true;
  if (BULLET_ITEM.test(line)) return true;
  if (
    LINK_DEF.test(line) &&
    (index + 1 === lines.length || lines[index + 1]!.trim() === "")
  )
    return true;
  return (
    line.includes("|") &&
    index + 1 < lines.length &&
    isTableDelimiter(lines[index + 1]!)
  );
}

/** Strip up to `columns` leading spaces, or one leading tab, per line. */
function dedent(lines: string[], columns: number): string[] {
  return lines.map((line) => {
    if (line.startsWith("\t")) return line.slice(1);
    let stripped = 0;
    let index = 0;
    while (stripped < columns && index < line.length && line[index] === " ") {
      stripped++;
      index++;
    }
    return line.slice(index);
  });
}

function parseFrontMatter(lines: string[]): [Node | null, number] {
  if (lines.length === 0 || !FRONT_MATTER_OPEN.test(lines[0]!))
    return [null, 0];
  for (let index = 1; index < lines.length; index++) {
    if (FRONT_MATTER_CLOSE.test(lines[index]!))
      return [node("verbatim", lines.slice(0, index + 1)), index + 1];
  }
  return [null, 0];
}

/** Escape a single character for literal use inside a RegExp. */
function escapeForRegExp(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/** Return the index just past the fence opened at `start`. */
function parseFence(lines: string[], start: number): number {
  const marker = FENCE_OPEN.exec(lines[start]!)![2]!;
  const char = marker[0]!;
  const closer = new RegExp(
    `^ {0,3}${escapeForRegExp(char)}{${marker.length},}\\s*$`,
  );
  for (let index = start + 1; index < lines.length; index++) {
    if (closer.test(lines[index]!)) return index + 1;
  }
  return lines.length;
}

function parseQuote(lines: string[], start: number): [Node, number] {
  const body: string[] = [];
  let index = start;
  while (index < lines.length) {
    const match = QUOTE_LINE.exec(lines[index]!);
    if (match) {
      body.push(match[1]!);
      index++;
      continue;
    }
    // Lazy continuation: prose following quote lines without a "> ".
    const line = lines[index]!;
    if (line.trim() !== "" && !opensBlock(lines, index)) {
      body.push(line.trim());
      index++;
      continue;
    }
    break;
  }
  return [node("blockquote", [], { children: parse(body) }), index];
}

/** True when a line carries at least `columns` of leading whitespace. */
function isIndented(line: string, columns: number): boolean {
  if (line.startsWith("\t")) return true;
  return line.length - line.trimStart().length >= columns;
}

/** Columns between a list marker and its content (CommonMark caps it at 4). */
function markerGap(space: string): number {
  return space.length <= 4 ? space.length : 1;
}

/** Collect one list item's body. Returns [body, contentIndent, nextIndex]. */
function parseListItem(
  lines: string[],
  start: number,
): [string[], number, number] {
  const match = BULLET_ITEM.exec(lines[start]!);
  const indent = match![1]!;
  const marker = match![2]!;
  const contentIndent = indent.length + marker.length + markerGap(match![3]!);
  const body: string[] = [match![4]!];

  let index = start + 1;
  while (index < lines.length) {
    const line = lines[index]!;
    if (line.trim() === "") {
      // A blank line ends the item unless indented content follows it, which
      // makes this a loose item with more blocks inside.
      let lookahead = index;
      while (lookahead < lines.length && lines[lookahead]!.trim() === "")
        lookahead++;
      if (
        lookahead >= lines.length ||
        !isIndented(lines[lookahead]!, contentIndent)
      )
        break;
      body.push(...lines.slice(index, lookahead));
      index = lookahead;
      continue;
    }
    if (isIndented(line, contentIndent)) {
      body.push(line);
      index++;
      continue;
    }
    // Lazy continuation of the item's trailing prose.
    if (!opensBlock(lines, index)) {
      body.push(line.trim());
      index++;
      continue;
    }
    break;
  }

  while (body.length > 0 && body.at(-1)!.trim() === "") body.pop();
  return [body, contentIndent, index];
}

function parseList(lines: string[], start: number): [Node[], number] {
  const items: Node[] = [];
  let index = start;
  while (index < lines.length) {
    const match = BULLET_ITEM.exec(lines[index]!);
    if (!match) break;
    const [body, contentIndent, nextIndex] = parseListItem(lines, index);
    const gap = contentIndent - match[1]!.length - match[2]!.length;
    items.push(
      node("list-item", [], {
        children: parse(dedent(body, contentIndent)),
        bullet: match[1]! + match[2]! + " ".repeat(gap),
        contentIndent,
      }),
    );
    index = nextIndex;
  }
  return [items, index];
}

/** Turn a document, or one container's body, into a flat list of blocks. */
function parse(lines: string[]): Node[] {
  const nodes: Node[] = [];
  let index = 0;

  const [frontMatter, afterFrontMatter] = parseFrontMatter(lines);
  if (frontMatter) nodes.push(frontMatter);
  index = afterFrontMatter;

  while (index < lines.length) {
    const line = lines[index]!;

    if (line.trim() === "") {
      let end = index;
      while (end < lines.length && lines[end]!.trim() === "") end++;
      nodes.push(node("blank", lines.slice(index, end)));
      index = end;
      continue;
    }

    if (FENCE_OPEN.test(line) && !INDENTED_CODE.test(line)) {
      const end = parseFence(lines, index);
      nodes.push(node("verbatim", lines.slice(index, end)));
      index = end;
      continue;
    }

    if (INDENTED_CODE.test(line)) {
      let end = index;
      while (
        end < lines.length &&
        (lines[end]!.trim() === "" || INDENTED_CODE.test(lines[end]!))
      )
        end++;
      nodes.push(node("verbatim", lines.slice(index, end)));
      index = end;
      continue;
    }

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      isTableDelimiter(lines[index + 1]!)
    ) {
      let end = index;
      while (
        end < lines.length &&
        lines[end]!.trim() !== "" &&
        lines[end]!.includes("|")
      )
        end++;
      nodes.push(node("verbatim", lines.slice(index, end)));
      index = end;
      continue;
    }

    if (
      ATX_HEADING.test(line) ||
      SETEXT_UNDERLINE.test(line) ||
      THEMATIC_BREAK.test(line)
    ) {
      nodes.push(node("verbatim", [line]));
      index++;
      continue;
    }

    if (HTML_BLOCK.test(line)) {
      let end = index;
      while (end < lines.length && lines[end]!.trim() !== "") end++;
      nodes.push(node("verbatim", lines.slice(index, end)));
      index = end;
      continue;
    }

    if (
      LINK_DEF.test(line) &&
      (index + 1 === lines.length || lines[index + 1]!.trim() === "")
    ) {
      nodes.push(node("verbatim", [line]));
      index++;
      continue;
    }

    if (QUOTE_LINE.test(line)) {
      const [parsed, next] = parseQuote(lines, index);
      nodes.push(parsed);
      index = next;
      continue;
    }

    if (BULLET_ITEM.test(line)) {
      const [items, next] = parseList(lines, index);
      nodes.push(...items);
      index = next;
      continue;
    }

    let end = index;
    while (
      end < lines.length &&
      lines[end]!.trim() !== "" &&
      !lines[end]!.includes("|") &&
      !opensBlock(lines, end)
    ) {
      end++;
    }
    if (end === index) {
      nodes.push(node("verbatim", [line]));
      index++;
      continue;
    }
    nodes.push(node("paragraph", lines.slice(index, end)));
    index = end;
  }

  return nodes;
}

// --- rendering -------------------------------------------------------------

/** Emit final lines.
 *
 * `firstPrefix` opens a block, `contPrefix` indents everything after its first
 * line, and `outer` is the number of columns the caller prepends to each
 * returned line. Wrapping happens against `width - outer` so nested prefixes
 * never push a line past the limit.
 */
function render(
  nodes: Node[],
  width: number,
  firstPrefix = "",
  contPrefix = "",
  outer = 0,
): string[] {
  const out: string[] = [];
  const budget = width - outer;
  nodes.forEach((current, position) => {
    switch (current.kind) {
      case "paragraph":
        out.push(
          ...wrapParagraph(current.lines, firstPrefix, contPrefix, budget),
        );
        break;
      case "blank": {
        // Keep container markers ("> ") so a quote or item does not end here.
        const blank = (position === 0 ? firstPrefix : contPrefix).replace(
          /\s+$/,
          "",
        );
        for (let i = 0; i < current.lines.length; i++) out.push(blank);
        break;
      }
      case "blockquote": {
        const marker = textWidth("> ");
        out.push(
          ...render(
            current.children,
            budget,
            `${firstPrefix}> `,
            `${contPrefix}> `,
            outer + marker,
          ),
        );
        break;
      }
      case "list-item": {
        // The body is already dedented, so both prefixes are plain indents.
        const added = Math.max(
          textWidth(firstPrefix) + current.bullet.length,
          textWidth(contPrefix),
        );
        const pad = " ".repeat(current.contentIndent);
        const body = render(current.children, budget, pad, pad, outer + added);
        if (body.length === 0) {
          out.push(`${firstPrefix}${current.bullet}`.replace(/\s+$/, ""));
          break;
        }
        out.push(firstPrefix + current.bullet + body[0]!.trimStart());
        // Never rstrip a content line: trailing spaces are hard breaks.
        for (const line of body.slice(1))
          out.push(line.trim() === "" ? "" : contPrefix + line);
        break;
      }
      default: {
        let prefix = firstPrefix;
        for (const line of current.lines) {
          out.push(
            line.trim() === ""
              ? `${prefix}`.replace(/\s+$/, "")
              : prefix + line,
          );
          prefix = contPrefix;
        }
      }
    }
  });
  return out;
}

/** Return `text` with its prose reflowed to `width` columns.
 *
 * Line endings and the presence of a final newline are preserved.
 */
export function wrapMarkdown(text: string, width: number): string {
  const crlf = text.includes("\r\n");
  const normalized = text.replaceAll("\r\n", "\n");

  const trailingNewline = normalized.endsWith("\n");
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") lines.pop();

  const wrapped = render(parse(lines), width);
  const result = wrapped.join("\n") + (trailingNewline ? "\n" : "");
  return crlf ? result.replaceAll("\n", "\r\n") : result;
}

// --- CLI -------------------------------------------------------------------

type Mode = "write" | "check" | "diff" | "stdout";

const USAGE = `usage: wrap-markdown.ts [--width N] [--check | --diff | --stdout] FILE...

Reflow Markdown prose to a column limit without mangling anything else.

Only paragraph text is rewrapped. Everything with meaning beyond its words is
copied through unchanged: front matter, headings, code fences, indented code,
pipe tables, HTML blocks, thematic breaks, and link reference definitions.
Blockquote markers, list hanging indents, and hard line breaks are preserved.

options:
  -w, --width N   column limit (default: 80)
  --check         exit 1 if any file needs wrapping, change nothing
  --diff          print a unified diff instead of writing
  --stdout        print the wrapped file to stdout
  -h, --help      show this message
`;

function parseArgs(
  argv: string[],
): { files: string[]; width: number; mode: Mode } | null {
  const files: string[] = [];
  let width = 80;
  let mode: Mode = "write";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      process.stdout.write(USAGE);
      return null;
    }
    if (arg === "--check" || arg === "--diff" || arg === "--stdout") {
      if (mode !== "write") {
        process.stderr.write(
          "error: choose only one of --check, --diff, --stdout\n",
        );
        return null;
      }
      mode = arg.slice(2) as Mode;
      continue;
    }
    if (arg === "-w" || arg === "--width") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value)) {
        process.stderr.write(`error: ${arg} needs a number\n`);
        return null;
      }
      width = value;
      continue;
    }
    if (arg.startsWith("--width=")) {
      width = Number(arg.slice("--width=".length));
      continue;
    }
    if (arg.startsWith("-") && arg !== "-") {
      process.stderr.write(`error: unknown option ${arg}\n`);
      return null;
    }
    files.push(arg);
  }

  if (files.length === 0) {
    process.stderr.write(USAGE);
    return null;
  }
  if (width < 20) {
    process.stderr.write("error: --width must be at least 20\n");
    return null;
  }
  return { files, width, mode };
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (!args) return 2;

  let status = 0;
  for (const path of args.files) {
    let original: string;
    try {
      original = await Bun.file(path).text();
    } catch (error) {
      process.stderr.write(`${path}: ${(error as Error).message}\n`);
      status = 2;
      continue;
    }

    const wrapped = wrapMarkdown(original, args.width);

    if (args.mode === "stdout") {
      process.stdout.write(wrapped);
      continue;
    }
    if (wrapped === original) continue;
    if (args.mode === "check") {
      process.stderr.write(`${path}: needs wrapping\n`);
      if (status === 0) status = 1;
      continue;
    }
    if (args.mode === "diff") {
      process.stdout.write(
        unifiedDiff(splitLines(original), splitLines(wrapped), {
          fromFile: path,
          toFile: path,
        }),
      );
      continue;
    }
    await Bun.write(path, wrapped);
    process.stdout.write(`wrapped ${path}\n`);
  }

  return status;
}

if (import.meta.main) {
  process.exit(await main(process.argv.slice(2)));
}
