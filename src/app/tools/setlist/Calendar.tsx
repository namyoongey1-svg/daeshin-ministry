"use client";

import { useState } from "react";
import type { SetlistSummary } from "./actions";

/*
  콘티 달력.

  찬양팀의 한 주는 날짜로 돌아간다. 목록만 있으면 "다음 주일 콘티를 짰던가"를
  알 수 없다. 달력에 올려 두면 빈 주일이 눈에 보인다.
*/

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function ymd(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function Calendar({
  items,
  currentDate,
  onPick,
  onOpen,
}: {
  items: SetlistSummary[];
  /** 지금 편집 중인 콘티의 날짜 */
  currentDate: string;
  /** 빈 날을 누르면 그 날짜로 콘티를 시작한다 */
  onPick: (date: string) => void;
  /** 콘티가 있는 날을 누르면 불러온다 */
  onOpen: (id: string) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => {
    const base = currentDate ? new Date(`${currentDate}T00:00:00`) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const byDate = new Map<string, SetlistSummary>();
  for (const item of items) {
    if (item.serviceDate) byDate.set(item.serviceDate, item);
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();

  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const move = (delta: number) => setCursor(new Date(year, month + delta, 1));
  const todayKey = ymd(today);

  return (
    <section className="no-print mt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold">달력</h2>
        <span className="text-xs text-faint">저장한 콘티 {items.length}개</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="지난달"
            className="h-8 w-8 rounded-lg text-muted transition-colors hover:bg-sunken hover:text-foreground"
          >
            ‹
          </button>
          <span className="w-[6.5rem] text-center text-sm font-medium tabular-nums">
            {year}년 {month + 1}월
          </span>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="다음달"
            className="h-8 w-8 rounded-lg text-muted transition-colors hover:bg-sunken hover:text-foreground"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-card border border-line bg-line">
        {WEEK.map((w, i) => (
          <div
            key={w}
            className={`bg-sunken py-1.5 text-center text-xs font-medium ${
              i === 0 ? "text-highlight" : "text-muted"
            }`}
          >
            {w}
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={`x${i}`} className="min-h-[4.25rem] bg-background" />;
          const key = ymd(date);
          const saved = byDate.get(key);
          const isToday = key === todayKey;
          const isCurrent = key === currentDate;
          const sunday = date.getDay() === 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => (saved ? onOpen(saved.id) : onPick(key))}
              className={`min-h-[4.25rem] bg-background p-1.5 text-left align-top transition-colors hover:bg-sunken ${
                isCurrent ? "ring-2 ring-inset ring-accent" : ""
              }`}
            >
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs tabular-nums ${
                  isToday
                    ? "bg-foreground font-bold text-background"
                    : sunday
                      ? "text-highlight"
                      : "text-muted"
                }`}
              >
                {date.getDate()}
              </span>
              {saved && (
                <span className="mt-1 block truncate rounded bg-accent-soft px-1 py-0.5 text-[0.65rem] leading-tight text-accent">
                  {saved.songCount}곡
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        콘티가 있는 날을 누르면 불러오고, 빈 날을 누르면 그 날짜로 시작합니다.
      </p>
    </section>
  );
}
