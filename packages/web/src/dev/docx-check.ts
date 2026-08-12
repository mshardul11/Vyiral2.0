// Dev-only smoke check for the DOCX exporter: builds the fixture resume, writes it
// out, and prints the text content of word/document.xml so content regressions are
// visible without opening Word.
//
// Usage: npx tsx src/dev/docx-check.ts [outfile]
import { writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { Packer } from "docx";
import { buildDocx } from "../export/docx";
import { fixtureResume } from "../resume/fixture";

const out = process.argv[2] ?? "./resume-check.docx";
const buffer = await Packer.toBuffer(buildDocx(fixtureResume));
writeFileSync(out, buffer);
console.log(`wrote ${out} (${buffer.length} bytes)`);

/**
 * Minimal zip reader — enough to pull one stored/deflated entry out of a .docx,
 * which saves adding a zip dependency just for this check.
 */
function readZipEntry(zip: Buffer, name: string): Buffer | null {
  // Walk local file headers (PK\x03\x04).
  let offset = 0;
  while (offset + 30 <= zip.length) {
    if (zip.readUInt32LE(offset) !== 0x04034b50) break;
    const method = zip.readUInt16LE(offset + 8);
    const compressedSize = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const entryName = zip.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const dataStart = offset + 30 + nameLength + extraLength;
    const data = zip.subarray(dataStart, dataStart + compressedSize);
    if (entryName === name) {
      return method === 0 ? data : inflateRawSync(data);
    }
    offset = dataStart + compressedSize;
  }
  return null;
}

const documentXml = readZipEntry(buffer, "word/document.xml");
if (!documentXml) {
  console.error("word/document.xml not found — the file is not a valid .docx");
  process.exit(1);
}

const xml = documentXml.toString("utf8");
const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
  .map((match) => match[1] ?? "")
  .join("\n")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

console.log(`document.xml: ${xml.length} bytes`);
console.log(`text runs: ${text.split("\n").length}`);
console.log("---");
console.log(text);
