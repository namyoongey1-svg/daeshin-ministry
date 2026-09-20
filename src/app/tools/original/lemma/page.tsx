import Link from "next/link";
import { findOccurrences } from "@/lib/bible/data";
import { findBook } from "@/lib/bible/books";
import type { Lang } from "@/lib/bible/types";

export default async function LemmaPage({
  searchParams,
}: PageProps<"/tools/original/lemma">) {
  const params = await searchParams;
  const lemma = typeof params.lemma === "string" ? params.lemma : "";
  const lang: Lang = params.lang === "hbo" ? "hbo" : "grc";

  if (!lemma) {
    return <p className="text-sm">찾을 단어가 지정되지 않았습니다.</p>;
  }

  const { verses, hits, results } = await findOccurrences(lemma, lang);

  return (
    <div>
      <Link href="/tools/original" className="text-sm text-muted hover:text-accent">
        ← 원어 파싱으로
      </Link>

      <h1 className="mt-2 text-xl font-bold">
        <span className={lang === "hbo" ? "hbo" : "grc"}>{lemma}</span> 용례
      </h1>
      <p className="mt-1 text-sm text-muted">
        {lang === "grc" ? "신약" : "구약"} 전체에서 {hits.toLocaleString()}회 /{" "}
        {verses.toLocaleString()}절에 나타납니다.
        {verses > results.length && ` (앞의 ${results.length}절만 표시)`}
      </p>

      <ul className="mt-5 space-y-3">
        {results.map((occ) => {
          const book = findBook(occ.book);
          return (
            <li key={`${occ.book}${occ.chapter}:${occ.verse}`} className="rounded border border-line bg-surface p-3">
              <Link
                href={`/tools/original?ref=${encodeURIComponent(`${book?.abbr ?? occ.book} ${occ.chapter}:${occ.verse}`)}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                {occ.bookKo} {occ.chapter}:{occ.verse}
              </Link>
              <span className="ml-2 text-xs text-muted">{occ.parse}</span>
              <p
                className={`mt-1 text-base ${lang === "hbo" ? "hbo text-right" : "grc"}`}
              >
                {occ.snippet}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
