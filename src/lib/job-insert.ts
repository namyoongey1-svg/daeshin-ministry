import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobFormValues } from "./job-form";

/*
  공고를 실제로 넣는 길. 회원이 직접 올릴 때도, 운영진이 접수된 글을 게시할
  때도 여기를 지난다. 서버 액션 파일에 두지 않는 까닭은, "use server" 파일의
  export 는 전부 바깥에서 부를 수 있는 끝점이 되기 때문이다.
*/

/**
 * 교회를 찾거나 만들고 공고를 넣는다. 회원이 직접 올릴 때도, 운영진이 접수된
 * 글을 게시할 때도 이 길을 지난다. created_by 는 넣는 사람이다 — RLS 가 그렇게
 * 요구하고, 누가 올렸는지 남아야 해서다.
 */
export async function insertJobPost(
  supabase: SupabaseClient,
  v: JobFormValues,
  userId: string
): Promise<{ error: string } | { id: string }> {
  // 같은 이름·지역의 교회가 이미 있으면 그것을 쓴다.
  const { data: found } = await supabase
    .from("churches")
    .select("id")
    .eq("name", v.churchName)
    .eq("region", v.region)
    .maybeSingle();

  let churchId = found?.id as string | undefined;

  if (!churchId) {
    const { data: made, error: churchError } = await supabase
      .from("churches")
      .insert({
        name: v.churchName,
        presbytery: v.denomination,
        denomination: v.denomination,
        region: v.region,
        address: v.address || null,
        pastor: v.pastor || null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (churchError) return { error: churchError.message };
    churchId = made.id as string;
  }

  const { data: post, error } = await supabase
    .from("job_posts")
    .insert({
      church_id: churchId,
      title: v.title,
      position: v.position,
      employment: v.employment,
      department: v.department || null,
      region: v.region,
      duties: v.duties,
      pay_min: v.payMin,
      pay_max: v.payMax,
      pay_note: v.payNote,
      housing: v.housing,
      deadline: v.deadline || null,
      contact_name: v.contactName,
      contact_phone: v.contactPhone,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: post.id as string };
}
