import assert from "node:assert/strict";
import test from "node:test";

import {
  PERSONAL_FACTOR_WEIGHTS,
  blendPersonalScore,
  calculateAspectScore,
  calculateNatalAspectScore,
  calculatePersonalFactor,
  calculatePersonalizedDayScore,
} from "../lib/personal-methodology.ts";

test("aspect anchors and interpolation are deterministic", () => {
  assert.equal(calculateAspectScore(0), 85);
  assert.equal(calculateAspectScore(30), 60);
  assert.equal(calculateAspectScore(120), 100);
  assert.equal(calculateAspectScore(180), 25);
  assert.equal(calculateAspectScore(15), 73);
  assert.equal(calculateAspectScore(45), 75);
});

test("natal aspect uses the shortest angular distance", () => {
  assert.equal(calculateNatalAspectScore(350, 10), calculateAspectScore(20));
  assert.equal(calculateNatalAspectScore(10, 350), calculateAspectScore(20));
});

test("personal data levels progressively add natal factors", () => {
  const date = calculatePersonalFactor(0, {
    level: "date",
    natalSunLongitude: 0,
  });
  const approximate = calculatePersonalFactor(0, {
    level: "approximate",
    natalSunLongitude: 0,
    natalMoonLongitude: 120,
  });
  const exact = calculatePersonalFactor(0, {
    level: "exact",
    natalSunLongitude: 0,
    natalMoonLongitude: 120,
    ascendantLongitude: 180,
  });

  assert.deepEqual(date, { score: 85, sunScore: 85 });
  assert.deepEqual(approximate, { score: 91, sunScore: 85, moonScore: 100 });
  assert.deepEqual(exact, {
    score: 75,
    sunScore: 85,
    moonScore: 100,
    ascendantScore: 25,
  });
});

test("missing inputs fail instead of silently inventing precision", () => {
  assert.throws(
    () => calculatePersonalFactor(0, { level: "approximate", natalSunLongitude: 0 }),
    /натальная Луна/,
  );
  assert.throws(
    () => calculatePersonalFactor(0, {
      level: "exact",
      natalSunLongitude: 0,
      natalMoonLongitude: 120,
    }),
    /Асцендент/,
  );
});

test("personal influence grows by level without forcing a date change", () => {
  assert.deepEqual(PERSONAL_FACTOR_WEIGHTS, {
    date: 0.2,
    approximate: 0.3,
    exact: 0.35,
  });
  assert.equal(blendPersonalScore(50, 100, "date"), 60);
  assert.equal(blendPersonalScore(50, 100, "approximate"), 65);
  assert.equal(blendPersonalScore(50, 100, "exact"), 67);
  assert.equal(blendPersonalScore(72, 72, "exact"), 72);
});

test("day score exposes its factors for a future explanation", () => {
  assert.deepEqual(calculatePersonalizedDayScore(50, 0, {
    level: "exact",
    natalSunLongitude: 0,
    natalMoonLongitude: 120,
    ascendantLongitude: 180,
  }), {
    score: 58,
    generalScore: 50,
    personalWeight: 0.35,
    sunScore: 85,
    moonScore: 100,
    ascendantScore: 25,
  });
});
