import assert from "node:assert/strict";
import test from "node:test";

import {
  birthDateInputFromIso,
  formatBirthDateInput,
  formatPersonalizationSummary,
  formatBirthTimeInput,
  isValidBirthPlace,
  isValidBirthTime,
  normalizeBirthPlace,
  parseBirthDateInput,
  zodiacForBirthDate,
} from "../lib/personalization.ts";

const today = new Date(2026, 7, 23);

test("birth date mask inserts dots and preserves canonical storage", () => {
  assert.equal(formatBirthDateInput("01021990"), "01.02.1990");
  assert.equal(formatBirthDateInput("01/02/1990"), "01.02.1990");
  assert.equal(birthDateInputFromIso("1990-02-01"), "01.02.1990");
  assert.equal(parseBirthDateInput("01.02.1990", today), "1990-02-01");
});

test("birth date validation rejects impossible and future dates", () => {
  assert.equal(parseBirthDateInput("31.02.1990", today), null);
  assert.equal(parseBirthDateInput("24.08.2026", today), null);
  assert.equal(parseBirthDateInput("01.01.1899", today), null);
});

test("zodiac is derived from birth date boundaries", () => {
  assert.equal(zodiacForBirthDate("1990-03-20")?.name, "рыбы");
  assert.equal(zodiacForBirthDate("1990-03-21")?.name, "овен");
  assert.equal(zodiacForBirthDate("1990-12-22")?.name, "козерог");
});

test("time mask moves from hours to minutes after two digits", () => {
  assert.equal(formatBirthTimeInput("1"), "1");
  assert.equal(formatBirthTimeInput("12"), "12:");
  assert.equal(formatBirthTimeInput("123"), "12:3");
  assert.equal(formatBirthTimeInput("12:34"), "12:34");
  assert.equal(isValidBirthTime("23:59"), true);
  assert.equal(isValidBirthTime("24:00"), false);
});

test("place validation accepts names but rejects symbols and empty values", () => {
  assert.equal(normalizeBirthPlace("  Нижний   Новгород "), "Нижний Новгород");
  assert.equal(isValidBirthPlace("Ростов-на-Дону"), true);
  assert.equal(isValidBirthPlace("São Paulo"), true);
  assert.equal(isValidBirthPlace("123"), false);
  assert.equal(isValidBirthPlace(""), false);
});

test("saved personalization is summarized without implying a changed score", () => {
  assert.equal(formatPersonalizationSummary({
    zodiac: "дева",
    birthDate: "1990-09-03",
    birthTime: "08:45",
    birthPlace: "Нижний Новгород",
    timeUnknown: false,
  }), "03.09.1990 · дева · 08:45 · Нижний Новгород");

  assert.equal(formatPersonalizationSummary({
    zodiac: "рыбы",
    birthDate: "1988-03-12",
    birthTime: "",
    birthPlace: "",
    timeUnknown: true,
  }), "12.03.1988 · рыбы · время неизвестно");
});
