"use client";

import { useState } from "react";
import Link from "next/link";
import { addClipping } from "@/lib/sermon-store";
import type { AnalyzedWord, Verse } from "@/lib/bible/types";

/** 히브리어 본문의 형태소 구분 기호를 화면에서는 뗀다. */
function display(word: AnalyzedWord) {
  return word.lang === "hbo" ? word.text.replace(/\//g, "") : word.text;
}

function addToSermonNote(word: AnalyzedWord, refLabel: string) {
  addClipping({
    ref: refLabel,
    text: display(word),
    lemma: word.lemma,
    summary: word.summary,
    gloss: word.gloss ?? "",
    notes: word.sermonNotes,
    at: Date.now(),
  });
}

export default function VerseReader({
  verse,
  refLabel,
  initialWord,
}: {
  verse: Verse;
  refLabel: string;
  /** 주소로 넘어온 낱말 번호. 특정 낱말을 가리키는 링크를 공유할 때 쓴다. */
  initialWord?: number;
}) {
  const [selected, setSelected] = useState<number | null>(
    initialWord !== undefined && initialWord >= 0 && initialWord < verse.words.length
      ? initialWord
      : null
  );
  const [saved, setSaved] = useState(false);
  const active = selected === null ? null : verse.words[selected];
  const rtl = verse.lang === "hbo";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <div
          className={`rounded-lg border border-line bg-surface p-5 text-2xl ${
            rtl ? "hbo text-right" : "grc"
          }`}
        >
          {verse.words.map((word, i) => (
            <button
              key={i}
              onClick={() => { setSelected(i); setSaved(false); }}
              className={`mx-0.5 rounded px-1 transition-colors ${
                selected === i
                  ? "bg-accent text-background"
                  : "hover:bg-accent-soft"
              }`}
              title={word.summary}
            >
              {display(word)}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted">
          낱말을 누르면 형태소 분석과 설교 포인트가 열립니다.
        </p>

        <h2 className="mt-8 mb-2 text-sm font-bold">절 전체 파싱표</h2>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-accent-soft text-left">
              <tr>
                <th className="px-3 py-2 font-medium">본문</th>
                <th className="px-3 py-2 font-medium">사전형</th>
                <th className="px-3 py-2 font-medium">분석</th>
                <th className="px-3 py-2 font-medium">뜻</th>
              </tr>
            </thead>
            <tbody>
              {verse.words.map((word, i) => (
                <tr
                  key={i}
                  onClick={() => { setSelected(i); setSaved(false); }}
                  className={`cursor-pointer border-t border-line ${
                    selected === i ? "bg-accent-soft" : "hover:bg-accent-soft/50"
                  }`}
                >
                  <td className={`px-3 py-2 text-lg ${rtl ? "hbo" : "grc"}`}>
                    {display(word)}
                  </td>
                  <td className={`px-3 py-2 ${rtl ? "hbo" : "grc"}`}>
                    {rtl ? word.strong ?? word.lemma : word.lemma}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{word.summary}</td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {word.gloss ? word.gloss.slice(0, 60) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        {!active ? (
          <div className="rounded-lg border border-dashed border-line p-5 text-sm text-muted">
            낱말을 선택하세요.
          </div>
        ) : (
          <div className="rounded-lg border border-line bg-surface p-5">
            <p className={`text-3xl ${rtl ? "hbo text-right" : "grc"}`}>
              {display(active)}
            </p>
            <p className={`mt-1 text-sm text-muted ${rtl ? "hbo text-right" : "grc"}`}>
              사전형 {rtl ? active.strong ?? active.lemma : active.lemma}
            </p>

            <p className="mt-3 rounded bg-accent-soft px-3 py-2 text-sm font-medium">
              {active.summary}
            </p>

            {active.features.length > 0 && (
              <dl className="mt-3 grid grid-cols-[4rem_1fr] gap-y-1 text-sm">
                {active.features.map((f) => (
                  <div key={f.label + f.code} className="contents">
                    <dt className="text-muted">{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {active.gloss && (
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="mb-1 text-xs font-bold text-muted">사전 뜻 (Strong&apos;s)</h3>
                <p className="text-sm leading-relaxed">{active.gloss}</p>
              </div>
            )}

            {active.sermonNotes.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="mb-1 text-xs font-bold text-highlight">설교 포인트</h3>
                <ul className="space-y-2 text-sm leading-relaxed">
                  {active.sermonNotes.map((note, i) => (
                    <li key={i} className="border-l-2 border-highlight pl-2">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
              <Link
                href={`/tools/original/lemma?lemma=${encodeURIComponent(active.lemma)}&lang=${active.lang}`}
                className="rounded border border-line px-3 py-2 text-center text-sm hover:bg-accent-soft"
              >
                이 단어의 다른 용례 보기
              </Link>
              <button
                onClick={() => { addToSermonNote(active, refLabel); setSaved(true); }}
                className="rounded bg-accent px-3 py-2 text-sm text-background"
              >
                {saved ? "설교 노트에 담았습니다" : "설교 노트에 담기"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
