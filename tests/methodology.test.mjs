import assert from "node:assert/strict";
import test from "node:test";
import { MoonPhase } from "astronomy-engine";

import {
  angularDistance,
  archetypeTargets,
  calculatePhaseScore,
  pickPreferredDay,
  ratingForScore,
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
  assert.equal(ratingForScore(92), "good");
  assert.equal(ratingForScore(91), "caution");
  assert.equal(ratingForScore(70), "caution");
  assert.equal(ratingForScore(69), "neutral");
  assert.equal(ratingForScore(30), "neutral");
  assert.equal(ratingForScore(29), "low");
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

test("every rolling 14-day window has varied ratings and no all-red period", () => {
  const start = new Date(Date.UTC(2026, 0, 1, 12));

  for (const archetype of Object.keys(archetypeTargets)) {
    const ratings = Array.from({ length: 730 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return ratingForScore(calculatePhaseScore(MoonPhase(date), archetype));
    });

    for (let index = 0; index <= ratings.length - 14; index += 1) {
      const window = ratings.slice(index, index + 14);
      assert.ok(window.some((rating) => rating !== "low"), `${archetype} has an all-low window at ${index}`);
      assert.ok(new Set(window).size >= 2, `${archetype} has a visually uniform window at ${index}`);
      assert.ok(window.filter((rating) => rating === "good").length <= 6, `${archetype} has too many good days at ${index}`);
    }
  }
});
