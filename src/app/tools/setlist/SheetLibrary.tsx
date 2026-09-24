"use client";

import { useRef, useState } from "react";
import { ACCEPT, deleteSheet, sheetUrl, uploadSheet, type Sheet } from "@/lib/sheets";

/**
 * 악보 보관함.
 *
 * 악보는 한 번 올려 두고 여러 콘티에서 다시 쓴다. 그래서 콘티 안이 아니라
 * 콘티 옆에 둔다 — 같은 곡을 다음 달에 또 부를 때 다시 올리지 않아도 된다.
 */
export function SheetLibrary({
  sheets,
  onChange,
  usedIds,
}: {
  sheets: Sheet[];
  onChange: (sheets: Sheet[]) => void;
  usedIds: Set<string>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const added: Sheet[] = [];
    for (const file of Array.from(files)) {
      setBusy(`${file.name} 올리는 중…`);
      try {
        added.push(await uploadSheet(file));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        break;
      }
    }
    setBusy(null);
    if (added.length) onChange([...added, ...sheets]);
    if (input.current) input.current.value = "";
  }

  async function open(sheet: Sheet) {
    const url = await sheetUrl(sheet.path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else setError("악보를 열지 못했습니다.");
  }

  async function remove(sheet: Sheet) {
    const warn = usedIds.has(sheet.id)
      ? `"${sheet.title}"은 지금 콘티에 붙어 있습니다. 지우면 연결도 끊어집니다. 계속할까요?`
      : `"${sheet.title}"을 지울까요?`;
    if (!confirm(warn)) return;
    setError(null);
    setBusy("지우는 중…");
    try {
      await deleteSheet(sheet);
      onChange(sheets.filter((s) => s.id !== sheet.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(null);
  }

  return (
    <section className="no-print mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold">악보 보관함</h2>
        <span className="text-xs text-faint">{sheets.length}개</span>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy !== null}
          className="ml-auto h-9 rounded-pill border border-line px-4 text-sm font-medium transition-colors hover:border-line-strong disabled:opacity-40"
        >
          악보 올리기
        </button>
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => add(e.target.files)}
        />
      </div>

      <p className="mt-1 text-xs leading-relaxed text-muted">
        PDF나 사진으로 올려 두면 곡마다 골라 붙일 수 있고, 콘티와 함께 PDF 한 개로
        묶입니다. 올린 악보는 본인만 봅니다.
      </p>

      {busy && <p className="mt-2 text-xs text-muted">{busy}</p>}
      {error && <p className="mt-2 text-xs text-highlight">{error}</p>}

      {sheets.length > 0 && (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {sheets.map((sheet) => (
            <li key={sheet.id} className="flex items-center gap-2 py-2 text-sm">
              <button
                type="button"
                onClick={() => open(sheet)}
                className="flex-1 truncate text-left transition-colors hover:text-accent"
              >
                {sheet.title}
                <span className="ml-2 text-xs text-faint">
                  {sheet.mime === "application/pdf" ? "PDF" : "사진"} ·{" "}
                  {Math.max(1, Math.round(sheet.sizeBytes / 1024))}KB
                </span>
                {usedIds.has(sheet.id) && (
                  <span className="ml-2 text-xs text-accent">콘티에 붙임</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => remove(sheet)}
                disabled={busy !== null}
                aria-label={`${sheet.title} 지우기`}
                className="h-8 shrink-0 rounded-lg px-2 text-xs text-muted transition-colors hover:bg-sunken hover:text-highlight disabled:opacity-40"
              >
                지우기
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
