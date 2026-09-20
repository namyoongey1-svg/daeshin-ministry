import Link from "next/link";
import VerseReader from "@/components/VerseReader";
import { getVerse } from "@/lib/bible/data";
import { formatReference, parseReference } from "@/lib/bible/books";

const EXAMPLES = ["요 3:16", "롬 8:28", "창 1:1", "시 23:1", "빌 2:6"];

export default async function OriginalPage({
  searchParams,
}: PageProps<"/tools/original">) {
  const params = await searchParams;
  const input = typeof params.ref === "string" && params.ref.trim() ? params.ref : "요 3:16";
  const reference = parseReference(input);
  const verse = reference
    ? await getVerse(reference.book.osis, reference.chapter, reference.verse)
    : null;

  return (
    <div>
      <h1 className="text-xl font-bold">원어 파싱</h1>
      <p className="mt-1 text-sm text-muted">
        신약은 헬라어(SBLGNT), 구약은 히브리어(OSHB) 본문을 형태소까지 분석해 보여줍니다.
      </p>

      <form className="mt-4 flex gap-2">
        <input
          name="ref"
          defaultValue={input}
          placeholder="예: 요 3:16"
          className="w-56 rounded border border-line bg-surface px-3 py-2 text-sm"
        />
        <button className="rounded bg-accent px-4 py-2 text-sm text-background">
          찾기
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
        {EXAMPLES.map((e) => (
          <Link
            key={e}
            href={`/tools/original?ref=${encodeURIComponent(e)}`}
            className="rounded-full border border-line px-2 py-1 hover:bg-accent-soft"
          >
            {e}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {!reference ? (
          <p className="rounded border border-line p-4 text-sm">
            구절을 알아보지 못했습니다. <b>요 3:16</b>이나 <b>요한복음 3:16</b> 형식으로 입력해 주세요.
          </p>
        ) : !verse ? (
          <p className="rounded border border-line p-4 text-sm">
            {formatReference(reference)} 본문을 찾지 못했습니다. 장·절 번호를 확인해 주세요.
          </p>
        ) : (
          <>
            <h2 className="mb-3 text-lg font-bold">{formatReference(reference)}</h2>
            <VerseReader verse={verse} refLabel={formatReference(reference)} />
          </>
        )}
      </div>
    </div>
  );
}
