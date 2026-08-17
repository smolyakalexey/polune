"use client";

/* eslint-disable @next/next/no-img-element -- exact local SVG assets exported from Figma */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Fuse from "fuse.js";
import { MoonPhase } from "astronomy-engine";
import {
  angularDistance,
  archetypeTargets,
  calculatePhaseScore,
  METHOD_VERSION,
  pickPreferredDay,
  ratingForScore,
} from "@/lib/methodology";
import type { Archetype, Rating } from "@/lib/methodology";
import { intentCatalog } from "@/lib/intent-catalog";
import type { CatalogIconKey, IntentDefinition } from "@/lib/intent-catalog";
import { classifyQuerySafety, isConfidentCatalogMatch } from "@/lib/query-safety";
import { configureAnalyticsFromUrl, trackEvent } from "@/lib/analytics";
import type { Icon } from "@phosphor-icons/react";
import {
  AirplaneTilt,
  Bed,
  BookOpenText,
  Briefcase,
  Broom,
  CalendarCheck,
  CalendarPlus,
  Check,
  ChatCircle,
  CookingPot,
  FlowerLotus,
  Gift,
  Heart,
  HouseLine,
  Info,
  MagicWand,
  MagnifyingGlass,
  MinusCircle,
  MoonStars,
  MusicNotes,
  PaintBrush,
  PawPrint,
  PencilSimple,
  PersonSimpleRun,
  Plant,
  Scissors,
  SealCheck,
  ShoppingBag,
  Sparkle,
  TrendUp,
  ThumbsDown,
  ThumbsUp,
  UsersThree,
  Warning,
  Wrench,
  X,
  XCircle,
} from "@phosphor-icons/react";

type Intent = Omit<IntentDefinition, "icon"> & { Icon: Icon };

type Day = {
  id: string;
  dateIso: string;
  day: string;
  weekday: string;
  longDate: string;
  monthLabel: string;
  score: number;
  rating: Rating;
  moonPhaseAngle: number;
  moonPhaseLabel: string;
  targetPhaseAngle: number;
  phaseDistance: number;
};

const catalogIcons: Record<CatalogIconKey, Icon> = {
  airplane: AirplaneTilt,
  bed: Bed,
  book: BookOpenText,
  briefcase: Briefcase,
  broom: Broom,
  calendar: CalendarCheck,
  "calendar-plus": CalendarPlus,
  chat: ChatCircle,
  cooking: CookingPot,
  flower: FlowerLotus,
  gift: Gift,
  heart: Heart,
  house: HouseLine,
  magic: MagicWand,
  moon: MoonStars,
  music: MusicNotes,
  paint: PaintBrush,
  paw: PawPrint,
  pencil: PencilSimple,
  plant: Plant,
  run: PersonSimpleRun,
  scissors: Scissors,
  shopping: ShoppingBag,
  sparkle: Sparkle,
  trend: TrendUp,
  users: UsersThree,
  wrench: Wrench,
};

const intents: Intent[] = intentCatalog.map(({ icon, ...intent }) => ({
  ...intent,
  Icon: catalogIcons[icon],
}));

function resultUrl(intentId: string, dateIso: string) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.searchParams.set("intent", intentId);
  url.searchParams.set("date", dateIso);
  url.searchParams.set("method", METHOD_VERSION);
  return url;
}

function currentMoscowDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day"), 12));
}

function buildCurrentWeek(archetype: Archetype): Day[] {
  const anchor = currentMoscowDate();
  const calculatedDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(anchor.getUTCDate() + index);
    const day = String(date.getUTCDate());
    const dateIso = date.toISOString().slice(0, 10);
    const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", "");
    const monthLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })
      .formatToParts(date)
      .find((part) => part.type === "month")?.value ?? "";
    const moonPhaseAngle = MoonPhase(date);
    const score = calculatePhaseScore(moonPhaseAngle, archetype);
    const moonPhaseLabel = moonPhaseAngle < 15 || moonPhaseAngle >= 345
      ? "новолуние"
      : moonPhaseAngle < 165
        ? "растущая луна"
        : moonPhaseAngle < 195
          ? "полнолуние"
          : "убывающая луна";
    return {
      id: dateIso,
      dateIso,
      day,
      weekday,
      longDate: `${day} ${monthLabel}, ${weekday}`,
      monthLabel: `${monthLabel}, ${weekday}`,
      score,
      rating: ratingForScore(score),
      moonPhaseAngle,
      moonPhaseLabel,
      targetPhaseAngle: archetypeTargets[archetype],
      phaseDistance: angularDistance(moonPhaseAngle, archetypeTargets[archetype]),
    };
  });
  const preferredId = pickPreferredDay(calculatedDays).id;
  return calculatedDays.map((day) => ({
    ...day,
    rating: day.id === preferredId ? "excellent" : ratingForScore(day.score),
  }));
}

