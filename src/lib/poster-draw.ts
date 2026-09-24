"use client";

import { SHAPES, THEMES, type Poster } from "./poster";

/*
  포스터를 캔버스에 그린다.

  글꼴 파일을 받지 않는다. 브라우저가 이미 가진 한글 글꼴로 그리므로
  첫 그림이 바로 뜬다 — 포스터는 고치면서 보는 물건이라, 한 글자 고칠 때마다
  몇 MB를 기다리게 할 수 없다.

  글자 크기는 폭만 보고 정하지 않는다. A4처럼 긴 판에서 폭만 기준으로 잡으면
  글이 판에 비해 작아 보이고 아래가 텅 빈다. 판의 넓이(폭×높이)를 함께 보고
  키운 뒤, 본문 높이를 한 번 미리 재서 위아래 가운데에 놓는다.
*/

interface Pen {
  c: CanvasRenderingContext2D;
  /** 글자 크기의 기준 배율 */
  k: number;
  width: number;
  height: number;
  pad: number;
  y: number;
  /**
   * false 면 진짜로 그리지 않고 높이만 쟴다.
   *
   * 내용이 얼마나 차는지 미리 알아야 가운데 놓을 수 있다. 그러지 않으면
   * A4 처럼 긴 판에서 글이 위쪽에만 몰리고 아래가 텀 비게 된다.
   */
  paint: boolean;
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
  // pen.y 는 글자의 밑선이 아니라 줄의 윗선이다. 밑선으로 다루면 다음 글의
  // 윈부분이 앞 줄로 올라가 겁친다.
  const lineHeight = size * pen.k * lead;
  const baseline = size * pen.k * 0.78;
  for (const row of rows) {
    if (pen.paint) {
      pen.c.textAlign = center ? "center" : "left";
      pen.c.fillText(row, center ? pen.width / 2 : pen.pad, pen.y + baseline);
    }
    pen.y += lineHeight;
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

  // 여기가 포스터에서 가장 많이 읽힌다. 제목 다음으로 크게 둔다.
  const labelSize = 19;
  const valueSize = 31;
  const labelWidth = 104 * pen.k;
  const left = pen.pad;

  for (const [label, value] of rows) {
    const top = pen.y;
    const baseline = valueSize * pen.k * 0.78;

    setFont(pen, labelSize, 700);
    if (pen.paint) {
      pen.c.textAlign = "left";
      pen.c.fillStyle = theme.accent;
      // 꼬리표는 값의 첫 줄에 눈높이를 맞춘다.
      pen.c.fillText(label, left, top + baseline);
    }

    setFont(pen, valueSize, 500);
    const lines = wrap(pen, value, pen.width - pen.pad * 2 - labelWidth);
    let y = top;
    for (const line of lines) {
      if (pen.paint) {
        pen.c.textAlign = "left";
        pen.c.fillStyle = theme.fg;
        pen.c.fillText(line, left + labelWidth, y + baseline);
      }
      y += valueSize * pen.k * 1.3;
    }
    pen.y = Math.max(y, top + valueSize * pen.k * 1.3) + 18 * pen.k;
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

  // 판의 넓이를 기준으로 잡는다. 폭만 보면 A4 처럼 긴 판에서 글이 작아 보인다.
  const k = Math.sqrt((shape.width * shape.height) / (1000 * 1000)) * 1.06;
  const pen: Pen = {
    c, k, width: shape.width, height: shape.height,
    pad: Math.max(70, shape.width * 0.085), y: 0, paint: false,
  };

  c.fillStyle = theme.bg;
  c.fillRect(0, 0, shape.width, shape.height);
  c.textBaseline = "alphabetic";

  const titleSize = poster.title.length > 14 ? 58 : poster.title.length > 8 ? 70 : 80;
  const verseLines = poster.verse.trim()
    ? wrapAt(pen, `“${poster.verse.trim()}”`, 21)
    : [];

  /** 아래 띠(말씀·문의)가 차지하는 높이 */
  const footBand =
    (verseLines.length ? verseLines.length * 21 * k * 1.55 + 26 * k : 0) +
    (poster.verseRef.trim() ? 34 * k : 0) +
    (poster.footer.trim() ? 44 * k : 0) +
    (poster.shape === "wide" ? 60 : 96) * k * 0.6;

  /** 위쪽 본문을 한 번 미리 그려 높이를 잰다 */
  const body = (p: Pen) => {
    draw(p, poster.eyebrow, 21, theme.accent, { weight: 700, gap: 1.0 });
    draw(p, poster.title, titleSize, theme.fg, { weight: 700, gap: 0.45, lead: 1.18 });
    draw(p, poster.subtitle, 25, theme.sub, { gap: 1.2 });
    if (poster.title.trim()) {
      if (p.paint) {
        c.strokeStyle = theme.accent;
        c.lineWidth = 3 * k;
        c.beginPath();
        c.moveTo(p.width / 2 - 36 * k, p.y);
        c.lineTo(p.width / 2 + 36 * k, p.y);
        c.stroke();
      }
      p.y += 50 * k;
    }
    facts(p, poster, theme);
  };

  pen.y = 0;
  body(pen);
  const bodyHeight = pen.y;

  // 남는 자리를 위아래로 나눠 본문을 가운데에 앉힌다.
  const topPad = (poster.shape === "wide" ? 70 : 110) * k;
  const room = shape.height - footBand - topPad;
  pen.y = topPad + Math.max(0, (room - bodyHeight) / 2);
  pen.paint = true;
  body(pen);

  // 말씀과 문의는 아래에서부터 쌓는다.
  let y = shape.height - (poster.shape === "wide" ? 52 : 74) * k;
  if (poster.footer.trim()) {
    setFont(pen, 19, 400);
    c.textAlign = "center";
    c.fillStyle = theme.sub;
    c.fillText(poster.footer.trim(), shape.width / 2, y);
    y -= 44 * k;
  }
  if (poster.verseRef.trim()) {
    setFont(pen, 19, 700);
    c.textAlign = "center";
    c.fillStyle = theme.accent;
    c.fillText(poster.verseRef.trim(), shape.width / 2, y);
    y -= 34 * k;
  }
  if (verseLines.length) {
    setFont(pen, 21, 400);
    c.textAlign = "center";
    c.fillStyle = theme.sub;
    for (let i = verseLines.length - 1; i >= 0; i--) {
      c.fillText(verseLines[i], shape.width / 2, y);
      y -= 21 * k * 1.55;
    }
  }

  return canvas;
}

/** 특정 글자 크기로 줄을 나눠 본다. 높이를 미리 재려면 줄 수부터 알아야 한다. */
function wrapAt(pen: Pen, text: string, size: number): string[] {
  setFont(pen, size, 400);
  return wrap(pen, text, pen.width - pen.pad * 2);
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
