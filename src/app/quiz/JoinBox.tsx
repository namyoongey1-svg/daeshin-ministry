"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeCode } from "@/lib/quiz";

/**
 * 코드 넣고 들어가는 칸.
 *
 * 큰 화면에 띄운 코드를 보고 휴대폰으로 받아 적는 상황이라, 소문자로 치거나
 * 빈칸을 넣어도 들어가게 다듬는다. 여섯 자리를 채우면 바로 넘어간다 —
 * 예배 끝나고 서서 하는 일이라 버튼 한 번을 더 누르게 하면 안 된다.
 */
export function JoinBox() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const go = (value: string) => router.push(`/quiz/${value}`);

  return (
    <div className="mt-8 rounded-card border border-line bg-surface p-6">
      <h2 className="text-lg font-bold">퀴즈 참여하기</h2>
      <p className="mt-1 text-sm text-muted">코드 여섯 자리만 적으시면 됩니다. 가입은 없습니다.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) go(code);
        }}
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <input
          value={code}
          onChange={(e) => {
            const next = normalizeCode(e.target.value);
            setCode(next);
            if (next.length === 6) go(next);
          }}
          inputMode="text"
          autoCapitalize="characters"
          placeholder="ABC123"
          aria-label="참여 코드"
          className="w-44 rounded-card border border-line bg-background px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] transition-colors focus:border-accent focus:outline-none"
        />
        <button
          disabled={code.length !== 6}
          className="rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          들어가기
        </button>
      </form>
    </div>
  );
}
