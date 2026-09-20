"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getServerSnapshot,
  getSnapshot,
  removeClipping,
  setOutline,
  subscribe,
  type Outline,
} from "@/lib/sermon-store";

export default function SermonPage() {
  const { clippings, outline } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const patch = (changes: Partial<Outline>) => setOutline({ ...outline, ...changes });

  function toMarkdown() {
    const lines = [
      `# ${outline.title || "(제목 없음)"}`,
      ``,
      `**본문** ${outline.passage || "-"}`,
      ``,
      `**중심 메시지** ${outline.bigIdea || "-"}`,
      ``,
      `## 대지`,
      ...outline.points.map((p, i) => `${i + 1}. ${p || "-"}`),
      ``,
      `## 적용`,
      outline.application || "-",
    ];
    if (clippings.length) {
      lines.push(``, `## 원어 연구`);
      for (const c of clippings) {
        lines.push(
          ``,
          `### ${c.text} — ${c.ref}`,
          `- 사전형: ${c.lemma}`,
          `- 분석: ${c.summary}`,
          ...(c.gloss ? [`- 뜻: ${c.gloss}`] : []),
          ...c.notes.map((n) => `- 설교 포인트: ${n}`)
        );
      }
    }
    return lines.join("\n");
  }

  function download() {
    const blob = new Blob([toMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${outline.title || "설교노트"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const field = "w-full rounded border border-line bg-surface px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-xl font-bold">설교 노트</h1>
      <p className="mt-1 text-sm text-muted">
        원어 파싱에서 담은 낱말이 아래에 모입니다. 작성 내용은 이 브라우저에만 저장됩니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <input
            className={field}
            placeholder="본문 (예: 요한복음 3:16)"
            value={outline.passage}
            onChange={(e) => patch({ passage: e.target.value })}
          />
          <input
            className={field}
            placeholder="설교 제목"
            value={outline.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <textarea
            className={`${field} h-20`}
            placeholder="중심 메시지 — 한 문장으로"
            value={outline.bigIdea}
            onChange={(e) => patch({ bigIdea: e.target.value })}
          />
          {outline.points.map((point, i) => (
            <input
              key={i}
              className={field}
              placeholder={`대지 ${i + 1}`}
              value={point}
              onChange={(e) => {
                const points = [...outline.points];
                points[i] = e.target.value;
                patch({ points });
              }}
            />
          ))}
          <button
            onClick={() => patch({ points: [...outline.points, ""] })}
            className="text-xs text-accent hover:underline"
          >
            + 대지 추가
          </button>
          <textarea
            className={`${field} h-24`}
            placeholder="적용 — 청중이 이번 주에 무엇을 할 것인가"
            value={outline.application}
            onChange={(e) => patch({ application: e.target.value })}
          />
          <div className="flex gap-2">
            <button onClick={download} className="rounded bg-accent px-4 py-2 text-sm text-background">
              마크다운으로 내려받기
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(toMarkdown())}
              className="rounded border border-line px-4 py-2 text-sm hover:bg-accent-soft"
            >
              복사
            </button>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold">담은 원어 ({clippings.length})</h2>
          {clippings.length === 0 ? (
            <p className="rounded border border-dashed border-line p-5 text-sm text-muted">
              아직 없습니다.{" "}
              <Link href="/tools/original" className="text-accent hover:underline">
                원어 파싱
              </Link>
              에서 낱말을 선택해 담아 보세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {clippings.map((c) => (
                <li key={c.at} className="rounded border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="grc text-xl">{c.text}</p>
                      <p className="text-xs text-muted">
                        {c.ref} · {c.summary}
                      </p>
                    </div>
                    <button
                      onClick={() => removeClipping(c.at)}
                      className="text-xs text-muted hover:text-highlight"
                    >
                      삭제
                    </button>
                  </div>
                  {c.gloss && <p className="mt-2 text-xs">{c.gloss}</p>}
                  {c.notes.map((n, i) => (
                    <p key={i} className="mt-2 border-l-2 border-highlight pl-2 text-xs leading-relaxed">
                      {n}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
