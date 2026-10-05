/**
 * Display width in terminal columns.
 *
 * JS has no equivalent of Python's `unicodedata.east_asian_width`, and the
 * `\p{East_Asian_Width=Wide}` Unicode property escape is not implemented in
 * JavaScriptCore, so wide ranges are listed explicitly below. The table covers
 * the Wide (W) and Fullwidth (F) classes from Unicode's EastAsianWidth.txt;
 * Ambiguous (A) is intentionally treated as width 1.
 */

/** Sorted, non-overlapping `[start, end]` code point ranges measured in columns 2. */
const WIDE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x1100, 0x115f], // Hangul Jamo initial consonants
  [0x231a, 0x231b], // watch, hourglass
  [0x2329, 0x232a],
  [0x23e9, 0x23ec],
  [0x23f0, 0x23f0],
  [0x23f3, 0x23f3],
  [0x25fd, 0x25fe],
  [0x2614, 0x2615],
  [0x2648, 0x2653],
  [0x267f, 0x267f],
  [0x2693, 0x2693],
  [0x26a1, 0x26a1],
  [0x26aa, 0x26ab],
  [0x26bd, 0x26be],
  [0x26c4, 0x26c5],
  [0x26ce, 0x26ce],
  [0x26d4, 0x26d4],
  [0x26ea, 0x26ea],
  [0x26f2, 0x26f3],
  [0x26f5, 0x26f5],
  [0x26fa, 0x26fa],
  [0x26fd, 0x26fd],
  [0x2705, 0x2705],
  [0x270a, 0x270b],
  [0x2728, 0x2728],
  [0x274c, 0x274c],
  [0x274e, 0x274e],
  [0x2753, 0x2755],
  [0x2757, 0x2757],
  [0x2795, 0x2797],
  [0x27b0, 0x27b0],
  [0x27bf, 0x27bf],
  [0x2b1b, 0x2b1c],
  [0x2b50, 0x2b50],
  [0x2b55, 0x2b55],
  [0x2e80, 0x2e99], // CJK radicals supplement
  [0x2e9b, 0x2ef3],
  [0x2f00, 0x2fd5], // Kangxi radicals
  [0x2ff0, 0x2ffb], // ideographic description characters
  [0x3000, 0x303e], // CJK symbols and punctuation
  [0x3041, 0x3096], // Hiragana
  [0x3099, 0x30ff], // Katakana
  [0x3105, 0x312f], // Bopomofo
  [0x3131, 0x318e],
  [0x3190, 0x31e3],
  [0x31f0, 0x321e],
  [0x3220, 0x3247],
  [0x3250, 0x4dbf], // CJK unified ideographs extension A
  [0x4e00, 0xa48c], // CJK unified ideographs
  [0xa490, 0xa4c6], // Yi syllables and radicals
  [0xa960, 0xa97c], // Hangul Jamo extended-A
  [0xac00, 0xd7a3], // Hangul syllables
  [0xf900, 0xfaff], // CJK compatibility ideographs
  [0xfe10, 0xfe19], // vertical forms
  [0xfe30, 0xfe52], // CJK compatibility forms
  [0xfe54, 0xfe66],
  [0xfe68, 0xfe6b],
  [0xff01, 0xff60], // fullwidth forms
  [0xffe0, 0xffe6], // fullwidth signs
  [0x16fe0, 0x16fe4],
  [0x16ff0, 0x16ff1],
  [0x17000, 0x187f7], // Tangut and components
  [0x18800, 0x18cd5],
  [0x18d00, 0x18d08],
  [0x1aff0, 0x1aff3],
  [0x1aff5, 0x1affb],
  [0x1affd, 0x1affe],
  [0x1b000, 0x1b122],
  [0x1b132, 0x1b132],
  [0x1b150, 0x1b152],
  [0x1b155, 0x1b155],
  [0x1b164, 0x1b167],
  [0x1b170, 0x1b2fb],
  [0x1f004, 0x1f004],
  [0x1f0cf, 0x1f0cf],
  [0x1f18e, 0x1f18e],
  [0x1f191, 0x1f19a],
  [0x1f200, 0x1f202],
  [0x1f210, 0x1f23b],
  [0x1f240, 0x1f248],
  [0x1f250, 0x1f251],
  [0x1f260, 0x1f265],
  [0x1f300, 0x1f320],
  [0x1f32d, 0x1f335],
  [0x1f337, 0x1f37c],
  [0x1f37e, 0x1f393],
  [0x1f3a0, 0x1f3ca],
  [0x1f3cf, 0x1f3d3],
  [0x1f3e0, 0x1f3f0],
  [0x1f3f4, 0x1f3f4],
  [0x1f3f8, 0x1f43e],
  [0x1f440, 0x1f440],
  [0x1f442, 0x1f4fc],
  [0x1f4ff, 0x1f53d],
  [0x1f54b, 0x1f54e],
  [0x1f550, 0x1f567],
  [0x1f57a, 0x1f57a],
  [0x1f595, 0x1f596],
  [0x1f5a4, 0x1f5a4],
  [0x1f5fb, 0x1f64f],
  [0x1f680, 0x1f6c5],
  [0x1f6cc, 0x1f6cc],
  [0x1f6d0, 0x1f6d2],
  [0x1f6d5, 0x1f6d7],
  [0x1f6dc, 0x1f6df],
  [0x1f6eb, 0x1f6ec],
  [0x1f6f4, 0x1f6fc],
  [0x1f7e0, 0x1f7eb],
  [0x1f7f0, 0x1f7f0],
  [0x1f90c, 0x1f93a],
  [0x1f93c, 0x1f945],
  [0x1f947, 0x1f9ff],
  [0x1fa70, 0x1fa7c],
  [0x1fa80, 0x1fa88],
  [0x1fa90, 0x1fabd],
  [0x1fabf, 0x1fac5],
  [0x1face, 0x1fadb],
  [0x1fae0, 0x1fae8],
  [0x1faf0, 0x1faf8],
  [0x20000, 0x2fffd], // CJK unified ideographs extensions B and beyond
  [0x30000, 0x3fffd],
];

