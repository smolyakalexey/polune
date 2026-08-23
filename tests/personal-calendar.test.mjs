import assert from "node:assert/strict";
import test from "node:test";

import { buildCalendarDays, buildTwoMonthCalendarDays } from "../lib/calendar.ts";
import {
  personalizeCalendar,
  resolvePersonalProfile,
} from "../lib/personal-calendar.ts";
import { pickPreferredDay } from "../lib/methodology.ts";

const intent = { archetype: "care", zodiacProfile: "beauty" };
const now = new Date("2026-08-23T09:00:00.000Z");

test("date-only birth data resolves to the honest lowest personalization level", () => {
  const resolved = resolvePersonalProfile({
    birthDate: "1990-09-03",
    birthTime: "",
    timeUnknown: true,
    birthTimePeriod: "",
    timeZone: "",
  });

  assert.equal(resolved.profile.level, "date");
  assert.equal(resolved.requestedLevel, "date");
  assert.equal(resolved.fellBackToDate, false);
});

test("unresolvable precise time falls back to date instead of inventing precision", () => {
  const resolved = resolvePersonalProfile({
    birthDate: "2021-11-07",
    birthTime: "01:30",
    timeUnknown: false,
    birthTimePeriod: "",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York",
  });

  assert.equal(resolved.requestedLevel, "exact");
  assert.equal(resolved.profile.level, "date");
  assert.equal(resolved.fellBackToDate, true);
});

test("personalization recalculates two months but picks only inside the 14-day window", () => {
  const recommendations = buildCalendarDays(intent, { now });
  const calendar = buildTwoMonthCalendarDays(intent, now);
  const resolved = resolvePersonalProfile({
    birthDate: "1990-09-03",
    birthTime: "08:45",
    timeUnknown: false,
    birthTimePeriod: "",
    latitude: 56.3269,
    longitude: 44.0059,
    timeZone: "Europe/Moscow",
  });
  const personalized = personalizeCalendar(calendar, recommendations, resolved.profile);

  assert.equal(personalized.calendarDays.length, calendar.length);
  assert.equal(personalized.recommendationDays.length, 14);
  assert.ok(personalized.calendarDays.every((day) => day.personalLevel === "exact"));
  assert.ok(personalized.calendarDays.every((day) => Number.isInteger(day.generalScore)));
  assert.ok(personalized.calendarDays.every((day) => Number.isInteger(day.personalScore)));
  assert.ok(personalized.recommendationDays.some((day) => day.dateIso === personalized.preferredDate));
  assert.equal(pickPreferredDay(personalized.recommendationDays).dateIso, personalized.preferredDate);
  assert.deepEqual(
    personalized.calendarDays.filter((day) => day.isPreferred).map((day) => day.dateIso),
    [personalized.preferredDate],
  );
});
