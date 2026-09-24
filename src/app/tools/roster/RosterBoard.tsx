"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSaveState } from "@/app/tools/setlist/actions";
import { readRoster, writeRoster, writeTemplate } from "@/lib/roster-excel";
import {
  addStudents,
  birthdayLabel,
  deleteStudent,
  listAttendance,
  listStudents,
  recentCounts,
  setPresent,
  upcomingBirthdays,
  updateStudent,
  type Student,
} from "@/lib/roster";

const field = "w-full rounded border border-line bg-surface px-2 py-1.5 text-sm";
const label = "mb-1 block text-xs text-muted";

type Tab = "출석" | "생일" | "명단";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

export function RosterBoard() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [tab, setTab] = useState<Tab>("출석");
  const [date, setDate] = useState(today);
  const [present, setPresentSet] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<{ date: string; count: number }[]>([]);
  const [klass, setKlass] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const state = await getSaveState().catch(() => ({ signedIn: false, items: [] }));
      if (!alive) return;
      setSignedIn(state.signedIn);
      if (!state.signedIn) return;
      try {
        const [list, recent] = await Promise.all([listStudents(), recentCounts()]);
        if (!alive) return;
        setStudents(list);
        setCounts(recent);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    listAttendance(date)
      .then((set) => alive && setPresentSet(set))
      .catch(() => {});
    return () => { alive = false; };
  }, [date, signedIn]);

  async function run(work: () => Promise<void>) {
    setError(null);
    try { await work(); } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const toggle = (student: Student) =>
    run(async () => {
      const next = !present.has(student.id);
      // 눌린 느낌이 먼저 와야 한다. 스무 명을 찍는 동안 매번 기다릴 수 없다.
      setPresentSet((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(student.id); else copy.delete(student.id);
        return copy;
      });
      await setPresent(student.id, date, next);
    });

  const importFile = (files: FileList | null) =>
    run(async () => {
      const file = files?.[0];
      if (!file) return;
      setBusy("읽는 중…");
      const { students: rows, skipped, unknownHeaders } = await readRoster(file);
      if (rows.length === 0) throw new Error("읽을 줄이 없습니다.");
      setBusy(`${rows.length}명 등록 중…`);
      const added = await addStudents(rows);
      setStudents((prev) => [...prev, ...added].sort(byClassThenName));
      const notes = [
        `${added.length}명 등록했습니다.`,
        skipped.length ? `이름이 없어 건너뛴 줄: ${skipped.join(", ")}` : "",
        unknownHeaders.length ? `못 알아본 머리글: ${unknownHeaders.join(", ")}` : "",
      ].filter(Boolean);
      setBusy(notes.join(" · "));
      if (fileInput.current) fileInput.current.value = "";
    });

  const classes = [...new Set(students.map((s) => s.className).filter(Boolean))].sort();
  const shown = students
    .filter((s) => s.active && (!klass || s.className === klass))
    .sort(byClassThenName);
  const birthdays = upcomingBirthdays(students);

  if (signedIn === null) return <div className="mt-8 h-40 rounded-card border border-line bg-sunken" />;

  if (!signedIn) {
    return (
      <div className="mt-8 rounded-card border border-line bg-sunken px-5 py-6 text-sm leading-relaxed">
        <b>로그인이 필요합니다.</b>
        <p className="mt-1 text-muted">
          아이들 정보가 들어가는 곳이라 로그인한 본인만 볼 수 있게 했습니다.
        </p>
        <Link href="/login?next=/tools/roster" className="mt-3 inline-block font-semibold text-accent hover:underline">
          구글로 로그인 →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center gap-2">
        {(["출석", "생일", "명단"] as Tab[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`h-9 rounded-pill px-4 text-sm font-medium transition-colors ${
              tab === name
                ? "bg-foreground text-background"
                : "border border-line text-muted hover:border-line-strong"
            }`}
          >
            {name}
            {name === "생일" && birthdays.length > 0 && (
              <span className="ml-1.5 text-xs">{birthdays.filter((b) => b.inDays <= 14).length}</span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-faint">{students.filter((s) => s.active).length}명</span>
      </div>

      {busy && <p className="mt-3 text-xs text-muted">{busy}</p>}
      {error && <p className="mt-3 text-xs text-highlight">{error}</p>}

      {tab === "출석" && (
        <section className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <label>
              <span className={label}>날짜</span>
              <input type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            {classes.length > 0 && (
              <label>
                <span className={label}>반</span>
                <select className={field} value={klass} onChange={(e) => setKlass(e.target.value)}>
                  <option value="">전체</option>
                  {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
            <div className="ml-auto self-end rounded-pill bg-accent-soft px-4 py-2 text-sm font-bold text-accent">
              {shown.filter((s) => present.has(s.id)).length} / {shown.length}명
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="mt-6 rounded-card border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
              명단이 비어 있습니다. <b>명단</b> 칸에서 엑셀을 올려 주세요.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((student) => {
                const on = present.has(student.id);
                return (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => toggle(student)}
                      className={`flex h-14 w-full items-center gap-2 rounded-card border px-4 text-left transition-colors ${
                        on
                          ? "border-accent bg-accent-soft"
                          : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <span className={`text-lg ${on ? "text-accent" : "text-faint"}`}>
                        {on ? "✓" : "○"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-medium ${on ? "text-accent" : ""}`}>
                          {student.name}
                        </span>
                        {student.className && (
                          <span className="block truncate text-xs text-faint">{student.className}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {counts.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold">최근 출석</h2>
              <ul className="mt-2 divide-y divide-line border-y border-line text-sm">
                {counts.slice(0, 8).map((row) => (
                  <li key={row.date} className="flex items-center gap-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => setDate(row.date)}
                      className="text-muted transition-colors hover:text-accent"
                    >
                      {row.date}
                    </button>
                    <span className="ml-auto font-bold tabular-nums">{row.count}명</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab === "생일" && (
        <section className="mt-4">
          {birthdays.length === 0 ? (
            <p className="rounded-card border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
              앞으로 60일 안에 생일인 아이가 없습니다. 생일을 적지 않았다면 명단에서 채워 주세요.
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {birthdays.map(({ student, inDays, turning }) => (
                <li key={student.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span
                    className={`w-16 shrink-0 text-xs font-bold ${
                      inDays === 0 ? "text-highlight" : inDays <= 7 ? "text-accent" : "text-faint"
                    }`}
                  >
                    {inDays === 0 ? "오늘" : `D-${inDays}`}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{student.name}</span>
                    <span className="block truncate text-xs text-faint">
                      {[student.className, birthdayLabel(student)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {turning && <span className="shrink-0 text-xs text-muted">{turning}살</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted">
            태어난 해를 몰라도 월·일만 있으면 셉니다. 교회 명단에서 태어난 해까지 받는 일은
            드물기 때문입니다.
          </p>
        </section>
      )}

      {tab === "명단" && (
        <RosterTable
          students={students}
          onChange={setStudents}
          onError={setError}
          onImport={() => fileInput.current?.click()}
          fileInput={fileInput}
          onFile={importFile}
        />
      )}
    </div>
  );
}

function byClassThenName(a: Student, b: Student) {
  return (
    a.className.localeCompare(b.className, "ko") || a.name.localeCompare(b.name, "ko")
  );
}

function RosterTable({
  students,
  onChange,
  onError,
  onImport,
  fileInput,
  onFile,
}: {
  students: Student[];
  onChange: (students: Student[]) => void;
  onError: (message: string) => void;
  onImport: () => void;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onFile: (files: FileList | null) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const patch = (id: string, changes: Partial<Student>) =>
    onChange(students.map((s) => (s.id === id ? { ...s, ...changes } : s)));

  async function save(student: Student) {
    try {
      await updateStudent(student.id, student);
      setOpenId(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  async function remove(student: Student) {
    if (!confirm(`"${student.name}"을 명단에서 지울까요? 출석 기록도 함께 지워집니다.`)) return;
    try {
      await deleteStudent(student.id);
      onChange(students.filter((s) => s.id !== student.id));
      setOpenId(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="mt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onImport}
          className="h-9 rounded-pill bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
        >
          엑셀 올리기
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.csv"
          hidden
          onChange={(e) => onFile(e.target.files)}
        />
        <button
          type="button"
          onClick={() => writeRoster(students, `명단 ${today()}.xlsx`)}
          disabled={students.length === 0}
          className="h-9 rounded-pill border border-line px-4 text-sm font-medium transition-colors hover:border-line-strong disabled:opacity-40"
        >
          엑셀로 내려받기
        </button>
        <button
          type="button"
          onClick={() => writeTemplate()}
          className="h-9 rounded-pill px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          빈 서식 받기
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">
        첫 줄에 머리글이 있어야 합니다 — <b>이름, 반, 생년, 생월, 생일, 보호자, 연락처, 비고</b>.
        <br />
        이름만 있으면 나머지는 비어 있어도 됩니다. <code>성명</code>·<code>학급</code>·
        <code>휴대폰</code>처럼 달리 적은 머리글도 알아봅니다.
      </p>

      {students.length > 0 && (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {students.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => setOpenId(openId === student.id ? null : student.id)}
                className="flex w-full items-center gap-2 py-2.5 text-left text-sm transition-colors hover:text-accent"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{student.name}</span>
                <span className="shrink-0 text-xs text-faint">{student.className}</span>
                <span className="w-24 shrink-0 text-right text-xs text-faint">
                  {birthdayLabel(student)}
                </span>
              </button>

              {openId === student.id && (
                <div className="mb-3 rounded-card border border-line bg-surface p-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label>
                      <span className={label}>이름</span>
                      <input className={field} value={student.name}
                        onChange={(e) => patch(student.id, { name: e.target.value })} />
                    </label>
                    <label>
                      <span className={label}>반</span>
                      <input className={field} value={student.className}
                        onChange={(e) => patch(student.id, { className: e.target.value })} />
                    </label>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([["생년", "birthYear"], ["생월", "birthMonth"], ["생일", "birthDay"]] as const).map(
                      ([name, key]) => (
                        <label key={key}>
                          <span className={label}>{name}</span>
                          <input
                            className={field}
                            inputMode="numeric"
                            value={student[key] ?? ""}
                            onChange={(e) =>
                              patch(student.id, { [key]: Number(e.target.value) || null } as Partial<Student>)
                            }
                          />
                        </label>
                      )
                    )}
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label>
                      <span className={label}>보호자</span>
                      <input className={field} value={student.guardian}
                        onChange={(e) => patch(student.id, { guardian: e.target.value })} />
                    </label>
                    <label>
                      <span className={label}>연락처 (선택)</span>
                      <input className={field} value={student.guardianPhone}
                        onChange={(e) => patch(student.id, { guardianPhone: e.target.value })} />
                    </label>
                  </div>

                  <label className="mt-2 block">
                    <span className={label}>비고</span>
                    <input className={field} placeholder="알레르기, 형제 관계 등" value={student.note}
                      onChange={(e) => patch(student.id, { note: e.target.value })} />
                  </label>

                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--accent)]"
                      checked={student.active}
                      onChange={(e) => patch(student.id, { active: e.target.checked })}
                    />
                    명단에 둠 (졸업·전출은 체크를 빼면 출석 칸에서 사라집니다)
                  </label>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => save(student)}
                      className="h-9 rounded-pill bg-accent px-4 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(student)}
                      className="ml-auto h-9 rounded-lg px-3 text-xs text-muted transition-colors hover:bg-sunken hover:text-highlight"
                    >
                      지우기
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
