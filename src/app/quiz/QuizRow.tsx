"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { removeQuiz, setQuizOpen } from "./actions";
import type { MyQuiz } from "./page";

/** 내가 만든 퀴즈 한 줄. 코드 복사와 열고 닫기를 여기서 바로 한다. */
export function QuizRow({ quiz }: { quiz: MyQuiz }) {
  const [open, setOpen] = useState(quiz.open);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/quiz/${quiz.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드를 막아 둔 브라우저가 있다. 코드는 화면에 이미 보이므로 넘어간다.
    }
  };

  return (
    <li className="rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">{quiz.title}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {quiz.sermon && `${quiz.sermon} · `}
            문제 {quiz.question_count}개 · 푼 사람 {quiz.play_count}명
          </p>
        </div>

        <button
          onClick={copy}
          title="참여 주소를 복사합니다"
          className="shrink-0 rounded-card bg-sunken px-4 py-2 font-mono text-xl font-bold tracking-[0.2em] transition-colors hover:bg-accent-soft hover:text-accent"
        >
          {copied ? "복사됨" : quiz.code}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-xs">
        <Link
          href={`/quiz/${quiz.code}/board`}
          className="rounded-pill bg-sunken px-3 py-1.5 font-medium text-muted transition-colors hover:text-foreground"
        >
          순위 보기
        </Link>
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const next = !open;
              setOpen(next);
              const r = await setQuizOpen(quiz.id, next);
              if (r.error) setOpen(!next);
            })
          }
          className={`rounded-pill px-3 py-1.5 font-medium transition-colors disabled:opacity-60 ${
            open ? "bg-accent-soft text-accent" : "bg-sunken text-faint"
          }`}
        >
          {open ? "받는 중" : "닫힘"}
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`"${quiz.title}" 퀴즈와 푼 기록을 모두 지웁니다. 되돌릴 수 없습니다.`)) return;
            start(() => void removeQuiz(quiz.id));
          }}
          className="ml-auto text-faint underline-offset-4 hover:text-foreground hover:underline"
        >
          지우기
        </button>
      </div>
    </li>
  );
}
