import type { Rating } from "./methodology.ts";

export const INTENTIONS_STORAGE_KEY = "polune-intentions-v1";

export type IntentionStatus = "planned" | "completed" | "cancelled";
export type IntentionPersonalizationLevel = "none" | "date" | "approximate" | "exact";

export type IntentionSnapshot = {
  methodVersion: "0.6" | "0.7p";
  score: number;
  rating: Rating;
  personalizationLevel: IntentionPersonalizationLevel;
  verdict: string;
};

export type SavedIntention = {
  schemaVersion: 1;
  id: string;
  intentId: string;
  selectedDate: string;
  status: IntentionStatus;
  snapshot: IntentionSnapshot;
  reminder:
    | { kind: "none" }
    | {
        kind: "external_calendar";
        provider: "apple" | "google" | "unknown";
        lastAttemptedAt: string;
      };
  repeat: { kind: "none" } | { kind: "ask_after_completion" };
  dateHistory: Array<{
    fromDate: string;
    toDate: string;
    changedAt: string;
    reason: "user_selected" | "recommended_reschedule";
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
};

type NewIntentionInput = {
  id: string;
  intentId: string;
  selectedDate: string;
  snapshot: IntentionSnapshot;
  now?: Date;
  todayIso: string;
};

const ratings = new Set<Rating>(["low", "excellent", "neutral", "good", "caution"]);
const personalizationLevels = new Set<IntentionPersonalizationLevel>(["none", "date", "approximate", "exact"]);
const statuses = new Set<IntentionStatus>(["planned", "completed", "cancelled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isSnapshot(value: unknown): value is IntentionSnapshot {
  if (!isRecord(value)) return false;
  return (value.methodVersion === "0.6" || value.methodVersion === "0.7p")
    && Number.isInteger(value.score)
    && Number(value.score) >= 0
    && Number(value.score) <= 100
    && ratings.has(value.rating as Rating)
    && personalizationLevels.has(value.personalizationLevel as IntentionPersonalizationLevel)
    && typeof value.verdict === "string"
    && value.verdict.length > 0
    && value.verdict.length <= 160;
}

function isReminder(value: unknown): value is SavedIntention["reminder"] {
  if (!isRecord(value)) return false;
  if (value.kind === "none") return true;
  return value.kind === "external_calendar"
    && (value.provider === "apple" || value.provider === "google" || value.provider === "unknown")
    && isIsoTimestamp(value.lastAttemptedAt);
}

function isDateHistory(value: unknown): value is SavedIntention["dateHistory"] {
  return Array.isArray(value) && value.every((change) => (
    isRecord(change)
    && isCalendarDate(change.fromDate)
    && isCalendarDate(change.toDate)
    && isIsoTimestamp(change.changedAt)
    && (change.reason === "user_selected" || change.reason === "recommended_reschedule")
  ));
}

export function isSavedIntention(value: unknown): value is SavedIntention {
  if (!isRecord(value)) return false;
  return value.schemaVersion === 1
    && typeof value.id === "string"
    && value.id.length >= 8
    && typeof value.intentId === "string"
    && value.intentId.length > 0
    && isCalendarDate(value.selectedDate)
    && statuses.has(value.status as IntentionStatus)
    && isSnapshot(value.snapshot)
    && isReminder(value.reminder)
    && isRecord(value.repeat)
    && (value.repeat.kind === "none" || value.repeat.kind === "ask_after_completion")
    && isDateHistory(value.dateHistory)
    && isIsoTimestamp(value.createdAt)
    && isIsoTimestamp(value.updatedAt)
    && (value.completedAt === undefined || isIsoTimestamp(value.completedAt))
    && (value.cancelledAt === undefined || isIsoTimestamp(value.cancelledAt));
}

export function parseSavedIntentions(raw: string | null): SavedIntention[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedIntention);
  } catch {
    return [];
  }
}

export function createSavedIntention(input: NewIntentionInput): SavedIntention {
  if (!isCalendarDate(input.selectedDate) || input.selectedDate < input.todayIso) {
    throw new Error("Нельзя сохранить план на прошедшую или некорректную дату");
  }
  if (!isSnapshot(input.snapshot)) throw new Error("Некорректный снимок рекомендации");

  const timestamp = (input.now ?? new Date()).toISOString();
  return {
    schemaVersion: 1,
    id: input.id,
    intentId: input.intentId,
    selectedDate: input.selectedDate,
    status: "planned",
    snapshot: input.snapshot,
    reminder: { kind: "none" },
    repeat: { kind: "none" },
    dateHistory: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function activeIntention(intentions: SavedIntention[]) {
  return intentions.find((intention) => intention.status === "planned") ?? null;
}

export function replaceActiveIntention(intentions: SavedIntention[], next: SavedIntention) {
  const existing = activeIntention(intentions);
  const history = intentions.filter((intention) => intention.status !== "planned").slice(-12);
  if (existing?.intentId === next.intentId && existing.selectedDate === next.selectedDate) {
    return [...history, {
      ...existing,
      snapshot: next.snapshot,
      updatedAt: next.updatedAt,
    }];
  }
  return [...history, next];
}

export function withCalendarReminder(
  intention: SavedIntention,
  provider: "apple" | "google" | "unknown",
  now = new Date(),
): SavedIntention {
  const timestamp = now.toISOString();
  return {
    ...intention,
    reminder: { kind: "external_calendar", provider, lastAttemptedAt: timestamp },
    updatedAt: timestamp,
  };
}
