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
  email: string;
  userId: string;
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
    email: data.user.email ?? "",
    userId: data.user.id,
    profile: (profile as Profile | null) ?? null,
  };
}

export function isApproved(session: Session | null): boolean {
  return session?.profile?.status === "승인";
}

export function isAdmin(session: Session | null): boolean {
  return session?.profile?.role === "운영진" && session.profile.status === "승인";
}
