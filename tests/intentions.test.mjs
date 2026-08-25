import assert from "node:assert/strict";
import test from "node:test";

import {
  activeIntention,
  cancelIntention,
  completeIntention,
  createSavedIntention,
  intentionNeedsDecision,
  parseSavedIntentions,
  replaceActiveIntention,
  rescheduleIntention,
  withCalendarReminder,
} from "../lib/intentions.ts";

const snapshot = {
  methodVersion: "0.6",
  score: 77,
  rating: "good",
  personalizationLevel: "none",
  verdict: "лучший день для мягкого обновления",
};

function build(overrides = {}) {
  return createSavedIntention({
    id: "11111111-1111-4111-8111-111111111111",
    intentId: "haircut",
    selectedDate: "2026-08-25",
    snapshot,
    todayIso: "2026-08-24",
    now: new Date("2026-08-24T12:00:00.000Z"),
    ...overrides,
  });
}

test("creates a planned intention with an immutable recommendation snapshot", () => {
  const intention = build();
  assert.equal(intention.status, "planned");
  assert.equal(intention.selectedDate, "2026-08-25");
  assert.deepEqual(intention.reminder, { kind: "none" });
  assert.deepEqual(intention.snapshot, snapshot);
});

test("rejects past and impossible calendar dates", () => {
  assert.throws(() => build({ selectedDate: "2026-08-23" }));
  assert.throws(() => build({ selectedDate: "2026-02-30" }));
});

test("parsing skips damaged records without losing valid plans", () => {
  const valid = build();
  const parsed = parseSavedIntentions(JSON.stringify([{ broken: true }, valid]));
  assert.deepEqual(parsed, [valid]);
  assert.deepEqual(parseSavedIntentions("not-json"), []);
});

test("repeated save updates the same plan instead of duplicating it", () => {
  const original = build();
  const refreshed = build({
    snapshot: { ...snapshot, score: 80 },
    now: new Date("2026-08-24T13:00:00.000Z"),
  });
  const saved = replaceActiveIntention([original], refreshed);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, original.id);
  assert.equal(saved[0].snapshot.score, 80);
});

test("a new active plan replaces the old active plan but preserves history", () => {
  const existing = build();
  const completed = { ...build({ id: "22222222-2222-4222-8222-222222222222" }), status: "completed" };
  const next = build({
    id: "33333333-3333-4333-8333-333333333333",
    intentId: "habit",
    selectedDate: "2026-08-30",
  });
  const saved = replaceActiveIntention([completed, existing], next);
  assert.equal(saved.length, 2);
  assert.equal(activeIntention(saved)?.intentId, "habit");
  assert.equal(saved[0].status, "completed");
});

test("calendar export updates reminder metadata without changing the plan", () => {
  const intention = build();
  const updated = withCalendarReminder(intention, "apple", new Date("2026-08-24T14:00:00.000Z"));
  assert.equal(updated.id, intention.id);
  assert.equal(updated.selectedDate, intention.selectedDate);
  assert.deepEqual(updated.reminder, {
    kind: "external_calendar",
    provider: "apple",
    lastAttemptedAt: "2026-08-24T14:00:00.000Z",
  });
});

test("rescheduling records the explicit date change and resets the old reminder", () => {
  const intention = withCalendarReminder(build(), "apple", new Date("2026-08-24T13:00:00.000Z"));
  const updated = rescheduleIntention(intention, {
    selectedDate: "2026-08-28",
    snapshot: { ...snapshot, score: 61, rating: "neutral" },
    todayIso: "2026-08-24",
    now: new Date("2026-08-24T15:00:00.000Z"),
  });
  assert.equal(updated.selectedDate, "2026-08-28");
  assert.deepEqual(updated.reminder, { kind: "none" });
  assert.deepEqual(updated.dateHistory, [{
    fromDate: "2026-08-25",
    toDate: "2026-08-28",
    changedAt: "2026-08-24T15:00:00.000Z",
    reason: "user_selected",
  }]);
});

test("cancelling preserves the plan as history and removes it from active state", () => {
  const cancelled = cancelIntention(build(), new Date("2026-08-24T16:00:00.000Z"));
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.cancelledAt, "2026-08-24T16:00:00.000Z");
  assert.equal(activeIntention([cancelled]), null);
});

test("completing preserves the plan as history and removes it from active state", () => {
  const completed = completeIntention(build(), new Date("2026-08-25T10:00:00.000Z"));
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, "2026-08-25T10:00:00.000Z");
  assert.equal(activeIntention([completed]), null);
});

test("only a planned date before today requires an explicit decision", () => {
  const plan = build();
  assert.equal(intentionNeedsDecision(plan, "2026-08-24"), false);
  assert.equal(intentionNeedsDecision(plan, "2026-08-25"), false);
  assert.equal(intentionNeedsDecision(plan, "2026-08-26"), true);
  assert.equal(intentionNeedsDecision({ ...plan, status: "completed" }, "2026-08-26"), false);
});
