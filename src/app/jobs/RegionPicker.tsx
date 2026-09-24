"use client";

import { useEffect, useRef, useState } from "react";
import { SIDO, parseKeys, type Sido } from "@/lib/region";

/*
  지역 고르기.

  채용 사이트들이 쓰는 두 칸짜리 방식을 따랐다. 왼쪽에서 시·도를 고르면
  오른쪽에 그 지역의 시·군·구가 뜨고, 여러 곳을 한꺼번에 담는다.

  드롭다운 하나로 두면 "경기"를 고른 사람에게 경기도 전체 258건이 쏟아진다.
  실제로 찾는 사람은 "분당 아니면 용인" 처럼 두세 곳을 함께 본다.

  건수를 함께 보여 준다. 고르기 전에 그곳에 공고가 있는지부터 알 수 있어야
  헛걸음을 하지 않는다.
*/

export interface PlaceCount {
  sido: Sido;
  total: number;
  /** 원문에 구·군까지 적힌 공고만 모은 것 */
  children: { name: string; count: number }[];
}

export function RegionPicker({
  counts,
  selected,
}: {
  counts: PlaceCount[];
  /** "서울,경기|성남시 분당구" 꼴 */
  selected: string;
}) {
  const [open, setOpen] = useState(false);
  const [sido, setSido] = useState<Sido>(counts[0]?.sido ?? "서울");
  const [picked, setPicked] = useState<string[]>(() =>
    parseKeys(selected).map((k) => (k.sigungu ? `${k.sido}|${k.sigungu}` : k.sido))
  );
  const box = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 닫는다. 고른 것은 그대로 둔다 — 담는 중에 닫혔다고 버리면 화난다.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const byId = new Map(counts.map((c) => [c.sido, c]));
  const current = byId.get(sido);

  function toggle(key: string) {
    setPicked((prev) => {
      // 시·도 전체를 담으면 그 안의 구 선택은 의미가 없어진다.
      if (!key.includes("|")) {
        const without = prev.filter((p) => !p.startsWith(`${key}|`) && p !== key);
        return prev.includes(key) ? without : [...without, key];
      }
      const parent = key.split("|")[0];
      const without = prev.filter((p) => p !== parent);
      return prev.includes(key) ? without.filter((p) => p !== key) : [...without, key];
    });
  }

  /**
   * 고른 것은 숨긴 칸에 담고, 감싸고 있는 거르기 폼을 그대로 보낸다.
   * 지역만 따로 주소를 바꾸면 옆에서 고르던 직분·부서가 날아간다.
   */
  function apply() {
    setOpen(false);
    requestAnimationFrame(() => box.current?.closest("form")?.requestSubmit());
  }

  const label =
    picked.length === 0
      ? "지역"
      : picked.length === 1
        ? picked[0].replace("|", " ")
        : `${picked[0].replace("|", " ")} 외 ${picked.length - 1}`;

  return (
    <div className="relative" ref={box}>
      <input type="hidden" name="region" value={picked.join(",")} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-[38px] items-center gap-2 rounded-pill border py-2 pl-4 pr-3.5 text-sm font-medium transition-colors ${
          picked.length
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-surface text-muted hover:border-line-strong"
        }`}
      >
        {label}
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 opacity-60" aria-hidden>
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-30 w-[min(92vw,34rem)] overflow-hidden rounded-card border border-line bg-background shadow-xl">
          <div className="flex h-[19rem]">
            {/* 시·도 */}
            <ul className="w-[7.5rem] shrink-0 overflow-y-auto border-r border-line bg-sunken">
              {SIDO.map((name) => {
                const c = byId.get(name);
                const on = sido === name;
                const chosen = picked.some((p) => p === name || p.startsWith(`${name}|`));
                return (
                  <li key={name}>
                    <button
                      type="button"
                      onMouseEnter={() => setSido(name)}
                      onClick={() => setSido(name)}
                      className={`flex w-full items-center gap-1 px-3 py-2 text-left text-sm transition-colors ${
                        on ? "bg-background font-semibold" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {chosen && <span className="text-accent">•</span>}
                      <span className="truncate">{name}</span>
                      <span className="ml-auto text-xs text-faint">{c?.total ?? 0}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* 시·군·구 */}
            <div className="flex-1 overflow-y-auto p-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-sunken">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--accent)]"
                  checked={picked.includes(sido)}
                  onChange={() => toggle(sido)}
                />
                <b>{sido} 전체</b>
                <span className="ml-auto text-xs text-faint">{current?.total ?? 0}</span>
              </label>

              {current && current.children.length > 0 ? (
                <ul className="mt-1">
                  {current.children.map((child) => {
                    const key = `${sido}|${child.name}`;
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sunken">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[var(--accent)]"
                            checked={picked.includes(key) || picked.includes(sido)}
                            disabled={picked.includes(sido)}
                            onChange={() => toggle(key)}
                          />
                          <span className="truncate">{child.name}</span>
                          <span className="ml-auto text-xs text-faint">{child.count}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 px-2 text-xs leading-relaxed text-muted">
                  이 지역은 공고에 시·군·구가 적혀 있지 않습니다.
                  <br />
                  위의 <b>{sido} 전체</b>로 담아 주세요.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-line bg-sunken px-3 py-2">
            <span className="text-xs text-muted">{picked.length}곳 선택</span>
            <button
              type="button"
              onClick={() => setPicked([])}
              className="text-xs text-muted underline-offset-4 hover:underline"
            >
              비우기
            </button>
            <button
              type="button"
              onClick={apply}
              className="ml-auto h-8 rounded-pill bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
