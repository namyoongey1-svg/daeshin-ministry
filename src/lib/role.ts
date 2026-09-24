"use client";

import { useSyncExternalStore } from "react";
import { createLocalStore } from "./local-store";

/*
  지금 구직 중인가, 사역 중인가.

  한 사람이 쓰는 화면이 둘로 갈린다. 자리를 찾는 사람은 청빙공고·추천·지도·
  알림을 보고, 사역 중인 사람은 콘티·설교·주보·명단을 쓴다. 둘 다 한 줄에
  늘어놓으면 열두 개가 되어 무엇부터 눌러야 할지 알 수 없다.

  고른 값은 브라우저에만 남긴다. 계정에 묶으면 로그인해야 쓸 수 있게 되고,
  구직 중이라는 사실은 남에게 알리고 싶지 않은 정보이기도 하다. 사역하다
  자리를 옮기는 일은 흔하므로 언제든 바꿀 수 있게 둔다.
*/

export type Role = "구직" | "사역";

const store = createLocalStore<Role | null>("daeshin.role", null, (raw) =>
  raw === "구직" || raw === "사역" ? raw : null
);

export function useRole(): [Role | null, (role: Role | null) => void] {
  const role = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  return [role, store.set];
}

export const ROLE_LABEL: Record<Role, string> = {
  구직: "자리를 찾는 중",
  사역: "사역하는 중",
};

export const ROLE_NOTE: Record<Role, string> = {
  구직: "청빙공고·맞춤 추천·지도·알림을 먼저 보여 드립니다.",
  사역: "콘티·설교 노트·주보·명단 같은 사역 도구를 먼저 보여 드립니다.",
};
