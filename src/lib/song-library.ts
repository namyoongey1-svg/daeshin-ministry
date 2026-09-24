"use client";

import { createClient } from "@/lib/supabase/client";
import type { Sheet } from "@/lib/sheets";

/*
  곡 라이브러리.

  악보를 콘티에 붙여 두면 같은 곡을 다음 달에 또 부를 때 다시 올려야 한다.
  악보는 콘티가 아니라 곡에 붙는 물건이다. 곡을 한 번 등록해 두면 키·박자·
  송폼·악보가 함께 따라온다.

  예배마다 달라지는 것(부를 키, 그날의 연결, 비고)은 콘티에 남고, 곡 자체에
  딸린 것(원키, 박자, 보통의 송폼, 악보)은 여기 남는다.
*/

export interface LibrarySong {
  id: string;
  title: string;
  originalKey: string;
  bpm: string;
  meter: string;
  form: string;
  note: string;
  link: string;
  favorite: boolean;
  updatedAt: string;
  /** 이 곡에 붙은 악보 */
  sheets: Sheet[];
}

interface SongRow {
  id: string;
  title: string;
  original_key: string;
  bpm: string;
  meter: string;
  form: string;
  note: string;
  link: string;
  favorite: boolean;
  updated_at: string;
}

const COLUMNS = "id, title, original_key, bpm, meter, form, note, link, favorite, updated_at";

function toSong(row: SongRow, sheets: Sheet[] = []): LibrarySong {
  return {
    id: row.id,
    title: row.title,
    originalKey: row.original_key ?? "",
    bpm: row.bpm ?? "",
    meter: row.meter ?? "4/4",
    form: row.form ?? "",
    note: row.note ?? "",
    link: row.link ?? "",
    favorite: Boolean(row.favorite),
    updatedAt: row.updated_at,
    sheets,
  };
}

/** 곡과 그 곡에 붙은 악보를 한 번에 읽는다. */
export async function listSongs(): Promise<LibrarySong[]> {
  const supabase = createClient();

  const [songs, sheets] = await Promise.all([
    supabase.from("library_songs").select(COLUMNS).order("title").limit(1000),
    supabase
      .from("sheets")
      .select("id, title, path, mime, size_bytes, created_at, song_id")
      .order("created_at"),
  ]);

  if (songs.error) throw new Error(`곡 목록을 읽지 못했습니다: ${songs.error.message}`);

  const bySong = new Map<string, Sheet[]>();
  for (const row of (sheets.data ?? []) as (Sheet & { song_id: string | null; size_bytes: number; created_at: string })[]) {
    if (!row.song_id) continue;
    const list = bySong.get(row.song_id) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      path: row.path,
      mime: row.mime,
      sizeBytes: row.size_bytes ?? 0,
      createdAt: row.created_at,
    });
    bySong.set(row.song_id, list);
  }

  return ((songs.data as SongRow[] | null) ?? []).map((row) =>
    toSong(row, bySong.get(row.id) ?? [])
  );
}

export type SongInput = Partial<Omit<LibrarySong, "id" | "updatedAt" | "sheets">> & {
  title: string;
};

function toRow(input: SongInput) {
  return {
    title: input.title.trim().slice(0, 200),
    original_key: (input.originalKey ?? "").trim().slice(0, 10),
    bpm: (input.bpm ?? "").trim().slice(0, 5),
    meter: (input.meter ?? "4/4").trim().slice(0, 10),
    form: (input.form ?? "").trim().slice(0, 200),
    note: (input.note ?? "").trim().slice(0, 2000),
    link: (input.link ?? "").trim().slice(0, 500),
    favorite: Boolean(input.favorite),
  };
}

export async function addSong(input: SongInput): Promise<LibrarySong> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("로그인이 필요합니다.");
  if (!input.title.trim()) throw new Error("곡 제목을 적어 주세요.");

  const { data, error } = await supabase
    .from("library_songs")
    .insert({ owner_id: auth.user.id, ...toRow(input) })
    .select(COLUMNS)
    .single();

  // 제목이 같으면 같은 곡으로 본다 (unique index).
  if (error?.code === "23505") throw new Error(`"${input.title.trim()}"은 이미 있습니다.`);
  if (error) throw new Error(`등록하지 못했습니다: ${error.message}`);
  return toSong(data as SongRow);
}

export async function updateSong(id: string, input: SongInput): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("library_songs").update(toRow(input)).eq("id", id);
  if (error?.code === "23505") throw new Error(`"${input.title.trim()}"은 이미 있습니다.`);
  if (error) throw new Error(`고치지 못했습니다: ${error.message}`);
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("library_songs").update({ favorite }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * 곡을 지운다. 붙어 있던 악보는 남긴다.
 *
 * 악보는 여러 곡에 다시 붙일 수 있는 파일이고, 곡을 지우려다 악보까지
 * 날리면 되돌릴 수 없다. 표 정의에서도 `on delete set null` 로 두었다.
 */
export async function deleteSong(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("library_songs").delete().eq("id", id);
  if (error) throw new Error(`지우지 못했습니다: ${error.message}`);
}

/** 이미 올린 악보를 곡에 붙이거나 뗀다. */
export async function linkSheet(sheetId: string, songId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("sheets").update({ song_id: songId }).eq("id", sheetId);
  if (error) throw new Error(`악보를 연결하지 못했습니다: ${error.message}`);
}
