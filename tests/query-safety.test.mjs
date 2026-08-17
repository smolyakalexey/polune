import assert from "node:assert/strict";
import test from "node:test";

import { classifyQuerySafety, isConfidentCatalogMatch } from "../lib/query-safety.ts";

test("ordinary study request is safe", () => {
  assert.equal(classifyQuerySafety("написать диплом"), "safe");
});

test("high-risk and sensitive decisions are separated", () => {
  assert.equal(classifyQuerySafety("навредить себе"), "high-risk");
  assert.equal(classifyQuerySafety("начать лечение лекарствами"), "sensitive");
});

test("inappropriate wording is detected", () => {
  assert.equal(classifyQuerySafety("послать этого мудака"), "inappropriate");
});

test("catalog confidence uses a conservative cutoff", () => {
  assert.equal(isConfidentCatalogMatch(0.2), true);
  assert.equal(isConfidentCatalogMatch(0.31), false);
  assert.equal(isConfidentCatalogMatch(undefined), false);
});
