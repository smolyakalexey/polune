import { EclipticGeoMoon, MoonPhase } from "astronomy-engine";

import { intentCatalog } from "../lib/intent-catalog.ts";
import { intentZodiacProfiles } from "../lib/intent-profiles.ts";
import {
  calculateMethodScore,
  pickPreferredDay,
  ratingForScore,
} from "../lib/methodology.ts";
import { calculatePersonalizedDayScore } from "../lib/personal-methodology.ts";

const DAY_COUNT = 730;
const WINDOW_LENGTH = 14;
const start = new Date(Date.UTC(2026, 0, 1, 12));

const astronomy = Array.from({ length: DAY_COUNT }, (_, index) => {
  const date = new Date(start);
  date.setUTCDate(start.getUTCDate() + index);
  return {
    dateIso: date.toISOString().slice(0, 10),
    phase: MoonPhase(date),
    longitude: EclipticGeoMoon(date).lon,
  };
});

const sunGrid = Array.from({ length: 12 }, (_, index) => index * 30);
const profiles = {
  date: sunGrid.map((natalSunLongitude) => ({
    level: "date",
    natalSunLongitude,
  })),
  approximate: sunGrid.flatMap((natalSunLongitude) => [0, 60, 120, 180, 240, 300].map((offset) => ({
    level: "approximate",
    natalSunLongitude,
    natalMoonLongitude: (natalSunLongitude + offset) % 360,
  }))),
  exact: sunGrid.flatMap((natalSunLongitude) => [0, 60, 120, 180, 240, 300].flatMap((moonOffset) => (
    [0, 90, 180, 270].map((ascendantOffset) => ({
      level: "exact",
      natalSunLongitude,
      natalMoonLongitude: (natalSunLongitude + moonOffset) % 360,
      ascendantLongitude: (natalSunLongitude + ascendantOffset) % 360,
    }))
  ))),
};

function preferredDate(scores, windowStart) {
  return pickPreferredDay(scores.slice(windowStart, windowStart + WINDOW_LENGTH)).dateIso;
}

const result = {};

for (const [level, levelProfiles] of Object.entries(profiles)) {
  let scoreComparisons = 0;
  let changedScores = 0;
  let changedRatings = 0;
  let totalAbsoluteDelta = 0;
  let recommendationComparisons = 0;
  let changedRecommendations = 0;

  for (const intent of intentCatalog) {
    const generalScores = astronomy.map((day) => ({
      dateIso: day.dateIso,
      score: calculateMethodScore(
        day.phase,
        day.longitude,
        intent.archetype,
        intentZodiacProfiles[intent.id],
      ).score,
    }));

    const generalPreferredDates = Array.from(
      { length: DAY_COUNT - WINDOW_LENGTH + 1 },
      (_, windowStart) => preferredDate(generalScores, windowStart),
    );

    for (const profile of levelProfiles) {
      const personalScores = astronomy.map((day, index) => ({
        dateIso: day.dateIso,
        score: calculatePersonalizedDayScore(
          generalScores[index].score,
          day.longitude,
          profile,
        ).score,
      }));

      for (let day = 0; day < DAY_COUNT; day += 1) {
        const general = generalScores[day].score;
        const personal = personalScores[day].score;
        scoreComparisons += 1;
        totalAbsoluteDelta += Math.abs(personal - general);
        if (personal !== general) changedScores += 1;
        if (ratingForScore(personal) !== ratingForScore(general)) changedRatings += 1;
      }

      for (let windowStart = 0; windowStart <= DAY_COUNT - WINDOW_LENGTH; windowStart += 1) {
        recommendationComparisons += 1;
        if (preferredDate(personalScores, windowStart) !== generalPreferredDates[windowStart]) {
          changedRecommendations += 1;
        }
      }
    }
  }

  result[level] = {
    profiles: levelProfiles.length,
    scoreChangedPercent: Number((changedScores / scoreComparisons * 100).toFixed(1)),
    averageAbsoluteDelta: Number((totalAbsoluteDelta / scoreComparisons).toFixed(2)),
    ratingChangedPercent: Number((changedRatings / scoreComparisons * 100).toFixed(1)),
    recommendationChangedPercent: Number((changedRecommendations / recommendationComparisons * 100).toFixed(1)),
    recommendationConfirmedPercent: Number(((1 - changedRecommendations / recommendationComparisons) * 100).toFixed(1)),
  };
}

console.log(JSON.stringify({
  period: `${astronomy[0].dateIso}..${astronomy.at(-1).dateIso}`,
  intents: intentCatalog.length,
  windowLength: WINDOW_LENGTH,
  result,
}, null, 2));
