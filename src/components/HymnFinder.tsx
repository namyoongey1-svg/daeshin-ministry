"use client";

import { useState } from "react";
import { searchHymns } from "@/lib/hymns";

/**
 * 찬송가를 번호로도 제목으로도 찾는다.
 *
 * 주보를 쓰다 "그 찬송 몇 장이더라" 하고 막히는 일이 잦아서 옆에 둔다.
 * 고른 것은 주보에 붙여 넣기 좋은 꼴로 복사된다. 가사는 담지 않는다.
 */
export default function HymnFinder() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<number | null>(null);
  const results = searchHymns(query);

  async function copy(text: string, n: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(n);
      setTimeout(() => setCopied((c) => (c === n ? null : c)), 1500);
    } catch {
      // 복사를 막아 둔 브라우저 — 눌러서 직접 적으시면 된다.
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-bold">찬송가 찾기</h2>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCopied(null); }}
        placeholder="번호나 제목 — 21 / 주 예수 이름"
        className="w-full rounded border border-line bg-surface px-2 py-1.5 text-sm"
      />

      {query.trim() && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-1 py-2 text-xs text-muted">찾는 찬송이 없습니다.</li>
          ) : (
            results.map((hymn) => (
              <li key={hymn.n}>
                <button
                  onClick={() => copy(`찬송가 ${hymn.n}장 (${hymn.t})`, hymn.n)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-sunken"
                >
                  <span className="w-12 shrink-0 font-bold tabular-nums">{hymn.n}장</span>
                  <span className="min-w-0 flex-1 truncate">{hymn.t}</span>
                  <span className="shrink-0 text-xs text-faint">
                    {copied === hymn.n ? "복사됨" : hymn.cat}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <p className="mt-2 text-xs leading-relaxed text-faint">
        누르면 &quot;찬송가 21장 (주 예수 이름 높이어)&quot; 꼴로 복사됩니다.
        비고 칸에 번호만 적고 칸을 벗어나도 제목이 붙습니다.
      </p>
    </div>
  );
}
