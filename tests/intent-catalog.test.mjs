import assert from "node:assert/strict";
import test from "node:test";

import { catalogSearchPhraseCount, intentCatalog } from "../lib/intent-catalog.ts";
import { intentZodiacProfiles } from "../lib/intent-profiles.ts";

const normalize = (value) => value.trim().toLowerCase().replaceAll("ё", "е");

test("catalog stays inside the approved MVP scale", () => {
  assert.ok(intentCatalog.length >= 50 && intentCatalog.length <= 70);
  assert.ok(catalogSearchPhraseCount >= 500 && catalogSearchPhraseCount <= 700);
});

test("catalog ids, labels and search phrases are unique", () => {
  assert.equal(new Set(intentCatalog.map((intent) => intent.id)).size, intentCatalog.length);
  assert.equal(new Set(intentCatalog.map((intent) => normalize(intent.label))).size, intentCatalog.length);

  const owners = new Map();
  for (const intent of intentCatalog) {
    for (const phrase of [intent.label, ...intent.keywords]) {
      const key = normalize(phrase);
      assert.equal(owners.has(key), false, `Фраза «${phrase}» повторяется у ${owners.get(key)} и ${intent.id}`);
      owners.set(key, intent.id);
    }
  }
});

test("every intent has enough formulations and a supported archetype", () => {
  const archetypes = new Set(["growth", "connection", "planning", "care", "release"]);
  for (const intent of intentCatalog) {
    assert.ok(intent.keywords.length >= 8, `${intent.id} has too few search formulations`);
    assert.ok(archetypes.has(intent.archetype), `${intent.id} has an unsupported archetype`);
  }
});

test("every intent has exactly one supported zodiac profile", () => {
  const profiles = new Set(["beauty", "body", "learning", "career", "social", "relationship", "home", "clearing", "travel", "creativity"]);
  assert.deepEqual(new Set(Object.keys(intentZodiacProfiles)), new Set(intentCatalog.map((intent) => intent.id)));
  for (const intent of intentCatalog) {
    assert.ok(profiles.has(intentZodiacProfiles[intent.id]), `${intent.id} has an unsupported zodiac profile`);
  }
});

test("diploma formulations share one canonical intent", () => {
  const thesis = intentCatalog.find((intent) => intent.id === "thesis");
  assert.ok(thesis);
  assert.ok(thesis.keywords.includes("написать диплом"));
  assert.ok(thesis.keywords.includes("защитить диплом"));
  assert.ok(thesis.keywords.includes("сдать диплом"));
});
