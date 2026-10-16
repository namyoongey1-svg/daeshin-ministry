"use server";

import { revalidatePath } from "next/cache";
import { getSession, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { insertJobPost } from "@/lib/job-insert";

/*
  접수된 공고를 운영진이 처리한다. 게시하면 교회를 찾거나 만들고 job_posts 에
  옮긴다 — 회원이 직접 올릴 때와 같은 길이다. created_by 는 게시한 운영진이다.
*/

async function adminClient() {
  const session = await getSession();
  if (!isAdmin(session)) return null;
  const supabase = await createClient();
  if (!supabase || !session) return null;
  return { supabase, userId: session.userId };
}

export async function approveSubmission(formData: FormData): Promise<void> {
  const ctx = await adminClient();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: s } = await ctx.supabase.from("job_submissions").select("*").eq("id", id).maybeSingle();
  if (!s || s.status !== "대기") return;

  const made = await insertJobPost(
    ctx.supabase,
    {
      churchName: s.church_name,
      denomination: s.denomination,
      region: s.region,
      address: s.address ?? "",
      pastor: s.pastor ?? "",
      title: s.title,
      position: s.position,
      employment: s.employment,
      department: s.department ?? "",
      duties: s.duties,
      payMin: s.pay_min,
      payMax: s.pay_max,
      payNote: s.pay_note,
      housing: s.housing,
      deadline: s.deadline ?? "",
      contactName: s.contact_name,
      contactPhone: s.contact_phone,
    },
    ctx.userId
  );
  if ("error" in made) return;

  await ctx.supabase
    .from("job_submissions")
    .update({ status: "게시", job_post_id: made.id })
    .eq("id", id);

  revalidatePath("/jobs");
  revalidatePath("/jobs/submissions");
}

export async function rejectSubmission(formData: FormData): Promise<void> {
  const ctx = await adminClient();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await ctx.supabase.from("job_submissions").update({ status: "거절" }).eq("id", id);
  revalidatePath("/jobs/submissions");
}
