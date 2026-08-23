import assert from "node:assert/strict";
import test from "node:test";

import { createAnonymousSessionId } from "../lib/session-id.ts";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("uses native randomUUID in secure contexts", () => {
  const expected = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(createAnonymousSessionId({ randomUUID: () => expected }), expected);
});

test("creates a valid v4 UUID when randomUUID is unavailable on LAN HTTP", () => {
  const id = createAnonymousSessionId({
    getRandomValues(values) {
      values.set(Array.from({ length: 16 }, (_, index) => index));
    },
  });

  assert.match(id, uuidV4Pattern);
  assert.equal(id, "00010203-0405-4607-8809-0a0b0c0d0e0f");
});

test("keeps an emergency fallback for restricted browsers", () => {
  assert.match(createAnonymousSessionId(undefined, () => 0.5), uuidV4Pattern);
});
