type CalendarEventInput = {
  dateIso: string;
  intentId: string;
  intentLabel: string;
  description: string;
  resultUrl: string;
  createdAt?: Date;
};

function parseCalendarDate(dateIso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  if (!match) throw new Error("Некорректная дата календарного события");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (date.toISOString().slice(0, 10) !== dateIso) throw new Error("Некорректная дата календарного события");
  return date;
}

function compactDate(dateIso: string) {
  return dateIso.replaceAll("-", "");
}

function nextDateIso(dateIso: string) {
  const date = parseCalendarDate(dateIso);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(value: string) {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = "";
  let byteLength = 0;
  for (const character of value) {
    const characterBytes = encoder.encode(character).length;
    if (byteLength + characterBytes > 75 && chunk) {
      chunks.push(chunk);
      chunk = ` ${character}`;
      byteLength = 1 + characterBytes;
    } else {
      chunk += character;
      byteLength += characterBytes;
    }
  }
  chunks.push(chunk);
  return chunks.join("\r\n");
}

export function buildIcsCalendarEvent(input: CalendarEventInput) {
  const start = compactDate(input.dateIso);
  const end = compactDate(nextDateIso(input.dateIso));
  const createdAt = input.createdAt ?? new Date();
  const timestamp = createdAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const safeIntentId = input.intentId.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Polune//Calendar Event//RU",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:polune-${safeIntentId}-${input.dateIso}@polune.local`,
    `DTSTAMP:${timestamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeIcsText(`polune — ${input.intentLabel}`)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    `URL:${escapeIcsText(input.resultUrl)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];
  return lines.map(foldIcsLine).join("\r\n");
}

export function buildGoogleCalendarUrl(input: CalendarEventInput) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", `polune — ${input.intentLabel}`);
  url.searchParams.set("dates", `${compactDate(input.dateIso)}/${compactDate(nextDateIso(input.dateIso))}`);
  url.searchParams.set("details", `${input.description}\n${input.resultUrl}`);
  url.searchParams.set("ctz", "Europe/Moscow");
  return url;
}
