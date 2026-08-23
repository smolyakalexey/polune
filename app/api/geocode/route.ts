import { NextResponse } from "next/server";

import { autocompleteBirthPlaces, requestBirthPlaces } from "@/lib/geocoding";

const cachedSearches = new Map<string, { expiresAt: number; places: Awaited<ReturnType<typeof requestBirthPlaces>> }>();
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

function serializedNominatimSearch(query: string) {
  const cached = cachedSearches.get(query);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.places);

  const search = requestQueue.then(async () => {
    const queuedCache = cachedSearches.get(query);
    if (queuedCache && queuedCache.expiresAt > Date.now()) return queuedCache.places;
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    nextRequestAt = Date.now() + 1100;
    const places = await requestBirthPlaces(
      query,
      fetch,
      process.env.GEOCODING_BASE_URL ?? "https://nominatim.openstreetmap.org",
    );
    cachedSearches.set(query, {
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      places,
    });
    if (cachedSearches.size > 500) cachedSearches.delete(cachedSearches.keys().next().value!);
    return places;
  });
  requestQueue = search.then(() => undefined, () => undefined);
  return search;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as null | Record<string, unknown>;
  const query = typeof body?.query === "string" ? body.query.trim().replace(/\s+/g, " ") : "";
  const mode = body?.mode === "autocomplete" ? "autocomplete" : "search";
  if (query.length < 2 || query.length > 80) {
    return NextResponse.json({ error: "Введите название населённого пункта" }, { status: 400 });
  }

  try {
    const places = mode === "autocomplete"
      ? await autocompleteBirthPlaces(query, process.env.GEOAPIFY_API_KEY ?? "")
      : await serializedNominatimSearch(query.toLocaleLowerCase("ru-RU"));
    return NextResponse.json(
      { places, attribution: mode === "autocomplete" ? "powered by Geoapify" : "© OpenStreetMap contributors" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const isMissingKey = error instanceof Error && error.message.includes("not configured");
    return NextResponse.json(
      { error: isMissingKey ? "Автодополнение не настроено" : "Не удалось проверить место. Попробуйте ещё раз" },
      { status: isMissingKey ? 503 : 502 },
    );
  }
}
