"use client";

import { useState } from "react";

/*
  공고 주소를 복사한다. 단톡방과 스레드에 공고 하나를 보내는 가장 짧은 길이다.
  모바일에서는 공유 창(navigator.share)이 있으면 그걸 쓴다 — 카카오톡으로
  바로 보낼 수 있다.
*/
export function ShareButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // 사용자가 공유 창을 닫았거나 클립보드를 막아 둔 브라우저. 조용히 넘어간다.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="rounded-pill border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:border-line-strong"
    >
      {done ? "주소 복사됨" : "공유 · 주소 복사"}
    </button>
  );
}
