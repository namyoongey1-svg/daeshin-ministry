import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import VerseReader from "@/components/VerseReader";
import { getSession } from "@/lib/auth";
import { getLatinVerse, getVerse } from "@/lib/bible/data";
import type { Verse } from "@/lib/bible/types";
import { passageFromRow, type StudyRow } from "@/lib/study";
import { createClient } from "@/lib/supabase/server";
import { removeStudy } from "../actions";
import { StudyContentView } from "./StudyContentView";

/*
  스터디 한 편.

  본문은 저장하지 않고 그때그때 그린다. 파싱 데이터가 고쳐지면 지난 스터디도
  같이 고쳐진다. 메모만 인도자의 것이다.
*/

async function loadStudy(id: string) {
  const supabase = await createClient();
  if (!supabase || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await supabase.from("studies").select("*").eq("id", id).maybeSingle();
  return (data as StudyRow | null) ?? null;
}

export async function generateMetadata({ params }: PageProps<"/study/[id]">): Promise<Metadata> {
  const { id } = await params;
  const study = await loadStudy(id);
  if (!study) return { title: "스터디를 찾을 수 없습니다", robots: { index: false } };
  return {
    title: `${study.title} — 원어 스터디`,
    description: `${study.passage} 본문을 원어로 읽고 퀴즈로 복습합니다.`,
    alternates: { canonical: `/study/${study.id}` },
    robots: study.published ? undefined : { index: false },
  };
}

export default async function StudyPage({ params }: PageProps<"/study/[id]">) {
  const { id } = await params;
  const [study, session] = await Promise.all([loadStudy(id), getSession()]);
  if (!study) notFound();

  const passage = passageFromRow(study);
  const verses: Verse[] = [];
  // 라틴어 스터디는 불가타를 위에, 원어 파싱을 아래에 둔다. 퀴즈는 원어로 낸다.
  const latin = new Map<number, string>();
  if (passage) {
    for (let v = passage.from; v <= passage.to; v++) {
      const verse = await getVerse(passage.book.osis, passage.chapter, v);
      if (verse) verses.push(verse);
      if (study.lang === "lat") {
        const text = await getLatinVerse(passage.book.osis, passage.chapter, v);
        if (text) latin.set(v, text);
      }
    }
  }
  const mine = session?.userId === study.created_by;
  const paragraphs = study.notes.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <article className="max-w-4xl">
      <Link href="/study" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
        ← 원어 스터디로
      </Link>

      <header className="mt-3">
        <p className="text-sm font-semibold text-accent">{study.passage}</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{study.title}</h1>
        <p className="mt-2 text-xs text-faint">
          {new Date(study.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
          {!study.published && " · 비공개"}
        </p>
      </header>

      {study.quiz_code && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-card border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <span>본문을 다 읽으셨으면 퀴즈로 복습하세요. 틀린 문제는 풀이가 함께 나옵니다.</span>
          <div className="ml-auto flex gap-2">
            <Link href={`/quiz/${study.quiz_code}`} className="rounded-pill bg-accent px-4 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-accent-hover">
              퀴즈 풀기
            </Link>
            <Link href={`/quiz/${study.quiz_code}/board`} className="rounded-pill border border-line bg-surface px-4 py-1.5 text-xs font-medium transition-colors hover:border-line-strong">
              점수판
            </Link>
          </div>
        </div>
      )}

      {paragraphs.length > 0 && (
        <section className="mt-8 rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm font-bold">인도자 메모</h2>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-wrap">{p}</p>
            ))}
          </div>
        </section>
      )}

      {study.content ? (
        <section className="mt-8">
          <StudyContentView content={study.content} />
          {verses.length > 0 && passage && (
            <details className="mt-8 rounded-card border border-line p-5">
              <summary className="cursor-pointer text-sm font-semibold text-muted hover:text-foreground">
                {passage.book.testament === "ot" ? "히브리어" : "헬라어"} 본문 파싱 보기 — 낱말을 누르면 형태소와 사전이 열립니다
              </summary>
              <div className="mt-4 flex flex-col gap-8">
                {verses.map((verse) => {
                  const label = `${passage.book.ko} ${verse.chapter}:${verse.verse}`;
                  return (
                    <div key={verse.ref}>
                      <h3 className="mb-2 text-sm font-semibold text-muted">{label}</h3>
                      <VerseReader verse={verse} refLabel={label} />
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </section>
      ) : (
      <section className="mt-8">
          <h2 className="text-sm font-bold">본문{study.lang === "lat" && " — 라틴어(불가타)와 원어"}</h2>
          <p className="mt-1 text-xs text-faint">
            {study.lang === "lat"
              ? "불가타 본문 아래에 원어를 둡니다. 원어 낱말을 누르면 파싱과 사전이 열립니다. 시편은 불가타 편 번호로 맞춰 찾습니다 (합쳐진 편은 절이 어긋날 수 있습니다)."
              : "낱말을 누르면 파싱과 사전이 열립니다. 설교 노트에 담을 수도 있습니다."}
          </p>
          {verses.length === 0 ? (
            <p className="mt-4 rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              본문을 찾지 못했습니다.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-8">
              {verses.map((verse) => {
                const label = `${passage!.book.ko} ${verse.chapter}:${verse.verse}`;
                return (
                  <div key={verse.ref}>
                    <h3 className="mb-2 text-sm font-semibold text-muted">{label}</h3>
                    {latin.get(verse.verse) && (
                      <p lang="la" className="mb-3 rounded-card border border-line bg-surface px-4 py-3 font-serif text-base leading-relaxed">
                        {latin.get(verse.verse)}
                      </p>
                    )}
                    <VerseReader verse={verse} refLabel={label} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {mine && (
        <form action={removeStudy} className="mt-10 border-t border-line pt-4">
          <input type="hidden" name="id" value={study.id} />
          <button className="text-xs text-faint underline-offset-4 hover:text-foreground hover:underline">
            이 스터디 지우기 (퀴즈도 함께 지워집니다)
          </button>
        </form>
      )}
    </article>
  );
}
