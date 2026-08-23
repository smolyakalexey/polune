export type CalendarProvider = "apple" | "google";

export type CalendarPlatformSignals = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  userAgentDataPlatform?: string;
};

export function detectCalendarProvider(signals: CalendarPlatformSignals): CalendarProvider | null {
  const platform = `${signals.userAgentDataPlatform ?? ""} ${signals.platform}`.toLowerCase();
  const userAgent = signals.userAgent.toLowerCase();
  const isIPadDesktopMode = platform.includes("mac") && signals.maxTouchPoints > 1;
  const isAppleMobile = isIPadDesktopMode || /iphone|ipad|ipod|ios/.test(`${platform} ${userAgent}`);
  if (isAppleMobile) return "apple";

  if (/android|chrome os|cros/.test(`${platform} ${userAgent}`)) return "google";

  if (platform.includes("mac")) {
    const isSafari = userAgent.includes("safari")
      && !/chrome|chromium|crios|edg|opr|fxios/.test(userAgent);
    return isSafari ? "apple" : null;
  }

  if (/win|linux/.test(platform)) return "google";
  return null;
}
