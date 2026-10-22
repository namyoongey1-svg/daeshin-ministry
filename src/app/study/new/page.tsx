import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isApproved } from "@/lib/auth";
import { DocForm } from "./DocForm";
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

      {!isApproved(session) ? (
        <p className="mt-8 rounded-card border border-dashed border-line px-6 py-10 text-center text-sm leading-relaxed text-muted">
          승인 회원만 올릴 수 있습니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          가입 정보를 적어 주세요.
        </p>
      ) : (
        <>
          <section className="mt-8 rounded-card border border-line bg-surface p-5">
            <h2 className="text-lg font-bold">워드 문서로 올리기</h2>
            <p className="mt-1 mb-5 text-sm leading-relaxed text-muted">
              매주 만드시는 스터디 문서를 그대로 올리면 세 언어 본문과 낱말 풀이가 화면이 되고,
              뜻과 연상 팁에서 복습 퀴즈가 만들어집니다.
            </p>
            <DocForm />
          </section>

          <details className="mt-6 rounded-card border border-line p-5">
            <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">
              또는 본문 범위만 적기 — 원어 본문이 파싱과 함께 뜨고, 파싱에서 퀴즈를 냅니다
            </summary>
            <StudyForm />
          </details>
        </>
      )}
    </div>
  );
}
