import assert from "node:assert/strict";
import test from "node:test";

import { keepRussianPrepositionsWithNextWord } from "../lib/typography.ts";

test("russian prepositions stay attached to the following word", () => {
  assert.equal(
    keepRussianPrepositionsWithNextWord("день для отдыха и прогулки в парке"),
    "день для\u00a0отдыха и прогулки в\u00a0парке",
  );
  assert.equal(
    keepRussianPrepositionsWithNextWord("Из-за дождя перенесите встречу на завтра"),
    "Из-за\u00a0дождя перенесите встречу на\u00a0завтра",
  );
});

test("ordinary words that contain preposition fragments remain unchanged", () => {
  assert.equal(
    keepRussianPrepositionsWithNextWord("вместе отдыхать безопасно"),
    "вместе отдыхать безопасно",
  );
});
