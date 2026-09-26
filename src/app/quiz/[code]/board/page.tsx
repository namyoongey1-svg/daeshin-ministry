import type { Metadata } from "next";
import Link from "next/link";
import { normalizeCode, rank, type BoardRow, type QuizSummary } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "퀴즈 순위",
  robots: { index: false },
};

export default async function BoardPage({ params }: PageProps<"/quiz/[code]/board"> ) {
  const { code } = await params;
  const clean = normalizeCode(code);
  const supabase = await createClient();

  const { data: quiz } = await supabase!
    .from("quiz_open")
    .select("*")
    .eq("code", clean)
    .maybeSingle();

  if (!quiz) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">순위를 찾지 못했습니다</h1>
        <p className="mt-3 text-sm text-muted">닫힌 퀴즈이거나 코드가 다릅니다.</p>
        <Link href="/quiz" className="mt-6 inline-block text-sm text-accent hover:underline">
          코드 다시 넣기
        </Link>
      </div>
    );
  }

  const summary = quiz as QuizSummary;
  const { data } = await supabase!
    .from("quiz_board")
    .select("player, score, finished_at")
    .eq("quiz_id", summary.id);

  const rows = rank((data ?? []) as BoardRow[]);
  const top = rows[0]?.score ?? 0;

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-sm font-semibold text-accent">설교 퀴즈</p>
      <h1 className="mt-2 text-3xl font-bold">{summary.title}</h1>
      <p className="mt-1 text-sm text-muted">
        문제 {summary.question_count}개 · 푼 사람 {rows.length}명
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          아직 푼 사람이 없습니다.
        </p>
      ) : (
        <ol className="mt-6 flex flex-col gap-2">
          {rows.map((row, i) => (
            <li
              key={`${row.player}-${row.finished_at}`}
              className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3"
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-pill text-sm font-bold ${
                  i < 3 ? "bg-accent-soft text-accent" : "bg-sunken text-faint"
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{row.player}</span>
              {/* 막대로 보여 주면 점수 차이가 한눈에 읽힌다. */}
              <span className="hidden h-1.5 w-24 overflow-hidden rounded-pill bg-sunken sm:block">
                <span
                  className="block h-full rounded-pill bg-accent"
                  style={{ width: `${top ? (row.score / top) * 100 : 0}%` }}
                />
              </span>
              <span className="shrink-0 text-sm font-bold">
                {row.score}
                <span className="font-medium text-faint"> / {summary.question_count}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-6 text-xs leading-relaxed text-faint">
        같은 이름으로 여러 번 풀면 가장 높은 점수만 올라갑니다. 점수가 같으면 먼저 낸 분이 앞입니다.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        <Link
          href={`/quiz/${clean}`}
          className="rounded-pill bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
        >
          퀴즈 풀기
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
