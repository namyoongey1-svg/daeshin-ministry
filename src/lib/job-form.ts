import { DENOMINATIONS } from "@/lib/denomination";
import { EMPLOYMENT, POSITIONS } from "@/lib/jobs";

/*
  청빙공고 양식을 읽고 확인한다.

  회원이 바로 올리는 길(/jobs/new)과 로그인 없이 접수하는 길(/jobs/submit)이
  같은 양식을 쓴다. 확인 규칙이 한곳에 있어야 두 길이 다른 것을 받지 않는다.
*/

export interface JobFormValues {
  churchName: string;
  denomination: string;
  region: string;
  address: string;
  pastor: string;
  title: string;
  position: string;
  employment: string;
  department: string;
  duties: string;
  payMin: number | null;
  payMax: number | null;
  payNote: string;
  housing: boolean;
  deadline: string;
  contactName: string;
  contactPhone: string;
}

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export function parseJobForm(formData: FormData): { error: string } | { values: JobFormValues } {
  const values: JobFormValues = {
    churchName: text(formData, "church_name"),
    denomination: text(formData, "denomination"),
    region: text(formData, "region"),
    address: text(formData, "address"),
    pastor: text(formData, "pastor"),
    title: text(formData, "title"),
    position: text(formData, "position"),
    employment: text(formData, "employment"),
    department: text(formData, "department"),
    duties: text(formData, "duties"),
    payMin: text(formData, "pay_min") ? Number(text(formData, "pay_min")) : null,
    payMax: text(formData, "pay_max") ? Number(text(formData, "pay_max")) : null,
    payNote: text(formData, "pay_note"),
    housing: formData.get("housing") === "on",
    deadline: text(formData, "deadline"),
    contactName: text(formData, "contact_name"),
    contactPhone: text(formData, "contact_phone"),
  };

  if (!values.churchName || !values.denomination || !values.region) {
    return { error: "교회 이름·교단·지역은 반드시 적어 주세요." };
  }
  if (!values.title || !values.position || !values.employment || !values.duties) {
    return { error: "제목·직분·근무 형태·사역 내용은 반드시 적어 주세요." };
  }
  if (!values.contactName || !values.contactPhone) {
    return { error: "연락처를 적어 주세요. 승인 회원에게만 보입니다." };
  }
  // 목록의 거르기가 이 값들을 그대로 쓴다. 아무 말이나 들어오면 걸러지지 않는다.
  if (!DENOMINATIONS.includes(values.denomination as never)) return { error: "교단을 목록에서 골라 주세요." };
  if (!POSITIONS.includes(values.position as never)) return { error: "직분을 목록에서 골라 주세요." };
  if (!EMPLOYMENT.includes(values.employment as never)) return { error: "근무 형태를 목록에서 골라 주세요." };

  // 스키마의 pay_disclosure 제약과 같은 규칙이다. 여기서 먼저 걸러야 사람이
  // 읽을 수 있는 말로 알려 줄 수 있다 — DB 오류 문구를 그대로 보여 줄 수는 없다.
  if ((values.payMin === null || values.payMax === null) && !values.payNote) {
    return {
      error:
        "사례비를 범위로 적어 주시거나, 비공개인 이유를 한 줄 적어 주세요. 사례비를 알 수 없는 공고는 지원하기 어렵습니다.",
    };
  }
  if (values.payMin !== null && values.payMax !== null && values.payMin > values.payMax) {
    return { error: "사례비 최소가 최대보다 큽니다." };
  }

  return { values };
}
