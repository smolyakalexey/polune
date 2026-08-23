export const birthZodiacSigns = [
  { name: "овен", symbol: "♈︎" },
  { name: "телец", symbol: "♉︎" },
  { name: "близнецы", symbol: "♊︎" },
  { name: "рак", symbol: "♋︎" },
  { name: "лев", symbol: "♌︎" },
  { name: "дева", symbol: "♍︎" },
  { name: "весы", symbol: "♎︎" },
  { name: "скорпион", symbol: "♏︎" },
  { name: "стрелец", symbol: "♐︎" },
  { name: "козерог", symbol: "♑︎" },
  { name: "водолей", symbol: "♒︎" },
  { name: "рыбы", symbol: "♓︎" },
] as const;

export function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join(".");
}

export function birthDateInputFromIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : formatBirthDateInput(value);
}

export function parseBirthDateInput(value: string, today = new Date()) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900) return null;
  const candidate = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) return null;
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  if (candidate > todayUtc) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function zodiacForBirthDate(dateIso: string) {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) return null;
  const monthDay = Number(match[1]) * 100 + Number(match[2]);
  const index = monthDay >= 1222 || monthDay <= 119 ? 9
    : monthDay <= 218 ? 10
      : monthDay <= 320 ? 11
        : monthDay <= 419 ? 0
          : monthDay <= 520 ? 1
            : monthDay <= 620 ? 2
              : monthDay <= 722 ? 3
                : monthDay <= 822 ? 4
                  : monthDay <= 922 ? 5
                    : monthDay <= 1022 ? 6
                      : monthDay <= 1121 ? 7
                        : 8;
  return birthZodiacSigns[index];
}

export function formatBirthTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length < 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidBirthTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

export function normalizeBirthPlace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidBirthPlace(value: string) {
  const normalized = normalizeBirthPlace(value);
  return normalized.length >= 2
    && normalized.length <= 80
    && /^[\p{L}\s.'’()-]+$/u.test(normalized);
}

export function formatPersonalizationSummary(data: {
  zodiac: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeUnknown: boolean;
}) {
  const date = birthDateInputFromIso(data.birthDate);
  const details = [date, data.zodiac];
  if (data.timeUnknown) details.push("время неизвестно");
  else if (data.birthTime) details.push(data.birthTime);
  if (data.birthPlace) details.push(data.birthPlace);
  return details.filter(Boolean).join(" · ");
}
