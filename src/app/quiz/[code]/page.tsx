import type { Metadata } from "next";
import Link from "next/link";
import { normalizeCode, type QuizQuestion, type QuizSummary } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";
import { PlayQuiz } from "./PlayQuiz";

export const metadata: Metadata = {
  title: "퀴즈 풀기",
  // 참여 주소는 그 자리에서 쓰고 버리는 것이라 검색에 남길 이유가 없다.
  robots: { index: false },
};

export default async function PlayPage({ params }: PageProps<"/quiz/[code]">) {
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
        <h1 className="text-2xl font-bold">퀴즈를 찾지 못했습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          코드 <b className="font-mono">{clean || "?"}</b> 로 열려 있는 퀴즈가 없습니다.
          <br />
          코드를 다시 확인해 주세요. 이미 닫힌 퀴즈일 수도 있습니다.
        </p>
        <Link
          href="/quiz"
          className="mt-6 inline-block rounded-pill bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
        >
          코드 다시 넣기
        </Link>
      </div>
    );
  }

  const summary = quiz as QuizSummary;

  const { data: rows } = await supabase!
    .from("quiz_open_questions")
    .select("id, position, prompt, choices")
    .eq("quiz_id", summary.id)
    .order("position");

  const questions = (rows ?? []) as QuizQuestion[];

  return <PlayQuiz quiz={summary} questions={questions} code={clean} />;
}
