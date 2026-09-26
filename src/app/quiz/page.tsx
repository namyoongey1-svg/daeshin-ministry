import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JoinBox } from "./JoinBox";
import { QuizRow } from "./QuizRow";

export const metadata: Metadata = {
  title: "설교 퀴즈",
  description:
    "설교를 마치고 바로 푸는 퀴즈를 만듭니다. 참여자는 가입 없이 여섯 자리 코드만 적고 들어옵니다.",
  alternates: { canonical: "/quiz" },
};

export interface MyQuiz {
  id: string;
  title: string;
  sermon: string;
  code: string;
  open: boolean;
  created_at: string;
  question_count: number;
  play_count: number;
}

export default async function QuizPage() {
  const session = await getSession();
  const supabase = await createClient();

  let mine: MyQuiz[] = [];
  if (isApproved(session) && supabase) {
    const { data } = await supabase
      .from("quizzes")
      .select("id, title, sermon, code, open, created_at, quiz_questions(count), quiz_plays(count)")
      .order("created_at", { ascending: false });

    mine = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      sermon: row.sermon as string,
      code: row.code as string,
      open: row.open as boolean,
      created_at: row.created_at as string,
      question_count: (row.quiz_questions as { count: number }[])?.[0]?.count ?? 0,
      play_count: (row.quiz_plays as { count: number }[])?.[0]?.count ?? 0,
    }));
  }

  return (
    <div>
      <header>
        <h1 className="text-3xl font-bold sm:text-4xl">설교 퀴즈</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          설교를 마치고 바로 푸는 퀴즈입니다. 들은 것을 한 번 더 붙잡게 하는 것이
          목적이지 등수를 매기는 것이 목적이 아니라, 틀린 문제마다 풀이를 함께
          보여 줍니다.
        </p>
      </header>

      {/* 참여는 누구나. 가입도 로그인도 없다. */}
      <JoinBox />

      <section className="mt-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">내가 만든 퀴즈</h2>
          {isApproved(session) && (
            <Link
              href="/quiz/new"
              className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              퀴즈 만들기
            </Link>
          )}
        </div>

        {!isApproved(session) ? (
          <p className="mt-5 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm leading-relaxed text-muted">
            퀴즈를 만들려면 승인 회원이어야 합니다.{" "}
            <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
            가입 정보를 적어 주세요.
            <br />
            <span className="text-faint">푸는 것은 가입 없이 위에서 바로 됩니다.</span>
          </p>
        ) : mine.length === 0 ? (
          <p className="mt-5 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm leading-relaxed text-muted">
            아직 만든 퀴즈가 없습니다.
            <br />
            <span className="text-faint">
              설교 요점 네다섯 개를 문제로 만들면 5분이면 끝납니다.
            </span>
          </p>
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {mine.map((quiz) => (
              <QuizRow key={quiz.id} quiz={quiz} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14 rounded-card border border-line bg-sunken px-5 py-5">
        <h2 className="text-sm font-bold">어떻게 쓰나요</h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-muted">
          <li>1. 설교 요점을 문제로 만듭니다. 네다섯 개면 충분합니다.</li>
          <li>2. 만들면 여섯 자리 코드가 나옵니다. 화면에 띄우거나 주보에 적으세요.</li>
          <li>3. 참여자는 이 페이지에서 코드와 이름만 적고 들어옵니다. 가입은 없습니다.</li>
          <li>4. 각자 자기 속도로 풉니다. 늦게 들어와도 되고, 끊겨도 자기 것만 다시 합니다.</li>
          <li>5. 다 풀면 점수와 풀이가 바로 나옵니다.</li>
        </ol>
      </section>
    </div>
  );
}
