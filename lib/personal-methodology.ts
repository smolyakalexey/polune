import { angularDistance } from "./methodology.ts";

export const PERSONAL_METHOD_VERSION = "0.7p";

export type PersonalizationLevel = "date" | "approximate" | "exact";

export const PERSONAL_FACTOR_WEIGHTS: Record<PersonalizationLevel, number> = {
  date: 0.2,
  approximate: 0.3,
  exact: 0.35,
};

const ASPECT_SCORE_ANCHORS = [
  { distance: 0, score: 85 },
  { distance: 30, score: 60 },
  { distance: 60, score: 90 },
  { distance: 90, score: 35 },
  { distance: 120, score: 100 },
  { distance: 150, score: 55 },
  { distance: 180, score: 25 },
] as const;

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function calculateAspectScore(distance: number) {
  const normalized = Math.max(0, Math.min(180, distance));

  for (let index = 1; index < ASPECT_SCORE_ANCHORS.length; index += 1) {
    const left = ASPECT_SCORE_ANCHORS[index - 1];
    const right = ASPECT_SCORE_ANCHORS[index];
    if (normalized <= right.distance) {
      const progress = (normalized - left.distance) / (right.distance - left.distance);
      return Math.round(left.score + (right.score - left.score) * progress);
    }
  }

  return ASPECT_SCORE_ANCHORS.at(-1)!.score;
}

export function calculateNatalAspectScore(dailyMoonLongitude: number, natalLongitude: number) {
  return calculateAspectScore(angularDistance(dailyMoonLongitude, natalLongitude));
}

export type PersonalProfile = {
  level: PersonalizationLevel;
  natalSunLongitude: number;
  natalMoonLongitude?: number;
  ascendantLongitude?: number;
};

export function calculatePersonalFactor(dailyMoonLongitude: number, profile: PersonalProfile) {
  const sunScore = calculateNatalAspectScore(dailyMoonLongitude, profile.natalSunLongitude);

  if (profile.level === "date") {
    return { score: sunScore, sunScore };
  }

  if (profile.natalMoonLongitude === undefined) {
    throw new Error("Для персонализации по времени нужна натальная Луна");
  }

  const moonScore = calculateNatalAspectScore(dailyMoonLongitude, profile.natalMoonLongitude);
  if (profile.level === "approximate") {
    return {
      score: Math.floor(sunScore * 0.55 + moonScore * 0.45),
      sunScore,
      moonScore,
    };
  }

  if (profile.ascendantLongitude === undefined) {
    throw new Error("Для точной персонализации нужен Асцендент");
  }

  const ascendantScore = calculateNatalAspectScore(dailyMoonLongitude, profile.ascendantLongitude);
  return {
    score: Math.floor(sunScore * 0.4 + moonScore * 0.35 + ascendantScore * 0.25),
    sunScore,
    moonScore,
    ascendantScore,
  };
}

export function blendPersonalScore(
  generalScore: number,
  personalScore: number,
  level: PersonalizationLevel,
) {
  const personalWeight = PERSONAL_FACTOR_WEIGHTS[level];
  return Math.floor(
    clampScore(generalScore) * (1 - personalWeight)
      + clampScore(personalScore) * personalWeight,
  );
}

export function calculatePersonalizedDayScore(
  generalScore: number,
  dailyMoonLongitude: number,
  profile: PersonalProfile,
) {
  const personal = calculatePersonalFactor(dailyMoonLongitude, profile);
  return {
    ...personal,
    generalScore: clampScore(generalScore),
    personalScore: personal.score,
    personalWeight: PERSONAL_FACTOR_WEIGHTS[profile.level],
    score: blendPersonalScore(generalScore, personal.score, profile.level),
  };
}
