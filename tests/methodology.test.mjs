import assert from "node:assert/strict";
import test from "node:test";
import { EclipticGeoMoon, MoonPhase } from "astronomy-engine";
import { intentCatalog } from "../lib/intent-catalog.ts";
import { intentZodiacProfiles } from "../lib/intent-profiles.ts";

import {
  angularDistance,
  calculateMethodScore,
  calculatePhaseScore,
  calculateZodiacScore,
  pickPreferredDay,
  ratingForScore,
  zodiacSignIndex,
} from "../lib/methodology.ts";

test("angular distance wraps around zero", () => {
  assert.equal(angularDistance(350, 10), 20);
  assert.equal(angularDistance(10, 350), 20);
});

test("phase score is focused around the target and continuous", () => {
  assert.equal(calculatePhaseScore(90, "growth"), 100);
  assert.equal(calculatePhaseScore(120, "growth"), 93);
  assert.equal(calculatePhaseScore(180, "growth"), 50);
  assert.equal(calculatePhaseScore(270, "growth"), 0);
});

test("status thresholds are stable", () => {
  assert.equal(ratingForScore(100), "good");
  assert.equal(ratingForScore(94), "good");
  assert.equal(ratingForScore(93), "caution");
  assert.equal(ratingForScore(75), "caution");
  assert.equal(ratingForScore(74), "neutral");
  assert.equal(ratingForScore(35), "neutral");
  assert.equal(ratingForScore(34), "low");
});

test("zodiac longitude wraps into twelve signs", () => {
  assert.equal(zodiacSignIndex(-1), 11);
  assert.equal(zodiacSignIndex(0), 0);
  assert.equal(zodiacSignIndex(29.99), 0);
  assert.equal(zodiacSignIndex(30), 1);
  assert.equal(zodiacSignIndex(359.99), 11);
  assert.equal(zodiacSignIndex(360), 0);
  assert.equal(calculateZodiacScore(120, "beauty"), 100);
});

test("method score combines phase and zodiac factors", () => {
  const result = calculateMethodScore(90, 120, "growth", "beauty");
  assert.deepEqual(result, { phaseScore: 100, zodiacScore: 100, score: 100 });

  const mixed = calculateMethodScore(90, 0, "growth", "beauty");
  assert.deepEqual(mixed, { phaseScore: 100, zodiacScore: 55, score: 79 });
});

test("highest score wins before date proximity", () => {
  const result = pickPreferredDay([
    { dateIso: "2026-08-15", score: 92 },
    { dateIso: "2026-08-16", score: 96 },
    { dateIso: "2026-08-17", score: 99 },
  ]);
  assert.equal(result.dateIso, "2026-08-17");
});

test("nearest date breaks an exact score tie", () => {
  const result = pickPreferredDay([
    { dateIso: "2026-08-16", score: 99 },
    { dateIso: "2026-08-15", score: 99 },
  ]);
  assert.equal(result.dateIso, "2026-08-15");
});

test("catalog calendars stay varied across rolling 14-day windows", () => {
  const start = new Date(Date.UTC(2026, 0, 1, 12));
  const astronomy = Array.from({ length: 730 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return { phase: MoonPhase(date), longitude: EclipticGeoMoon(date).lon };
  });
  let monotonicWindows = 0;
  let totalWindows = 0;
  const currentProfiles = new Set();

  for (const intent of intentCatalog) {
    const scores = astronomy.map(({ phase, longitude }) => {
      return calculateMethodScore(phase, longitude, intent.archetype, intentZodiacProfiles[intent.id]).score;
    });
    currentProfiles.add(scores.slice(229, 243).join(","));

    for (let index = 0; index <= scores.length - 14; index += 1) {
      const window = scores.slice(index, index + 14);
      const ratings = window.map(ratingForScore);
      const isIncreasing = window.every((score, day) => day === 0 || score >= window[day - 1]);
      const isDecreasing = window.every((score, day) => day === 0 || score <= window[day - 1]);
      totalWindows += 1;
      if (isIncreasing || isDecreasing) monotonicWindows += 1;

      assert.ok(ratings.some((rating) => rating !== "low"), `${intent.id} has an all-low window at ${index}`);
      assert.ok(ratings.filter((rating) => rating === "good").length <= 5, `${intent.id} has too many good days at ${index}`);
      assert.ok(Math.max(...window) - Math.min(...window) >= 12, `${intent.id} has a flat score window at ${index}`);
    }
  }

  assert.ok(currentProfiles.size >= 18, `catalog has only ${currentProfiles.size} distinct current profiles`);
  assert.ok(monotonicWindows / totalWindows < 0.005, "too many calendars are simple rising or falling gradients");
});
