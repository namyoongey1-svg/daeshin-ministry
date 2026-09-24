"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeAlertInput } from "@/lib/alerts";

export interface ActionResult {
  error?: string;
}

/** 알림 조건을 하나 추가한다. 같은 조건을 두 번 담지는 않는다. */
export async function addAlert(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "로그인이 필요합니다." };

  const input = normalizeAlertInput({
    region: String(formData.get("region") ?? ""),
    denomination: String(formData.get("denomination") ?? ""),
    position: String(formData.get("position") ?? ""),
    employment: String(formData.get("employment") ?? ""),
  });

  const { data: existing } = await supabase
    .from("job_alerts")
    .select("id")
    .eq("profile_id", auth.user.id)
    .is("region", input.region)
    .is("denomination", input.denomination)
    .is("position", input.position)
    .is("employment", input.employment)
    .maybeSingle();

  if (existing) return { error: "같은 조건이 이미 있습니다." };

  const { error } = await supabase.from("job_alerts").insert({
    profile_id: auth.user.id,
    ...input,
    // 지금부터 올라오는 것만 받는다. 지난 공고를 몰아 보내지 않는다.
    last_notified_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath("/alerts");
  return {};
}

export async function toggleAlert(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const { error } = await supabase.from("job_alerts").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/alerts");
  return {};
}

export async function removeAlert(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const { error } = await supabase.from("job_alerts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/alerts");
  return {};
}
