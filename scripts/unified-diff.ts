/**
 * Unified diff generation.
 *
 * Replaces Python's `difflib.unified_diff`, which has no stdlib equivalent in
 * JS. Output matches the classic GNU format that git and `patch` produce, so
 * `--diff` stays pipeable.
 */

/** One line of the comparison: unchanged (` `), removed (`-`), or added (`+`).
 *
 * `before` and `after` are 0-indexed line numbers on each side, or null when the
 * op does not exist on that side. Hunks need both to report accurate ranges.
 */
type Op = {
  kind: " " | "-" | "+";
  line: string;
  before: number | null;
  after: number | null;
};

/**
 * Split text into lines the way `difflib.splitlines` does: a trailing newline
 * terminates the last line rather than introducing an empty one, so a one-line
 * file diffs as one line instead of two.
 */
export function splitLines(text: string): string[] {
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

export type UnifiedDiffOptions = {
  fromFile: string;
  toFile: string;
  /** Lines of unchanged context around each hunk. Defaults to 3. */
  context?: number;
};

/**
 * Longest-common-subsequence diff via a dynamic-programming table.
 *
 * Markdown files are small enough that the O(n*m) table is fine, and the table
 * is allocated once as a flat Int32Array to keep the rows contiguous.
 *
 * When duplicate lines admit several equally short edit scripts, this picks one
 * of them; `git diff` may pick a different one. Both are minimal and apply
 * identically, so the choice only affects which lines a hunk attributes.
 */
function diffOps(before: string[], after: string[]): Op[] {
  const rows = before.length;
  const cols = after.length;
  const stride = cols + 1;
  // table[i * stride + j] is the LCS length of before[i:] and after[j:].
  const table = new Int32Array((rows + 1) * stride);

  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      table[i * stride + j] =
        before[i] === after[j]
          ? table[(i + 1) * stride + (j + 1)]! + 1
          : Math.max(
              table[(i + 1) * stride + j]!,
              table[i * stride + (j + 1)]!,
            );
    }
  }

  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (before[i] === after[j]) {
      ops.push({ kind: " ", line: before[i]!, before: i, after: j });
      i++;
      j++;
    } else if (table[(i + 1) * stride + j]! >= table[i * stride + (j + 1)]!) {
      ops.push({ kind: "-", line: before[i]!, before: i, after: null });
      i++;
    } else {
      ops.push({ kind: "+", line: after[j]!, before: null, after: j });
      j++;
    }
  }
  while (i < rows)
    ops.push({ kind: "-", line: before[i]!, before: i++, after: null });
  while (j < cols)
    ops.push({ kind: "+", line: after[j]!, before: null, after: j++ });
  return ops;
}

/**
 * Format a hunk range the way difflib does.
 *
 * Ranges are 1-indexed and normally drop the count when it is 1. An empty range
 * is the exception: it begins at the line *before* the insertion point, so a
 * pure addition at the top of a file reads `-0,0 +1`.
 */
function range(start: number, count: number): string {
  const beginning = count === 0 ? start : start + 1;
  if (count === 1) return `${beginning}`;
  return `${beginning},${count}`;
}

/** Running count of before/after lines emitted before each op index. */
function cursors(ops: Op[]): { before: number[]; after: number[] } {
  const size = ops.length + 1;
  const before: number[] = Array.from({ length: size }, () => 0);
  const after: number[] = Array.from({ length: size }, () => 0);
  for (let index = 0; index < ops.length; index++) {
    before[index + 1] = before[index]! + (ops[index]!.before === null ? 0 : 1);
    after[index + 1] = after[index]! + (ops[index]!.after === null ? 0 : 1);
  }
  return { before, after };
}

/** Split ops into hunks, each extended by `context` unchanged lines. */
function hunks(ops: Op[], context: number): Array<{ lo: number; hi: number }> {
  const changed = ops.flatMap((op, index) => (op.kind === " " ? [] : [index]));
  if (changed.length === 0) return [];

  // Group changes separated by at most 2 * context unchanged lines, matching
  // difflib. The gap counts unchanged ops, so the op-index distance is one more.
  const groups: Array<{ lo: number; hi: number }> = [];
  for (const index of changed) {
    const last = groups.at(-1);
    if (last && index - last.hi <= context * 2 + 1) {
      last.hi = index;
    } else {
      groups.push({ lo: index, hi: index });
    }
  }

  return groups.map(({ lo, hi }) => ({
    lo: Math.max(0, lo - context),
    hi: Math.min(ops.length - 1, hi + context),
  }));
}

/** Render a unified diff between two line arrays. Empty string when equal. */
export function unifiedDiff(
  before: string[],
  after: string[],
  options: UnifiedDiffOptions,
): string {
  const context = options.context ?? 3;
  const ops = diffOps(before, after);
  if (ops.every((op) => op.kind === " ")) return "";

  let out = `--- ${options.fromFile}\n+++ ${options.toFile}\n`;

  const cursorsByOp = cursors(ops);
  for (const { lo, hi } of hunks(ops, context)) {
    // A hunk may contain only additions or only removals, so fall back to the
    // running cursor when its first op has no line on that side.
    const firstOp = ops[lo]!;
    const fromStart = firstOp.before ?? cursorsByOp.before[lo]!;
    const toStart = firstOp.after ?? cursorsByOp.after[lo]!;
    const fromCount = cursorsByOp.before[hi + 1]! - cursorsByOp.before[lo]!;
    const toCount = cursorsByOp.after[hi + 1]! - cursorsByOp.after[lo]!;

    out += `@@ -${range(fromStart, fromCount)} +${range(toStart, toCount)} @@\n`;
    for (let index = lo; index <= hi; index++) {
      const op = ops[index]!;
      out += `${op.kind}${op.line}\n`;
    }
  }

  return out;
}
