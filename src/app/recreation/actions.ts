"use server";

import { revalidatePath } from "next/cache";
import { AGE_GROUPS, CATEGORIES, PLACES } from "@/lib/recreation";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
  id?: string;
}

/** 승인 회원인지 확인하고 사용자 id를 돌려준다. */
async function requireApproved() {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." as const };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "로그인이 필요합니다." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.status !== "승인") {
    return { error: "운영진 승인을 받은 뒤에 글을 쓸 수 있습니다." as const };
  }
  return { supabase, userId: auth.user.id };
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** 비워 두면 null. "상관없음"을 숫자 0으로 저장하면 거르기가 틀어진다. */
function number(form: FormData, key: string): number | null {
  const raw = text(form, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

export async function addRecreation(formData: FormData): Promise<ActionResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };
  const { supabase, userId } = gate;

  const title = text(formData, "title");
  const body = text(formData, "body");
  if (!title || !body) return { error: "제목과 진행 방법은 적어 주세요." };

  const category = text(formData, "category") || "기타";
  const place = text(formData, "place") || "상관없음";
  const ageGroup = text(formData, "age_group") || "전체";
  // 목록의 거르기가 이 값들을 그대로 쓴다. 아무 말이나 들어오면 걸러지지 않는다.
  if (!CATEGORIES.includes(category as never)) return { error: "갈래를 목록에서 골라 주세요." };
  if (!PLACES.includes(place as never)) return { error: "장소를 목록에서 골라 주세요." };
  if (!AGE_GROUPS.includes(ageGroup as never)) return { error: "대상을 목록에서 골라 주세요." };

  const min = number(formData, "min_people");
  const max = number(formData, "max_people");
  if (min && max && min > max) return { error: "최소 인원이 최대 인원보다 많습니다." };

  const { data, error } = await supabase
    .from("recreations")
    .insert({
      author_id: userId,
      title,
      category,
      min_people: min,
      max_people: max,
      place,
      minutes: number(formData, "minutes"),
      age_group: ageGroup,
      supplies: text(formData, "supplies"),
      body,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/recreation");
  return { id: data.id as string };
}

/**
 * 해 봤어요 표시를 켜고 끈다.
 *
 * 누가 눌렀는지는 화면에 내보내지 않는다. 몇 명이 해 봤는지만 세면 되고,
 * 누가 무엇을 했는지까지 남길 이유가 없다.
 */
export async function toggleLike(id: string, on: boolean): Promise<ActionResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };
  const { supabase, userId } = gate;

  const { error } = on
    ? await supabase.from("recreation_likes").upsert({ recreation_id: id, profile_id: userId })
    : await supabase
        .from("recreation_likes")
        .delete()
        .eq("recreation_id", id)
        .eq("profile_id", userId);

  if (error) return { error: error.message };
  revalidatePath("/recreation");
  revalidatePath(`/recreation/${id}`);
  return {};
}

export async function removeRecreation(id: string): Promise<ActionResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };

  const { error } = await gate.supabase.from("recreations").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/recreation");
  return {};
}
