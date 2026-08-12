// Dev-only: extracts the text layer from a generated PDF, so we can assert the
// document contains real selectable text (which is what makes it readable by ATS
// software) rather than rasterised glyphs.
//
// react-pdf writes text as `TJ` arrays of hex strings against base-14 Helvetica
// with WinAnsiEncoding, so both hex `<...>` and literal `(...)` operands are
// handled below.
//
// Usage: npx tsx src/dev/pdf-text.ts <file.pdf>
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

const file = process.argv[2];
if (!file) throw new Error("usage: pdf-text.ts <file.pdf>");
const data = readFileSync(file);

/** Pull out every stream body, inflating the FlateDecode ones. */
function contentStreams(pdf: Buffer): string[] {
  const streams: string[] = [];
  let cursor = 0;
  while (true) {
    const keyword = pdf.indexOf("stream", cursor);
    if (keyword === -1) break;
    // Skip "endstream" occurrences.
    if (pdf.subarray(keyword - 3, keyword).toString("latin1") === "end") {
      cursor = keyword + 6;
      continue;
    }
    let start = keyword + "stream".length;
    if (pdf[start] === 0x0d) start += 1;
    if (pdf[start] === 0x0a) start += 1;
    const end = pdf.indexOf("endstream", start);
    if (end === -1) break;
    const body = pdf.subarray(start, end);
    try {
      streams.push(inflateSync(body).toString("latin1"));
    } catch {
      streams.push(body.toString("latin1"));
    }
    cursor = end + "endstream".length;
  }
  return streams;
}

// WinAnsiEncoding matches Latin-1 except in 0x80–0x9F, where it carries typographic
// characters that JavaScript's charCode would otherwise turn into control codes.
// Without this map, em dashes and bullet glyphs silently vanish from the output and
// the check looks like a rendering bug when it is only a decoding one.
const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
  0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘",
  0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x98: "˜",
  0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};

function fromWinAnsi(code: number): string {
  return WIN_ANSI_HIGH[code] ?? String.fromCharCode(code);
}

/** Decode one PDF string operand — hex `<4869>` or literal `(Hi)`. */
function decodeOperand(operand: string): string {
  if (operand.startsWith("<")) {
    const hex = operand.slice(1, -1).replace(/\s+/g, "");
    let out = "";
    for (let i = 0; i + 1 < hex.length; i += 2) {
      out += fromWinAnsi(Number.parseInt(hex.slice(i, i + 2), 16));
    }
    return out;
  }
  return operand
    .slice(1, -1)
    .replace(/\\([()\\])/g, "$1")
    .replace(/[-]/g, (ch) => fromWinAnsi(ch.charCodeAt(0)));
}

const blob = contentStreams(data).join("\n");

// Each text-showing operation is a bracketed array of operands ending in TJ, or a
// single operand followed by Tj. Kerning numbers between operands are ignored.
const lines: string[] = [];
for (const match of blob.matchAll(/\[((?:<[0-9a-fA-F\s]*>|\((?:\\.|[^\\()])*\)|[-\d.\s])*)\]\s*TJ/g)) {
  const operands = match[1]?.match(/<[0-9a-fA-F\s]*>|\((?:\\.|[^\\()])*\)/g) ?? [];
  lines.push(operands.map(decodeOperand).join(""));
}
for (const match of blob.matchAll(/(<[0-9a-fA-F\s]*>|\((?:\\.|[^\\()])*\))\s*Tj/g)) {
  if (match[1]) lines.push(decodeOperand(match[1]));
}

const text = lines.join("\n");
console.log(`text runs: ${lines.length}`);
console.log(`extracted characters: ${text.length}`);
console.log("---");
console.log(text);
