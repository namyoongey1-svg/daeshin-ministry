"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { Setlist } from "@/lib/setlist";
import {
  deleteSetlist,
  getSaveState,
  listSetlists,
  loadSetlist,
  saveSetlist,
  type SetlistSummary,
} from "./actions";

/**
 * 콘티를 계정에 저장하는 자리.
 *
 * 로그인하지 않아도 콘티는 그대로 쓸 수 있다. 여는 데 10초면 되는 것이
 * 이 도구의 쓸모인데, 로그인 뒤로 감추면 그 쓸모가 사라진다. 계정 저장은
 * 얹는 것이지 문턱이 아니다 — 쓰던 내용은 브라우저에 남아 있다가,
 * 로그인하면 그대로 저장할 수 있다.
 */
export function SaveBar({
  setlist,
  savedId,
  onSavedIdChange,
  onLoad,
}: {
  setlist: Setlist;
  savedId: string | null;
  onSavedIdChange: (id: string | null) => void;
  onLoad: (setlist: Setlist) => void;
}) {
  // null 은 "아직 모름". 로그인 안 한 것과 구별해야 칸이 깜빡이지 않는다.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [items, setItems] = useState<SetlistSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filled = setlist.songs.filter((s) => s.title.trim()).length;

  useEffect(() => {
    let alive = true;
    start(async () => {
      const state = await getSaveState();
      if (!alive) return;
      setSignedIn(state.signedIn);
      setItems(state.items);
    });
    return () => {
      alive = false;
    };
    // 한 번만 물어본다. 이후의 목록은 저장·삭제 때 갱신한다.
  }, []);

  function run(work: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await work();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  const save = (asNew: boolean) =>
    run(async () => {
      const result = await saveSetlist(asNew ? null : savedId, setlist);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSavedIdChange(result.id ?? null);
      setItems(await listSetlists());
      setMessage(asNew || !savedId ? "저장했습니다." : "덮어썼습니다.");
    });

  const open_ = (id: string) =>
    run(async () => {
      const loaded = await loadSetlist(id);
      if (!loaded) {
        setError("불러오지 못했습니다.");
        return;
      }
      onLoad(loaded);
      onSavedIdChange(id);
      setOpen(false);
      setMessage("불러왔습니다.");
    });

  const remove = (id: string, title: string) =>
    run(async () => {
      if (!confirm(`"${title}"을 지울까요?`)) return;
      const result = await deleteSetlist(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (savedId === id) onSavedIdChange(null);
      setItems(await listSetlists());
    });

  // 알아보는 동안은 자리만 비워 둔다. 글을 넣었다 바꾸면 화면이 뛴다.
  if (signedIn === null) {
    return <div className="no-print mt-4 h-[52px] rounded-card border border-line bg-sunken" />;
  }

  if (!signedIn) {
    return (
      <div className="no-print mt-4 rounded-card border border-line bg-sunken px-4 py-3 text-sm">
        <b>로그인하면 계정에 저장됩니다.</b>
        <span className="text-muted">
          {" "}노트북에서 짜고 주일 아침에 휴대폰으로 열 수 있습니다. 지금 적은 내용은
          그대로 두고 로그인만 하면 됩니다.
        </span>
        <Link
          href="/login?next=/tools/setlist"
          className="ml-2 inline-block font-semibold text-accent hover:underline"
        >
          카카오·구글로 로그인 →
        </Link>
      </div>
    );
  }

  return (
    <div className="no-print mt-4 rounded-card border border-line bg-sunken px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={pending || filled === 0}
          className="h-9 rounded-pill bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {pending ? "…" : savedId ? "덮어쓰기" : "계정에 저장"}
        </button>

        {savedId && (
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="h-9 rounded-pill border border-line px-4 text-sm font-medium transition-colors hover:border-line-strong disabled:opacity-40"
          >
            새로 저장
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="h-9 rounded-pill px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          내 콘티 {items.length}개 {open ? "▲" : "▼"}
        </button>

        {message && !error && <span className="text-xs text-muted">{message}</span>}
        {error && <span className="text-xs text-highlight">{error}</span>}
        {filled === 0 && !error && (
          <span className="text-xs text-faint">곡을 적으면 저장할 수 있습니다.</span>
        )}
      </div>

      {open && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {items.length === 0 ? (
            <li className="py-3 text-sm text-muted">아직 저장한 콘티가 없습니다.</li>
          ) : (
            items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
                <button
                  type="button"
                  onClick={() => open_(item.id)}
                  disabled={pending}
                  className="flex-1 truncate text-left transition-colors hover:text-accent disabled:opacity-40"
                >
                  {item.title}
                  <span className="ml-2 text-xs text-faint">{item.songCount}곡</span>
                  {item.id === savedId && (
                    <span className="ml-2 text-xs text-accent">지금 열어 둔 것</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id, item.title)}
                  disabled={pending}
                  aria-label={`${item.title} 지우기`}
                  className="h-8 shrink-0 rounded-lg px-2 text-xs text-muted transition-colors hover:bg-surface hover:text-highlight disabled:opacity-40"
                >
                  지우기
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