/** Marks and format characters take no columns of their own. */
const ZERO_WIDTH = /^[\p{M}\p{Cf}]$/u;

/** True when a code point falls in a Wide or Fullwidth range. */
function isWide(codePoint: number): boolean {
  let lo = 0;
  let hi = WIDE_RANGES.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const range = WIDE_RANGES[mid]!;
    if (codePoint < range[0]) hi = mid - 1;
    else if (codePoint > range[1]) lo = mid + 1;
    else return true;
  }
  return false;
}

/** Columns occupied by a single code point. */
export function codePointWidth(codePoint: number, char: string): number {
  if (ZERO_WIDTH.test(char)) return 0;
  return isWide(codePoint) ? 2 : 1;
}

/**
 * Column count for a string, counting CJK and emoji as two columns.
 *
 * Iterates by code point rather than UTF-16 unit so astral characters (emoji,
 * CJK extensions) are measured once instead of twice.
 */
export function textWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += codePointWidth(char.codePointAt(0)!, char);
  }
  return width;
}

/**
 * True for scripts that wrap between characters rather than at spaces.
 *
 * CJK and similar scripts do not put spaces between words, so a run of them has
 * to be split to fit. Latin words, URLs, and identifiers never split.
 */
export function isBreakable(word: string): boolean {
  for (const char of word) {
    if (!isWide(char.codePointAt(0)!)) return false;
  }
  return word.length > 0;
}

/** Chop a wide-character run into pieces that each fit `budget` columns. */
export function splitBreakable(word: string, budget: number): string[] {
  const pieces: string[] = [];
  let current = "";
  let currentWidth = 0;
  for (const char of word) {
    const charWidth = codePointWidth(char.codePointAt(0)!, char);
    if (current && currentWidth + charWidth > budget) {
      pieces.push(current);
      current = "";
      currentWidth = 0;
    }
    current += char;
    currentWidth += charWidth;
  }
  if (current) pieces.push(current);
  return pieces;
}
