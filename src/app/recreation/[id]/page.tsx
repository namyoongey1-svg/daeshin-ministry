import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, isApproved } from "@/lib/auth";
import { describeSetup, type Recreation } from "@/lib/recreation";
import { createClient } from "@/lib/supabase/server";
import { LikeButton } from "../LikeButton";

export const metadata: Metadata = {
  title: "레크리에이션",
  robots: { index: false },
};

export default async function RecreationDetail({ params }: PageProps<"/recreation/[id]">) {
  const { id } = await params;
  const session = await getSession();

  if (!isApproved(session)) {
    return (
      <div className="max-w-2xl">
        <Link href="/recreation" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
          ← 레크리에이션 나눔으로
        </Link>
        <p className="mt-8 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm leading-relaxed text-muted">
          승인 회원에게만 보입니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          가입 정보를 적어 주세요.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase!
    .from("recreations_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const item = data as Recreation;

  return (
    <article className="max-w-2xl">
      <Link href="/recreation" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 레크리에이션 나눔으로
      </Link>

      <header className="mt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
            {item.category}
          </span>
          <span className="text-xs text-faint">{item.created_at.slice(0, 10)}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{item.title}</h1>
        <p className="mt-2 text-sm text-muted">{describeSetup(item)}</p>
      </header>

      {item.supplies && (
        <p className="mt-5 rounded-card border border-line bg-sunken px-4 py-3 text-sm leading-relaxed">
          <b className="font-semibold">준비물</b> · {item.supplies}
        </p>
      )}

      {/* 줄바꿈을 그대로 살린다. 진행 순서를 번호로 적어 오는 글이 많다. */}
      <div className="mt-6 whitespace-pre-wrap text-[0.95rem] leading-relaxed">{item.body}</div>

      <div className="mt-10 flex items-center gap-3 border-t border-line pt-5">
        <LikeButton id={item.id} liked={item.liked} count={item.like_count} />
        <p className="text-xs leading-relaxed text-faint">
          해 보셨으면 눌러 주세요. 다음 사람이 고를 때 도움이 됩니다.
        </p>
      </div>
    </article>
  );
}
