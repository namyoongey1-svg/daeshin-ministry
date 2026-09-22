import "server-only";
import { createClient } from "./supabase/server";

export type MemberRole = "사역자" | "교회" | "운영진";
export type MemberStatus = "대기" | "승인" | "거절";

export interface Profile {
  id: string;
  name: string;
  phone: string | null;
  church_name: string;
  presbytery: string;
  position: string;
  role: MemberRole;
  status: MemberStatus;
}

export interface Session {
  /**
   * 메일 주소가 없을 수 있다.
   *
   * 카카오는 이메일을 선택 동의 항목으로 두어, 동의하지 않으면 주소가 오지
   * 않는다. 콘티 저장에는 필요 없지만 공고 알림은 메일로 가므로, 없는 채로
   * 두면 알림을 켜 놓고 아무것도 못 받는 일이 생긴다.
   */
  email: string | null;
  userId: string;
  /** 어느 것으로 들어왔는가 — kakao / google / email */
  provider: string | null;
  /** 가입 정보를 아직 안 냈으면 null */
  profile: Profile | null;
}

/** 로그인하지 않았거나 Supabase를 연결하지 않았으면 null. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, phone, church_name, presbytery, position, role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    email: data.user.email ?? null,
    userId: data.user.id,
    provider: (data.user.app_metadata?.provider as string | undefined) ?? null,
    profile: (profile as Profile | null) ?? null,
  };
}

export function isApproved(session: Session | null): boolean {
  return session?.profile?.status === "승인";
}

export function isAdmin(session: Session | null): boolean {
  return session?.profile?.role === "운영진" && session.profile.status === "승인";
}
