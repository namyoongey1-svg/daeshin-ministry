"use client";

import { useState } from "react";
import { formatBody, formatTitle, rankBoards, type Fit, type PostedJob } from "@/lib/crosspost";

/*
  공고를 올린 뒤 다른 게시판에도 퍼뜨리게 돕는다.

  자동으로 올리지 않는다. 각 게시판에 맞춘 제목과 본문을 만들어 두고, 복사
  단추와 게시판 주소만 붙인다. 올리는 것은 사람이 자기 자격으로 한다 — 그래야
  게시판 규칙에 걸리지 않고, 우리가 허락받아 읽어 오는 곳과의 관계도 상하지
  않는다.
*/

const FIT_LABEL: Record<Fit, string> = {
  모두: "여러 교단이 봄",
  "같은 교단": "같은 교단",
  "다른 교단": "",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // 클립보드를 막은 브라우저가 있다. 그럴 땐 아래 글상자에서 직접 고르면 된다.
        }
      }}
      className={`rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
        done ? "bg-accent text-background" : "bg-sunken text-muted hover:text-foreground"
      }`}
    >
      {done ? "복사됨" : label}
    </button>
  );
}

export function CrossPost({ job }: { job: PostedJob }) {
  const [withLink, setWithLink] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const boards = rankBoards(job.denomination);
  const body = formatBody(job, withLink);

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">다른 게시판에도 올리기</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        게시판마다 제목 꼴을 맞춰 두었습니다. 복사해서 붙이시면 30초면 끝납니다.
        자동으로 올리지 않는 까닭은, 게시판마다 글쓰기 자격이 따로 있고 기계가
        대신 올리면 스팸으로 지워지기 때문입니다.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={withLink}
          onChange={(e) => setWithLink(e.target.checked)}
          className="h-4 w-4"
        />
        본문 끝에 이 사이트 주소 붙이기
      </label>

      <ul className="mt-4 flex flex-col gap-2">
        {boards.map((board) => {
          const title = formatTitle(job, board);
          const expanded = open === board.id;
          return (
            <li
              key={board.id}
              className={`rounded-card border bg-surface p-4 ${
                board.fit === "다른 교단" ? "border-line opacity-80" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{board.label}</span>
                {FIT_LABEL[board.fit] && (
                  <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    {FIT_LABEL[board.fit]}
                  </span>
                )}
                {board.fit === "다른 교단" && board.audience && (
                  // 숨기지 않는다. 다른 교단 교회도 올리는 곳이다 — 누가 보는지만 알린다.
                  <span className="text-xs text-faint">{board.audience} 출신이 주로 봄</span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <CopyButton text={title} label="제목 복사" />
                  <CopyButton text={body} label="본문 복사" />
                  <a
                    href={board.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-pill border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:border-line-strong"
                  >
                    게시판 열기 ↗
                  </a>
                </div>
              </div>

              <p className="mt-2 truncate text-sm text-muted">{title}</p>

              {board.note && (
                <p className="mt-2 rounded-card bg-sunken px-3 py-2 text-xs leading-relaxed text-muted">
                  {board.note}
                </p>
              )}

              <button
                type="button"
                onClick={() => setOpen(expanded ? null : board.id)}
                className="mt-2 text-xs text-faint underline-offset-4 hover:text-foreground hover:underline"
              >
                {expanded ? "본문 접기" : "본문 미리 보기"}
              </button>
              {expanded && (
                <textarea
                  readOnly
                  value={body}
                  rows={12}
                  onFocus={(e) => e.currentTarget.select()}
                  className="mt-2 w-full rounded-card border border-line bg-background px-3 py-2 font-mono text-xs leading-relaxed"
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
