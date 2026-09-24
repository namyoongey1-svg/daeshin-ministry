"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createLocalStore } from "@/lib/local-store";
import { SaveBar } from "./SaveBar";
import { SheetLibrary } from "./SheetLibrary";
import { getSaveState, type SaveState } from "./actions";
import { listSheets, type Sheet } from "@/lib/sheets";
import { buildSetlistPdf, downloadPdf } from "@/lib/setlist-pdf";
import {
  FORM_PARTS,
  LINKS,
  MOODS,
  PARTS,
  emptySetlist,
  emptySong,
  reviveSetlist,
  formatKey,
  reviewSetlist,
  singingKey,
  totalMinutes,
  transposeLabel,
  type Mood,
  type Setlist,
  type Song,
} from "@/lib/setlist";

const store = createLocalStore<Setlist>("daeshin.setlist", emptySetlist(), reviveSetlist);

/**
 * 지금 고치고 있는 콘티가 계정의 어느 줄인가.
 *
 * 새로고침해도 이 연결이 남아야 한다. 잊어버리면 다음 "저장"이
 * 같은 콘티를 한 번 더 만든다.
 */
const savedIdStore = createLocalStore<string | null>("daeshin.setlist.saved", null, (raw) =>
  typeof raw === "string" ? raw : null
);

const field = "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm";
const label = "mb-1 block text-xs text-muted";

const MOOD_STYLE: Record<Mood, string> = {
  "여는 찬양": "bg-highlight-soft text-highlight",
  "빠른 찬양": "bg-highlight-soft text-highlight",
  "느린 찬양": "bg-accent-soft text-accent",
  경배: "bg-accent-soft text-accent",
  "응답·헌신": "bg-sunken text-muted",
};

