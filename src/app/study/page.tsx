import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isApproved } from "@/lib/auth";
import type { StudyRow } from "@/lib/study";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "원어 스터디",
  description:
    "매주 함께 읽는 성경 원어 본문입니다. 헬라어·히브리어 본문을 파싱과 함께 보고, 본문에서 만든 퀴즈로 복습합니다.",
  alternates: { canonical: "/study" },
};

function week(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default async function StudyListPage() {
  const [session, supabase] = await Promise.all([getSession(), createClient()]);
  const { data } = supabase
    ? await supabase.from("studies").select("*").order("created_at", { ascending: false }).limit(60)
    : { data: null };
  const rows = (data as StudyRow[] | null) ?? [];

  return (
    <div className="max-w-3xl">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">원어 스터디</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            매주 함께 읽는 본문입니다. 낱말을 누르면 파싱이 열리고, 다 읽은 뒤에는
            본문에서 만든 퀴즈로 복습합니다. 모임에 못 온 주도 여기서 따라올 수 있습니다.
          </p>
        </div>
        {isApproved(session) && (
          <Link href="/study/new" className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover">
            이번 주 올리기
          </Link>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-card border border-dashed border-line py-16 text-center text-sm text-muted">
          아직 올라온 스터디가 없습니다.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/study/${s.id}`}
                className="flex flex-col gap-1 rounded-card border border-line bg-surface p-5 transition-all hover:border-line-strong hover:shadow-card"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold">{s.title}</h2>
                  <span className="text-xs text-faint">{week(s.created_at)}</span>
                </div>
                <p className="text-sm text-muted">
                  {s.passage}
                  {s.lang === "lat" && " · 라틴어"}
                  {s.quiz_code && " · 퀴즈 있음"}
                  {!s.published && " · 비공개"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
