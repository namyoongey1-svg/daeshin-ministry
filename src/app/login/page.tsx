import LoginForm from "./LoginForm";

/** 로그인 뒤 돌아갈 곳. 바깥 주소로 튕기지 않게 우리 경로만 받는다. */
function safeNext(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  return /^\/(?!\/)/.test(raw) ? raw : undefined;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  // /auth/callback 이 실패하면 이유를 여기로 넘겨 준다.
  const error = typeof params.error === "string" ? params.error : undefined;

  return <LoginForm initialError={error} next={safeNext(params.next)} />;
}
