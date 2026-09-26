import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isApproved } from "@/lib/auth";
import { RecreationForm } from "./RecreationForm";

export const metadata: Metadata = {
  title: "레크리에이션 나누기",
  description: "해 보신 레크리에이션을 적어 두시면 다음 사람이 그대로 씁니다.",
  alternates: { canonical: "/recreation/new" },
};

export default async function NewRecreationPage() {
  const session = await getSession();

  return (
    <div className="max-w-2xl">
      <Link href="/recreation" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 레크리에이션 나눔으로
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">레크리에이션 나누기</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        해 보신 것을 적어 주세요. 인원·장소·시간을 따로 받는 까닭은, 읽는 사람이
        글을 끝까지 읽지 않고도 우리 교회에서 할 수 있는지 알아야 하기 때문입니다.
      </p>

      {!isApproved(session) ? (
        <p className="mt-8 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm leading-relaxed text-muted">
          승인 회원만 쓸 수 있습니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          가입 정보를 적어 주세요.
        </p>
      ) : (
        <RecreationForm />
      )}
    </div>
  );
}
