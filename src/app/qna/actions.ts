"use server";

import { revalidatePath } from "next/cache";
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

export async function askQuestion(formData: FormData): Promise<ActionResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };

  const topic = String(formData.get("topic") ?? "기타").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (title.length < 4) return { error: "제목을 조금 더 적어 주세요." };
  if (body.length < 10) return { error: "내용을 조금 더 적어 주세요." };

  const { data, error } = await gate.supabase
    .from("questions")
    .insert({ author_id: gate.userId, topic, title, body })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/qna");
  return { id: data.id as string };
}

export async function answerQuestion(
  questionId: string,
  formData: FormData
): Promise<ActionResult> {
  const gate = await requireApproved();
  if ("error" in gate) return { error: gate.error };

  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 5) return { error: "답변을 조금 더 적어 주세요." };

  const { error } = await gate.supabase
    .from("answers")
    .insert({ question_id: questionId, author_id: gate.userId, body });

  if (error) return { error: error.message };
  revalidatePath(`/qna/${questionId}`);
  revalidatePath("/qna");
  return {};
}

/** 본인 글만 지운다. 정책이 막아 주지만 화면에서도 본인 것만 보인다. */
export async function deleteQuestion(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/qna");
  return {};
}

export async function deleteAnswer(id: string, questionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase가 연결되지 않았습니다." };

  const { error } = await supabase.from("answers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/qna/${questionId}`);
  return {};
}
