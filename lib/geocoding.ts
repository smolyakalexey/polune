import timezoneAtCoordinates from "@photostructure/tz-lookup";

import { normalizeBirthPlace } from "./personalization.ts";

export type GeocodedBirthPlace = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

type NominatimResult = {
  osm_type?: string;
  osm_id?: number;
  category?: string;
  type?: string;
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
};

type GeoapifyResult = {
  place_id?: string;
  formatted?: string;
  lat?: number;
  lon?: number;
  city?: string;
  state?: string;
  country?: string;
  result_type?: string;
};

const allowedPlaceTypes = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "hamlet",
  "administrative",
]);

function canonicalLabel(result: NominatimResult) {
  const address = result.address ?? {};
  const settlement = address.city
    ?? address.town
    ?? address.village
    ?? address.municipality
    ?? address.hamlet;
  const region = address.state ?? address.region ?? address.county;
  const parts = [settlement, region, address.country].filter(Boolean);
  return [...new Set(parts)].join(", ") || result.display_name || "";
}

export async function requestBirthPlaces(
  query: string,
  fetcher: typeof fetch = fetch,
  baseUrl = "https://nominatim.openstreetmap.org",
) {
  const normalized = normalizeBirthPlace(query);
  if (normalized.length < 2 || normalized.length > 80) {
    throw new Error("Введите название населённого пункта");
  }

  const url = new URL("/search", baseUrl);
  url.searchParams.set("q", normalized);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ru,en");
  url.searchParams.set("limit", "8");

  const response = await fetcher(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Polune/0.7p (birth-place lookup; contact: support@polune.site)",
    },
  });
  if (!response.ok) throw new Error("Сервис поиска места временно недоступен");

  const payload = await response.json() as NominatimResult[];
  const places: GeocodedBirthPlace[] = [];
  for (const result of payload) {
    if (!allowedPlaceTypes.has(result.type ?? "") && result.category !== "boundary") continue;
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const label = canonicalLabel(result);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !label) continue;
    const id = `${result.osm_type ?? "place"}-${result.osm_id ?? `${latitude}-${longitude}`}`;
    if (places.some((place) => place.id === id || place.label === label)) continue;
    places.push({
      id,
      label,
      latitude,
      longitude,
      timeZone: timezoneAtCoordinates(latitude, longitude),
    });
    if (places.length === 5) break;
  }
  return places;
}

export async function autocompleteBirthPlaces(
  query: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
  baseUrl = "https://api.geoapify.com",
) {
  const normalized = normalizeBirthPlace(query);
  if (normalized.length < 3 || normalized.length > 80) {
    throw new Error("Введите минимум три символа");
  }
  if (!apiKey) throw new Error("Geoapify API key is not configured");

  const url = new URL("/v1/geocode/autocomplete", baseUrl);
  url.searchParams.set("text", normalized);
  url.searchParams.set("type", "city");
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "ru");
  url.searchParams.set("limit", "5");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetcher(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Сервис подсказок временно недоступен");
  const payload = await response.json() as { results?: GeoapifyResult[] };

  const places: GeocodedBirthPlace[] = [];
  for (const result of payload.results ?? []) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    const parts = [result.city, result.state, result.country].filter(Boolean);
    const label = [...new Set(parts)].join(", ") || result.formatted || "";
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !label) continue;
    const id = result.place_id ?? `geoapify-${latitude}-${longitude}`;
    if (places.some((place) => place.id === id || place.label === label)) continue;
    places.push({
      id,
      label,
      latitude,
      longitude,
      timeZone: timezoneAtCoordinates(latitude, longitude),
    });
  }
  return places;
}
