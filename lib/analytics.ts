import { METHOD_VERSION } from "@/lib/methodology";
import { PERSONAL_METHOD_VERSION } from "@/lib/personal-methodology";
import type { AnalyticsEventName } from "@/lib/analytics-events";
import { createAnonymousSessionId } from "@/lib/session-id";

type AnalyticsProperties = {
  intentId?: string;
  archetype?: string;
  selectedDate?: string;
  score?: number;
  methodVersion?: string;
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

export function getAnonymousSessionId() {
  const createId = () => createAnonymousSessionId({
    randomUUID: typeof window.crypto?.randomUUID === "function"
      ? () => window.crypto.randomUUID()
      : undefined,
    getRandomValues: typeof window.crypto?.getRandomValues === "function"
      ? (values) => window.crypto.getRandomValues(values)
      : undefined,
  });
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = createId();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return createId();
  }
}

export function trackEvent(eventName: AnalyticsEventName, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined" || analyticsDisabled()) return;

  const requestedMethodVersion = properties.methodVersion
    ?? new URLSearchParams(window.location.search).get("method");
  const methodVersion = requestedMethodVersion === PERSONAL_METHOD_VERSION
    ? PERSONAL_METHOD_VERSION
    : METHOD_VERSION;

  const payload = JSON.stringify({
    sessionId: getAnonymousSessionId(),
    eventName,
    ...properties,
    methodVersion,
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
