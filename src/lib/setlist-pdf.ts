"use client";

import { PDFDocument, type PDFPage } from "pdf-lib";
import { sheetBytes, type Sheet } from "@/lib/sheets";
import type { LibrarySong } from "@/lib/song-library";
import {
  formatKey,
  singingKey,
  totalMinutes,
  transposeLabel,
  PARTS,
  type Setlist,
  type Song,
} from "@/lib/setlist";

/*
  콘티 한 장과 곡별 악보를 PDF 한 개로 묶는다.

  주일 아침에 팀에게 건네는 것은 결국 종이 한 묶음이다. 콘티 따로, 악보 따로
  보내면 누군가는 반드시 한쪽을 빠뜨린다.

  첫 장은 글자를 PDF 에 직접 쓰지 않고 캔버스에 그려 그림으로 넣는다.
  pdf-lib 의 기본 글꼴에는 한글이 없어서, 글자로 넣으려면 한글 글꼴 파일을
  통째로 받아야 한다(수 MB). 캔버스는 브라우저가 이미 가진 글꼴로 한글을
  그려 주므로 받을 것이 없다. 첫 장에서 글자를 복사할 일은 없으니
  잃는 것도 없다.
*/

const A4 = { width: 595.28, height: 841.89 };
/** 150dpi. 인쇄해도 글자가 뭉개지지 않는 선 */
const SCALE = 2.5;

interface Ctx {
  c: CanvasRenderingContext2D;
  y: number;
}

const MARGIN = 48 * SCALE;

function line(ctx: Ctx, text: string, size: number, opts: { bold?: boolean; color?: string; gap?: number; indent?: number } = {}) {
  const { bold = false, color = "#111111", gap = 6, indent = 0 } = opts;
  ctx.c.fillStyle = color;
  ctx.c.font = `${bold ? "700" : "400"} ${size * SCALE}px "Noto Sans KR", "Malgun Gothic", sans-serif`;
  ctx.c.fillText(text, MARGIN + indent * SCALE, ctx.y);
  ctx.y += (size + gap) * SCALE;
}

/** 오른쪽 끝에 붙여 쓰는 글자 (조 표시 등) */
function rightText(ctx: Ctx, text: string, size: number, baseline: number) {
  ctx.c.font = `700 ${size * SCALE}px "Noto Sans KR", "Malgun Gothic", sans-serif`;
  ctx.c.fillStyle = "#111111";
  const width = ctx.c.measureText(text).width;
  ctx.c.fillText(text, ctx.c.canvas.width - MARGIN - width, baseline);
}

function songSpec(song: Song): string {
  const key = singingKey(song);
  return [key ? formatKey(key) : "", song.meter, song.bpm ? `♩${song.bpm}` : "", transposeLabel(song)]
    .filter(Boolean)
    .join(" · ");
}

/** 콘티 첫 장을 캔버스에 그린다. */
function drawCover(setlist: Setlist, sheetCount: Map<string, number>): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(A4.width * SCALE);
  canvas.height = Math.round(A4.height * SCALE);
  const c = canvas.getContext("2d");
  if (!c) throw new Error("이 브라우저에서는 PDF를 만들 수 없습니다.");

  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.textBaseline = "alphabetic";

  const ctx: Ctx = { c, y: MARGIN + 26 * SCALE };

  line(ctx, setlist.serviceName || "예배", 24, { bold: true, gap: 4 });
  const sub = [setlist.date, setlist.leader && `인도 ${setlist.leader}`].filter(Boolean).join("  ·  ");
  line(ctx, sub, 11, { color: "#666666", gap: 14 });

  c.strokeStyle = "#111111";
  c.lineWidth = 1.5 * SCALE;
  c.beginPath();
  c.moveTo(MARGIN, ctx.y);
  c.lineTo(canvas.width - MARGIN, ctx.y);
  c.stroke();
  ctx.y += 26 * SCALE;

  const filled = setlist.songs.filter((s) => s.title.trim());
  filled.forEach((song, i) => {
    const baseline = ctx.y;
    line(ctx, `${i + 1}.  ${song.title}`, 15, { bold: true, gap: 3 });

    const key = singingKey(song);
    if (key) rightText(ctx, formatKey(key), 15, baseline);

    const spec = [song.mood, songSpec(song)].filter(Boolean).join("  ·  ");
    if (spec) line(ctx, spec, 10, { color: "#666666", gap: 3, indent: 20 });

    if (song.form.trim()) line(ctx, `송폼  ${song.form.trim()}`, 10.5, { color: "#111111", gap: 3, indent: 20 });

    const extras = [
      i > 0 && song.link !== "바로" ? `${song.link}로 연결` : "",
      song.note.trim(),
      (sheetCount.get(song.libraryId) ?? 0) > 0 ? `악보 ${sheetCount.get(song.libraryId)}장` : "",
    ].filter(Boolean).join("  ·  ");
    if (extras) line(ctx, extras, 10, { color: "#666666", gap: 3, indent: 20 });

    ctx.y += 10 * SCALE;
  });

  if (filled.length === 0) line(ctx, "곡이 없습니다.", 12, { color: "#999999" });

  // 아래쪽 — 팀과 메모
  ctx.y += 12 * SCALE;
  c.strokeStyle = "#dddddd";
  c.lineWidth = 1 * SCALE;
  c.beginPath();
  c.moveTo(MARGIN, ctx.y);
  c.lineTo(canvas.width - MARGIN, ctx.y);
  c.stroke();
  ctx.y += 20 * SCALE;

  // 곡 수는 길이를 안 적었어도 보여 준다. 예상 길이만 없을 뿐이다.
  const minutes = totalMinutes(setlist.songs);
  line(ctx, `${filled.length}곡${minutes > 0 ? ` · 약 ${minutes}분` : ""}`, 11, { color: "#666666" });

  const team = PARTS.filter((p) => setlist.team[p]?.trim())
    .map((p) => `${p} ${setlist.team[p].trim()}`)
    .join("   ");
  if (team) line(ctx, team, 11, { color: "#666666" });

  if (setlist.note.trim()) {
    ctx.y += 6 * SCALE;
    for (const row of wrap(c, setlist.note.trim(), canvas.width - MARGIN * 2, 11)) {
      line(ctx, row, 11, { color: "#444444", gap: 4 });
    }
  }

  return canvas;
}

