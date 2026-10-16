import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isAdmin, isApproved } from "@/lib/auth";
import { createJobPost } from "./actions";
import { PostForm } from "./PostForm";

export const metadata: Metadata = {
  title: "청빙공고 올리기",
  description:
    "함께할 사역자를 찾는 교회가 직접 공고를 올립니다. 교단과 사례비를 처음부터 받아, 구직자가 헛걸음하지 않게 합니다.",
  alternates: { canonical: "/jobs/new" },
};

/** 로그인·승인이 필요한 까닭을 적고 갈 곳을 알려 주는 상자 */
function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-card border border-dashed border-line px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export default async function NewJobPage() {
  const session = await getSession();

  return (
    <div className="max-w-3xl">
      <Link href="/jobs" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 청빙·구직으로
      </Link>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">청빙공고 올리기</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        모아 오는 공고는 게시판마다 칸이 달라 교단도 사례비도 대부분 비어 있습니다.
        여기서 올리시면 그 둘을 처음부터 받아, 보는 사람이 지원할지 바로 판단할 수
        있습니다.
      </p>

      {/*
        교회 쪽은 가입까지 가지 않는 일이 많다. 로그인 없이 접수하는 길을 먼저
        보여 주고, 사역자가 담임목사님께 그 주소만 보내면 되게 한다.
      */}
      <p className="mt-4 max-w-xl rounded-card border border-line bg-surface px-4 py-3 text-sm leading-relaxed">
        <b>가입 없이 보내려면</b>{" "}
        <Link href="/jobs/submit" className="text-accent underline-offset-4 hover:underline">
          /jobs/submit
        </Link>
        <span className="text-muted"> — 교회 담당자에게 이 주소를 보내 주세요. 운영진이 확인한 뒤 올립니다.</span>
        {isAdmin(session) && (
          <>
            {" "}
            <Link href="/jobs/submissions" className="text-accent underline-offset-4 hover:underline">
              접수된 공고 보기
            </Link>
          </>
        )}
      </p>

      {!session ? (
        <Gate title="로그인이 필요합니다">
          공고를 올린 분이 누구인지 남아야 합니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          카카오나 구글로 들어오세요.
        </Gate>
      ) : !session.profile ? (
        <Gate title="가입 정보를 먼저 적어 주세요">
          이름·소속 교회·교단·직분을 받습니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          한 번만 적으시면 됩니다.
        </Gate>
      ) : !isApproved(session) ? (
        <Gate title="승인을 기다리는 중입니다">
          공고를 올리려면 운영진 승인이 필요합니다. 아무나 올릴 수 있게 두면 광고가
          섞이고, 그러면 목록을 믿을 수 없게 됩니다.
          <br />
          <span className="text-faint">승인되면 이 화면에서 바로 올리실 수 있습니다.</span>
        </Gate>
      ) : (
        <PostForm action={createJobPost} mode="post" />
      )}
    </div>
  );
}