export default function SetlistEditor() {
  const setlist = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const savedId = useSyncExternalStore(
    savedIdStore.subscribe,
    savedIdStore.getSnapshot,
    savedIdStore.getServerSnapshot
  );

  /** 저장과 악보는 로그인해야 쓰므로 화면이 뜼고 나서 따로 물어본다. */
  const [state, setState] = useState<SaveState | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [pdfBusy, startPdf] = useTransition();
  const [pdfNote, setPdfNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = await getSaveState().catch(() => ({ signedIn: false, items: [] }));
      if (!alive) return;
      setState(next);
      if (!next.signedIn) return;
      const loaded = await listSheets().catch(() => []);
      if (alive) setSheets(loaded);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const patch = (changes: Partial<Setlist>) =>
    store.update((current) => ({ ...current, ...changes }));

  const patchSong = (id: string, changes: Partial<Song>) =>
    patch({ songs: setlist.songs.map((s) => (s.id === id ? { ...s, ...changes } : s)) });

  function move(index: number, delta: number) {
    const next = [...setlist.songs];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patch({ songs: next });
  }

  /** 콘티 한 장 + 곡별 악보를 PDF 하나로. */
  function makePdf() {
    setPdfNote(null);
    startPdf(async () => {
      try {
        const { bytes, skipped } = await buildSetlistPdf(setlist, sheets);
        downloadPdf(bytes, `${setlist.serviceName} ${setlist.date}.pdf`.replace(/[\/:*?"<>|]/g, " "));
        setPdfNote(
          skipped.length
            ? `만들었습니다. 다만 이 악보는 붙이지 못했습니다 — ${skipped.join(", ")}`
            : "PDF를 만들었습니다."
        );
      } catch (err) {
        setPdfNote(err instanceof Error ? err.message : String(err));
      }
    });
  }

  const hints = reviewSetlist(setlist.songs);
  const hintsFor = (id: string) => hints.filter((h) => h.songId === id);
  const minutes = totalMinutes(setlist.songs);
  const filled = setlist.songs.filter((s) => s.title.trim());

  /** 단톡방에 그대로 붙일 수 있는 글. 콘티는 대부분 이렇게 공유된다. */
  function toText(): string {
    // 인도자는 머리말에 한 번만 적는다. 팀 칸에도 적어 두면 두 번 나온다.
    const leader = setlist.leader.trim() || setlist.team["인도"]?.trim() || "";
    const parts = PARTS.filter((p) => p !== "인도" && setlist.team[p]?.trim())
      .map((p) => `${p} ${setlist.team[p].trim()}`)
      .join(" / ");

    const header = [
      `[${setlist.serviceName}] ${setlist.date}`,
      leader ? `인도 ${leader}` : "",
      parts,
    ].filter(Boolean);

    const lines = [...header, ""];

    filled.forEach((song, i) => {
      const key = singingKey(song);
      const spec = [
        key ? formatKey(key) : "",
        song.meter,
        song.bpm ? `♩${song.bpm}` : "",
      ].filter(Boolean).join(", ");
      lines.push(`${i + 1}. ${song.title}${spec ? `  (${spec})` : ""}`);

      const sub = [
        i > 0 && song.link !== "바로" ? `${song.link}로 연결` : "",
        transposeLabel(song),
        song.note.trim(),
      ].filter(Boolean).join(" · ");
      if (sub) lines.push(`   ${sub}`);
      if (song.form.trim()) lines.push(`   ${song.form.trim()}`);
    });

    if (minutes > 0) lines.push("", `총 ${minutes}분`);
    if (setlist.note.trim()) lines.push("", setlist.note.trim());
    return lines.join("\n");
  }

  return (
    <div>
      <div className="no-print">
        <h1 className="text-3xl font-bold sm:text-4xl">찬양 콘티</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          곡 순서와 조, 연결을 정리합니다. 조가 멀리 건너뛰거나 분위기가 갑자기
          바뀌는 자리는 표시해 드립니다. 적은 내용은 이 브라우저에만 저장됩니다.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-2">
          <label>
            <span className={label}>예배</span>
            <input className={field} value={setlist.serviceName}
              onChange={(e) => patch({ serviceName: e.target.value })} />
          </label>
          <label>
            <span className={label}>날짜</span>
            <input type="date" className={field} value={setlist.date}
              onChange={(e) => patch({ date: e.target.value })} />
          </label>
          <label>
            <span className={label}>인도</span>
            <input className={field} value={setlist.leader}
              onChange={(e) => patch({ leader: e.target.value })} />
          </label>
          {/* 버튼은 한 덩어리로 묶어 둔다. 좌우로 흘러가면 입력칸 사이에 끼어 보인다. */}
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(toText())}
              className="rounded-pill bg-accent px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              단톡방용 복사
            </button>
            <button
              type="button"
              onClick={makePdf}
              disabled={pdfBusy}
              className="rounded-pill border border-line px-5 py-2 text-sm font-medium transition-colors hover:border-line-strong disabled:opacity-40"
            >
              {pdfBusy ? "묶는 중…" : "악보까지 PDF 하나로"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-pill border border-line px-5 py-2 text-sm font-medium transition-colors hover:border-line-strong"
            >
              인쇄
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirm("적은 내용을 모두 지울까요?")) return;
                store.set(emptySetlist());
                // 저장해 둔 콘티는 그대로 두고 연결만 끈는다.
                savedIdStore.set(null);
              }}
              className="rounded-pill border border-line px-5 py-2 text-sm font-medium transition-colors hover:border-line-strong"
            >
              새로 시작
            </button>
          </div>
        </div>

        {pdfNote && <p className="mt-3 text-xs leading-relaxed text-muted">{pdfNote}</p>}

        <SaveBar
          signedIn={state ? state.signedIn : null}
          initialItems={state?.items ?? []}
          setlist={setlist}
          savedId={savedId}
          onSavedIdChange={savedIdStore.set}
          onLoad={store.set}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        {/* ------------------------------------------------------- 곡 목록 */}
        <section className="no-print">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">곡 순서</h2>
            <span className="text-xs text-faint">
              {filled.length}곡{minutes > 0 && ` · 약 ${minutes}분`}
            </span>
          </div>

          <ul className="mt-3 space-y-3">
            {setlist.songs.map((song, i) => (
              <li key={song.id} className="rounded-card border border-line bg-surface p-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-faint">{i + 1}</span>
                  <input
                    className={field}
                    placeholder="곡 제목"
                    value={song.title}
                    onChange={(e) => patchSong(song.id, { title: e.target.value })}
                  />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <label>
                    <span className={label}>원키</span>
                    <input className={field} placeholder="G" value={song.originalKey}
                      onChange={(e) => patchSong(song.id, { originalKey: e.target.value })} />
                  </label>
                  <label>
                    <span className={label}>부를 키</span>
                    <input className={field} placeholder="A" value={song.key}
                      onChange={(e) => patchSong(song.id, { key: e.target.value })} />
                  </label>
                  <label>
                    <span className={label}>박자</span>
                    <input className={field} placeholder="4/4" value={song.meter}
                      onChange={(e) => patchSong(song.id, { meter: e.target.value })} />
                  </label>
                  <label>
                    <span className={label}>BPM</span>
                    <input className={field} inputMode="numeric" placeholder="72" value={song.bpm}
                      onChange={(e) => patchSong(song.id, { bpm: e.target.value })} />
                  </label>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label>
                    <span className={label}>분위기</span>
                    <select className={field} value={song.mood}
                      onChange={(e) => patchSong(song.id, { mood: e.target.value as Mood })}>
                      {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={label}>{i === 0 ? "시작" : "앞 곡에서"}</span>
                    <select className={field} value={song.link}
                      onChange={(e) => patchSong(song.id, { link: e.target.value as Song["link"] })}>
                      {LINKS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={label}>길이(분)</span>
                    <input className={field} inputMode="numeric" placeholder="5" value={song.minutes}
                      onChange={(e) => patchSong(song.id, { minutes: e.target.value })} />
                  </label>
                </div>

                {/* 송폼 — 단추는 없는 것보다 빠르라고 둔다. 그냥 적어도 된다. */}
                <div className="mt-3">
                  <span className={label}>송폼</span>
                  <input
                    className={field}
                    placeholder="인트로 - 1절 - 후렴 - 2절 - 후렴 - 브릿지 x2 - 후렴 - 엔딩"
                    value={song.form}
                    onChange={(e) => patchSong(song.id, { form: e.target.value })}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {FORM_PARTS.map((part) => (
                      <button
                        key={part}
                        type="button"
                        onClick={() =>
                          patchSong(song.id, {
                            form: song.form.trim() ? `${song.form.trim()} - ${part}` : part,
                          })
                        }
                        className="h-7 rounded-pill border border-line px-2.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-foreground"
                      >
                        {part}
                      </button>
                    ))}
                    {song.form.trim() && (
                      <button
                        type="button"
                        onClick={() => patchSong(song.id, { form: "" })}
                        className="h-7 rounded-pill px-2.5 text-xs text-faint transition-colors hover:text-highlight"
                      >
                        비우기
                      </button>
                    )}
                  </div>
                </div>

                {state?.signedIn && (
                  <label className="mt-3 block">
                    <span className={label}>악보</span>
                    <select
                      className={field}
                      value={song.sheetId}
                      onChange={(e) => patchSong(song.id, { sheetId: e.target.value })}
                    >
                      <option value="">— 없음</option>
                      {sheets.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <input
                  className={`${field} mt-3`}
                  placeholder="비고 — 1절만 / 마지막에 자유 찬양"
                  value={song.note}
                  onChange={(e) => patchSong(song.id, { note: e.target.value })}
                />

                {hintsFor(song.id).map((hint, n) => (
                  <p key={n} className="mt-2 border-l-2 border-highlight pl-3 text-xs leading-relaxed text-muted">
                    {hint.text}
                  </p>
                ))}

                {/* 휴대폰에서 엄지로 누를 수 있어야 해서 글자보다 크게 잡았다. */}
                <div className="mt-2 flex items-center gap-1 text-xs text-muted">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`${i + 1}번 곡을 위로`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-sunken hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                  >↑</button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === setlist.songs.length - 1}
                    aria-label={`${i + 1}번 곡을 아래로`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-sunken hover:text-accent disabled:pointer-events-none disabled:opacity-30"
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => patch({ songs: setlist.songs.filter((s) => s.id !== song.id) })}
                    aria-label={`${i + 1}번 곡 삭제`}
                    className="ml-auto flex h-9 items-center rounded-lg px-3 transition-colors hover:bg-sunken hover:text-highlight"
                  >삭제</button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => patch({ songs: [...setlist.songs, emptySong()] })}
            className="mt-3 flex h-10 items-center rounded-lg px-3 text-xs font-medium text-accent transition-colors hover:bg-sunken"
          >+ 곡 추가</button>

          <div className="mt-8">
            <h2 className="mb-2 text-sm font-bold">팀</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PARTS.map((part) => (
                <label key={part}>
                  <span className={label}>{part}</span>
                  <input
                    className={field}
                    value={setlist.team[part] ?? ""}
                    onChange={(e) => patch({ team: { ...setlist.team, [part]: e.target.value } })}
                  />
                </label>
              ))}
            </div>
            <label className="mt-3 block">
              <span className={label}>전체 메모</span>
              <textarea className={`${field} h-20`} value={setlist.note}
                placeholder="리허설 시간, 특송 순서, 자막 담당 등"
                onChange={(e) => patch({ note: e.target.value })} />
            </label>
          </div>

          {state?.signedIn && (
            <SheetLibrary
              sheets={sheets}
              onChange={setSheets}
              usedIds={new Set(setlist.songs.map((s) => s.sheetId).filter(Boolean))}
            />
          )}
        </section>

        {/* ------------------------------------------------------- 미리보기 */}
        <section className="print-sheet lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-surface p-6">
            <header className="border-b border-foreground pb-3">
              <h2 className="text-lg font-bold">{setlist.serviceName || "예배"}</h2>
              <p className="mt-0.5 text-sm text-muted">
                {setlist.date}
                {setlist.leader && ` · 인도 ${setlist.leader}`}
              </p>
            </header>

            <ol className="mt-4 space-y-3">
              {filled.length === 0 ? (
                <li className="py-6 text-center text-sm text-muted">곡을 적으면 여기 모입니다.</li>
              ) : (
                filled.map((song, i) => {
                  const key = singingKey(song);
                  const shift = transposeLabel(song);
                  return (
                    <li key={song.id} className="text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="w-4 shrink-0 text-faint">{i + 1}</span>
                        <span className="font-bold">{song.title}</span>
                        {key && (
                          <span className="ml-auto shrink-0 font-bold tabular-nums">
                            {formatKey(key)}
                          </span>
                        )}
                      </div>
                      <div className="ml-6 mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={`rounded-pill px-2 py-0.5 ${MOOD_STYLE[song.mood]}`}>
                          {song.mood}
                        </span>
                        <span className="text-faint">{song.meter}</span>
                        {song.bpm && <span className="text-faint">♩{song.bpm}</span>}
                        {shift && <span className="text-accent">{shift}</span>}
                        {i > 0 && song.link !== "바로" && (
                          <span className="text-muted">{song.link}</span>
                        )}
                      </div>
                      {song.form && (
                        <p className="ml-6 mt-1 text-xs leading-relaxed">{song.form}</p>
                      )}
                      {song.note && (
                        <p className="ml-6 mt-1 text-xs leading-relaxed text-muted">{song.note}</p>
                      )}
                    </li>
                  );
                })
              )}
            </ol>

            {(minutes > 0 || PARTS.some((p) => setlist.team[p]?.trim())) && (
              <footer className="mt-5 border-t border-line pt-3 text-xs text-muted">
                {minutes > 0 && <p>약 {minutes}분</p>}
                <p className="mt-1">
                  {PARTS.filter((p) => setlist.team[p]?.trim())
                    .map((p) => `${p} ${setlist.team[p].trim()}`)
                    .join(" · ")}
                </p>
              </footer>
            )}
          </div>

          {hints.length > 0 && (
            <div className="no-print mt-4 rounded-card border border-line bg-surface p-5">
              <h3 className="text-sm font-bold">짚어 볼 곳 {hints.length}개</h3>
              <p className="mt-1 text-xs leading-relaxed text-faint">
                틀렸다는 뜻이 아닙니다. 일부러 그렇게 짠 콘티도 많습니다.
                현장에서 당황하기 쉬운 자리만 적어 둡니다.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
