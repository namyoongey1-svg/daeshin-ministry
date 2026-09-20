"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  error?: string;
}

/** 가입 정보를 저장한다. 승인은 운영진이 따로 한다. */
export async function saveProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "로그인이 필요합니다." };

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const name = text("name");
  const churchName = text("church_name");
  const presbytery = text("presbytery");
  const position = text("position");

  if (!name || !churchName || !presbytery || !position) {
    return { error: "이름·소속 교회·노회·직분은 모두 적어 주세요." };
  }

  const { error } = await supabase.from("profiles").upsert({
    id: auth.user.id,
    name,
    phone: text("phone") || null,
    church_name: churchName,
    presbytery,
    position,
  });

  if (error) return { error: error.message };

  revalidatePath("/account");
  return {};
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  revalidatePath("/", "layout");
}
