import { LANG_LABEL, type StudyContent } from "@/lib/study-doc";

/*
  문서로 올린 스터디의 본문.

  언어마다 절 전체를 먼저 크게 보이고, 그 아래 낱말 표를 둔다. 연상 팁은 표
  안에서 낱말 바로 밑에 붙인다 — 팁은 낱말과 떨어지면 힘을 잃는다.
  히브리어는 오른쪽에서 왼쪽으로 흐른다.
*/

const FONT: Record<string, string> = {
  hbo: "font-hebrew text-2xl leading-loose",
  grc: "font-greek text-xl leading-relaxed",
  lat: "font-serif text-lg leading-relaxed",
};

export function StudyContentView({ content }: { content: StudyContent }) {
  return (
    <div className="flex flex-col gap-10">
      {content.passages.map((p) => (
        <section key={p.ref}>
          {content.passages.length > 1 && <h2 className="text-lg font-bold">{p.ref}</h2>}
          <div className="mt-3 flex flex-col gap-8">
            {p.sections.map((s) => (
              <div key={`${p.ref}:${s.lang}`} className="rounded-card border border-line bg-surface p-5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="text-sm font-bold">{LANG_LABEL[s.lang]}</h3>
                  {s.source && <span className="text-xs text-faint">{s.source}</span>}
                </div>
                {s.text && (
                  <p dir={s.lang === "hbo" ? "rtl" : "ltr"} lang={s.lang === "hbo" ? "he" : s.lang === "grc" ? "el" : "la"} className={`mt-3 ${FONT[s.lang]}`}>
                    {s.text}
                  </p>
                )}
                {s.words.length > 0 && (
                  <table className="mt-4 w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-xs text-faint">
                        <th className="border-b border-line py-1.5 pr-3 font-medium">낱말</th>
                        <th className="border-b border-line py-1.5 pr-3 font-medium">읽기</th>
                        <th className="border-b border-line py-1.5 font-medium">뜻</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.words.map((w, i) => (
                        <tr key={i} className="align-top">
                          <td className={`border-b border-line py-2 pr-3 ${s.lang === "hbo" ? "font-hebrew text-lg" : s.lang === "grc" ? "font-greek" : "font-serif"}`} dir={s.lang === "hbo" ? "rtl" : "ltr"}>
                            {w.word}
                          </td>
                          <td className="border-b border-line py-2 pr-3 text-xs text-muted">{w.reading ?? ""}</td>
                          <td className="border-b border-line py-2">
                            <div>{w.meaning}</div>
                            {w.tip && (
                              <div className="mt-1 rounded-card bg-accent-soft px-2.5 py-1.5 text-xs leading-relaxed text-accent">
                                💡 {w.tip}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
