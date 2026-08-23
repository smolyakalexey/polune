import type { CalendarDay } from "./calendar.ts";
import { calculateNatalProfile } from "./natal.ts";
import type { BirthTimePeriod } from "./natal.ts";
import {
  calculatePersonalizedDayScore,
} from "./personal-methodology.ts";
import type {
  PersonalProfile,
  PersonalizationLevel,
} from "./personal-methodology.ts";
import { pickPreferredDay, ratingForScore } from "./methodology.ts";

export type SavedBirthData = {
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  birthTimePeriod: BirthTimePeriod | "";
  latitude?: number;
  longitude?: number;
  timeZone: string;
};

export type ResolvedPersonalProfile = {
  profile: PersonalProfile;
  requestedLevel: PersonalizationLevel;
  fellBackToDate: boolean;
};

export type PersonalizedCalendarDay = CalendarDay & {
  personalLevel: PersonalizationLevel;
  generalScore: number;
  personalScore: number;
  personalWeight: number;
  sunScore: number;
  moonScore?: number;
  ascendantScore?: number;
};

function requestedLevelFor(data: SavedBirthData): PersonalizationLevel {
  if (!data.timeUnknown && data.birthTime) return "exact";
  if (data.timeUnknown && data.birthTimePeriod) return "approximate";
  return "date";
}

export function resolvePersonalProfile(data: SavedBirthData): ResolvedPersonalProfile {
  const requestedLevel = requestedLevelFor(data);

  try {
    const calculated = calculateNatalProfile({
      dateIso: data.birthDate,
      time: requestedLevel === "exact" ? data.birthTime : undefined,
      period: requestedLevel === "approximate" ? data.birthTimePeriod || undefined : undefined,
      timeZone: requestedLevel === "date" ? undefined : data.timeZone || undefined,
      latitude: requestedLevel === "exact" ? data.latitude : undefined,
      longitude: requestedLevel === "exact" ? data.longitude : undefined,
    });
    return {
      profile: calculated,
      requestedLevel,
      fellBackToDate: false,
    };
  } catch {
    if (requestedLevel === "date") throw new Error("Не удалось рассчитать профиль по дате рождения");
    return {
      profile: calculateNatalProfile({ dateIso: data.birthDate }),
      requestedLevel,
      fellBackToDate: true,
    };
  }
}

export function personalizeDay(day: CalendarDay, profile: PersonalProfile): PersonalizedCalendarDay {
  const personal = calculatePersonalizedDayScore(day.score, day.lunarLongitude, profile);
  return {
    ...day,
    score: personal.score,
    rating: ratingForScore(personal.score),
    personalLevel: profile.level,
    generalScore: personal.generalScore,
    personalScore: personal.personalScore,
    personalWeight: personal.personalWeight,
    sunScore: personal.sunScore,
    moonScore: personal.moonScore,
    ascendantScore: personal.ascendantScore,
  };
}

export function personalizeCalendar(
  calendarDays: CalendarDay[],
  recommendationDays: CalendarDay[],
  profile: PersonalProfile,
) {
  if (recommendationDays.length === 0) throw new Error("Для персональной рекомендации нужны ближайшие дни");

  const personalizedRecommendations = recommendationDays.map((day) => personalizeDay(day, profile));
  const preferredDate = pickPreferredDay(personalizedRecommendations).dateIso;
  const recommendationDateSet = new Set(recommendationDays.map((day) => day.dateIso));
  const recommendationByDate = new Map(personalizedRecommendations.map((day) => [day.dateIso, day]));
  const personalizedCalendar = calendarDays.map((day) => {
    const personalized = recommendationByDate.get(day.dateIso) ?? personalizeDay(day, profile);
    return {
      ...personalized,
      isPreferred: recommendationDateSet.has(day.dateIso) && day.dateIso === preferredDate,
    };
  });

  return {
    preferredDate,
    recommendationDays: personalizedRecommendations.map((day) => ({
      ...day,
      isPreferred: day.dateIso === preferredDate,
    })),
    calendarDays: personalizedCalendar,
  };
}
