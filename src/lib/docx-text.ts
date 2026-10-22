import "server-only";
import { inflateRawSync } from "node:zlib";

/*
  워드(.docx) 파일에서 글만 꺼낸다.

  .docx 는 zip 안에 XML 이다. 의존성을 더하지 않으려고 zip 의 중앙 디렉터리를
  직접 읽는다 — 필요한 것은 word/document.xml 하나뿐이라 그 정도면 된다.
  표는 행마다 한 줄로, 칸은 " | " 로 잇는다.
*/

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;

function readZipEntry(buf: Buffer, wanted: string): Buffer | null {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== CENTRAL) return null;
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28);
    const elen = buf.readUInt16LE(off + 30);
    const clen = buf.readUInt16LE(off + 32);
    const local = buf.readUInt32LE(off + 42);
    const name = buf.toString("utf8", off + 46, off + 46 + nlen);
    if (name === wanted) {
      const lnlen = buf.readUInt16LE(local + 26);
      const lelen = buf.readUInt16LE(local + 28);
      const start = local + 30 + lnlen + lelen;
      const data = buf.subarray(start, start + csize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      return null;
    }
    off += 46 + nlen + elen + clen;
  }
  return null;
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const text = (xml: string) => decode(xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)?.map((t) => t.replace(/<[^>]+>/g, "")).join("") ?? "");

/** 문단을 차례대로 돌려준다. 빈 문단은 뺀다. 워드 파일이 아니면 null. */
export function docxParagraphs(file: Buffer): string[] | null {
  const xml = readZipEntry(file, "word/document.xml")?.toString("utf8");
  if (!xml) return null;
  const body = xml.match(/<w:body>([\s\S]*)<\/w:body>/)?.[1] ?? xml;
  const out: string[] = [];
  for (const block of body.match(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>/g) ?? []) {
    if (block.startsWith("<w:tbl>")) {
      for (const row of block.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []) {
        const cells = (row.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []).map((c) => text(c).trim());
        if (cells.some(Boolean)) out.push(cells.join(" | "));
      }
      continue;
    }
    const t = text(block).trim();
    if (t) out.push(t);
  }
  return out;
}
