export type Archetype = "growth" | "connection" | "planning" | "care" | "release";

export type Rating = "low" | "excellent" | "neutral" | "good" | "caution";

export const METHOD_VERSION = "0.4";

export const archetypeTargets: Record<Archetype, number> = {
  growth: 90,
  connection: 150,
  planning: 60,
  care: 300,
  release: 240,
};

export function angularDistance(angle: number, target: number) {
  return Math.abs(((angle - target + 540) % 360) - 180);
}

export function calculatePhaseScore(angle: number, archetype: Archetype) {
  const distance = angularDistance(angle, archetypeTargets[archetype]);
  const phaseMatch = (1 + Math.cos(distance * Math.PI / 180)) / 2;
  return Math.floor(100 * phaseMatch);
}

export function ratingForScore(score: number): Rating {
  if (score >= 92) return "good";
  if (score >= 70) return "caution";
  if (score >= 30) return "neutral";
  return "low";
}

export function pickPreferredDay<T extends { score: number; dateIso: string }>(days: T[]) {
  if (days.length === 0) throw new Error("Для выбора дня нужен непустой список");
  const maximum = Math.max(...days.map((day) => day.score));
  const maximumDays = days.filter((day) => day.score === maximum);
  return [...maximumDays].sort((left, right) => left.dateIso.localeCompare(right.dateIso))[0];
}
