import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { personalizationProfiles } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const zodiacSigns = new Set([
  "овен", "телец", "близнецы", "рак", "лев", "дева",
  "весы", "скорпион", "стрелец", "козерог", "водолей", "рыбы",
]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  const body = await request.json().catch(() => null) as null | Record<string, unknown>;
  const zodiac = typeof body?.zodiac === "string" ? body.zodiac.toLowerCase() : "";
  const birthDate = typeof body?.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate) ? body.birthDate : null;
  const birthTime = typeof body?.birthTime === "string" && /^\d{2}:\d{2}$/.test(body.birthTime) ? body.birthTime : null;
  const birthPlace = typeof body?.birthPlace === "string" ? body.birthPlace.trim().slice(0, 80) || null : null;
  const timeUnknown = body?.timeUnknown !== false;

  if (!zodiacSigns.has(zodiac)) {
    return NextResponse.json({ error: "Выберите знак зодиака" }, { status: 400 });
  }

  const db = await getDb();
  await db.insert(personalizationProfiles).values({
    userId: user.id,
    email: user.email,
    zodiac,
    birthDate,
    birthTime: timeUnknown ? null : birthTime,
    birthPlace,
    timeUnknown,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: personalizationProfiles.userId,
    set: {
      email: user.email,
      zodiac,
      birthDate,
      birthTime: timeUnknown ? null : birthTime,
      birthPlace,
      timeUnknown,
      updatedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
