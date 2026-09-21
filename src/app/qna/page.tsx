import Link from "next/link";
import type { Metadata } from "next";
import { getSession, isApproved } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { TOPICS, relativeTime, type Question } from "@/lib/qna";
import AskForm from "./AskForm";

export const metadata: Metadata = {
  title: "사역 Q&A",
  description:
    "사례비, 청빙, 목회 고민처럼 실명으로는 꺼내기 어려운 이야기를 승인 회원끼리 익명으로 나눕니다.",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold sm:text-4xl">사역 Q&amp;A</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        사례비, 청빙, 당회와의 갈등처럼 실명으로는 꺼내기 어려운 이야기를
        승인 회원끼리 익명으로 나눕니다.
      </p>
      {children}
    </div>
  );
}

export default async function QnaPage({ searchParams }: PageProps<"/qna">) {
  const params = await searchParams;
  const topic = typeof params.topic === "string" ? params.topic : "";

  if (!getSupabaseEnv()) {
    return (
      <Shell>
        <p className="mt-8 rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">
          Supabase를 아직 연결하지 않아 Q&amp;A가 꺼져 있습니다.
        </p>
      </Shell>
    );
  }

  const session = await getSession();
  const approved = isApproved(session);

  if (!approved) {
    return (
      <Shell>
        <div className="mt-8 rounded-card border border-dashed border-line p-8 text-center text-sm leading-relaxed text-muted">
          {!session ? (
            <>
              승인 회원만 읽고 쓸 수 있습니다.{" "}
              <Link href="/login" className="text-accent underline-offset-4 hover:underline">
                로그인
              </Link>
              부터 해 주세요.
            </>
          ) : !session.profile ? (
            <>
              <Link href="/account" className="text-accent underline-offset-4 hover:underline">
                소속 정보
              </Link>
              를 적어 주시면 운영진이 확인합니다.
            </>
          ) : (
            <>
              승인을 기다리는 중입니다.
              <br />
              여기 오가는 이야기가 이야기인 만큼, 확인된 사역자에게만 엽니다.
            </>
          )}
        </div>
      </Shell>
    );
  }

  const supabase = await createClient();
  let query = supabase!
    .from("questions_public")
    .select("id, topic, title, body, created_at, answer_count, mine")
    .order("created_at", { ascending: false })
    .limit(60);
  if (topic) query = query.eq("topic", topic);

  const { data } = await query;
  const questions = (data as Question[] | null) ?? [];

  return (
    <Shell>
      <AskForm />

      <nav className="mt-10 flex flex-wrap gap-1.5">
        <Link
          href="/qna"
          className={`rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
            topic ? "text-muted hover:bg-sunken" : "bg-foreground text-background"
          }`}
        >
          전체
        </Link>
        {TOPICS.map((t) => (
          <Link
            key={t}
            href={`/qna?topic=${encodeURIComponent(t)}`}
            className={`rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
              topic === t ? "bg-foreground text-background" : "text-muted hover:bg-sunken"
            }`}
          >
            {t}
          </Link>
        ))}
      </nav>

      {questions.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed border-line py-16 text-center text-sm text-muted">
          아직 올라온 글이 없습니다. 먼저 물어보셔도 됩니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {questions.map((q) => (
            <li key={q.id}>
              <Link
                href={`/qna/${q.id}`}
                className="block rounded-card border border-line bg-surface p-5 transition-all hover:border-line-strong hover:shadow-card"
              >
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
                <h2 className="mt-2 font-bold">{q.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{q.body}</p>
                <p className="mt-3 text-xs text-faint">
                  {q.answer_count > 0 ? `답변 ${q.answer_count}개` : "아직 답변 없음"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 rounded-card border border-line bg-surface px-5 py-4 text-xs leading-relaxed text-muted">
        <b>익명이지만 완전한 익명은 아닙니다.</b> 글쓴이는 화면 어디에도 드러나지
        않지만, 신고나 정리를 위해 운영진은 확인할 수 있습니다. 그 사실을 알고
        쓰시라고 적어 둡니다. 교회나 사람을 특정할 수 있는 내용은 피해 주세요.
      </p>
    </Shell>
  );
}
