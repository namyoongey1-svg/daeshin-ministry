"use client";

import type { Student } from "./roster";

/*
  명단 엑셀 주고받기.

  교회 명단은 이미 엑셀로 있다. 손으로 다시 치게 하면 아무도 쓰지 않는다.
  교역자가 바뀔 때 명단을 넘기는 것도 결국 엑셀 파일 하나다.

  라이브러리는 누를 때 받아 온다(동적 import). 명단을 안 쓰는 사람까지
  엑셀 코드를 내려받게 할 이유가 없다.
*/

export const COLUMNS = ["이름", "반", "생년", "생월", "생일", "보호자", "연락처", "비고"] as const;

/** 엑셀 머리글이 조금씩 달라도 알아본다. */
const ALIASES: Record<string, (typeof COLUMNS)[number]> = {
  이름: "이름", 성명: "이름", 학생명: "이름", 아동명: "이름",
  반: "반", 부서: "반", 학급: "반", 소속: "반", 학년: "반",
  생년: "생년", 출생연도: "생년", 년: "생년",
  생월: "생월", 월: "생월",
  생일: "생일", 일: "생일",
  보호자: "보호자", 부모: "보호자", 학부모: "보호자", 보호자명: "보호자",
  연락처: "연락처", 전화: "연락처", 전화번호: "연락처", 휴대폰: "연락처", 보호자연락처: "연락처",
  비고: "비고", 메모: "비고", 특이사항: "비고",
};

export interface ImportResult {
  students: Omit<Student, "id">[];
  /** 읽었지만 이름이 없어 건너뛴 줄 번호 */
  skipped: number[];
  /** 알아보지 못한 머리글 */
  unknownHeaders: string[];
}

function clean(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function num(value: unknown): number | null {
  const n = Number(clean(value).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * "2016-03-05", "2016.3.5", "3/5" 처럼 한 칸에 몰아 적은 생일도 읽는다.
 * 숫자가 셋이면 연·월·일, 둘이면 월·일로 본다.
 */
function parseBirth(raw: string): { y: number | null; m: number | null; d: number | null } {
  const parts = raw.split(/[^0-9]+/).filter(Boolean).map(Number);
  if (parts.length >= 3) {
    const [a, b, c] = parts;
    return a > 31 ? { y: a, m: b, d: c } : { y: c, m: a, d: b };
  }
  if (parts.length === 2) return { y: null, m: parts[0], d: parts[1] };
  return { y: null, m: null, d: null };
}

/** 엑셀(.xlsx)이나 CSV 파일에서 명단을 읽는다. */
export async function readRoster(file: File): Promise<ImportResult> {
  const rows = file.name.toLowerCase().endsWith(".csv")
    ? await readCsv(file)
    : await readXlsx(file);

  if (rows.length === 0) throw new Error("빈 파일입니다.");

  const header = rows[0].map((cell) => clean(cell).replace(/\s/g, ""));
  const map = new Map<number, (typeof COLUMNS)[number]>();
  const unknownHeaders: string[] = [];

  header.forEach((name, i) => {
    const hit = ALIASES[name];
    if (hit) map.set(i, hit);
    else if (name) unknownHeaders.push(name);
  });

  if (![...map.values()].includes("이름")) {
    throw new Error(
      `"이름" 칸을 찾지 못했습니다. 첫 줄에 머리글이 있어야 합니다 — ${COLUMNS.join(", ")}`
    );
  }

  const students: Omit<Student, "id">[] = [];
  const skipped: number[] = [];

  rows.slice(1).forEach((row, i) => {
    const get = (key: (typeof COLUMNS)[number]) => {
      for (const [index, name] of map) if (name === key) return clean(row[index]);
      return "";
    };

    const name = get("이름");
    if (!name) {
      // 빈 줄은 조용히 넘긴다. 엑셀 끝에 붙어 있기 마련이다.
      if (row.some((cell) => clean(cell))) skipped.push(i + 2);
      return;
    }

    // 생일이 한 칸에 몰려 있을 수도, 세 칸으로 나뉘어 있을 수도 있다.
    const lump = parseBirth(get("생일"));
    const month = num(get("생월")) ?? lump.m;
    const day = (get("생월") ? num(get("생일")) : lump.d) ?? lump.d;

    students.push({
      name,
      className: get("반"),
      birthYear: num(get("생년")) ?? lump.y,
      birthMonth: month && month >= 1 && month <= 12 ? month : null,
      birthDay: day && day >= 1 && day <= 31 ? day : null,
      guardian: get("보호자"),
      guardianPhone: get("연락처"),
      note: get("비고"),
      active: true,
    });
  });

  return { students, skipped, unknownHeaders };
}

async function readXlsx(file: File): Promise<unknown[][]> {
  const { default: readXlsxFile } = await import("read-excel-file/browser");

  let result: unknown;
  try {
    result = await readXlsxFile(file);
  } catch {
    throw new Error("엑셀 파일을 읽지 못했습니다. .xlsx 또는 .csv 로 저장해 주세요.");
  }

  // 시트 목록으로 돌려주는 판과 줄만 돌려주는 판이 섞여 있다. 첫 시트를 쓴다.
  if (Array.isArray(result) && result.length > 0 && !Array.isArray(result[0])) {
    const first = result[0] as { data?: unknown[][] };
    if (Array.isArray(first?.data)) return first.data;
  }
  return (result ?? []) as unknown[][];
}

/** CSV 는 직접 읽는다. 따옴표 안의 쉼표와 줄바꿈까지 본다. */
async function readCsv(file: File): Promise<string[][]> {
  const text = (await file.text()).replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 0);
}

/** 명단을 엑셀 파일로 내려받는다. 다시 올릴 수 있는 모양 그대로 쓴다. */
export async function writeRoster(students: Student[], filename: string): Promise<void> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");

  const header = COLUMNS.map((name) => ({
    value: name,
    fontWeight: "bold" as const,
    backgroundColor: "#EDF4F0",
  }));

  // 빈 칸은 value 를 아예 빼둔다. null 을 넣으면 라이브러리가 받지 않는다.
  const cell = (value: string | number | null) =>
    value === null || value === "" ? {} : { value };

  const body = students.map((s) => [
    cell(s.name),
    cell(s.className),
    cell(s.birthYear),
    cell(s.birthMonth),
    cell(s.birthDay),
    cell(s.guardian),
    cell(s.guardianPhone),
    cell(s.note),
  ]);

  // 브라우저판은 파일을 바로 쓰지 않고 내려받기를 따로 누른다.
  const out = await writeXlsxFile([header, ...body], {
    columns: [
      { width: 12 }, { width: 16 }, { width: 8 }, { width: 6 },
      { width: 6 }, { width: 12 }, { width: 16 }, { width: 24 },
    ],
  });
  await out.toFile(filename);
}

/** 처음 쓰는 사람이 내려받아 채워 올릴 빈 서식 */
export async function writeTemplate(): Promise<void> {
  await writeRoster(
    [
      {
        id: "",
        name: "김믿음",
        className: "초등부 3학년",
        birthYear: 2016,
        birthMonth: 3,
        birthDay: 5,
        guardian: "김성실",
        guardianPhone: "010-0000-0000",
        note: "땅콩 알레르기",
        active: true,
      },
    ],
    "명단 서식.xlsx"
  );
}