const intentSearch = new Fuse(intents, {
  keys: ["label", "group", "keywords"],
  threshold: 0.42,
  ignoreLocation: true,
  includeScore: true,
  useTokenSearch: true,
});
const popularIntentIds = ["haircut", "habit", "cleaning", "conversation", "trip"];
const previewIntents: Intent[] = [
  intents.find((intent) => intent.id === "haircut")!,
  intents.find((intent) => intent.id === "conversation")!,
  intents.find((intent) => intent.id === "trip")!,
  intents.find((intent) => intent.id === "skincare")!,
  { id: "catalog-preview", label: "найти дело в каталоге", group: "каталог", Icon: MagnifyingGlass, archetype: "planning" },
];

const ratingLabels: Record<Rating, string> = {
  low: "низкое совпадение",
  excellent: "лучший день",
  neutral: "нейтральный день",
  good: "хороший день",
  caution: "умеренное совпадение",
};

const statusIcons: Record<Rating, string> = {
  low: "/figma/status-low.svg",
  excellent: "/figma/status-excellent.svg",
  neutral: "/figma/status-neutral.svg",
  good: "/figma/status-good.svg",
  caution: "/figma/status-caution.svg",
};

const ratingInsights: Record<Rating, { Icon: Icon; title: string; text: string }> = {
  excellent: { Icon: Sparkle, title: "фаза близка к целевой точке", text: "угловое расстояние до символической цели минимально" },
  good: { Icon: SealCheck, title: "хорошее совпадение фазы", text: "дата находится рядом с символической целью" },
  neutral: { Icon: MinusCircle, title: "нейтральное совпадение фазы", text: "дата находится между подходящей и противоположной фазой" },
  caution: { Icon: Warning, title: "умеренное совпадение фазы", text: "фаза подходит частично, но есть более точные даты" },
  low: { Icon: XCircle, title: "слабое совпадение фазы", text: "дата далека от символической цели" },
};

function buildReasons(intent: Intent, day: Day) {
  const ratingInsight = ratingInsights[day.rating];
  const isWeekend = day.weekday === "сб" || day.weekday === "вс";
  return [
    {
      Icon: MoonStars,
      title: day.moonPhaseLabel,
      text: `фазовый угол луны — ${Math.round(day.moonPhaseAngle)}°`,
    },
    {
      Icon: ratingInsight.Icon,
      title: ratingInsight.title,
      text: `${ratingInsight.text} для дела «${intent.label}»`,
    },
    {
      Icon: isWeekend ? FlowerLotus : CalendarCheck,
      title: isWeekend ? "свободный ритм дня" : "ритм буднего дня",
      text: isWeekend
        ? "проще оставить время без спешки и лишних переключений"
        : "лучше заранее выделить время и не ставить дело между встречами",
    },
  ];
}

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Polune — на главную">
      <img src="/figma/polune-mark.svg" alt="" />
    </a>
  );
}

function splitIntentLabel(label: string) {
  const words = label.trim().split(/\s+/);
  if (label.length <= 18 || words.length < 2) return [label];

  let splitAt = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const firstLength = words.slice(0, index).join(" ").length;
    const secondLength = words.slice(index).join(" ").length;
    const difference = Math.abs(firstLength - secondLength);
    if (difference <= smallestDifference) {
      splitAt = index;
      smallestDifference = difference;
    }
  }
  return [words.slice(0, splitAt).join(" "), words.slice(splitAt).join(" ")];
}

function IntentLine({ intent, onClick, animated = false }: { intent: Intent; onClick: () => void; animated?: boolean }) {
  const IntentIcon = intent.Icon;
  const [firstLine, secondLine] = splitIntentLabel(intent.label);
  return (
    <button
      className={`intent-line ${animated ? "is-ticker" : ""}`}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={`выбрать дело, сейчас показано: ${intent.label}`}
    >
      <span className="intent-copy" key={animated ? intent.id : undefined}>
        <span className="intent-first-line">
          <IntentIcon weight="bold" aria-hidden="true" />
          <span className="intent-text-line">{firstLine}</span>
        </span>
        {secondLine && <span className="intent-text-line intent-second-line">{secondLine}</span>}
      </span>
    </button>
  );
}

