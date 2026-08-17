import { METHOD_VERSION } from "@/lib/methodology";

export type AnalyticsEventName =
  | "page_view"
  | "intent_selected"
  | "result_viewed"
  | "day_selected"
  | "calendar_added"
  | "result_shared"
  | "feedback_helpful"
  | "feedback_not_helpful";

type AnalyticsProperties = {
  intentId?: string;
  archetype?: string;
  selectedDate?: string;
  score?: number;
};

const SESSION_KEY = "lunora_anonymous_session";
const ANALYTICS_DISABLED_KEY = "polune_analytics_disabled";

function analyticsDisabled() {
  try {
    return window.localStorage.getItem(ANALYTICS_DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function configureAnalyticsFromUrl() {
  if (typeof window === "undefined") return;

  const setting = new URLSearchParams(window.location.search).get("analytics");
  try {
    if (setting === "off") window.localStorage.setItem(ANALYTICS_DISABLED_KEY, "1");
    if (setting === "on") window.localStorage.removeItem(ANALYTICS_DISABLED_KEY);
  } catch {
    // Analytics remains best-effort when browser storage is unavailable.
  }
}

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
  if (typeof window === "undefined" || analyticsDisabled()) return;

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
