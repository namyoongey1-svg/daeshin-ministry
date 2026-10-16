"use server";

import { parseJobForm } from "@/lib/job-form";
import { createClient } from "@/lib/supabase/server";
import type { PostResult } from "../new/actions";

/**
 * 로그인 없이 공고를 접수한다. 바로 올라가지 않고 운영진이 확인한 뒤 게시한다.
 *
 * 로그인이 없으니 누가 보냈는지는 연락처뿐이다. 그래서 봇이 넣은 글을 거르는
 * 빈칸(website)을 하나 둔다 — 사람은 안 보이는 칸이라 비워 두고, 기계는 채운다.
 * 채워져 있으면 넣지 않고 넣은 척만 한다.
 */
export async function submitJob(formData: FormData): Promise<PostResult> {
  if (String(formData.get("website") ?? "")) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const parsed = parseJobForm(formData);
  if ("error" in parsed) return parsed;
  const v = parsed.values;

  const { error } = await supabase.from("job_submissions").insert({
    church_name: v.churchName,
    denomination: v.denomination,
    region: v.region,
    address: v.address || null,
    pastor: v.pastor || null,
    title: v.title,
    position: v.position,
    employment: v.employment,
    department: v.department || null,
    duties: v.duties,
    pay_min: v.payMin,
    pay_max: v.payMax,
    pay_note: v.payNote,
    housing: v.housing,
    deadline: v.deadline || null,
    contact_name: v.contactName,
    contact_phone: v.contactPhone,
  });

  if (error) return { error: "접수하지 못했습니다. 잠시 뒤 다시 보내 주세요." };
  return { ok: true };
}
