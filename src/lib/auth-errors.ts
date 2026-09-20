/**
 * Supabase가 돌려주는 인증 오류를 사역자가 읽을 수 있는 말로 바꾼다.
 *
 * 원문은 영어이고 "invalid flow state" 같은 내부 용어가 그대로 나온다.
 * 무엇을 해야 하는지까지 적어 준다.
 */

interface Explained {
  message: string;
  /** 메일을 다시 받으면 풀리는 문제인가 */
  resend: boolean;
}

const RULES: [RegExp, Explained][] = [
  [
    /flow state.*expired|flow state has expired/i,
    {
      message:
        "로그인 링크가 만료되었습니다. 보안을 위해 메일을 받은 뒤 5분 안에 눌러야 합니다. 다시 받아 주세요.",
      resend: true,
    },
  ],
  [
    /email link is invalid or has expired|otp_expired|token has expired/i,
    {
      message: "링크가 이미 사용되었거나 만료되었습니다. 메일을 다시 받아 주세요.",
      resend: true,
    },
  ],
  [
    /code verifier|flow state not found|invalid request.*code/i,
    {
      message:
        "메일을 요청한 브라우저에서 링크를 열어야 합니다. 이 컴퓨터에서 메일을 열고 다시 눌러 주세요.",
      resend: true,
    },
  ],
  [
    /rate limit|too many requests|over_email_send_rate_limit/i,
    {
      message:
        "메일 발송 한도를 넘었습니다. 잠시 뒤에 다시 시도해 주세요. (무료 플랜은 시간당 2통입니다)",
      resend: false,
    },
  ],
  [
    /you can only request this after (\d+) seconds?/i,
    { message: "방금 보냈습니다. 잠시 뒤에 다시 눌러 주세요.", resend: false },
  ],
  [
    /invalid email|unable to validate email/i,
    { message: "메일 주소를 다시 확인해 주세요.", resend: false },
  ],
  [
    /signups not allowed|signup is disabled/i,
    { message: "지금은 가입이 막혀 있습니다. 운영진에게 문의해 주세요.", resend: false },
  ],
];

export function explainAuthError(raw: string | null | undefined): Explained | null {
  if (!raw) return null;
  for (const [pattern, explained] of RULES) {
    if (pattern.test(raw)) return explained;
  }
  // 모르는 오류는 원문을 그대로 보여 준다. 숨기면 고칠 수가 없다.
  return { message: raw, resend: false };
}
