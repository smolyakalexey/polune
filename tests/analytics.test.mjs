import assert from "node:assert/strict";
import test from "node:test";

import { ANALYTICS_EVENT_NAMES } from "../lib/analytics-events.ts";

test("analytics event names are unique", () => {
  assert.equal(new Set(ANALYTICS_EVENT_NAMES).size, ANALYTICS_EVENT_NAMES.length);
});

test("analytics covers the main product and personalization funnels", () => {
  for (const eventName of [
    "page_view",
    "intent_selected",
    "reveal_viewed",
    "result_viewed",
    "personalization_started",
    "personalization_completed",
    "calendar_expanded",
    "calendar_options_opened",
    "calendar_ics_prepared",
    "calendar_google_opened",
    "calendar_google_blocked",
    "intention_saved",
    "intention_viewed",
    "intention_replaced",
    "intention_reminder_opened",
    "second_intention_attempted",
    "result_shared",
  ]) {
    assert.ok(ANALYTICS_EVENT_NAMES.includes(eventName));
  }
});
