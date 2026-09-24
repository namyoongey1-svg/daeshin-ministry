"use client";

import Link from "next/link";
import { GROUPS } from "./RoleNav";
import { ROLE_LABEL, ROLE_NOTE, useRole, type Role } from "@/lib/role";

/*
  첫 화면에서 한 번 묻는다.

  이 사이트에는 성격이 다른 두 묶음이 들어 있다. 자리를 찾는 일과 사역을
  꾸리는 일은 같은 사람이 하더라도 같은 날 하지는 않는다. 처음에 한 번
  고르게 하면 그 뒤로 볼 것이 절반으로 준다.

  고르지 않아도 사이트는 그대로 쓸 수 있다. 막아서는 문이 아니라 갈림길이다.
*/

const CARDS: { role: Role; heading: string; lines: string[] }[] = [
  {
    role: "구직",
    heading: "자리를 찾고 있습니다",
    lines: [
      "네 곳의 청빙게시판을 매일 모아 한자리에서 봅니다",
      "지역·직분·교단을 적어 두면 맞는 것부터 보여 드립니다",
      "새 공고가 올라오면 메일로 알려 드립니다",
    ],
  },
  {
    role: "사역",
    heading: "사역하고 있습니다",
    lines: [
      "찬양 콘티를 짜고 악보를 하나의 PDF로 묶습니다",
      "설교 노트·원어 파싱·주보·포스터를 만듭니다",
      "함께할 사역자를 찾는 공고를 올립니다",
    ],
  },
];

export function RolePicker() {
  const [role, setRole] = useRole();

  if (role) {
    return (
      <div className="mt-8 rounded-card border border-line bg-sunken px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm font-semibold">{ROLE_LABEL[role]}</p>
          <button
            onClick={() => setRole(role === "구직" ? "사역" : "구직")}
            className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            {role === "구직" ? "사역 중으로 바꾸기" : "자리를 찾는 중으로 바꾸기"}
          </button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-faint">{ROLE_NOTE[role]}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {GROUPS[role].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-pill border border-line bg-surface px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-line-strong"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="text-sm font-semibold">지금 어느 쪽이신가요?</p>
      <p className="mt-1 text-xs text-faint">
        고르시면 그쪽 메뉴만 보여 드립니다. 나중에 언제든 바꿀 수 있습니다.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <button
            key={card.role}
            onClick={() => setRole(card.role)}
            className="group rounded-card border border-line bg-surface p-5 text-left transition-all hover:border-accent hover:shadow-card"
          >
            <h2 className="text-lg font-bold group-hover:text-accent">{card.heading}</h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {card.lines.map((line) => (
                <li key={line} className="flex gap-2 text-sm leading-relaxed text-muted">
                  <span aria-hidden className="text-accent">·</span>
                  {line}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
