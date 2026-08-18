export type Archetype = "growth" | "connection" | "planning" | "care" | "release";
export type ZodiacProfile = "beauty" | "body" | "learning" | "career" | "social" | "relationship" | "home" | "clearing" | "travel" | "creativity";

export type Rating = "low" | "excellent" | "neutral" | "good" | "caution";

export const METHOD_VERSION = "0.5";
export const PHASE_WEIGHT = 0.55;
export const ZODIAC_WEIGHT = 0.45;

export const archetypeTargets: Record<Archetype, number> = {
  growth: 90,
  connection: 150,
  planning: 60,
  care: 300,
  release: 240,
};

export const zodiacSignNames = [
  "Овне", "Тельце", "Близнецах", "Раке", "Льве", "Деве",
  "Весах", "Скорпионе", "Стрельце", "Козероге", "Водолее", "Рыбах",
] as const;

const zodiacScores: Record<ZodiacProfile, readonly number[]> = {
  beauty:       [55, 90, 65, 60, 100, 85, 95, 45, 55, 70, 65, 80],
  body:         [80, 85, 60, 95, 65, 90, 70, 60, 75, 85, 65, 100],
  learning:     [70, 60, 100, 50, 75, 95, 80, 55, 90, 85, 100, 65],
  career:       [100, 70, 90, 55, 85, 90, 75, 65, 80, 100, 95, 50],
  social:       [85, 70, 100, 80, 100, 75, 95, 70, 95, 65, 90, 75],
  relationship: [70, 75, 90, 100, 85, 80, 100, 95, 80, 65, 75, 100],
  home:         [65, 100, 70, 100, 65, 95, 75, 70, 75, 100, 65, 85],
  clearing:     [80, 75, 70, 85, 55, 100, 65, 95, 70, 100, 90, 75],
  travel:       [95, 65, 100, 60, 85, 70, 80, 65, 100, 75, 100, 70],
  creativity:   [80, 90, 90, 75, 100, 85, 100, 80, 90, 65, 95, 100],
};

export function angularDistance(angle: number, target: number) {
  return Math.abs(((angle - target + 540) % 360) - 180);
}

export function calculatePhaseScore(angle: number, archetype: Archetype) {
  const distance = angularDistance(angle, archetypeTargets[archetype]);
  const phaseMatch = (1 + Math.cos(distance * Math.PI / 180)) / 2;
  return Math.floor(100 * phaseMatch);
}

export function zodiacSignIndex(longitude: number) {
  const normalized = ((longitude % 360) + 360) % 360;
  return Math.floor(normalized / 30);
}

export function calculateZodiacScore(longitude: number, profile: ZodiacProfile) {
  return zodiacScores[profile][zodiacSignIndex(longitude)];
}

export function calculateMethodScore(
  phaseAngle: number,
  lunarLongitude: number,
  archetype: Archetype,
  zodiacProfile: ZodiacProfile,
) {
  const phaseScore = calculatePhaseScore(phaseAngle, archetype);
  const zodiacScore = calculateZodiacScore(lunarLongitude, zodiacProfile);
  return {
    phaseScore,
    zodiacScore,
    score: Math.floor(phaseScore * PHASE_WEIGHT + zodiacScore * ZODIAC_WEIGHT),
  };
}

export function ratingForScore(score: number): Rating {
  if (score >= 94) return "good";
  if (score >= 75) return "caution";
  if (score >= 35) return "neutral";
  return "low";
}

export function pickPreferredDay<T extends { score: number; dateIso: string }>(days: T[]) {
  if (days.length === 0) throw new Error("Для выбора дня нужен непустой список");
  const maximum = Math.max(...days.map((day) => day.score));
  const maximumDays = days.filter((day) => day.score === maximum);
  return [...maximumDays].sort((left, right) => left.dateIso.localeCompare(right.dateIso))[0];
}
