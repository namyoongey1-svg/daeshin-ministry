"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole, type Role } from "@/lib/role";

/*
  지금 무엇을 하는 중인지에 따라 메뉴를 나눈다.

  열두 개를 한 줄에 늘어놓으면 휴대폰에서 옆으로 한참 밀어야 하고, 무엇부터
  눌러야 할지도 알 수 없다. 자리를 찾는 사람에게 콘티는 지금 필요 없고,
  사역 중인 사람에게 맞춤 추천은 지금 필요 없다.

  아직 고르지 않았으면 청빙 쪽을 보여 준다. 이 사이트에 처음 들어오는 가장
  흔한 까닭이고, 첫 화면에서 곧 물어보기 때문이다.
*/

export const GROUPS: Record<Role, { href: string; label: string }[]> = {
  구직: [
    { href: "/jobs", label: "청빙·구직" },
    { href: "/jobs/recommend", label: "맞춤 추천" },
    { href: "/jobs/map", label: "지도" },
    { href: "/alerts", label: "알림" },
    { href: "/qna", label: "Q&A" },
  ],
  사역: [
    { href: "/jobs/new", label: "공고 등록" },
    { href: "/tools/setlist", label: "콘티" },
    { href: "/tools/sermon", label: "설교 노트" },
    { href: "/tools/original", label: "원어 파싱" },
    { href: "/tools/songs", label: "곡" },
    { href: "/tools/bulletin", label: "주보" },
    { href: "/tools/poster", label: "포스터" },
    { href: "/tools/roster", label: "명단·출석" },
    { href: "/qna", label: "Q&A" },
  ],
};

export function RoleNav() {
  const [role, setRole] = useRole();
  const path = usePathname();
  const shown: Role = role ?? "구직";

  return (
    <nav className="order-2 -mx-1 mt-1.5 flex w-full items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:order-none lg:mt-0 lg:w-auto lg:flex-1 [&::-webkit-scrollbar]:hidden">
      {/* 어느 쪽을 보고 있는지 알리고, 한 번에 건너뛸 수 있게 둔다. */}
      <div className="mr-1 flex shrink-0 rounded-pill bg-sunken p-0.5">
        {(["구직", "사역"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setRole(key)}
            aria-pressed={shown === key}
            className={`rounded-pill px-2.5 py-1 text-xs font-semibold transition-colors ${
              shown === key ? "bg-surface text-foreground shadow-card" : "text-faint hover:text-muted"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {GROUPS[shown].map((item) => {
        const here = path === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={here ? "page" : undefined}
            className={`shrink-0 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
              here ? "bg-sunken text-foreground" : "text-muted hover:bg-sunken hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
