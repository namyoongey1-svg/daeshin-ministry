import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isApproved } from "@/lib/auth";
import { StudyForm } from "./StudyForm";

export const metadata: Metadata = {
  title: "원어 스터디 올리기",
  robots: { index: false },
};

export default async function NewStudyPage() {
  const session = await getSession();

  return (
    <div className="max-w-2xl">
      <Link href="/study" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 원어 스터디로
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">이번 주 스터디 올리기</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        본문과 메모를 적으면 원어 본문이 파싱과 함께 뜨고, 복습 퀴즈가 자동으로 만들어집니다.
      </p>

      {isApproved(session) ? (
        <StudyForm />
      ) : (
        <p className="mt-8 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm leading-relaxed text-muted">
          승인 회원만 올릴 수 있습니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          가입 정보를 적어 주세요.
        </p>
      )}
    </div>
  );
}
