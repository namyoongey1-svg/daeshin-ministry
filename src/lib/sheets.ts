"use client";

import { createClient } from "@/lib/supabase/client";

/*
  악보 보관함.

  파일은 브라우저에서 Supabase Storage 로 곧장 올린다. 서버 액션을 거치지
  않는 이유가 있다 — 서버 액션 요청은 기본 1MB 에서 잘리는데, 악보 PDF 는
  그보다 큰 일이 흔하다. 어차피 누가 무엇을 올릴 수 있는지는 Storage 정책이
  정하므로(경로 첫 칸이 자기 uuid), 서버를 한 번 더 거칠 이유도 없다.
*/

export const BUCKET = "sheets";
export const MAX_BYTES = 20 * 1024 * 1024;
export const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export interface Sheet {
  id: string;
  title: string;
  path: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
}

interface SheetRow {
  id: string;
  title: string;
  path: string;
  mime: string;
  size_bytes: number;
  created_at: string;
}

function toSheet(row: SheetRow): Sheet {
  return {
    id: row.id,
    title: row.title,
    path: row.path,
    mime: row.mime,
    sizeBytes: row.size_bytes ?? 0,
    createdAt: row.created_at,
  };
}

export async function listSheets(): Promise<Sheet[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sheets")
    .select("id, title, path, mime, size_bytes, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(`악보 목록을 읽지 못했습니다: ${error.message}`);
  return (data as SheetRow[] | null)?.map(toSheet) ?? [];
}

function extensionOf(file: File): string {
  const known: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  return known[file.type] ?? "bin";
}

/** 확장자를 뗀 파일 이름. 대부분 곡 제목이 그대로 들어 있다. */
function titleFrom(file: File): string {
  return file.name.replace(/\.[^.]+$/, "").trim().slice(0, 200) || "악보";
}

export async function uploadSheet(file: File): Promise<Sheet> {
  if (file.size > MAX_BYTES) {
    throw new Error(`파일이 너무 큽니다 (${Math.round(file.size / 1024 / 1024)}MB). 20MB까지 됩니다.`);
  }
  if (!ACCEPT.split(",").includes(file.type)) {
    throw new Error("PDF 또는 이미지(PNG·JPG·WEBP)만 올릴 수 있습니다.");
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("로그인이 필요합니다.");

  // 경로 첫 칸이 본인 uuid 여야 Storage 정책을 통과한다.
  const path = `${auth.user.id}/${crypto.randomUUID()}.${extensionOf(file)}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(`올리지 못했습니다: ${upErr.message}`);

  const { data, error } = await supabase
    .from("sheets")
    .insert({
      owner_id: auth.user.id,
      title: titleFrom(file),
      path,
      mime: file.type,
      size_bytes: file.size,
    })
    .select("id, title, path, mime, size_bytes, created_at")
    .single();

  if (error) {
    // 표에 못 적었으면 올린 파일도 치운다. 안 그러면 아무도 모르는 파일이 남는다.
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(`악보를 등록하지 못했습니다: ${error.message}`);
  }

  return toSheet(data as SheetRow);
}

export async function renameSheet(id: string, title: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("sheets")
    .update({ title: title.trim().slice(0, 200) || "악보" })
    .eq("id", id);
  if (error) throw new Error(`이름을 바꾸지 못했습니다: ${error.message}`);
}

export async function deleteSheet(sheet: Sheet): Promise<void> {
  const supabase = createClient();
  // 파일을 먼저 지운다. 표만 남으면 고아 파일보다 고치기 쉽다.
  await supabase.storage.from(BUCKET).remove([sheet.path]);
  const { error } = await supabase.from("sheets").delete().eq("id", sheet.id);
  if (error) throw new Error(`지우지 못했습니다: ${error.message}`);
}

/** 화면에서 열어 볼 때 쓰는 한시적 주소. 버킷이 비공개라 서명이 필요하다. */
export async function sheetUrl(path: string, seconds = 3600): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

/** PDF 로 묶을 때 쓰는 원본 바이트 */
export async function sheetBytes(path: string): Promise<Uint8Array> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`악보를 내려받지 못했습니다: ${error?.message ?? path}`);
  return new Uint8Array(await data.arrayBuffer());
}
