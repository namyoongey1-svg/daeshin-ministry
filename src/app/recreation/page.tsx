import type { Metadata } from "next";
import Link from "next/link";
import { getSession, isApproved } from "@/lib/auth";
import {
  AGE_GROUPS,
  CATEGORIES,
  PLACES,
  describeSetup,
  matchesFilter,
  type Recreation,
} from "@/lib/recreation";
import { createClient } from "@/lib/supabase/server";
import { LikeButton } from "./LikeButton";

export const metadata: Metadata = {
  title: "레크리에이션 나눔",
  description:
    "수련회와 공동체 모임에서 해 본 레크리에이션을 나눕니다. 인원·장소·시간·대상으로 추려 우리 교회에서 할 수 있는 것만 골라 보세요.",
  alternates: { canonical: "/recreation" },
};

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

const CHIP =
  "cursor-pointer appearance-none rounded-pill border py-2 pl-4 pr-9 text-sm font-medium transition-colors";

export default async function RecreationPage({ searchParams }: PageProps<"/recreation">) {
  const params = await searchParams;
  const filter = {
    category: one(params.category),
    place: one(params.place),
    age: one(params.age),
    people: Number(one(params.people)) || undefined,
  };

  const session = await getSession();
  const supabase = await createClient();

  // 승인 회원만 읽는다. 놀이 자체는 비밀이 아니지만, 쓴 사람이 자기 교회
  // 이야기를 섞어 적는 곳이라 바깥에 통째로 열어 두지 않는다.
  const { data } = isApproved(session)
    ? await supabase!.from("recreations_public").select("*").order("created_at", { ascending: false })
    : { data: null };

  const all = (data ?? []) as Recreation[];
  const items = all.filter((item) => matchesFilter(item, filter));

  const select = (name: string, label: string, options: readonly string[]) => (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={String(params[name] ?? "")}
        className={`${CHIP} ${
          params[name]
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-surface text-muted hover:border-line-strong"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg viewBox="0 0 12 12" className="pointer-events-none absolute right-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 opacity-50" aria-hidden>
        <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">레크리에이션 나눔</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            수련회를 준비할 때마다 같은 것을 처음부터 다시 짭니다. 해 보신 것을
            적어 두시면 다음 사람이 그대로 씁니다. 인원·장소·시간을 따로 받으니
            우리 교회에서 할 수 있는 것만 골라 보세요.
          </p>
        </div>
        {isApproved(session) && (
          <Link
            href="/recreation/new"
            className="shrink-0 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
          >
            나누기
          </Link>
        )}
      </header>

      {!isApproved(session) ? (
        <p className="mt-10 rounded-card border border-dashed border-line px-6 py-12 text-center text-sm leading-relaxed text-muted">
          승인 회원에게만 보입니다.{" "}
          <Link href="/account" className="text-accent hover:underline">내 정보</Link>에서
          가입 정보를 적어 주시면 운영진이 확인합니다.
        </p>
      ) : (
        <>
          <form className="mt-7 flex flex-wrap items-center gap-2">
            {select("category", "갈래", CATEGORIES)}
            {select("age", "대상", AGE_GROUPS)}
            {select("place", "장소", PLACES)}
            <label className="relative">
              <span className="sr-only">인원</span>
              <input
                name="people"
                type="number"
                min={1}
                defaultValue={one(params.people)}
                placeholder="인원"
                className="w-24 rounded-pill border border-line bg-surface px-4 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
              />
            </label>
            <button className="rounded-pill bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85">
              찾기
            </button>
            {(filter.category || filter.place || filter.age || filter.people) && (
              <Link href="/recreation" className="px-2 text-sm text-muted underline-offset-4 hover:underline">
                초기화
              </Link>
            )}
          </form>

          <p className="mt-6 text-sm text-muted">
            <b className="text-foreground">{items.length}개</b>
            {items.length !== all.length && ` · 전체 ${all.length}개 중`}
          </p>

          {items.length === 0 ? (
            <div className="mt-8 rounded-card border border-dashed border-line px-6 py-14 text-center">
              <p className="text-sm text-muted">
                {all.length === 0
                  ? "아직 나눈 것이 없습니다. 첫 번째로 적어 주세요."
                  : "이 조건에 드는 것이 없습니다. 조건을 줄여 보세요."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col rounded-card border border-line bg-surface p-5 transition-all hover:border-line-strong hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/recreation/${item.id}`} className="min-w-0 text-lg font-bold hover:text-accent">
                      {item.title}
                    </Link>
                    <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent">
                      {item.category}
                    </span>
                  </div>

                  {/* 우리 교회에서 할 수 있는지 한 줄로 판단하게 한다. */}
                  <p className="mt-1.5 text-sm text-muted">{describeSetup(item)}</p>

                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{item.body}</p>

                  {item.supplies && (
                    <p className="mt-2 text-xs text-faint">준비물 · {item.supplies}</p>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <LikeButton id={item.id} liked={item.liked} count={item.like_count} />
                    <Link
                      href={`/recreation/${item.id}`}
                      className="ml-auto text-xs font-medium text-accent underline-offset-4 hover:underline"
                    >
                      자세히 →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
