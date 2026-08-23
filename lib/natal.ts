import {
  EclipticGeoMoon,
  Observer,
  RotateVector,
  Rotation_ECT_EQD,
  Rotation_EQD_HOR,
  SphereFromVector,
  Spherical,
  SunPosition,
  VectorFromSphere,
} from "astronomy-engine";

import type { PersonalizationLevel } from "./personal-methodology.ts";

export type BirthTimePeriod = "night" | "morning" | "day" | "evening";

export const BIRTH_PERIOD_MIDPOINTS: Record<BirthTimePeriod, string> = {
  night: "03:00",
  morning: "09:00",
  day: "15:00",
  evening: "21:00",
};

type LocalDateTime = {
  dateIso: string;
  time: string;
  timeZone: string;
};

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function zonedParts(date: Date, timeZone: string): LocalParts {
  const values = Object.fromEntries(
    formatterFor(timeZone).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function parseLocalDateTime(input: LocalDateTime): LocalParts {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.dateIso);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(input.time);
  if (!dateMatch || !timeMatch) throw new Error("Нужны дата YYYY-MM-DD и время HH:MM");

  const parts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
    second: 0,
  };
  const check = new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  ));
  if (
    parts.hour > 23
    || parts.minute > 59
    || check.getUTCFullYear() !== parts.year
    || check.getUTCMonth() !== parts.month - 1
    || check.getUTCDate() !== parts.day
  ) throw new Error("Некорректные локальные дата или время");

  formatterFor(input.timeZone);
  return parts;
}

function dateAtUtcNoon(dateIso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) throw new Error("Нужна дата YYYY-MM-DD");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) throw new Error("Некорректная дата рождения");
  return date;
}

function partsTimestamp(parts: LocalParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

function sameParts(left: LocalParts, right: LocalParts) {
  return left.year === right.year
    && left.month === right.month
    && left.day === right.day
    && left.hour === right.hour
    && left.minute === right.minute
    && left.second === right.second;
}

export function resolveLocalBirthInstants(input: LocalDateTime) {
  const desired = parseLocalDateTime(input);
  const desiredTimestamp = partsTimestamp(desired);
  const offsets = new Set<number>();

  for (let hours = -36; hours <= 36; hours += 3) {
    const sampleTimestamp = desiredTimestamp + hours * 60 * 60 * 1000;
    const sample = new Date(sampleTimestamp);
    offsets.add(partsTimestamp(zonedParts(sample, input.timeZone)) - sampleTimestamp);
  }

  return [...offsets]
    .map((offset) => new Date(desiredTimestamp - offset))
    .filter((candidate) => sameParts(zonedParts(candidate, input.timeZone), desired))
    .sort((left, right) => left.getTime() - right.getTime());
}

export function resolveLocalBirthInstant(input: LocalDateTime) {
  const candidates = resolveLocalBirthInstants(input);
  if (candidates.length === 0) {
    throw new Error("Это локальное время не существовало из-за перевода часов");
  }
  if (candidates.length > 1) {
    throw new Error("Это локальное время неоднозначно из-за перевода часов");
  }
  return candidates[0];
}

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function horizonVectorForEclipticLongitude(
  longitude: number,
  instant: Date,
  observer: Observer,
) {
  const ecliptic = VectorFromSphere(new Spherical(0, normalizeLongitude(longitude), 1), instant);
  const equatorial = RotateVector(Rotation_ECT_EQD(instant), ecliptic);
  return RotateVector(Rotation_EQD_HOR(instant, observer), equatorial);
}

export function calculateAscendantLongitude(
  instant: Date,
  latitude: number,
  longitude: number,
) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Широта должна быть от -90 до 90 градусов");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Долгота должна быть от -180 до 180 градусов");
  }

  const observer = new Observer(latitude, longitude, 0);
  const roots: number[] = [];
  let leftLongitude = 0;
  let leftHeight = horizonVectorForEclipticLongitude(0, instant, observer).z;

  for (let rightLongitude = 1; rightLongitude <= 360; rightLongitude += 1) {
    const rightHeight = horizonVectorForEclipticLongitude(rightLongitude, instant, observer).z;
    if (leftHeight === 0 || leftHeight * rightHeight < 0) {
      let left = leftLongitude;
      let right = rightLongitude;
      for (let iteration = 0; iteration < 50; iteration += 1) {
        const middle = (left + right) / 2;
        const middleHeight = horizonVectorForEclipticLongitude(middle, instant, observer).z;
        if (leftHeight * middleHeight <= 0) right = middle;
        else left = middle;
      }
      roots.push(normalizeLongitude((left + right) / 2));
    }
    leftLongitude = rightLongitude;
    leftHeight = rightHeight;
  }

  const ascendant = roots.find((root) => {
    const horizon = horizonVectorForEclipticLongitude(root, instant, observer);
    return horizon.y < 0;
  });
  if (ascendant === undefined) throw new Error("Не удалось определить восточное пересечение эклиптики");
  return ascendant;
}

type NatalInput = {
  dateIso: string;
  time?: string;
  period?: BirthTimePeriod;
  timeZone?: string;
  latitude?: number;
  longitude?: number;
};

export function calculateNatalProfile(input: NatalInput) {
  let level: PersonalizationLevel = "date";
  let instant = dateAtUtcNoon(input.dateIso);

  if (input.time || input.period) {
    if (!input.timeZone) throw new Error("Для времени рождения нужен часовой пояс места");
    instant = resolveLocalBirthInstant({
      dateIso: input.dateIso,
      time: input.time ?? BIRTH_PERIOD_MIDPOINTS[input.period!],
      timeZone: input.timeZone,
    });
    level = input.time ? "exact" : "approximate";
  }

  const profile: {
    level: PersonalizationLevel;
    instant: Date;
    natalSunLongitude: number;
    natalMoonLongitude?: number;
    ascendantLongitude?: number;
  } = {
    level,
    instant,
    natalSunLongitude: SunPosition(instant).elon,
  };

  if (level !== "date") profile.natalMoonLongitude = EclipticGeoMoon(instant).lon;
  if (level === "exact") {
    if (input.latitude === undefined || input.longitude === undefined) {
      throw new Error("Для Асцендента нужны координаты места рождения");
    }
    profile.ascendantLongitude = calculateAscendantLongitude(
      instant,
      input.latitude,
      input.longitude,
    );
  }

  return profile;
}

export function eclipticPointHorizonPosition(
  longitude: number,
  instant: Date,
  latitude: number,
  observerLongitude: number,
) {
  const vector = horizonVectorForEclipticLongitude(
    longitude,
    instant,
    new Observer(latitude, observerLongitude, 0),
  );
  return {
    altitude: Math.asin(vector.z / Math.hypot(vector.x, vector.y, vector.z)) * 180 / Math.PI,
    azimuth: (360 + Math.atan2(-vector.y, vector.x) * 180 / Math.PI) % 360,
    ecliptic: SphereFromVector(
      VectorFromSphere(new Spherical(0, normalizeLongitude(longitude), 1), instant),
    ),
  };
}
