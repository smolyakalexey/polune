export type CalendarSheetGesture = "expand" | "collapse" | null;

export function resolveCalendarSheetGesture(input: {
  expanded: boolean;
  deltaY: number;
  startScrollTop: number;
  threshold?: number;
}): CalendarSheetGesture {
  const threshold = input.threshold ?? 44;
  if (!input.expanded && input.deltaY <= -threshold) return "expand";
  if (input.expanded && input.startScrollTop <= 1 && input.deltaY >= threshold) return "collapse";
  return null;
}
