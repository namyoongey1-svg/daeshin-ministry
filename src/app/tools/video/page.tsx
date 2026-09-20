"use client";

import { useSyncExternalStore } from "react";
import { createLocalStore, newId } from "@/lib/local-store";
import {
  EVENT_TYPES,
  PRIORITIES,
  PURPOSES,
  SHOOTING_RULES,
  buildSegments,
  buildShots,
  emptyPlan,
  formatDuration,
  type Priority,
  type Segment,
  type Shot,
  type VideoPlan,
} from "@/lib/video-plan";

const store = createLocalStore<VideoPlan>("daeshin.video", emptyPlan(), (raw) => ({
  ...emptyPlan(),
  ...(raw as Partial<VideoPlan>),
}));

const field = "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm";
const label = "mb-1 block text-xs text-muted";

const PRIORITY_STYLE: Record<Priority, string> = {
  필수: "bg-highlight text-background",
  권장: "bg-accent-soft",
  여유되면: "border border-line text-muted",
};

export default function VideoPlanPage() {
  const plan = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const patch = (changes: Partial<VideoPlan>) =>
    store.update((current) => ({ ...current, ...changes }));

  const planned = plan.segments.reduce((sum, s) => sum + (s.seconds || 0), 0);
  const over = planned - plan.targetSeconds;
  const shotsDone = plan.shots.filter((s) => s.done).length;
  const mustShots = plan.shots.filter((s) => s.priority === "필수");
  const mustLeft = mustShots.filter((s) => !s.done).length;

  function patchShot(id: string, changes: Partial<Shot>) {
    patch({ shots: plan.shots.map((s) => (s.id === id ? { ...s, ...changes } : s)) });
  }

  function patchSegment(id: string, changes: Partial<Segment>) {
    patch({ segments: plan.segments.map((s) => (s.id === id ? { ...s, ...changes } : s)) });
  }

  function loadTemplate(eventType: string) {
    if (!eventType) return;
    const incoming = buildShots(eventType);
    // 이미 적어 둔 항목은 두고 뒤에 붙인다.
    patch({ shots: [...plan.shots, ...incoming] });
  }

  function toMarkdown() {
    const lines = [
      `# ${plan.title || "(제목 없음)"} 스케치 영상 기획`,
      ``,
      `- 행사일: ${plan.eventDate}`,
      `- 쓰임새: ${plan.purpose}`,
      `- 목표 길이: ${formatDuration(plan.targetSeconds)} (구성 합계 ${formatDuration(planned)})`,
      ``,
      `## 촬영 샷 리스트`,
      ``,
      `| 우선순위 | 장면 | 어떻게 |`,
      `| --- | --- | --- |`,
      ...plan.shots.map((s) => `| ${s.priority} | ${s.scene} | ${s.detail} |`),
      ``,
      `## 편집 구성`,
      ``,
      `| 구간 | 길이 | 내용 | 음악 | 자막 |`,
      `| --- | --- | --- | --- | --- |`,
      ...plan.segments.map(
        (s) => `| ${s.name} | ${s.seconds}초 | ${s.content} | ${s.music} | ${s.caption} |`
      ),
      ``,
      `## 촬영 원칙`,
      ``,
      ...SHOOTING_RULES.map((r) => `- ${r}`),
    ];
    if (plan.notes.trim()) lines.push(``, `## 메모`, ``, plan.notes);
    return lines.join("\n");
  }

  function download() {
    const blob = new Blob([toMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.title || "영상기획"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="text-xl font-bold">스케치 영상 기획</h1>
      <p className="mt-1 text-sm text-muted">
        찍을 장면을 미리 정하고, 편집 구성을 짭니다. 적은 내용은 이 브라우저에만 저장됩니다.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <label className="sm:col-span-2">
          <span className={label}>행사명</span>
          <input className={field} placeholder="2026 여름 수련회" value={plan.title}
            onChange={(e) => patch({ title: e.target.value })} />
        </label>
        <label>
          <span className={label}>행사일</span>
          <input type="date" className={field} value={plan.eventDate}
            onChange={(e) => patch({ eventDate: e.target.value })} />
        </label>
        <label>
          <span className={label}>쓰임새</span>
          <select className={field} value={plan.purpose}
            onChange={(e) => patch({ purpose: e.target.value })}>
            {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>

      {/* ------------------------------------------------------- 샷 리스트 */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold">촬영 샷 리스트</h2>
          {plan.shots.length > 0 && (
            <span className="text-xs text-muted">
              {shotsDone}/{plan.shots.length} 촬영
              {mustLeft > 0 && <b className="ml-1 text-highlight">· 필수 {mustLeft}개 남음</b>}
            </span>
          )}
          <select
            className="ml-auto rounded border border-line bg-surface px-2 py-1.5 text-sm"
            value=""
            onChange={(e) => { loadTemplate(e.target.value); e.target.value = ""; }}
          >
            <option value="">행사 유형에서 불러오기…</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {plan.shots.length === 0 ? (
          <p className="mt-3 rounded border border-dashed border-line p-6 text-center text-sm text-muted">
            위에서 행사 유형을 고르면 놓치기 쉬운 장면들이 채워집니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {plan.shots.map((shot) => (
              <li key={shot.id} className="rounded border border-line bg-surface p-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={shot.done}
                    onChange={(e) => patchShot(shot.id, { done: e.target.checked })}
                    className="mt-1"
                    aria-label="촬영 완료"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className={`${field} max-w-xs ${shot.done ? "line-through opacity-60" : ""}`}
                        value={shot.scene}
                        onChange={(e) => patchShot(shot.id, { scene: e.target.value })}
                      />
                      <select
                        className={`rounded px-2 py-0.5 text-xs ${PRIORITY_STYLE[shot.priority]}`}
                        value={shot.priority}
                        onChange={(e) => patchShot(shot.id, { priority: e.target.value as Priority })}
                      >
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button
                        onClick={() => patch({ shots: plan.shots.filter((s) => s.id !== shot.id) })}
                        className="ml-auto text-xs text-muted hover:text-highlight"
                      >삭제</button>
                    </div>
                    <input
                      className={`${field} mt-2`}
                      placeholder="어떻게 찍을지 — 앵글, 길이, 주의할 점"
                      value={shot.detail}
                      onChange={(e) => patchShot(shot.id, { detail: e.target.value })}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() =>
            patch({
              shots: [...plan.shots, { id: newId(), scene: "", detail: "", priority: "권장", done: false }],
            })
          }
          className="mt-2 text-xs text-accent hover:underline"
        >+ 장면 추가</button>
      </section>

      {/* -------------------------------------------------------- 편집 구성 */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold">편집 구성</h2>
          <label className="flex items-center gap-2 text-xs text-muted">
            목표 길이
            <input
              type="number"
              min={30}
              step={10}
              className="w-20 rounded border border-line bg-surface px-2 py-1 text-sm"
              value={plan.targetSeconds}
              onChange={(e) => patch({ targetSeconds: Number(e.target.value) || 0 })}
            />
            초
          </label>
          <button
            onClick={() => {
              if (confirm("목표 길이에 맞춰 구성을 다시 짤까요? 지금 적은 내용은 사라집니다.")) {
                patch({ segments: buildSegments(plan.targetSeconds) });
              }
            }}
            className="text-xs text-accent hover:underline"
          >기본 구성으로 다시 짜기</button>

          <span className={`ml-auto text-sm ${over > 10 ? "text-highlight" : "text-muted"}`}>
            합계 {formatDuration(planned)}
            {over !== 0 && (over > 0 ? ` · ${over}초 초과` : ` · ${-over}초 여유`)}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-accent-soft text-left text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">구간</th>
                <th className="w-20 px-3 py-2 font-medium">초</th>
                <th className="px-3 py-2 font-medium">내용</th>
                <th className="px-3 py-2 font-medium">음악</th>
                <th className="px-3 py-2 font-medium">자막</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {plan.segments.map((seg) => (
                <tr key={seg.id} className="border-t border-line align-top">
                  <td className="px-2 py-1.5">
                    <input className={field} value={seg.name}
                      onChange={(e) => patchSegment(seg.id, { name: e.target.value })} /></td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} step={5} className={field} value={seg.seconds}
                      onChange={(e) => patchSegment(seg.id, { seconds: Number(e.target.value) || 0 })} /></td>
                  <td className="px-2 py-1.5">
                    <input className={field} value={seg.content}
                      onChange={(e) => patchSegment(seg.id, { content: e.target.value })} /></td>
                  <td className="px-2 py-1.5">
                    <input className={field} value={seg.music}
                      onChange={(e) => patchSegment(seg.id, { music: e.target.value })} /></td>
                  <td className="px-2 py-1.5">
                    <input className={field} placeholder="화면에 올릴 글" value={seg.caption}
                      onChange={(e) => patchSegment(seg.id, { caption: e.target.value })} /></td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => patch({ segments: plan.segments.filter((s) => s.id !== seg.id) })}
                      className="text-xs text-muted hover:text-highlight"
                    >×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={() =>
            patch({
              segments: [...plan.segments, { id: newId(), name: "", seconds: 10, content: "", music: "", caption: "" }],
            })
          }
          className="mt-2 text-xs text-accent hover:underline"
        >+ 구간 추가</button>
      </section>

      {/* -------------------------------------------------------- 촬영 원칙 */}
      <section className="mt-10">
        <h2 className="mb-2 text-sm font-bold">촬영 전에 한 번</h2>
        <ul className="space-y-2 rounded-lg border border-line bg-surface p-5 text-sm leading-relaxed">
          {SHOOTING_RULES.map((rule, i) => (
            <li key={i} className="border-l-2 border-highlight pl-3">{rule}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <label className={label}>메모</label>
        <textarea
          className={`${field} h-24`}
          placeholder="장비, 담당자, 현장에서 챙길 것"
          value={plan.notes}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={download} className="rounded bg-accent px-4 py-2 text-sm text-background">
          마크다운으로 내려받기
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(toMarkdown())}
          className="rounded border border-line px-4 py-2 text-sm hover:bg-accent-soft"
        >복사</button>
        <button
          onClick={() => { if (confirm("적은 내용을 모두 지울까요?")) store.set(emptyPlan()); }}
          className="rounded border border-line px-4 py-2 text-sm hover:bg-accent-soft"
        >새로 시작</button>
      </div>
    </div>
  );
}