function IntentPicker({
  current,
  showSelection,
  onClose,
  onSelect,
}: {
  current: Intent;
  showSelection: boolean;
  onClose: () => void;
  onSelect: (intent: Intent) => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const querySafety = classifyQuerySafety(normalizedQuery);
  const searchResults = normalizedQuery && querySafety === "safe"
    ? intentSearch.search(normalizedQuery, { limit: 6 })
    : [];
  const hasConfidentMatch = isConfidentCatalogMatch(searchResults[0]?.score);
  const filtered = hasConfidentMatch
    ? searchResults.filter((result) => (result.score ?? 1) <= 0.34).slice(0, 3).map((result) => result.item)
    : [];
  const sections = normalizedQuery
    ? [{ title: "результаты", items: filtered }]
    : [
        { title: "популярное", items: popularIntentIds.map((id) => intents.find((intent) => intent.id === id)).filter(Boolean) as Intent[] },
        ...Array.from(new Set(intents.map((intent) => intent.group))).map((group) => ({
          title: group,
          items: intents.filter((intent) => intent.group === group),
        })),
      ];
  const feedback = normalizedQuery.length < 3 || hasConfidentMatch
    ? null
    : querySafety === "inappropriate"
      ? { title: "попробуйте написать нейтральнее", text: "мы не используем бранные формулировки в расчёте, календаре и публичных результатах" }
      : querySafety === "sensitive"
        ? { title: "мы не рассчитываем важные решения", text: "для медицинских, финансовых, юридических и срочных вопросов лучше опираться на профильного специалиста" }
        : querySafety === "high-risk"
          ? { title: "для такого запроса нет расчёта", text: "календарь не должен подсказывать даты для опасных действий" }
          : { title: "пока не понимаем этот запрос", text: "попробуйте изменить формулировку или очистить поиск и выбрать дело из каталога" };

  function renderIntentOption(intent: Intent) {
    return (
      <button
        type="button"
        key={intent.id}
        className={showSelection && intent.id === current.id ? "selected" : ""}
        onClick={() => onSelect(intent)}
      >
        <span className="picker-option-content">
          <intent.Icon weight="regular" aria-hidden="true" />
          <span>{intent.label}</span>
        </span>
        {showSelection && intent.id === current.id && <Check weight="bold" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <div className="picker-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <header className="picker-header">
          <h2 id="picker-title">выберите дело</h2>
          <button type="button" className="round-button" onClick={onClose} aria-label="Закрыть">
            <X size={22} weight="regular" />
          </button>
        </header>

        <div className="picker-search">
          <MagnifyingGlass aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value.slice(0, 48))}
            placeholder="найдите дело в каталоге"
            maxLength={48}
            aria-label="поиск дела"
          />
          {query && (
            <button type="button" className="picker-search-clear" onClick={() => setQuery("")} aria-label="очистить поиск">
              <X weight="bold" />
            </button>
          )}
        </div>

        <div className="picker-options" key={normalizedQuery ? "search" : "catalog"}>
          {sections.map((section) => section.items.length > 0 && (
            <section className="picker-group" key={section.title} aria-label={section.title}>
              <h3>{section.title}</h3>
              <div>{section.items.map(renderIntentOption)}</div>
            </section>
          ))}
          {feedback && (
            <section className={`picker-feedback feedback-${querySafety}`} role="status" aria-live="polite">
              <MagicWand weight="regular" aria-hidden="true" />
              <div><h3>{feedback.title}</h3><p>{feedback.text}</p></div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreInfoSheet({ day, onClose }: { day: Day; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="score-sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="score-sheet" role="dialog" aria-modal="true" aria-labelledby="score-sheet-title">
        <header>
          <div>
            <p>прозрачная формула mvp</p>
            <h2 id="score-sheet-title">как получили {day.score} из 100</h2>
          </div>
          <button type="button" className="round-button" onClick={onClose} aria-label="Закрыть объяснение">
            <X weight="regular" />
          </button>
        </header>
        <p className="score-explainer">это индекс совпадения по нашей методике, а не вероятность события и не обещание результата</p>
        <div className="score-factors">
          <div className="score-factor">
            <div><span>совпадение с фазой для выбранного дела</span><strong>{day.score} / 100</strong></div>
            <span className="score-track"><span style={{ width: `${day.score}%` }} /></span>
          </div>
        </div>
        <p className="score-footnote">фазовый угол дня — {Math.round(day.moonPhaseAngle)}°, символическая точка дела — {day.targetPhaseAngle}°, расстояние — {Math.round(day.phaseDistance)}°</p>
        <p className="score-footnote">день недели и близость даты не добавляют баллы, ближайшая дата получает приоритет только среди почти равных результатов</p>
      </section>
    </div>
  );
}

function WeekStrip({ days, activeId, onSelect }: { days: Day[]; activeId: string; onSelect: (day: Day) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fadeEdges, setFadeEdges] = useState({ left: false, right: true });
  const [scrollPosition, setScrollPosition] = useState(0);
  const selectedIndex = Math.max(0, days.findIndex((day) => day.id === activeId));
  const selectionStyle = {
    "--selection-offset": `${18 + selectedIndex * 54 - scrollPosition}px`,
  } as CSSProperties;

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    const target = selectedIndex * 54 - viewport.clientWidth / 2 + 26;
    viewport.scrollTo({
      left: Math.max(0, target),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [selectedIndex]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const updateFadeEdges = () => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      setFadeEdges({
        left: viewport.scrollLeft > 2,
        right: viewport.scrollLeft < maxScroll - 2,
      });
      setScrollPosition(viewport.scrollLeft);
    };

    updateFadeEdges();
    viewport.addEventListener("scroll", updateFadeEdges, { passive: true });
    const resizeObserver = new ResizeObserver(updateFadeEdges);
    resizeObserver.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", updateFadeEdges);
      resizeObserver.disconnect();
    };
  }, [days.length]);

  return (
    <div className="week-strip-frame">
      <div
        className="week-strip-scroll"
        ref={scrollRef}
        aria-label="Ближайшие четырнадцать дней"
        data-fade-left={fadeEdges.left}
        data-fade-right={fadeEdges.right}
      >
        <div className="week-strip">
          {days.map((day) => (
            <button
              type="button"
              key={day.id}
              className={`day-cell status-${day.rating} ${day.id === activeId ? "selected" : ""}`}
              onClick={() => onSelect(day)}
              aria-pressed={day.id === activeId}
              aria-label={`${day.longDate}: ${day.score} из 100, ${ratingLabels[day.rating]}`}
            >
              <span className="day-number">{day.day}</span>
              <span className="day-meta"><img src={statusIcons[day.rating]} alt="" />{day.weekday}</span>
            </button>
          ))}
        </div>
      </div>
      <span className="week-selection" style={selectionStyle} aria-hidden="true" />
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"start" | "result">("start");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [intent, setIntent] = useState(intents[0]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const days = useMemo(() => buildCurrentWeek(intent.archetype), [intent.archetype]);
  const initialBestId = pickPreferredDay(days).id;
  const [hasChosenIntent, setHasChosenIntent] = useState(false);
  const [activeId, setActiveId] = useState(initialBestId);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackAnswer, setFeedbackAnswer] = useState<"helpful" | "not_helpful" | null>(null);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const calendarStatusTimer = useRef<number | null>(null);
  const feedbackStatusTimer = useRef<number | null>(null);

  const active = days.find((day) => day.id === activeId) ?? days[1];
  const bestDay = pickPreferredDay(days);
  const alternatives = useMemo(
    () => {
      const goodDays = days
        .filter((day) => day.rating === "good")
        .sort((left, right) => right.score - left.score);

      if (active.id === bestDay.id) return goodDays.slice(0, 2);
      if (active.rating === "good") {
        return [bestDay, ...goodDays.filter((day) => day.id !== active.id)].slice(0, 2);
      }
      return [bestDay];
    },
    [active.id, active.rating, bestDay, days],
  );
  const reasons = buildReasons(intent, active);

  useEffect(() => () => {
    if (calendarStatusTimer.current) window.clearTimeout(calendarStatusTimer.current);
    if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
  }, []);

  useEffect(() => {
    const restoreFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const intentId = params.get("intent");
      const restoredIntent = intents.find((candidate) => candidate.id === intentId);

      if (!restoredIntent) {
        setScreen("start");
        setHasChosenIntent(false);
        return;
      }

      const restoredDays = buildCurrentWeek(restoredIntent.archetype);
      const requestedDate = params.get("date");
      const restoredDay = restoredDays.find((day) => day.dateIso === requestedDate) ?? pickPreferredDay(restoredDays);
      setIntent(restoredIntent);
      setHasChosenIntent(true);
      setScreen("result");
      setActiveId(restoredDay.id);
      setSaved(false);
      if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
      setFeedbackVisible(false);
      setFeedbackAnswer(null);
      trackEvent("result_viewed", {
        intentId: restoredIntent.id,
        archetype: restoredIntent.archetype,
        selectedDate: restoredDay.dateIso,
        score: restoredDay.score,
      });
    };

    configureAnalyticsFromUrl();
    trackEvent("page_view");
    restoreFromUrl();
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);

  useEffect(() => {
    if (screen !== "start" || pickerOpen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ticker = window.setInterval(() => {
      setPreviewIndex((index) => (index + 1) % previewIntents.length);
    }, 2600);
    return () => window.clearInterval(ticker);
  }, [pickerOpen, screen]);

  function chooseIntent(nextIntent: Intent) {
    const nextDays = buildCurrentWeek(nextIntent.archetype);
    const nextDay = pickPreferredDay(nextDays);
    setIntent(nextIntent);
    setHasChosenIntent(true);
    setPickerOpen(false);
    setScreen("result");
    setActiveId(nextDay.id);
    setSaved(false);
    if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
    setFeedbackVisible(false);
    setFeedbackAnswer(null);
    window.history.pushState({}, "", resultUrl(nextIntent.id, nextDay.dateIso));
    trackEvent("intent_selected", { intentId: nextIntent.id, archetype: nextIntent.archetype });
    trackEvent("result_viewed", {
      intentId: nextIntent.id,
      archetype: nextIntent.archetype,
      selectedDate: nextDay.dateIso,
      score: nextDay.score,
    });
  }

  function chooseDay(day: Day) {
    if (day.id === activeId) return;
    if (calendarStatusTimer.current) window.clearTimeout(calendarStatusTimer.current);
    setActiveId(day.id);
    setSaved(false);
    if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
    setFeedbackVisible(false);
    setFeedbackAnswer(null);
    window.history.pushState({}, "", resultUrl(intent.id, day.dateIso));
    trackEvent("day_selected", {
      intentId: intent.id,
      archetype: intent.archetype,
      selectedDate: day.dateIso,
      score: day.score,
    });
  }

  function addToCalendar() {
    const start = active.dateIso.replaceAll("-", "");
    const next = new Date(`${active.dateIso}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const end = next.toISOString().slice(0, 10).replaceAll("-", "");
    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:polune — ${intent.label}`,
      `DESCRIPTION:${active.score} из 100 · ${ratingLabels[active.rating]}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `polune-${active.dateIso}.ics`;
    link.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    if (!feedbackAnswer) setFeedbackVisible(true);
    trackEvent("calendar_added", {
      intentId: intent.id,
      archetype: intent.archetype,
      selectedDate: active.dateIso,
      score: active.score,
    });
    if (calendarStatusTimer.current) window.clearTimeout(calendarStatusTimer.current);
    calendarStatusTimer.current = window.setTimeout(() => setSaved(false), 2600);
  }

  async function shareResult() {
    const text = `${active.longDate} — ${active.score} из 100 для дела «${intent.label}» · подсказка polune`;
    const url = resultUrl(intent.id, active.dateIso).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: "polune", text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      }
      setShared(true);
      if (!feedbackAnswer) setFeedbackVisible(true);
      trackEvent("result_shared", {
        intentId: intent.id,
        archetype: intent.archetype,
        selectedDate: active.dateIso,
        score: active.score,
      });
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      // Отмена системного share не является ошибкой для пользователя.
    }
  }

  function submitFeedback(answer: "helpful" | "not_helpful") {
    if (feedbackAnswer) return;
    setFeedbackAnswer(answer);
    trackEvent(answer === "helpful" ? "feedback_helpful" : "feedback_not_helpful", {
      intentId: intent.id,
      archetype: intent.archetype,
      selectedDate: active.dateIso,
      score: active.score,
    });
    if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
    feedbackStatusTimer.current = window.setTimeout(() => setFeedbackVisible(false), 1800);
  }

  if (screen === "start") {
    return (
      <main className="app-shell start-screen" id="top">
        <div className="start-content">
          <Brand />
          <h1>узнать благоприятный<br />день, чтобы</h1>
          <IntentLine intent={previewIntents[previewIndex]} animated={!pickerOpen} onClick={() => setPickerOpen(true)} />
          <p className="intent-hint">нажмите, чтобы открыть каталог</p>
        </div>
        {pickerOpen && <IntentPicker current={intent} showSelection={hasChosenIntent} onClose={() => setPickerOpen(false)} onSelect={chooseIntent} />}
      </main>
    );
  }

  return (
    <main className="app-shell result-screen" id="top">
      <div className="result-content">
        <Brand />

        <header className="result-hero">
          <h1>благоприятный<br />день, чтобы</h1>
          <IntentLine intent={intent} onClick={() => setPickerOpen(true)} />
        </header>

        <WeekStrip days={days} activeId={active.id} onSelect={chooseDay} />

        <article className="featured-card" key={active.id} aria-live="polite">
          <div className={`score-label status-${active.rating}`}>
            <img src={statusIcons[active.rating]} alt="" />
            <span>{active.score}% · {ratingLabels[active.rating]}</span>
            <button
              type="button"
              className="score-info-button"
              onClick={() => setScoreInfoOpen(true)}
              aria-label={`Как рассчитали ${active.score} из 100`}
            >
              <Info size={16} weight="regular" />
            </button>
          </div>

          <div className="featured-date">
            <strong>{active.day}</strong>
            <span>{active.monthLabel}</span>
          </div>

          <div className="reason-list">
            {reasons.map((reason) => (
              <div className="reason" key={reason.title}>
                <div className="reason-title"><reason.Icon weight="regular" aria-hidden="true" /><h2>{reason.title}</h2></div>
                <p>{reason.text}</p>
              </div>
            ))}
          </div>

          <div className="featured-actions">
            <button type="button" className={`calendar-button ${saved ? "saved" : ""}`} onClick={addToCalendar} disabled={saved} aria-live="polite">
              {saved ? "добавлено в календарь" : "добавить в календарь"}
            </button>
            <button type="button" className="share-button" onClick={shareResult} aria-label="Поделиться результатом">
              {shared ? <Check size={28} weight="bold" /> : <img src="/figma/share.svg" alt="" />}
            </button>
          </div>
        </article>

        {feedbackVisible && (
          <section className="result-feedback" aria-live="polite" aria-label="Обратная связь о рекомендации">
            {feedbackAnswer ? (
              <p className="feedback-thanks">спасибо, это поможет улучшить рекомендации</p>
            ) : (
              <>
                <p>рекомендация была полезна?</p>
                <div>
                  <button type="button" onClick={() => submitFeedback("helpful")}>
                    <ThumbsUp weight="regular" aria-hidden="true" />да
                  </button>
                  <button type="button" onClick={() => submitFeedback("not_helpful")}>
                    <ThumbsDown weight="regular" aria-hidden="true" />не очень
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <section className="alternative-days" key={`alternatives-${active.id}`} aria-label="Быстрый выбор подходящего дня">
          {alternatives.map((day, index) => (
            <button
              type="button"
              key={day.id}
              style={{ animationDelay: `${index * 45}ms` }}
              onClick={() => chooseDay(day)}
              aria-label={`Открыть ${day.longDate}: ${day.score} из 100, ${ratingLabels[day.rating]}`}
            >
              <span className="alternative-date">
                <span>{day.longDate}</span>
              </span>
              <span className={`alternative-score status-${day.rating}`}>
                <img src={statusIcons[day.rating]} alt="" />{day.score}%
              </span>
            </button>
          ))}
        </section>

        <section className="trust-panel">
          <h2>наш подход — подсказка,<br />а не предсказание</h2>
          <ol>
            <li><span>01</span>используем реальные фазы луны и одну последовательную традицию</li>
            <li><span>02</span>отделяем астрономический факт от символической интерпретации</li>
            <li><span>03</span>не советуем откладывать медицинские, финансовые и другие важные решения</li>
          </ol>
        </section>
      </div>

      {pickerOpen && <IntentPicker current={intent} showSelection={hasChosenIntent} onClose={() => setPickerOpen(false)} onSelect={chooseIntent} />}
      {scoreInfoOpen && <ScoreInfoSheet day={active} onClose={() => setScoreInfoOpen(false)} />}
    </main>
  );
}
