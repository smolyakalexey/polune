import assert from "node:assert/strict";
import test from "node:test";

import { detectCalendarProvider } from "../lib/calendar-preference.ts";

test("Apple mobile devices default to an ICS file", () => {
  assert.equal(detectCalendarProvider({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    platform: "iPhone",
    maxTouchPoints: 5,
  }), "apple");
  assert.equal(detectCalendarProvider({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 5,
  }), "apple");
});

test("Android, ChromeOS, Windows, and Linux default to Google Calendar", () => {
  assert.equal(detectCalendarProvider({
    userAgent: "Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 Chrome/143 Mobile Safari/537.36",
    platform: "Linux armv8l",
    maxTouchPoints: 5,
    userAgentDataPlatform: "Android",
  }), "google");
  assert.equal(detectCalendarProvider({ userAgent: "Chrome", platform: "Win32", maxTouchPoints: 0 }), "google");
  assert.equal(detectCalendarProvider({ userAgent: "Chrome", platform: "Linux x86_64", maxTouchPoints: 0 }), "google");
});

test("macOS Safari defaults to Apple while other Mac browsers remain ambiguous", () => {
  assert.equal(detectCalendarProvider({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 0,
  }), "apple");
  assert.equal(detectCalendarProvider({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/143 Safari/537.36",
    platform: "MacIntel",
    maxTouchPoints: 0,
  }), null);
});

test("unknown platforms keep the explicit calendar choice", () => {
  assert.equal(detectCalendarProvider({ userAgent: "Unknown", platform: "Unknown", maxTouchPoints: 0 }), null);
});
