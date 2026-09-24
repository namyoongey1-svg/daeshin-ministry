"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ACCEPT, deleteSheet, sheetUrl, uploadSheet, type Sheet } from "@/lib/sheets";
import {
  addSong,
  deleteSong,
  linkSheet,
  listSongs,
  toggleFavorite,
  updateSong,
  type LibrarySong,
} from "@/lib/song-library";
import { FORM_PARTS } from "@/lib/setlist";
import { getSaveState } from "@/app/tools/setlist/actions";

/*
  곡 라이브러리 화면.

  콘티는 매주 새로 짜지만 곡은 쌓인다. 한 번 등록해 두면 키·박자·송폼·악보가
  따라오므로, 다음 달에 같은 곡을 부를 때 제목만 고르면 된다.
*/

const field = "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm";
const label = "mb-1 block text-xs text-muted";

type Sort = "제목" | "최근" | "즐겨찾기";

export function SongLibrary() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("제목");
  const [openId, setOpenId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const state = await getSaveState().catch(() => ({ signedIn: false, items: [] }));
      if (!alive) return;
      setSignedIn(state.signedIn);
      if (!state.signedIn) return;
      try {
        const loaded = await listSongs();
        if (alive) setSongs(loaded);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function run(work: () => Promise<void>) {
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const add = () =>
    run(async () => {
      const title = newTitle.trim();
      if (!title) return;
      setBusy("등록 중…");
      const song = await addSong({ title });
      setSongs((prev) => [...prev, song].sort((a, b) => a.title.localeCompare(b.title, "ko")));
      setNewTitle("");
      setOpenId(song.id);
      setBusy(null);
    });

  const patch = (id: string, changes: Partial<LibrarySong>) =>
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...changes } : s)));

  /**
   * 송폼 마디를 덧붙인다.
   *
   * 직전 값을 밖에서 읽어 이어 붙이면, 단추를 빠르게 연달아 누를 때 앞서 누른
   * 것이 사라진다. 화면이 다시 그려지기 전까지 모두 같은 옛값을 보기 때문이다.
   */
  const appendForm = (id: string, part: string) =>
    setSongs((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, form: s.form.trim() ? `${s.form.trim()} - ${part}` : part } : s
      )
    );

  const save = (song: LibrarySong) =>
    run(async () => {
      await updateSong(song.id, song);
      setBusy("저장했습니다.");
      setTimeout(() => setBusy(null), 1500);
    });

  const remove = (song: LibrarySong) =>
    run(async () => {
      if (!confirm(`"${song.title}"을 라이브러리에서 지울까요? 악보 파일은 남습니다.`)) return;
      await deleteSong(song.id);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      setOpenId(null);
    });

  const shown = songs
    .filter((s) => !query.trim() || s.title.includes(query.trim()))
    .sort((a, b) => {
      if (sort === "즐겨찾기" && a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (sort === "최근") return b.updatedAt.localeCompare(a.updatedAt);
      return a.title.localeCompare(b.title, "ko");
    });

  if (signedIn === null) {
    return <div className="mt-8 h-40 rounded-card border border-line bg-sunken" />;
  }

  if (!signedIn) {
    return (
      <div className="mt-8 rounded-card border border-line bg-sunken px-5 py-6 text-sm leading-relaxed">
        <b>로그인하면 곡을 쌓아 둘 수 있습니다.</b>
        <p className="mt-1 text-muted">
          한 번 등록해 두면 키·박자·송폼·악보가 따라옵니다. 다음 달에 같은 곡을 부를 때
          제목만 고르면 됩니다.
        </p>
        <Link
          href="/login?next=/tools/songs"
          className="mt-3 inline-block font-semibold text-accent hover:underline"
        >
          구글로 로그인 →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${field} max-w-xs flex-1`}
          placeholder="곡 제목으로 찾기"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={`${field} w-auto`}
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
        >
          <option value="제목">가나다순</option>
          <option value="최근">최근 고친 순</option>
          <option value="즐겨찾기">즐겨찾기 먼저</option>
        </select>
        <span className="text-xs text-faint">
          {shown.length}곡{songs.length !== shown.length && ` / 전체 ${songs.length}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          className={`${field} max-w-xs flex-1`}
          placeholder="새 곡 제목"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!newTitle.trim()}
          className="h-9 rounded-pill bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          곡 추가
        </button>
        {busy && <span className="self-center text-xs text-muted">{busy}</span>}
      </div>

      {error && <p className="mt-2 text-xs text-highlight">{error}</p>}

      {songs.length === 0 ? (
        <p className="mt-8 rounded-card border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
          아직 등록한 곡이 없습니다. 위에 제목을 적어 첫 곡을 넣어 보세요.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {shown.map((song) => (
            <li key={song.id}>
              <div className="flex items-center gap-2 py-2.5 text-sm">
                <button
                  type="button"
                  onClick={() => toggleFavorite(song.id, !song.favorite).then(() => patch(song.id, { favorite: !song.favorite }))}
                  aria-label={song.favorite ? "즐겨찾기 빼기" : "즐겨찾기"}
                  className={`h-8 w-8 shrink-0 rounded-lg transition-colors hover:bg-sunken ${song.favorite ? "text-highlight" : "text-faint"}`}
                >
                  {song.favorite ? "★" : "☆"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenId(openId === song.id ? null : song.id)}
                  className="flex flex-1 items-center gap-2 truncate text-left transition-colors hover:text-accent"
                >
                  <span className="truncate font-medium">{song.title}</span>
                  {song.originalKey && (
                    <span className="shrink-0 text-xs font-bold text-muted">{song.originalKey}</span>
                  )}
                  {song.sheets.length > 0 && (
                    <span className="shrink-0 text-xs text-accent">악보 {song.sheets.length}</span>
                  )}
                </button>
                <span className="shrink-0 text-xs text-faint">{openId === song.id ? "▲" : "▼"}</span>
              </div>

              {openId === song.id && (
                <SongDetail
                  song={song}
                  onPatch={(changes) => patch(song.id, changes)}
                  onAppendForm={(part) => appendForm(song.id, part)}
                  onSave={() => save(song)}
                  onRemove={() => remove(song)}
                  onError={setError}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SongDetail({
  song,
  onPatch,
  onAppendForm,
  onSave,
  onRemove,
  onError,
}: {
  song: LibrarySong;
  onPatch: (changes: Partial<LibrarySong>) => void;
  onAppendForm: (part: string) => void;
  onSave: () => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function addSheets(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const added: Sheet[] = [];
    try {
      for (const file of Array.from(files)) {
        const sheet = await uploadSheet(file);
        await linkSheet(sheet.id, song.id);
        added.push(sheet);
      }
      onPatch({ sheets: [...song.sheets, ...added] });
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
    setUploading(false);
    if (input.current) input.current.value = "";
  }

  async function open(sheet: Sheet) {
    const url = await sheetUrl(sheet.path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else onError("악보를 열지 못했습니다.");
  }

  async function dropSheet(sheet: Sheet) {
    if (!confirm(`"${sheet.title}" 악보를 지울까요?`)) return;
    try {
      await deleteSheet(sheet);
      onPatch({ sheets: song.sheets.filter((s) => s.id !== sheet.id) });
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="mb-3 rounded-card border border-line bg-surface p-4">
      <label className="block">
        <span className={label}>곡 제목</span>
        <input className={field} value={song.title} onChange={(e) => onPatch({ title: e.target.value })} />
      </label>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <label>
          <span className={label}>원키</span>
          <input className={field} placeholder="G" value={song.originalKey}
            onChange={(e) => onPatch({ originalKey: e.target.value })} />
        </label>
        <label>
          <span className={label}>박자</span>
          <input className={field} placeholder="4/4" value={song.meter}
            onChange={(e) => onPatch({ meter: e.target.value })} />
        </label>
        <label>
          <span className={label}>BPM</span>
          <input className={field} inputMode="numeric" placeholder="72" value={song.bpm}
            onChange={(e) => onPatch({ bpm: e.target.value })} />
        </label>
      </div>

      <div className="mt-3">
        <span className={label}>송폼 — 보통 이렇게 부른다</span>
        <input
          className={field}
          placeholder="인트로 - 1절 - 후렴 - 2절 - 후렴 - 브릿지 x2 - 후렴 - 엔딩"
          value={song.form}
          onChange={(e) => onPatch({ form: e.target.value })}
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {FORM_PARTS.map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => onAppendForm(part)}
              className="h-7 rounded-pill border border-line px-2.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-foreground"
            >
              {part}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-3 block">
        <span className={label}>참고 영상 링크</span>
        <input className={field} placeholder="https://youtu.be/…" value={song.link}
          onChange={(e) => onPatch({ link: e.target.value })} />
      </label>

      <label className="mt-2 block">
        <span className={label}>메모</span>
        <textarea className={`${field} h-16`} value={song.note}
          onChange={(e) => onPatch({ note: e.target.value })} />
      </label>

      {/* ------------------------------------------------------------ 악보 */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">악보 {song.sheets.length}장</span>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="ml-auto h-8 rounded-pill border border-line px-3 text-xs font-medium transition-colors hover:border-line-strong disabled:opacity-40"
          >
            {uploading ? "올리는 중…" : "＋ 악보 추가"}
          </button>
          <input ref={input} type="file" accept={ACCEPT} multiple hidden
            onChange={(e) => addSheets(e.target.files)} />
        </div>

        {song.sheets.length > 0 && (
          <ul className="mt-2 space-y-1">
            {song.sheets.map((sheet) => (
              <li key={sheet.id} className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => open(sheet)}
                  className="flex-1 truncate text-left text-xs transition-colors hover:text-accent"
                >
                  {sheet.title}
                  <span className="ml-2 text-faint">
                    {sheet.mime === "application/pdf" ? "PDF" : "사진"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => dropSheet(sheet)}
                  aria-label={`${sheet.title} 지우기`}
                  className="h-7 shrink-0 rounded-lg px-2 text-xs text-muted transition-colors hover:bg-sunken hover:text-highlight"
                >
                  지우기
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs leading-relaxed text-faint">
          PDF나 사진. 콘티에 이 곡을 넣으면 악보가 함께 따라가고, 콘티를 PDF로 묶을 때
          곡 순서대로 붙습니다.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          className="h-9 rounded-pill bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto h-9 rounded-lg px-3 text-xs text-muted transition-colors hover:bg-sunken hover:text-highlight"
        >
          이 곡 지우기
        </button>
      </div>
    </div>
  );
}
