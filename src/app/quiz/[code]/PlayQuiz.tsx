"use client";

import Link from "next/link";
import { useState } from "react";
import { encourage, type Graded, type QuizQuestion, type QuizSummary } from "@/lib/quiz";
import { submitQuiz } from "../actions";

/*
  퀴즈 푸는 화면.

  한 문제씩 보여 준다. 다섯 문제를 한 화면에 늘어놓으면 휴대폰에서 스크롤이
  길어지고, 무엇을 골랐는지 헷갈린다.

  뒤로 갈 수 있게 둔다. 시간을 재지 않으므로 굳이 막을 이유가 없고, 설교를
  떠올리다 앞 문제 답을 고쳐 쓰고 싶은 것이 자연스럽다.

  고른 것이 바로 맞았는지 알려 주지 않는다. 다 풀고 한 번에 보여 주어야
  옆 사람 화면을 곁눈질하는 일이 줄고, 풀이를 차분히 읽는다.
*/

const LETTERS = ["ᄀ", "ᄂ", "ᄃ", "ᄅ", "ᄆ"];

export function PlayQuiz({
  quiz,
  questions,
  code,
}: {
  quiz: QuizSummary;
  questions: QuizQuestion[];
  code: string;
}) {
  const [player, setPlayer] = useState("");
  const [started, setStarted] = useState(false);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const [graded, setGraded] = useState<Graded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const total = questions.length;
  const answered = picked.filter((p) => p !== null).length;

  // ------------------------------------------------------------ 이름 적기
  if (!started) {
    return (
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold text-accent">설교 퀴즈</p>
        <h1 className="mt-2 text-3xl font-bold">{quiz.title}</h1>
        {quiz.sermon && <p className="mt-1 text-sm text-muted">{quiz.sermon}</p>}
        <p className="mt-4 text-sm leading-relaxed text-muted">
          문제 {total}개입니다. 시간은 재지 않으니 천천히 푸세요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (player.trim()) setStarted(true);
          }}
          className="mt-6"
        >
          <label className="block text-sm font-medium" htmlFor="player">
            이름
            <span className="ml-2 text-xs font-normal text-faint">순위표에 이렇게 보입니다</span>
            <input
              id="player"
              value={player}
              onChange={(e) => setPlayer(e.target.value.slice(0, 20))}
              required
              autoFocus
              className="mt-1.5 w-full rounded-card border border-line bg-surface px-4 py-3 text-base transition-colors focus:border-accent focus:outline-none"
              placeholder="남윤기"
            />
          </label>
          <button className="mt-5 w-full rounded-pill bg-accent py-3.5 text-base font-semibold text-background transition-colors hover:bg-accent-hover">
            시작하기
          </button>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------ 결과
  if (graded) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-card border border-line bg-surface p-7 text-center">
          <p className="text-sm text-muted">{player} 님</p>
          <p className="mt-3 text-5xl font-bold tracking-tight">
            {graded.score}
            <span className="text-2xl font-medium text-faint"> / {graded.total}</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {encourage(graded.score, graded.total)}
          </p>
        </div>

        <ul className="mt-6 flex flex-col gap-3">
          {questions.map((q, i) => {
            const right = graded.correct[i];
            const mine = picked[i];
            const ok = mine === right;
            return (
              <li key={q.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 shrink-0 rounded-pill px-2 py-0.5 text-xs font-bold ${
                      ok ? "bg-accent-soft text-accent" : "bg-sunken text-faint"
                    }`}
                  >
                    {ok ? "맞음" : "틀림"}
                  </span>
                  <p className="text-sm font-medium leading-relaxed">{q.prompt}</p>
                </div>

                <p className="mt-3 text-sm">
                  <span className="text-faint">정답 · </span>
                  <b className="font-semibold">{q.choices[right]}</b>
                </p>
                {!ok && mine !== null && mine >= 0 && (
                  <p className="mt-1 text-sm text-faint">고르신 것 · {q.choices[mine]}</p>
                )}

                {/* 틀린 사람에게 이게 제일 중요하다. */}
                {graded.notes[i] && (
                  <p className="mt-3 rounded-card bg-sunken px-3.5 py-2.5 text-sm leading-relaxed text-muted">
                    {graded.notes[i]}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-7 flex flex-wrap gap-2">
          <Link
            href={`/quiz/${code}/board`}
            className="rounded-pill bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            순위 보기
          </Link>
          <button
            onClick={() => {
              setGraded(null);
              setPicked(questions.map(() => null));
              setAt(0);
            }}
            className="rounded-pill border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-line-strong"
          >
            다시 풀기
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------ 문제
  const q = questions[at];
  const last = at === total - 1;

  const send = async () => {
    setSending(true);
    setError(null);
    const result = await submitQuiz(code, player, picked);
    setSending(false);
    if (result.error) setError(result.error);
    else if (result.graded) setGraded(result.graded);
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-muted">
          {at + 1} / {total}
        </span>
        <span className="text-faint">{player}</span>
      </div>
      {/* 어디까지 왔는지 보여 준다. 끝이 안 보이면 중간에 그만둔다. */}
      <div className="mt-2 h-1 overflow-hidden rounded-pill bg-sunken">
        <div
          className="h-full rounded-pill bg-accent transition-all"
          style={{ width: `${((at + 1) / total) * 100}%` }}
        />
      </div>

      <h1 className="mt-7 text-xl font-bold leading-relaxed">{q.prompt}</h1>

      <ul className="mt-5 flex flex-col gap-2">
        {q.choices.map((choice, c) => {
          const on = picked[at] === c;
          return (
            <li key={c}>
              <button
                onClick={() => {
                  setPicked((prev) => prev.map((p, i) => (i === at ? c : p)));
                  // 고르면 바로 넘어간다. 마지막 문제에서는 멈춰서 확인하게 둔다.
                  if (!last) setTimeout(() => setAt((v) => v + 1), 180);
                }}
                className={`flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left text-base transition-colors ${
                  on
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-pill text-sm font-bold ${
                    on ? "bg-accent text-background" : "bg-sunken text-muted"
                  }`}
                >
                  {LETTERS[c]}
                </span>
                {choice}
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-5 rounded-card border border-line bg-sunken px-4 py-3 text-sm">{error}</p>
      )}

      <div className="mt-7 flex items-center gap-2">
        {at > 0 && (
          <button
            onClick={() => setAt((v) => v - 1)}
            className="rounded-pill border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:border-line-strong"
          >
            이전
          </button>
        )}

        {last ? (
          <button
            onClick={send}
            disabled={sending || answered === 0}
            className="ml-auto rounded-pill bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {sending ? "채점 중…" : `제출하기 (${answered}/${total})`}
          </button>
        ) : (
          <button
            onClick={() => setAt((v) => v + 1)}
            className="ml-auto rounded-pill border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:border-line-strong"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
