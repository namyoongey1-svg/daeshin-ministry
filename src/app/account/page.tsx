import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import ProfileForm from "./ProfileForm";
import { signOut } from "./actions";

/** 메일 주소가 없을 때 대신 보여 줄 이름 */
const PROVIDER_LABEL: Record<string, string> = {
  kakao: "카카오 계정",
  google: "구글 계정",
};

const STATUS_NOTE: Record<string, string> = {
  대기: "운영진이 소속 교회와 교단을 확인한 뒤 승인합니다. 보통 하루 안에 끝납니다.",
  승인: "승인되었습니다. 청빙공고의 교회 연락처를 볼 수 있습니다.",
  거절: "가입이 반려되었습니다. 소속 확인이 필요하면 운영진에게 문의해 주세요.",
};

export default async function AccountPage() {
  if (!getSupabaseEnv()) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold">내 정보</h1>
        <p className="mt-4 rounded border border-dashed border-line p-5 text-sm leading-relaxed text-muted">
          Supabase를 아직 연결하지 않아 로그인 기능이 꺼져 있습니다.
          <br />
          <code className="text-xs">.env.local</code> 에 프로젝트 URL과 anon key를 넣으면 켜집니다.
        </p>
      </div>
    );
  }

  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold">내 정보</h1>
        <p className="mt-4 text-sm text-muted">
          <Link href="/login" className="text-accent hover:underline">로그인</Link>
          이 필요합니다.
        </p>
      </div>
    );
  }

  const { profile } = session;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-bold">내 정보</h1>
      <p className="mt-1 text-sm text-muted">
        {session.email ?? PROVIDER_LABEL[session.provider ?? ""] ?? "로그인함"}
      </p>

      {/*
        카카오는 이메일을 선택 동의로 받는다. 동의하지 않았으면 주소가 없는데,
        그대로 두면 알림을 켜 놓고 아무것도 못 받게 된다. 미리 알려 둔다.
      */}
      {!session.email && (
        <p className="mt-3 rounded border border-line bg-sunken px-3 py-2 text-xs leading-relaxed text-muted">
          이 계정에는 <b>메일 주소가 없습니다.</b> 콘티 저장과 로그인은 그대로
          되지만, 새 공고 알림은 메일로 가므로 받을 수 없습니다. 알림까지
          받으시려면 메일 주소로 한 번 더 로그인해 주세요.
        </p>
      )}

      {!profile ? (
        <>
          <p className="mt-4 text-sm leading-relaxed">
            대신 교단 사역자인지 확인하기 위해 소속을 적어 주세요.
          </p>
          <ProfileForm />
        </>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-medium">
                {profile.status}
              </span>
              <span className="text-xs text-muted">{profile.role}</span>
            </div>
            <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-y-1 text-sm">
              <dt className="text-muted">이름</dt><dd>{profile.name}</dd>
              <dt className="text-muted">소속 교회</dt><dd>{profile.church_name}</dd>
              <dt className="text-muted">교단</dt><dd>{profile.presbytery}</dd>
              <dt className="text-muted">직분</dt><dd>{profile.position}</dd>
              {profile.phone && (<><dt className="text-muted">연락처</dt><dd>{profile.phone}</dd></>)}
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">
              {STATUS_NOTE[profile.status]}
            </p>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted hover:text-accent">
              소속 정보 고치기
            </summary>
            <ProfileForm profile={profile} />
          </details>
        </>
      )}

      <form action={signOut} className="mt-6">
        <button className="text-sm text-muted hover:text-highlight">로그아웃</button>
      </form>
    </div>
  );
}
