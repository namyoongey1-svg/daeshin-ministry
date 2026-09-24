"use client";

import { SHAPES, THEMES, type Poster } from "./poster";

/*
  포스터를 캔버스에 그린다.

  글꼴 파일을 받지 않는다. 브라우저가 이미 가진 한글 글꼴로 그리므로
  첫 그림이 바로 뜬다 — 포스터는 고치면서 보는 물건이라, 한 글자 고칠 때마다
  몇 MB를 기다리게 할 수 없다.

  크기는 모두 기준 폭(1000)에 대한 비율로 잡는다. A4든 정사각형이든
  같은 코드로 그리고, 글자만 그릇에 맞게 줄어든다.
*/

interface Pen {
  c: CanvasRenderingContext2D;
  /** 기준 폭 1000 대비 배율 */
  k: number;
  width: number;
  height: number;
  pad: number;
  y: number;
}

const FONT = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

function setFont(pen: Pen, size: number, weight = 400) {
  pen.c.font = `${weight} ${size * pen.k}px ${FONT}`;
}

/** 폭에 맞춰 줄을 나눈다. 한글은 단어 경계가 없어 글자 단위로 센다. */
function wrap(pen: Pen, raw: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of raw.split("\n")) {
    if (!paragraph) {
      out.push("");
      continue;
    }
    let row = "";
    for (const ch of paragraph) {
      if (pen.c.measureText(row + ch).width > maxWidth && row) {
        out.push(row);
        row = "";
      }
      row += ch;
    }
    out.push(row);
  }
  return out;
}

function draw(
  pen: Pen,
  raw: string,
  size: number,
  color: string,
  opts: { weight?: number; gap?: number; center?: boolean; lead?: number } = {}
) {
  if (!raw.trim()) return;
  const { weight = 400, gap = 0.35, center = true, lead = 1.35 } = opts;
  setFont(pen, size, weight);
  pen.c.fillStyle = color;
  const maxWidth = pen.width - pen.pad * 2;
  const rows = wrap(pen, raw, maxWidth);
  for (const row of rows) {
    const x = center ? pen.width / 2 : pen.pad;
    pen.c.textAlign = center ? "center" : "left";
    pen.c.fillText(row, x, pen.y);
    pen.y += size * pen.k * lead;
  }
  pen.y += size * pen.k * gap;
}

/** 언제·어디서·누가를 나란히 적는 칸. 포스터에서 가장 많이 읽히는 자리다. */
function facts(pen: Pen, poster: Poster, theme: (typeof THEMES)[keyof typeof THEMES]) {
  const rows: [string, string][] = [
    ["언제", poster.when],
    ["어디서", poster.where],
    ["누가", poster.who],
  ].filter(([, v]) => v.trim()) as [string, string][];
  if (rows.length === 0) return;

  const labelSize = 17;
  const valueSize = 26;
  const labelWidth = 92 * pen.k;
  const left = pen.pad;

  for (const [label, value] of rows) {
    const top = pen.y;

    setFont(pen, labelSize, 700);
    pen.c.textAlign = "left";
    pen.c.fillStyle = theme.accent;
    pen.c.fillText(label, left, top);

    setFont(pen, valueSize, 500);
    pen.c.fillStyle = theme.fg;
    const lines = wrap(pen, value, pen.width - pen.pad * 2 - labelWidth);
    let y = top;
    for (const line of lines) {
      pen.c.fillText(line, left + labelWidth, y);
      y += valueSize * pen.k * 1.3;
    }
    pen.y = Math.max(y, top + valueSize * pen.k * 1.3) + 14 * pen.k;
  }
}

export function drawPoster(poster: Poster): HTMLCanvasElement {
  const shape = SHAPES[poster.shape];
  const theme = THEMES[poster.theme];

  const canvas = document.createElement("canvas");
  canvas.width = shape.width;
  canvas.height = shape.height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("이 브라우저에서는 포스터를 그릴 수 없습니다.");

  const k = shape.width / 1000;
  const pen: Pen = { c, k, width: shape.width, height: shape.height, pad: 86 * k, y: 0 };

  c.fillStyle = theme.bg;
  c.fillRect(0, 0, shape.width, shape.height);
  c.textBaseline = "alphabetic";

  // 가로 포스터는 위아래가 좁아 여백을 줄인다.
  const topPad = poster.shape === "wide" ? 110 * k : 170 * k;
  pen.y = topPad;

  draw(pen, poster.eyebrow.toUpperCase() || poster.eyebrow, 20, theme.accent, {
    weight: 700,
    gap: 1.1,
  });

  const titleSize = poster.shape === "wide" ? 76 : poster.title.length > 12 ? 62 : 82;
  draw(pen, poster.title, titleSize, theme.fg, { weight: 700, gap: 0.5, lead: 1.2 });
  draw(pen, poster.subtitle, 26, theme.sub, { gap: 1.4 });

  // 구분선
  if (poster.title.trim()) {
    c.strokeStyle = theme.accent;
    c.lineWidth = 3 * k;
    c.beginPath();
    c.moveTo(pen.width / 2 - 34 * k, pen.y);
    c.lineTo(pen.width / 2 + 34 * k, pen.y);
    c.stroke();
    pen.y += 54 * k;
  }

  facts(pen, poster, theme);

  // 말씀은 아래쪽에 붙인다. 위에 두면 행사 정보를 밀어낸다.
  const bottom = shape.height - (poster.shape === "wide" ? 80 * k : 130 * k);
  if (poster.verse.trim()) {
    setFont(pen, 22, 400);
    const lines = wrap(pen, `“${poster.verse.trim()}”`, pen.width - pen.pad * 2);
    const refHeight = poster.verseRef.trim() ? 38 * k : 0;
    let y = bottom - refHeight - (lines.length - 1) * 22 * k * 1.5;
    // 본문과 겹치면 말씀을 본문 바로 아래로 내린다.
    y = Math.max(y, pen.y + 40 * k);

    c.textAlign = "center";
    c.fillStyle = theme.sub;
    for (const line of lines) {
      c.fillText(line, pen.width / 2, y);
      y += 22 * k * 1.5;
    }
    if (poster.verseRef.trim()) {
      setFont(pen, 18, 700);
      c.fillStyle = theme.accent;
      c.fillText(poster.verseRef.trim(), pen.width / 2, y + 14 * k);
    }
  }

  if (poster.footer.trim()) {
    setFont(pen, 18, 400);
    c.textAlign = "center";
    c.fillStyle = theme.sub;
    c.fillText(poster.footer.trim(), pen.width / 2, shape.height - 54 * k);
  }

  return canvas;
}

export function downloadPoster(poster: Poster, filename: string) {
  const canvas = drawPoster(poster);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
