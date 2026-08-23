import assert from "node:assert/strict";
import test from "node:test";

import { requestBirthPlaces } from "../lib/geocoding.ts";

test("geocoding returns canonical places with offline IANA time zones", async () => {
  let requestedUrl = "";
  const places = await requestBirthPlaces("  Москва  ", async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify([
      {
        osm_type: "relation",
        osm_id: 2555133,
        category: "boundary",
        type: "administrative",
        lat: "55.7504461",
        lon: "37.6174943",
        display_name: "Москва, Центральный федеральный округ, Россия",
        address: {
          city: "Москва",
          region: "Центральный федеральный округ",
          country: "Россия",
        },
      },
    ]), { status: 200 });
  });

  assert.match(requestedUrl, /q=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0/);
  assert.deepEqual(places, [{
    id: "relation-2555133",
    label: "Москва, Центральный федеральный округ, Россия",
    latitude: 55.7504461,
    longitude: 37.6174943,
    timeZone: "Europe/Moscow",
  }]);
});

test("geocoding filters non-settlements and duplicate labels", async () => {
  const places = await requestBirthPlaces("London", async () => new Response(JSON.stringify([
    { osm_type: "node", osm_id: 1, category: "place", type: "city", lat: "51.5", lon: "-0.12", address: { city: "London", country: "UK" } },
    { osm_type: "relation", osm_id: 2, category: "boundary", type: "administrative", lat: "51.51", lon: "-0.13", address: { city: "London", country: "UK" } },
    { osm_type: "node", osm_id: 3, category: "shop", type: "books", lat: "51.5", lon: "-0.12", display_name: "Shop" },
  ]), { status: 200 }));

  assert.equal(places.length, 1);
  assert.equal(places[0].timeZone, "Europe/London");
});

test("geocoding rejects malformed input and upstream errors", async () => {
  await assert.rejects(() => requestBirthPlaces(" "), /Введите название/);
  await assert.rejects(
    () => requestBirthPlaces("Москва", async () => new Response("fail", { status: 503 })),
    /временно недоступен/,
  );
});
