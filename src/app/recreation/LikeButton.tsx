"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "./actions";

/**
 * "해 봤어요" 표시.
 *
 * 누가 눌렀는지는 보여 주지 않는다. 몇 명이 해 봤는지만 알면 고르는 데
 * 도움이 되고, 누가 무엇을 했는지까지 남길 이유가 없다.
 */
export function LikeButton({ id, liked, count }: { id: string; liked: boolean; count: number }) {
  const [on, setOn] = useState(liked);
  const [n, setN] = useState(count);
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        const next = !on;
        // 누르자마자 바뀌게 둔다. 서버를 기다리면 눌린 것 같지가 않다.
        setOn(next);
        setN((v) => v + (next ? 1 : -1));
        start(async () => {
          const result = await toggleLike(id, next);
          // 실패하면 되돌린다. 눌렀는데 저장이 안 된 채로 켜져 있으면 더 나쁘다.
          if (result.error) {
            setOn(!next);
            setN((v) => v + (next ? -1 : 1));
          }
        });
      }}
      className={`rounded-pill px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
        on ? "bg-accent-soft text-accent" : "bg-sunken text-muted hover:text-foreground"
      }`}
    >
      해 봤어요 {n > 0 && n}
    </button>
  );
}
