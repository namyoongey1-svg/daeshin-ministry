import type { Metadata } from "next";
import Link from "next/link";
import { PostForm } from "../new/PostForm";
import { submitJob } from "./actions";

export const metadata: Metadata = {
  title: "청빙공고 접수",
  description:
    "로그인 없이 청빙공고를 보내 주세요. 운영진이 확인한 뒤 목록에 올립니다. 교단과 사례비를 처음부터 받아 구직자가 헛걸음하지 않게 합니다.",
  alternates: { canonical: "/jobs/submit" },
};

/*
  로그인 없이 보내는 양식.

  사역자가 담임목사님이나 행정 담당자에게 이 주소를 보내면, 받은 분은 가입
  없이 양식만 채워 보낸다. 운영진이 확인한 뒤 게시하므로 아무 글이나 목록에
  오르지는 않는다.
*/
export default function SubmitJobPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/jobs" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 청빙·구직으로
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">청빙공고 접수</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        가입 없이 보내실 수 있습니다. 보내 주시면 운영진이 확인한 뒤 목록에
        올립니다. 연락처는 승인 회원에게만 보이고, 목록과 검색엔진에는 나가지
        않습니다.
      </p>
      <p className="mt-3 max-w-xl rounded-card border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        모아 오는 다른 게시판 공고는 교단도 사례비도 대부분 비어 있습니다. 여기서는
        그 둘을 처음부터 받습니다 — 보는 사람이 지원할지 바로 판단할 수 있어야
        교회도 헛된 문의를 덜 받습니다.
      </p>

      <PostForm action={submitJob} mode="submit" />
    </div>
  );
}
