"use server";

import { createClient } from "@/lib/supabase/server";
import { MAX_SONGS, reviveSetlist, setlistTitle, type Setlist } from "@/lib/setlist";

/**
 * 콘티를 계정에 저장한다.
 *
 * 서버 액션은 화면을 거치지 않고도 부를 수 있는 입구다. 로그인 확인과
 * 값 검사를 여기서 한 번 더 한다. 어느 줄을 고칠지는 브라우저가 정하지만
 * 그 줄이 누구 것인지는 RLS(`owner_id = auth.uid()`)가 정한다.
 */

export interface SetlistSummary {
  id: string;
  title: string;
  serviceDate: string | null;
  songCount: number;
  updatedAt: string;
}

export interface SaveResult {
  id?: string;
  error?: string;
}

const NOT_CONNECTED = "Supabase가 연결되지 않았습니다.";
const NEED_LOGIN = "로그인이 필요합니다.";

/** 한 사람이 가질 수 있는 콘티 수. 실수로 반복 저장되는 것을 막는 선이다. */
const MAX_PER_USER = 200;

async function authed() {
  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONNECTED } as const;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: NEED_LOGIN } as const;

  return { supabase, userId: data.user.id } as const;
}

export interface SaveState {
  signedIn: boolean;
  items: SetlistSummary[];
}

/**
 * 저장 칸이 스스로 물어보는 상태.
 *
 * 이걸 화면 쪽에서 미리 읽어 넘기면 콘티 화면 전체가 요청마다 새로 그려지는
 * 쪽으로 바뀐다. 로그인하지 않은 사람에게도 매번 인증 서버를 다녀오게 되는데,
 * 이 도구의 쓸모는 열자마자 쓸 수 있다는 것이다. 화면은 미리 만들어 두고,
 * 저장 칸만 뒤늦게 채운다.
 */
export async function getSaveState(): Promise<SaveState> {
  const session = await authed();
  if ("error" in session) return { signedIn: false, items: [] };
  return { signedIn: true, items: await listSetlists() };
}

/** 내 콘티 목록. 본문(data)은 빼고 목록에 필요한 것만 읽는다. */
export async function listSetlists(): Promise<SetlistSummary[]> {
  const session = await authed();
  if ("error" in session) return [];

  const { data, error } = await session.supabase
    .from("setlists")
    .select("id, title, service_date, song_count, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    serviceDate: row.service_date ? String(row.service_date) : null,
    songCount: Number(row.song_count) || 0,
    updatedAt: String(row.updated_at),
  }));
}

/** 한 건을 통째로 읽는다. 내 것이 아니면 RLS가 빈 값을 돌려준다. */
export async function loadSetlist(id: string): Promise<Setlist | null> {
  const session = await authed();
  if ("error" in session) return null;

  const { data, error } = await session.supabase
    .from("setlists")
    .select("data")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return reviveSetlist(data.data);
}

/**
 * 새로 저장하거나 이미 저장한 것을 덮어쓴다.
 *
 * `id` 는 브라우저가 "어느 줄"인지만 알려 주는 값이다. 내용은 무엇이 오든
 * reviveSetlist 로 걸러 다시 만들고, 주인은 서버가 아는 로그인 정보로 넣는다.
 */
export async function saveSetlist(id: string | null, raw: unknown): Promise<SaveResult> {
  const session = await authed();
  if ("error" in session) return { error: session.error };

  const setlist = reviveSetlist(raw);
  const filled = setlist.songs.filter((s) => s.title.trim());
  if (filled.length === 0) return { error: "곡을 한 곡이라도 적어야 저장됩니다." };

  const row = {
    owner_id: session.userId,
    title: setlistTitle(setlist),
    service_date: setlist.date || null,
    song_count: Math.min(filled.length, MAX_SONGS),
    data: setlist,
  };

  if (id) {
    const { error } = await session.supabase.from("setlists").update(row).eq("id", id);
    if (error) return { error: error.message };
    return { id };
  }

  const { count } = await session.supabase
    .from("setlists")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_PER_USER) {
    return { error: `저장은 ${MAX_PER_USER}개까지입니다. 지난 콘티를 지우고 다시 해 주세요.` };
  }

  const { data, error } = await session.supabase
    .from("setlists")
    .insert(row)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: String(data.id) };
}

export async function deleteSetlist(id: string): Promise<SaveResult> {
  const session = await authed();
  if ("error" in session) return { error: session.error };

  const { error } = await session.supabase.from("setlists").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
