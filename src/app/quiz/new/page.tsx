import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isApproved } from "@/lib/auth";
import { QuizBuilder } from "./QuizBuilder";

export const metadata: Metadata = {
  title: "설교 퀴즈 만들기",
  description: "설교 요점을 문제로 만들면 여섯 자리 코드가 나옵니다. 참여자는 가입 없이 코드만 적고 들어옵니다.",
  alternates: { canonical: "/quiz/new" },
};

export default async function NewQuizPage() {
  const session = await getSession();

  return (
    <div className="max-w-2xl">
      <Link href="/quiz" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 설교 퀴즈로
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">설교 퀴즈 만들기</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        설교를 준비하시면서 요점 네다섯 개를 문제로 만들어 두세요. 만들면 여섯 자리
        코드가 나오고, 참여자는 가입 없이 그 코드만 적고 들어옵니다.
      </p>

      {!isApproved(session) ? (
        <p className="mt-8 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm leading-relaxed text-muted">
          승인 회원만 만들 수 있습니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          가입 정보를 적어 주세요.
        </p>
      ) : (
        <QuizBuilder />
      )}
    </div>
  );
}