/** 긴 메모를 폭에 맞춰 자른다. 한글은 단어 경계가 없어 글자 단위로 센다. */
function wrap(c: CanvasRenderingContext2D, text: string, maxWidth: number, size: number): string[] {
  c.font = `400 ${size * SCALE}px "Noto Sans KR", "Malgun Gothic", sans-serif`;
  const rows: string[] = [];
  for (const paragraph of text.split("\n")) {
    let row = "";
    for (const ch of paragraph) {
      if (c.measureText(row + ch).width > maxWidth && row) {
        rows.push(row);
        row = "";
      }
      row += ch;
    }
    rows.push(row);
  }
  return rows.slice(0, 12);
}

/** 이미지 악보를 A4 한 장에 여백 없이 꽉 맞춰 앉힌다. */
function fit(page: PDFPage, width: number, height: number) {
  const scale = Math.min(A4.width / width, A4.height / height);
  const w = width * scale;
  const h = height * scale;
  return { x: (A4.width - w) / 2, y: (A4.height - h) / 2, width: w, height: h };
}

/** PDF가 모르는 그림 형식(webp 등)을 PNG로 바꾼다. */
async function toPngDataUrl(bytes: Uint8Array, mime: string): Promise<string> {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("그림을 옮겨 그리지 못했습니다.");
  c.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

export interface BuildResult {
  bytes: Uint8Array;
  /** 붙이지 못한 악보 — 파일이 깨졌거나 지워진 경우 */
  skipped: string[];
}

/**
 * 콘티 + 악보를 PDF 하나로 묶는다.
 *
 * 악보 하나가 깨져 있다고 전체를 포기하지 않는다. 그 악보만 빼고 만든 뒤
 * 무엇을 뺐는지 돌려준다 — 주일 아침에 필요한 것은 완벽한 파일이 아니라
 * 당장 쓸 수 있는 파일이다.
 */
export async function buildSetlistPdf(
  setlist: Setlist,
  library: LibrarySong[]
): Promise<BuildResult> {
  const byId = new Map(library.map((s) => [s.id, s]));
  const counts = new Map(library.map((s) => [s.id, s.sheets.length]));

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${setlist.serviceName} ${setlist.date}`.trim());

  // 1) 콘티 장
  const cover = drawCover(setlist, counts);
  const png = await pdf.embedPng(cover.toDataURL("image/png"));
  const coverPage = pdf.addPage([A4.width, A4.height]);
  coverPage.drawImage(png, { x: 0, y: 0, width: A4.width, height: A4.height });

  // 2) 곡 순서대로 악보
  const skipped: string[] = [];
  for (const song of setlist.songs) {
    if (!song.title.trim() || !song.libraryId) continue;
    // 한 곡에 여러 장이 붙을 수 있다 — 코드보와 악보를 따로 올리는 팀이 많다.
    for (const sheet of byId.get(song.libraryId)?.sheets ?? []) await append(song, sheet);
  }

  async function append(song: Song, sheet: Sheet) {
    try {
      const bytes = await sheetBytes(sheet.path);

      if (sheet.mime === "application/pdf") {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await pdf.copyPages(src, src.getPageIndices());
        for (const page of pages) pdf.addPage(page);
        return;
      }

      // pdf-lib 은 PNG 와 JPEG 만 안다. webp 는 브라우저로 한 번 옮겨 그린다.
      const image =
        sheet.mime === "image/jpeg"
          ? await pdf.embedJpg(bytes)
          : sheet.mime === "image/png"
            ? await pdf.embedPng(bytes)
            : await pdf.embedPng(await toPngDataUrl(bytes, sheet.mime));
      const page = pdf.addPage([A4.width, A4.height]);
      page.drawImage(image, fit(page, image.width, image.height));
    } catch {
      skipped.push(`${song.title} (${sheet.title})`);
    }
  }

  return { bytes: await pdf.save(), skipped };
}

/** 만든 PDF를 내려받게 한다. */
export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
