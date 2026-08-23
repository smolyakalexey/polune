import assert from "node:assert/strict";
import test from "node:test";
import { EclipticGeoMoon, SunPosition } from "astronomy-engine";

import {
  BIRTH_PERIOD_MIDPOINTS,
  calculateAscendantLongitude,
  calculateNatalProfile,
  eclipticPointHorizonPosition,
  resolveLocalBirthInstant,
  resolveLocalBirthInstants,
} from "../lib/natal.ts";

test("local birth time resolves through an IANA time zone", () => {
  const instant = resolveLocalBirthInstant({
    dateIso: "1995-12-26",
    time: "15:30",
    timeZone: "Europe/Moscow",
  });
  assert.equal(instant.toISOString(), "1995-12-26T12:30:00.000Z");
});

test("daylight-saving gaps and overlaps are never guessed", () => {
  assert.equal(resolveLocalBirthInstants({
    dateIso: "2021-03-14",
    time: "02:30",
    timeZone: "America/New_York",
  }).length, 0);
  assert.equal(resolveLocalBirthInstants({
    dateIso: "2021-11-07",
    time: "01:30",
    timeZone: "America/New_York",
  }).length, 2);
});

test("birth periods have explicit, stable midpoints", () => {
  assert.deepEqual(BIRTH_PERIOD_MIDPOINTS, {
    night: "03:00",
    morning: "09:00",
    day: "15:00",
    evening: "21:00",
  });
});

test("date-only profile calculates the natal Sun without invented location", () => {
  const profile = calculateNatalProfile({ dateIso: "1995-12-26" });
  assert.equal(profile.level, "date");
  assert.equal(profile.instant.toISOString(), "1995-12-26T12:00:00.000Z");
  assert.equal(profile.natalSunLongitude, SunPosition(profile.instant).elon);
  assert.equal(profile.natalMoonLongitude, undefined);
  assert.equal(profile.ascendantLongitude, undefined);
});

test("date-only profile rejects impossible calendar dates", () => {
  assert.throws(
    () => calculateNatalProfile({ dateIso: "1995-02-30" }),
    /Некорректная дата/,
  );
});

test("approximate profile adds the Moon but not the Ascendant", () => {
  const profile = calculateNatalProfile({
    dateIso: "1995-12-26",
    period: "evening",
    timeZone: "Europe/Moscow",
  });
  assert.equal(profile.level, "approximate");
  assert.equal(profile.instant.toISOString(), "1995-12-26T18:00:00.000Z");
  assert.equal(profile.natalMoonLongitude, EclipticGeoMoon(profile.instant).lon);
  assert.equal(profile.ascendantLongitude, undefined);
});

test("Ascendant lies on the eastern horizon", () => {
  const instant = new Date("1995-12-26T12:30:00.000Z");
  const ascendant = calculateAscendantLongitude(instant, 55.7558, 37.6173);
  const horizon = eclipticPointHorizonPosition(ascendant, instant, 55.7558, 37.6173);
  assert.ok(Math.abs(horizon.altitude) < 1e-9);
  assert.ok(horizon.azimuth > 0 && horizon.azimuth < 180);
  assert.ok(ascendant >= 0 && ascendant < 360);
});

test("exact profile adds Sun, Moon, and Ascendant", () => {
  const profile = calculateNatalProfile({
    dateIso: "1995-12-26",
    time: "15:30",
    timeZone: "Europe/Moscow",
    latitude: 55.7558,
    longitude: 37.6173,
  });
  assert.equal(profile.level, "exact");
  assert.equal(profile.instant.toISOString(), "1995-12-26T12:30:00.000Z");
  assert.equal(typeof profile.natalSunLongitude, "number");
  assert.equal(typeof profile.natalMoonLongitude, "number");
  assert.equal(typeof profile.ascendantLongitude, "number");
});
