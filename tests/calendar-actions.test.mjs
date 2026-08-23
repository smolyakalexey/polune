import assert from "node:assert/strict";
import test from "node:test";

import { buildGoogleCalendarUrl, buildIcsCalendarEvent } from "../lib/calendar-actions.ts";

const event = {
  dateIso: "2026-12-31",
  intentId: "haircut",
  intentLabel: "постричься, обновить образ",
  description: "80 из 100; хороший день",
  resultUrl: "https://example.com/?intent=haircut&date=2026-12-31",
  createdAt: new Date("2026-08-23T12:34:56Z"),
};

test("ICS contains an all-day event with an exclusive next-day end", () => {
  const ics = buildIcsCalendarEvent(event);
  const unfolded = ics.replace(/\r\n /g, "");
  assert.match(unfolded, /DTSTART;VALUE=DATE:20261231\r\n/);
  assert.match(unfolded, /DTEND;VALUE=DATE:20270101\r\n/);
  assert.match(unfolded, /DTSTAMP:20260823T123456Z\r\n/);
  assert.match(unfolded, /UID:polune-haircut-2026-12-31@polune\.local\r\n/);
  assert.match(unfolded, /SUMMARY:polune — постричься\\, обновить образ\r\n/);
  assert.match(unfolded, /DESCRIPTION:80 из 100\\; хороший день\r\n/);
  for (const line of ics.split("\r\n")) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `ICS line exceeds 75 bytes: ${line}`);
  }
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
});

test("Google Calendar URL carries the same all-day event", () => {
  const url = buildGoogleCalendarUrl(event);
  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.pathname, "/calendar/render");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("dates"), "20261231/20270101");
  assert.equal(url.searchParams.get("text"), "polune — постричься, обновить образ");
  assert.equal(url.searchParams.get("details"), `${event.description}\n${event.resultUrl}`);
  assert.equal(url.searchParams.get("ctz"), "Europe/Moscow");
});

test("calendar exports reject impossible dates", () => {
  assert.throws(() => buildIcsCalendarEvent({ ...event, dateIso: "2026-02-30" }), /Некорректная дата/);
  assert.throws(() => buildGoogleCalendarUrl({ ...event, dateIso: "not-a-date" }), /Некорректная дата/);
});
