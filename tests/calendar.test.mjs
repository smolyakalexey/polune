import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCalendarDays,
  buildTwoMonthCalendarDays,
  moscowDateIso,
  resolveRequestedCalendarDay,
} from "../lib/calendar.ts";

const intent = { archetype: "growth", zodiacProfile: "beauty" };

test("Moscow calendar day changes exactly at Moscow midnight", () => {
  assert.equal(moscowDateIso(new Date("2026-12-31T20:59:59Z")), "2026-12-31");
  assert.equal(moscowDateIso(new Date("2026-12-31T21:00:00Z")), "2027-01-01");
});

test("default recommendation range contains fourteen consecutive future dates", () => {
  const days = buildCalendarDays(intent, { now: new Date("2026-12-26T10:00:00Z") });
  assert.equal(days.length, 14);
  assert.equal(days[0].dateIso, "2026-12-26");
  assert.equal(days.at(-1).dateIso, "2027-01-08");
  assert.equal(new Set(days.map((day) => day.dateIso)).size, days.length);
});

test("future range includes leap day without skipping dates", () => {
  const days = buildCalendarDays(intent, { count: 5, now: new Date("2028-02-26T10:00:00Z") });
  assert.deepEqual(days.map((day) => day.dateIso), [
    "2028-02-26",
    "2028-02-27",
    "2028-02-28",
    "2028-02-29",
    "2028-03-01",
  ]);
});

test("expanded calendar contains exactly the current and next month", () => {
  const yearBoundary = buildTwoMonthCalendarDays(intent, new Date("2026-12-31T10:00:00Z"));
  assert.equal(yearBoundary.length, 62);
  assert.equal(yearBoundary[0].dateIso, "2026-12-01");
  assert.equal(yearBoundary.at(-1).dateIso, "2027-01-31");

  const commonFebruary = buildTwoMonthCalendarDays(intent, new Date("2027-02-15T10:00:00Z"));
  assert.equal(commonFebruary.length, 59);
  assert.equal(commonFebruary[0].dateIso, "2027-02-01");
  assert.equal(commonFebruary.at(-1).dateIso, "2027-03-31");

  const leapFebruary = buildTwoMonthCalendarDays(intent, new Date("2028-02-15T10:00:00Z"));
  assert.equal(leapFebruary.length, 60);
  assert.equal(leapFebruary.at(-1).dateIso, "2028-03-31");
});

test("URL date restoration accepts only visible current or future dates", () => {
  const calendarDays = [
    { dateIso: "2026-08-22", score: 95 },
    { dateIso: "2026-08-23", score: 80 },
    { dateIso: "2026-09-01", score: 75 },
  ];
  const recommendationDays = [
    { dateIso: "2026-08-23", score: 80 },
    { dateIso: "2026-08-24", score: 87 },
  ];

  assert.equal(
    resolveRequestedCalendarDay("2026-09-01", calendarDays, recommendationDays, "2026-08-23").dateIso,
    "2026-09-01",
  );
  assert.equal(
    resolveRequestedCalendarDay("2026-08-22", calendarDays, recommendationDays, "2026-08-23").dateIso,
    "2026-08-23",
  );
  assert.equal(
    resolveRequestedCalendarDay("2027-01-01", calendarDays, recommendationDays, "2026-08-23").dateIso,
    "2026-08-23",
  );
  assert.equal(
    resolveRequestedCalendarDay("not-a-date", calendarDays, recommendationDays, "2026-08-23").dateIso,
    "2026-08-23",
  );
});

test("calendar rejects an empty or fractional range", () => {
  assert.throws(() => buildCalendarDays(intent, { count: 0 }), /хотя бы один день/);
  assert.throws(() => buildCalendarDays(intent, { count: 2.5 }), /хотя бы один день/);
});
