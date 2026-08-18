import { getDb } from "../../../db";
import { feedbackResponses } from "../../../db/schema";
import { intentCatalog } from "../../../lib/intent-catalog";
import { METHOD_VERSION } from "../../../lib/methodology";

const intentIds = new Set(intentCatalog.map((intent) => intent.id));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const returnOptions = new Set(["yes", "maybe", "no"]);

type FeedbackPayload = {
  sessionId?: string;
  intentId?: string;
  selectedDate?: string;
  score?: number;
  clarity?: number;
  trust?: number;
  wouldReturn?: string;
  missingIntent?: string;
  comment?: string;
  company?: string;
};

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 4_096) return Response.json({ error: "too_large" }, { status: 413 });

    const payload = await request.json() as FeedbackPayload;
    if (payload.company) return Response.json({ ok: true }, { status: 201 });
    if (!payload.sessionId || !uuidPattern.test(payload.sessionId)) return Response.json({ error: "invalid_session" }, { status: 400 });
    if (payload.intentId && !intentIds.has(payload.intentId)) return Response.json({ error: "invalid_intent" }, { status: 400 });
    if (payload.selectedDate && !datePattern.test(payload.selectedDate)) return Response.json({ error: "invalid_date" }, { status: 400 });
    if (payload.score !== undefined && (!Number.isInteger(payload.score) || payload.score < 0 || payload.score > 100)) {
      return Response.json({ error: "invalid_score" }, { status: 400 });
    }
    if (!Number.isInteger(payload.clarity) || (payload.clarity ?? 0) < 1 || (payload.clarity ?? 0) > 5) {
      return Response.json({ error: "invalid_clarity" }, { status: 400 });
    }
    if (!Number.isInteger(payload.trust) || (payload.trust ?? 0) < 1 || (payload.trust ?? 0) > 5) {
      return Response.json({ error: "invalid_trust" }, { status: 400 });
    }
    if (!payload.wouldReturn || !returnOptions.has(payload.wouldReturn)) {
      return Response.json({ error: "invalid_return" }, { status: 400 });
    }

    const db = await getDb();
    await db.insert(feedbackResponses).values({
      sessionId: payload.sessionId,
      intentId: payload.intentId ?? null,
      selectedDate: payload.selectedDate ?? null,
      score: payload.score ?? null,
      clarity: payload.clarity!,
      trust: payload.trust!,
      wouldReturn: payload.wouldReturn,
      missingIntent: optionalText(payload.missingIntent, 120),
      comment: optionalText(payload.comment, 500),
      methodVersion: METHOD_VERSION,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
}
