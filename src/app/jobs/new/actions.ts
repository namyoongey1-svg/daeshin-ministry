"use server";

import { revalidatePath } from "next/cache";
import { DENOMINATIONS } from "@/lib/denomination";
import { EMPLOYMENT, POSITIONS } from "@/lib/jobs";
import { createClient } from "@/lib/supabase/server";

export interface PostResult {
  error?: string;
  ok?: boolean;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

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

  const churchName = text(formData, "church_name");
  const denomination = text(formData, "denomination");
  const region = text(formData, "region");
  const title = text(formData, "title");
  const position = text(formData, "position");
  const employment = text(formData, "employment");
  const duties = text(formData, "duties");
  const contactName = text(formData, "contact_name");
  const contactPhone = text(formData, "contact_phone");

  if (!churchName || !denomination || !region) {
    return { error: "교회 이름·교단·지역은 반드시 적어 주세요." };
  }
  if (!title || !position || !employment || !duties) {
    return { error: "제목·직분·근무 형태·사역 내용은 반드시 적어 주세요." };
  }
  if (!contactName || !contactPhone) {
    return { error: "연락처를 적어 주세요. 승인 회원에게만 보입니다." };
  }
  // 목록의 거르기가 이 값들을 그대로 쓴다. 아무 말이나 들어오면 걸러지지 않는다.
  if (!DENOMINATIONS.includes(denomination as never)) return { error: "교단을 목록에서 골라 주세요." };
  if (!POSITIONS.includes(position as never)) return { error: "직분을 목록에서 골라 주세요." };
  if (!EMPLOYMENT.includes(employment as never)) return { error: "근무 형태를 목록에서 골라 주세요." };

  const payMinRaw = text(formData, "pay_min");
  const payMaxRaw = text(formData, "pay_max");
  const payNote = text(formData, "pay_note");
  const payMin = payMinRaw ? Number(payMinRaw) : null;
  const payMax = payMaxRaw ? Number(payMaxRaw) : null;

  // 스키마의 pay_disclosure 제약과 같은 규칙이다. 여기서 먼저 걸러야 사람이
  // 읽을 수 있는 말로 알려 줄 수 있다 — DB 오류 문구를 그대로 보여 줄 수는 없다.
  if ((payMin === null || payMax === null) && !payNote) {
    return {
      error:
        "사례비를 범위로 적어 주시거나, 비공개인 이유를 한 줄 적어 주세요. 사례비를 알 수 없는 공고는 지원하기 어렵습니다.",
    };
  }
  if (payMin !== null && payMax !== null && payMin > payMax) {
    return { error: "사례비 최소가 최대보다 큽니다." };
  }

  // 같은 이름·지역의 교회가 이미 있으면 그것을 쓴다.
  const { data: found } = await supabase
    .from("churches")
    .select("id")
    .eq("name", churchName)
    .eq("region", region)
    .maybeSingle();

  let churchId = found?.id as string | undefined;

  if (!churchId) {
    const { data: made, error: churchError } = await supabase
      .from("churches")
      .insert({
        name: churchName,
        presbytery: denomination,
        denomination,
        region,
        address: text(formData, "address") || null,
        pastor: text(formData, "pastor") || null,
        created_by: auth.user.id,
      })
      .select("id")
      .single();

    if (churchError) return { error: churchError.message };
    churchId = made.id as string;
  }

  const deadline = text(formData, "deadline");
  const { error } = await supabase.from("job_posts").insert({
    church_id: churchId,
    title,
    position,
    employment,
    department: text(formData, "department") || null,
    region,
    duties,
    pay_min: payMin,
    pay_max: payMax,
    pay_note: payNote,
    housing: formData.get("housing") === "on",
    deadline: deadline || null,
    contact_name: contactName,
    contact_phone: contactPhone,
    created_by: auth.user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath("/jobs/new");
  return { ok: true };
}
