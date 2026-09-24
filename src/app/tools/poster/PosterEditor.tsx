"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/local-store";
import {
  PRESETS,
  SHAPES,
  THEMES,
  emptyPoster,
  missingFields,
  revivePoster,
  type Poster,
  type ShapeId,
  type ThemeId,
} from "@/lib/poster";
import { downloadPoster, drawPoster } from "@/lib/poster-draw";

const store = createLocalStore<Poster>("daeshin.poster", emptyPoster(), revivePoster);

const field = "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm";
const label = "mb-1 block text-xs text-muted";

export default function PosterEditor() {
  const poster = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const canvasBox = useRef<HTMLDivElement>(null);

  const patch = (changes: Partial<Poster>) =>
    store.update((current) => ({ ...current, ...changes }));

  /**
   * 고칠 때마다 다시 그린다.
   *
   * 캔버스를 화면에 그대로 붙이고 CSS 로만 줄인다. 포스터는 인쇄까지 가는
   * 물건이라 원본 크기로 그려 두어야 내려받은 파일이 화면과 같다.
   */
  useEffect(() => {
    const box = canvasBox.current;
    if (!box) return;
    const canvas = drawPoster(poster);
    canvas.className = "block h-auto w-full rounded-card border border-line";
    box.replaceChildren(canvas);
  }, [poster]);

  const missing = missingFields(poster);
  const shape = SHAPES[poster.shape];

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
      {/* ------------------------------------------------------------ 입력 */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${label} mb-0`}>행사 고르기</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => store.set({ ...emptyPoster(), ...preset.value })}
              className="h-8 rounded-pill border border-line px-3 text-xs font-medium transition-colors hover:border-line-strong"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              if (confirm("적은 내용을 모두 지울까요?")) store.set(emptyPoster());
            }}
            className="h-8 rounded-pill px-3 text-xs text-muted transition-colors hover:text-highlight"
          >
            비우기
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label>
            <span className={label}>크기</span>
            <select
              className={field}
              value={poster.shape}
              onChange={(e) => patch({ shape: e.target.value as ShapeId })}
            >
              {Object.entries(SHAPES).map(([id, s]) => (
                <option key={id} value={id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>색</span>
            <select
              className={field}
              value={poster.theme}
              onChange={(e) => patch({ theme: e.target.value as ThemeId })}
            >
              {Object.entries(THEMES).map(([id, t]) => (
                <option key={id} value={id}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block">
          <span className={label}>맨 위 작은 글씨 — 부서나 행사 갈래</span>
          <input className={field} placeholder="여름성경학교" value={poster.eyebrow}
            onChange={(e) => patch({ eyebrow: e.target.value })} />
        </label>

        <label className="mt-2 block">
          <span className={label}>제목 — 줄을 나누려면 엔터</span>
          <textarea className={`${field} h-16`} placeholder={"우리는\n하나님의 작품"} value={poster.title}
            onChange={(e) => patch({ title: e.target.value })} />
        </label>

        <label className="mt-2 block">
          <span className={label}>부제 (선택)</span>
          <input className={field} placeholder="2026 여름성경학교" value={poster.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })} />
        </label>

        <div className="mt-4 rounded-card border border-line bg-sunken p-3">
          <p className="mb-2 text-xs leading-relaxed text-muted">
            포스터에서 사람들이 실제로 찾는 것은 이 셋입니다. 크게 나옵니다.
          </p>
          <label className="block">
            <span className={label}>언제</span>
            <textarea className={`${field} h-14`} placeholder={"7월 28일(화) ~ 30일(목)\n오전 9시 ~ 오후 3시"}
              value={poster.when} onChange={(e) => patch({ when: e.target.value })} />
          </label>
          <label className="mt-2 block">
            <span className={label}>어디서</span>
            <input className={field} placeholder="본당 및 교육관" value={poster.where}
              onChange={(e) => patch({ where: e.target.value })} />
          </label>
          <label className="mt-2 block">
            <span className={label}>누가</span>
            <input className={field} placeholder="유치부 · 초등부 (7세 ~ 초6)" value={poster.who}
              onChange={(e) => patch({ who: e.target.value })} />
          </label>
        </div>

        <label className="mt-3 block">
          <span className={label}>말씀</span>
          <textarea className={`${field} h-14`} placeholder="우리는 그가 만드신 바라" value={poster.verse}
            onChange={(e) => patch({ verse: e.target.value })} />
        </label>
        <label className="mt-2 block">
          <span className={label}>말씀 출처</span>
          <input className={field} placeholder="에베소서 2:10" value={poster.verseRef}
            onChange={(e) => patch({ verseRef: e.target.value })} />
        </label>

        <label className="mt-2 block">
          <span className={label}>맨 아래 — 교회 이름이나 문의처</span>
          <input className={field} placeholder="대로교회 교육부 · 문의 010-0000-0000" value={poster.footer}
            onChange={(e) => patch({ footer: e.target.value })} />
        </label>
      </section>

      {/* -------------------------------------------------------- 미리보기 */}
      <section className="lg:sticky lg:top-24 lg:self-start">
        <div ref={canvasBox} />

        <p className="mt-2 text-xs text-faint">
          {shape.width} × {shape.height}px · 화면에 보이는 그대로 저장됩니다
        </p>

        {missing.length > 0 && (
          <p className="mt-2 rounded border border-line bg-sunken px-3 py-2 text-xs leading-relaxed text-muted">
            아직 비어 있습니다 — <b>{missing.join(", ")}</b>
          </p>
        )}

        <button
          type="button"
          onClick={() =>
            downloadPoster(
              poster,
              `${(poster.title || "포스터").replace(/\n/g, " ").slice(0, 40)}.png`
            )
          }
          className="mt-3 h-10 w-full rounded-pill bg-accent text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
        >
          PNG로 내려받기
        </button>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          단톡방에 그대로 올리거나, 인쇄소에 보낼 수 있습니다. A4 세로는 150dpi라
          A4 한 장으로 인쇄해도 글자가 뭉개지지 않습니다.
        </p>
      </section>
    </div>
  );
}
