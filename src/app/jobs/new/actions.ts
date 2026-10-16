"use server";

import { revalidatePath } from "next/cache";
import { parseJobForm, type JobFormValues } from "@/lib/job-form";
import { insertJobPost } from "@/lib/job-insert";
import { createClient } from "@/lib/supabase/server";
import type { PostedJob } from "@/lib/crosspost";

export interface PostResult {
  error?: string;
  ok?: boolean;
  /** 방금 올린 내용. 다른 게시판에 붙일 글을 만드는 데 쓴다. */
  posted?: PostedJob;
}

/**
 * 교회를 등록하고 그 교회로 청빙공고를 올린다.
 *
 * 둘을 한 번에 받는다. 교회를 먼저 만들고 공고를 따로 쓰게 하면, 교회만
 * 등록해 두고 공고는 안 올리는 일이 생긴다. 이미 등록한 교회면 그것을 쓰고,
 * 없으면 만든다.
 */
export async function createJobPost(formData: FormData): Promise<PostResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "로그인이 필요합니다." };

  const parsed = parseJobForm(formData);
  if ("error" in parsed) return parsed;

  const result = await insertJobPost(supabase, parsed.values, auth.user.id);
  if ("error" in result) return result;

  revalidatePath("/jobs");
  revalidatePath("/jobs/new");
  return { ok: true, posted: toPosted(parsed.values) };
}

function toPosted(v: JobFormValues): PostedJob {
  return {
    church: v.churchName,
    denomination: v.denomination,
    region: v.region,
    address: v.address,
    pastor: v.pastor,
    title: v.title,
    position: v.position,
    employment: v.employment,
    department: v.department,
    duties: v.duties,
    payMin: v.payMin,
    payMax: v.payMax,
    payNote: v.payNote,
    housing: v.housing,
    deadline: v.deadline,
    contactName: v.contactName,
    contactPhone: v.contactPhone,
  };
}
