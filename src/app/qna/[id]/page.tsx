import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { relativeTime, type Answer, type Question } from "@/lib/qna";
import AnswerForm from "./AnswerForm";
import DeleteButton from "./DeleteButton";

// 익명 글이라 검색엔진에 올리지 않는다.
export const metadata: Metadata = {
  title: "사역 Q&A",
  robots: { index: false, follow: false },
};

export default async function QuestionPage({ params }: PageProps<"/qna/[id]">) {
  const { id } = await params;

  const session = await getSession();
  if (!isApproved(session)) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/qna" className="text-sm text-muted hover:text-accent">← 사역 Q&amp;A</Link>
        <p className="mt-6 rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">
          승인 회원만 읽을 수 있습니다.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: question } = await supabase!
    .from("questions_public")
    .select("id, topic, title, body, created_at, answer_count, mine")
    .eq("id", id)
    .maybeSingle();

  if (!question) notFound();
  const q = question as Question;

  const { data: answerData } = await supabase!
    .from("answers_public")
    .select("id, question_id, body, created_at, mine")
    .eq("question_id", id)
    .order("created_at", { ascending: true });

  const answers = (answerData as Answer[] | null) ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/qna" className="text-sm text-muted hover:text-accent">← 사역 Q&amp;A</Link>

      <article className="mt-5 rounded-card border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-pill bg-sunken px-2.5 py-1 font-medium text-muted">
            {q.topic}
          </span>
          {q.mine && (
            <span className="rounded-pill bg-accent-soft px-2.5 py-1 font-medium text-accent">
              내 글
            </span>
          )}
          <span className="ml-auto text-faint">{relativeTime(q.created_at)}</span>
        </div>

        <h1 className="mt-3 text-2xl font-bold leading-snug">{q.title}</h1>
        <p className="mt-4 whitespace-pre-line leading-relaxed">{q.body}</p>

        {q.mine && (
          <div className="mt-5 border-t border-line pt-4">
            <DeleteButton kind="question" id={q.id} />
          </div>
        )}
      </article>

      <section className="mt-8">
        <h2 className="text-sm font-bold">
          답변 {answers.length > 0 && `(${answers.length})`}
        </h2>

        {answers.length === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-line py-10 text-center text-sm text-muted">
            아직 답변이 없습니다. 비슷한 일을 겪으셨다면 한 줄이라도 남겨 주세요.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {answers.map((a) => (
              <li key={a.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex items-center gap-2 text-xs">
                  {a.mine && (
                    <span className="rounded-pill bg-accent-soft px-2.5 py-1 font-medium text-accent">
                      내 답변
                    </span>
                  )}
                  <span className="ml-auto text-faint">{relativeTime(a.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line leading-relaxed">{a.body}</p>
                {a.mine && (
                  <div className="mt-3">
                    <DeleteButton kind="answer" id={a.id} questionId={q.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <AnswerForm questionId={q.id} />
      </section>
    </div>
  );
}
