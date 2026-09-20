import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  // /auth/callback 이 실패하면 이유를 여기로 넘겨 준다.
  const error = typeof params.error === "string" ? params.error : undefined;

  return <LoginForm initialError={error} />;
}
