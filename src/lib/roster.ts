"use client";

import { createClient } from "@/lib/supabase/client";

/*
  교육부서 명단 · 출석 · 생일.

  여기 들어가는 것은 대부분 미성년자의 개인정보다. 이름·생일·보호자 연락처가
  한 줄에 모이면 흩어져 있을 때보다 훨씬 민감해진다. 오직 등록한 본인만 읽고
  쓰며(RLS), 보호자 연락처는 없어도 출석과 생일은 그대로 된다.
*/

export interface Student {
  id: string;
  name: string;
  className: string;
  birthYear: number | null;
  birthMonth: number | null;
  birthDay: number | null;
  guardian: string;
  guardianPhone: string;
  note: string;
  active: boolean;
}

interface StudentRow {
  id: string;
  name: string;
  class_name: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  guardian: string;
  guardian_phone: string;
  note: string;
  active: boolean;
}

const COLUMNS =
  "id, name, class_name, birth_year, birth_month, birth_day, guardian, guardian_phone, note, active";

function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    className: row.class_name ?? "",
    birthYear: row.birth_year,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    guardian: row.guardian ?? "",
    guardianPhone: row.guardian_phone ?? "",
    note: row.note ?? "",
    active: row.active !== false,
  };
}

function toRow(s: Omit<Student, "id">) {
  return {
    name: s.name.trim().slice(0, 100),
    class_name: s.className.trim().slice(0, 100),
    birth_year: s.birthYear,
    birth_month: s.birthMonth,
    birth_day: s.birthDay,
    guardian: s.guardian.trim().slice(0, 100),
    guardian_phone: s.guardianPhone.trim().slice(0, 40),
    note: s.note.trim().slice(0, 500),
    active: s.active,
  };
}

export async function listStudents(): Promise<Student[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .select(COLUMNS)
    .order("class_name")
    .order("name")
    .limit(2000);
  if (error) throw new Error(`명단을 읽지 못했습니다: ${error.message}`);
  return ((data as StudentRow[] | null) ?? []).map(toStudent);
}

export async function addStudents(students: Omit<Student, "id">[]): Promise<Student[]> {
  if (students.length === 0) return [];
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("students")
    .insert(students.map((s) => ({ owner_id: auth.user!.id, ...toRow(s) })))
    .select(COLUMNS);
  if (error) throw new Error(`등록하지 못했습니다: ${error.message}`);
  return ((data as StudentRow[] | null) ?? []).map(toStudent);
}

export async function updateStudent(id: string, student: Omit<Student, "id">): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("students").update(toRow(student)).eq("id", id);
  if (error) throw new Error(`고치지 못했습니다: ${error.message}`);
}

export async function deleteStudent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error(`지우지 못했습니다: ${error.message}`);
}

/* ------------------------------------------------------------------ 출석 */

/** 그날 온 아이들의 id */
export async function listAttendance(date: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("student_id")
    .eq("on_date", date);
  if (error) throw new Error(`출석을 읽지 못했습니다: ${error.message}`);
  return new Set(((data as { student_id: string }[] | null) ?? []).map((r) => r.student_id));
}

export async function setPresent(
  studentId: string,
  date: string,
  present: boolean
): Promise<void> {
  const supabase = createClient();
  if (!present) {
    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("student_id", studentId)
      .eq("on_date", date);
    if (error) throw new Error(error.message);
    return;
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("로그인이 필요합니다.");
  const { error } = await supabase
    .from("attendance")
    .upsert(
      { owner_id: auth.user.id, student_id: studentId, on_date: date },
      { onConflict: "student_id,on_date" }
    );
  if (error) throw new Error(error.message);
}

/** 최근 몇 주의 날짜별 출석 인원 */
export async function recentCounts(weeks = 8): Promise<{ date: string; count: number }[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const { data, error } = await supabase
    .from("attendance")
    .select("on_date")
    .gte("on_date", since.toISOString().slice(0, 10))
    .limit(5000);
  if (error) return [];

  const counts = new Map<string, number>();
  for (const row of (data as { on_date: string }[] | null) ?? []) {
    counts.set(row.on_date, (counts.get(row.on_date) ?? 0) + 1);
  }
  return [...counts]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------------ 생일 */

export interface Birthday {
  student: Student;
  /** 오늘부터 며칠 뒤. 오늘이면 0 */
  inDays: number;
  /** 올해 맞는 나이. 태어난 해를 모르면 null */
  turning: number | null;
}

/**
 * 다가오는 생일.
 *
 * 연도를 몰라도 월·일만 있으면 센다. 교회 명단에서 태어난 해까지 받는 일은
 * 드물기 때문이다.
 */
export function upcomingBirthdays(students: Student[], withinDays = 60, now = new Date()): Birthday[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: Birthday[] = [];

  for (const student of students) {
    if (!student.active || !student.birthMonth || !student.birthDay) continue;

    let next = new Date(today.getFullYear(), student.birthMonth - 1, student.birthDay);
    // 2월 29일생은 평년에 3월 1일로 밀린다. 달력이 알아서 넘겨 준다.
    if (next < today) next = new Date(today.getFullYear() + 1, student.birthMonth - 1, student.birthDay);

    const inDays = Math.round((next.getTime() - today.getTime()) / 86_400_000);
    if (inDays > withinDays) continue;

    out.push({
      student,
      inDays,
      turning: student.birthYear ? next.getFullYear() - student.birthYear : null,
    });
  }

  return out.sort((a, b) => a.inDays - b.inDays);
}

export function birthdayLabel(student: Student): string {
  if (!student.birthMonth || !student.birthDay) return "";
  const md = `${student.birthMonth}월 ${student.birthDay}일`;
  return student.birthYear ? `${student.birthYear}. ${md}` : md;
}
