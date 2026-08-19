import { requireChatGPTUser } from "@/app/chatgpt-auth";
import ProfileForm from "./profile-form";
import type { ProfileDraft } from "./profile-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

async function AuthenticatedProfile({ returnTo, initial }: { returnTo: string; initial: ProfileDraft }) {
  const user = await requireChatGPTUser(returnTo);
  return <ProfileForm displayName={user.displayName} email={user.email} initial={initial} />;
}

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initial: ProfileDraft = {
    zodiac: first(params.zodiac),
    birthDate: first(params.birth_date),
    birthTime: first(params.birth_time),
    birthPlace: first(params.birth_place),
    timeUnknown: first(params.time_unknown) !== "0",
  };
  const query = new URLSearchParams();
  if (initial.zodiac) query.set("zodiac", initial.zodiac);
  if (initial.birthDate) query.set("birth_date", initial.birthDate);
  if (initial.birthTime) query.set("birth_time", initial.birthTime);
  if (initial.birthPlace) query.set("birth_place", initial.birthPlace);
  query.set("time_unknown", initial.timeUnknown ? "1" : "0");
  const returnTo = `/profile?${query.toString()}`;

  return <AuthenticatedProfile returnTo={returnTo} initial={initial} />;
}
