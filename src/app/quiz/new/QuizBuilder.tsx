"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createQuiz, type QuizResult } from "../actions";

/*
  퀴즈 만드는 화면.

  설교가 끝나고 만드는 것이 아니라 설교를 준비하면서 만드는 물건이다. 그래서
  빠르게 치고 나갈 수 있어야 한다 — 문제 하나가 한 덩어리로 보이고, 보기는
  기본 넷이 이미 놓여 있고, 정답은 라디오 하나로 고른다.

  풀이 칸을 비워 두지 말라고 권한다. 점수만 나오는 퀴즈는 틀린 사람에게
  아무것도 남기지 않는다. 다만 막지는 않는다 — 급할 때가 있다.
*/

const FIELD =
  "w-full rounded-card border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none";
const LETTERS = ["ᄀ", "ᄂ", "ᄃ", "ᄅ", "ᄆ"];

interface Draft {
  key: number;
  choices: number;
}

export function QuizBuilder() {
  const [drafts, setDrafts] = useState<Draft[]>([
    { key: 0, choices: 4 },
    { key: 1, choices: 4 },
    { key: 2, choices: 4 },
  ]);
  const [next, setNext] = useState(3);
  const [state, action, pending] = useActionState(
    async (_prev: QuizResult, formData: FormData) => createQuiz(formData),
    {}
  );

  if (state.code) {
    return (
      <div className="mt-8 rounded-card border border-line bg-surface p-7 text-center">
        <h2 className="text-lg font-bold">퀴즈를 만들었습니다</h2>
        <p className="mt-2 text-sm text-muted">이 코드를 화면에 띄우거나 주보에 적으세요.</p>
        <p className="mt-5 rounded-card bg-sunken py-6 font-mono text-5xl font-bold tracking-[0.25em]">
          {state.code}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href={`/quiz/${state.code}`}
            className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
          >
            직접 풀어 보기
          </Link>
          <Link
            href="/quiz"
            className="rounded-pill border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-line-strong"
          >
            퀴즈 목록
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="title">
          퀴즈 제목<span className="ml-1 text-accent">*</span>
          <input id="title" name="title" required className={`mt-1.5 ${FIELD}`} placeholder="10월 5일 주일설교" />
        </label>
        <label className="block text-sm font-medium" htmlFor="sermon">
          설교 본문·제목
          <span className="ml-2 text-xs font-normal text-faint">비워도 됩니다</span>
          <input id="sermon" name="sermon" className={`mt-1.5 ${FIELD}`} placeholder="누가복음 15장 · 잃은 아들" />
        </label>
      </div>

      {drafts.map((draft, i) => (
        <fieldset key={draft.key} className="rounded-card border border-line bg-surface p-5">
          <legend className="px-2 text-sm font-bold">{i + 1}번 문제</legend>

          <input
            name={`q${i}_prompt`}
            className={FIELD}
            placeholder="아버지는 돌아온 아들에게 무엇을 신겼습니까?"
          />

          <ul className="mt-3 flex flex-col gap-2">
            {Array.from({ length: draft.choices }, (_, c) => (
              <li key={c} className="flex items-center gap-2">
                <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted">
                  <input
                    type="radio"
                    name={`q${i}_answer`}
                    value={c}
                    defaultChecked={c === 0}
                    className="h-4 w-4"
                    aria-label={`${i + 1}번 문제의 정답을 ${LETTERS[c]}로`}
                  />
                  {LETTERS[c]}
                </label>
                <input name={`q${i}_c${c}`} className={FIELD} placeholder={c < 2 ? "보기" : "보기 (비우면 뺍니다)"} />
              </li>
            ))}
          </ul>

          <div className="mt-2 flex gap-3 text-xs">
            {draft.choices < 5 && (
              <button
                type="button"
                onClick={() =>
                  setDrafts((prev) =>
                    prev.map((d) => (d.key === draft.key ? { ...d, choices: d.choices + 1 } : d))
                  )
                }
                className="text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                보기 늘리기
              </button>
            )}
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={() => setDrafts((prev) => prev.filter((d) => d.key !== draft.key))}
                className="ml-auto text-faint underline-offset-4 hover:text-foreground hover:underline"
              >
                이 문제 빼기
              </button>
            )}
          </div>

          <label className="mt-4 block text-xs font-medium text-muted">
            풀이
            <span className="ml-2 font-normal text-faint">
              틀린 분에게 이게 제일 중요합니다. 한 줄이면 충분합니다
            </span>
            <input
              name={`q${i}_note`}
              className={`mt-1.5 ${FIELD}`}
              placeholder="신을 신기는 것은 종이 아니라 아들로 받아들인다는 뜻입니다."
            />
          </label>
        </fieldset>
      ))}

      <div>
        <button
          type="button"
          onClick={() => {
            setDrafts((prev) => [...prev, { key: next, choices: 4 }]);
            setNext((v) => v + 1);
          }}
          className="rounded-pill border border-dashed border-line px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-line-strong hover:text-foreground"
        >
          문제 추가
        </button>
      </div>

      {state.error && (
        <p className="rounded-card border border-line bg-sunken px-4 py-3 text-sm">{state.error}</p>
      )}

      <div>
        <button
          disabled={pending}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "만드는 중…" : "퀴즈 만들기"}
        </button>
      </div>
    </form>
  );
}
