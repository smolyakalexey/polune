type RandomSource = {
  randomUUID?: () => string;
  getRandomValues?: (values: Uint8Array) => unknown;
};

function randomByte(random: () => number) {
  return Math.floor(Math.max(0, Math.min(0.9999999999999999, random())) * 256);
}

export function createAnonymousSessionId(
  source?: RandomSource,
  fallbackRandom: () => number = Math.random,
) {
  if (source?.randomUUID) return source.randomUUID();

  const bytes = new Uint8Array(16);
  if (source?.getRandomValues) source.getRandomValues(bytes);
  else bytes.set(Array.from({ length: 16 }, () => randomByte(fallbackRandom)));

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
