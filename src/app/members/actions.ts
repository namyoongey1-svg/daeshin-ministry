"use server";

import { revalidatePath } from "next/cache";
import { getSession, isAdmin, type MemberRole, type MemberStatus } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/*
  회원 승인. 운영진만 부른다.

  가입은 누구나 하지만 승인 회원이 되어야 청빙공고의 교회 연락처를 보고 글을
  올린다. 운영진이 소속 교회·교단을 보고 사람인지 확인한 뒤 승인한다.
  거절해도 계정은 남는다 — 소속을 고쳐 다시 신청할 수 있어야 한다.
*/

const STATUSES: MemberStatus[] = ["대기", "승인", "거절"];
const ROLES: MemberRole[] = ["사역자", "교회", "운영진"];

async function admin() {
  const session = await getSession();
  if (!isAdmin(session) || !session) return null;
  const supabase = await createClient();
  return supabase ? { supabase, me: session.userId } : null;
}

export async function setMemberStatus(formData: FormData): Promise<void> {
  const ctx = await admin();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as MemberStatus;
  if (!id || !STATUSES.includes(status)) return;
  await ctx.supabase.from("profiles").update({ status }).eq("id", id);
  revalidatePath("/members");
}

/** 운영진을 더 세우거나 내린다. 자기 자신은 내리지 못한다 — 마지막 운영진이 사라지면 아무도 승인을 못 한다. */
export async function setMemberRole(formData: FormData): Promise<void> {
  const ctx = await admin();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as MemberRole;
  if (!id || !ROLES.includes(role) || id === ctx.me) return;
  await ctx.supabase.from("profiles").update({ role }).eq("id", id);
  revalidatePath("/members");
}
