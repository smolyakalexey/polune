import { EclipticGeoMoon, MoonPhase } from "astronomy-engine";

import {
  angularDistance,
  annotatePreferredDays,
  archetypeTargets,
  calculateMethodScore,
  pickPreferredDay,
  ratingForScore,
  zodiacSignIndex,
  zodiacSignNames,
} from "./methodology.ts";
import type { Archetype, Rating, ZodiacProfile } from "./methodology.ts";

export type CalendarIntent = {
  archetype: Archetype;
  zodiacProfile: ZodiacProfile;
};

export type CalendarDay = {
  id: string;
  dateIso: string;
  day: string;
  weekday: string;
  longDate: string;
  monthLabel: string;
  score: number;
  phaseScore: number;
  zodiacScore: number;
  rating: Rating;
  isPreferred: boolean;
  moonPhaseAngle: number;
  moonPhaseLabel: string;
  targetPhaseAngle: number;
  phaseDistance: number;
  lunarLongitude: number;
  zodiacSignName: string;
};

const DAY_IN_MILLISECONDS = 86_400_000;

export function currentMoscowDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day"), 12));
}

export function moscowDateIso(now = new Date()) {
  return currentMoscowDate(now).toISOString().slice(0, 10);
}

export function buildCalendarDays(
  intent: CalendarIntent,
  options: { count?: number; fromMonthStart?: boolean; now?: Date } = {},
): CalendarDay[] {
  const { count = 14, fromMonthStart = false, now = new Date() } = options;
  if (!Number.isInteger(count) || count < 1) throw new Error("Диапазон календаря должен содержать хотя бы один день");

  const anchor = currentMoscowDate(now);
  if (fromMonthStart) anchor.setUTCDate(1);
  const calculatedDays = Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(anchor.getUTCDate() + index);
    const day = String(date.getUTCDate());
    const dateIso = date.toISOString().slice(0, 10);
    const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", "");
    const monthLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })
      .formatToParts(date)
      .find((part) => part.type === "month")?.value ?? "";
    const moonPhaseAngle = MoonPhase(date);
    const lunarLongitude = EclipticGeoMoon(date).lon;
    const { score, phaseScore, zodiacScore } = calculateMethodScore(
      moonPhaseAngle,
      lunarLongitude,
      intent.archetype,
      intent.zodiacProfile,
    );
    const moonPhaseLabel = moonPhaseAngle < 15 || moonPhaseAngle >= 345
      ? "новолуние"
      : moonPhaseAngle < 165
        ? "растущая луна"
        : moonPhaseAngle < 195
          ? "полнолуние"
          : "убывающая луна";
    return {
      id: dateIso,
      dateIso,
      day,
      weekday,
      longDate: `${day} ${monthLabel}, ${weekday}`,
      monthLabel: `${monthLabel}, ${weekday}`,
      score,
      phaseScore,
      zodiacScore,
      rating: ratingForScore(score),
      moonPhaseAngle,
      moonPhaseLabel,
      targetPhaseAngle: archetypeTargets[intent.archetype],
      phaseDistance: angularDistance(moonPhaseAngle, archetypeTargets[intent.archetype]),
      lunarLongitude,
      zodiacSignName: zodiacSignNames[zodiacSignIndex(lunarLongitude)],
    };
  });
  return annotatePreferredDays(calculatedDays);
}

export function buildTwoMonthCalendarDays(intent: CalendarIntent, now = new Date()) {
  const firstDay = currentMoscowDate(now);
  firstDay.setUTCDate(1);
  const lastDayOfNextMonth = new Date(Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 2, 0, 12));
  const count = Math.round((lastDayOfNextMonth.getTime() - firstDay.getTime()) / DAY_IN_MILLISECONDS) + 1;
  return buildCalendarDays(intent, { count, fromMonthStart: true, now });
}

export function resolveRequestedCalendarDay<T extends { dateIso: string; score: number }>(
  requestedDate: string | null,
  calendarDays: T[],
  recommendationDays: T[],
  todayIso: string,
) {
  return calendarDays.find((day) => day.dateIso === requestedDate && day.dateIso >= todayIso)
    ?? pickPreferredDay(recommendationDays);
}
