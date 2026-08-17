import assert from "node:assert/strict";
import test from "node:test";

import {
  angularDistance,
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
  assert.equal(calculatePhaseScore(120, "growth"), 76);
  assert.equal(calculatePhaseScore(180, "growth"), 6);
  assert.equal(calculatePhaseScore(270, "growth"), 0);
});

test("status thresholds are stable", () => {
  assert.equal(ratingForScore(100), "good");
  assert.equal(ratingForScore(80), "good");
  assert.equal(ratingForScore(79), "caution");
  assert.equal(ratingForScore(60), "caution");
  assert.equal(ratingForScore(59), "neutral");
  assert.equal(ratingForScore(40), "neutral");
  assert.equal(ratingForScore(39), "low");
});

test("nearest date wins among results within five points of maximum", () => {
  const result = pickPreferredDay([
    { dateIso: "2026-08-15", score: 92 },
    { dateIso: "2026-08-16", score: 96 },
    { dateIso: "2026-08-17", score: 99 },
  ]);
  assert.equal(result.dateIso, "2026-08-16");
});
