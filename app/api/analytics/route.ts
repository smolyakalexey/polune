import { getDb } from "../../../db";
import { analyticsEvents } from "../../../db/schema";
import { intentCatalog } from "../../../lib/intent-catalog";
import { METHOD_VERSION } from "../../../lib/methodology";

const eventNames = new Set([
  "page_view",
  "intent_selected",
  "result_viewed",
  "day_selected",
  "calendar_added",
  "result_shared",
]);
const intentIds = new Set(intentCatalog.map((intent) => intent.id));
const archetypes = new Set(["growth", "connection", "planning", "care", "release"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type EventPayload = {
  sessionId?: string;
  eventName?: string;
  intentId?: string;
  archetype?: string;
  selectedDate?: string;
  score?: number;
  methodVersion?: string;
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_048) return new Response(null, { status: 413 });

    const payload = await request.json() as EventPayload;
    if (!payload.sessionId || !uuidPattern.test(payload.sessionId)) return new Response(null, { status: 400 });
    if (!payload.eventName || !eventNames.has(payload.eventName)) return new Response(null, { status: 400 });
    if (payload.intentId && !intentIds.has(payload.intentId)) return new Response(null, { status: 400 });
    if (payload.archetype && !archetypes.has(payload.archetype)) return new Response(null, { status: 400 });
    if (payload.selectedDate && !datePattern.test(payload.selectedDate)) return new Response(null, { status: 400 });
    if (payload.score !== undefined && (!Number.isInteger(payload.score) || payload.score < 0 || payload.score > 100)) {
      return new Response(null, { status: 400 });
    }

    const db = await getDb();
    await db.insert(analyticsEvents).values({
      sessionId: payload.sessionId,
      eventName: payload.eventName,
      intentId: payload.intentId ?? null,
      archetype: payload.archetype ?? null,
      selectedDate: payload.selectedDate ?? null,
      score: payload.score ?? null,
      methodVersion: payload.methodVersion === METHOD_VERSION ? payload.methodVersion : METHOD_VERSION,
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
