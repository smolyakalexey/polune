import assert from "node:assert/strict";
import test from "node:test";

import { resolveCalendarSheetGesture } from "../lib/calendar-sheet.ts";

test("an upward swipe expands the compact calendar from any content position", () => {
  assert.equal(resolveCalendarSheetGesture({ expanded: false, deltaY: -60, startScrollTop: 0 }), "expand");
  assert.equal(resolveCalendarSheetGesture({ expanded: false, deltaY: 60, startScrollTop: 0 }), null);
});

test("a downward swipe collapses only when expanded content starts at the top", () => {
  assert.equal(resolveCalendarSheetGesture({ expanded: true, deltaY: 60, startScrollTop: 0 }), "collapse");
  assert.equal(resolveCalendarSheetGesture({ expanded: true, deltaY: 60, startScrollTop: 12 }), null);
  assert.equal(resolveCalendarSheetGesture({ expanded: true, deltaY: -60, startScrollTop: 0 }), null);
});

test("short movements remain ordinary taps or scrolls", () => {
  assert.equal(resolveCalendarSheetGesture({ expanded: false, deltaY: -20, startScrollTop: 0 }), null);
  assert.equal(resolveCalendarSheetGesture({ expanded: true, deltaY: 20, startScrollTop: 0 }), null);
});
