import { METHOD_VERSION } from "@/lib/methodology";

export type AnalyticsEventName =
  | "page_view"
  | "intent_selected"
  | "result_viewed"
  | "day_selected"
  | "calendar_added"
  | "result_shared";

type AnalyticsProperties = {
  intentId?: string;
  archetype?: string;
  selectedDate?: string;
  score?: number;
};

const SESSION_KEY = "lunora_anonymous_session";

function anonymousSessionId() {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return window.crypto.randomUUID();
  }
}

export function trackEvent(eventName: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    sessionId: anonymousSessionId(),
    eventName,
    methodVersion: METHOD_VERSION,
    ...properties,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([payload], { type: "application/json" }));
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  });
}
