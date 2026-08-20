"use client";

/* eslint-disable @next/next/no-img-element -- exact local SVG assets exported from Figma */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Fuse from "fuse.js";
import { EclipticGeoMoon, MoonPhase } from "astronomy-engine";
import {
  angularDistance,
  archetypeTargets,
  calculateMethodScore,
  METHOD_VERSION,
  PHASE_WEIGHT,
  pickPreferredDay,
  ratingForScore,
  ZODIAC_WEIGHT,
  zodiacSignIndex,
  zodiacSignNames,
} from "@/lib/methodology";
import type { Rating, ZodiacProfile } from "@/lib/methodology";
import { intentCatalog } from "@/lib/intent-catalog";
import type { CatalogIconKey, IntentDefinition } from "@/lib/intent-catalog";
import { intentZodiacProfiles } from "@/lib/intent-profiles";
import { classifyQuerySafety, isConfidentCatalogMatch } from "@/lib/query-safety";
import { configureAnalyticsFromUrl, trackEvent } from "@/lib/analytics";
import RevealTransition from "./reveal-transition";
import type { Icon } from "@phosphor-icons/react";
import {
  AirplaneTilt,
  ArrowCircleUpLeft,
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
  MoonStars,
  MusicNotes,
  PaintBrush,
  PawPrint,
  PencilSimple,
  PersonSimpleRun,
  Plant,
  Scissors,
  ShoppingBag,
  Sparkle,
  TrendUp,
  ThumbsDown,
  ThumbsUp,
  UsersThree,
  Wrench,
  X,
} from "@phosphor-icons/react";

type Intent = Omit<IntentDefinition, "icon"> & { Icon: Icon; zodiacProfile: ZodiacProfile };

type Day = {
  id: string;
  dateIso: string;
  day: string;
  weekday: string;
  longDate: string;
  monthLabel: string;
  score: number;
  phaseScore: number;
  zodiacScore: number;
  rating: Rating;
  moonPhaseAngle: number;
  moonPhaseLabel: string;
  targetPhaseAngle: number;
  phaseDistance: number;
  lunarLongitude: number;
  zodiacSignName: string;
};

type PersonalizationData = {
  zodiac: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeUnknown: boolean;
};

const zodiacSigns = [
  "овен", "телец", "близнецы", "рак", "лев", "дева",
  "весы", "скорпион", "стрелец", "козерог", "водолей", "рыбы",
];

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
  zodiacProfile: intentZodiacProfiles[intent.id],
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

function buildCurrentWeek(intent: Pick<Intent, "archetype" | "zodiacProfile">, count = 14, fromMonthStart = false): Day[] {
  const anchor = currentMoscowDate();
  if (fromMonthStart) anchor.setUTCDate(1);
  const calculatedDays = Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCDate(anchor.getUTCDate() + index);
    const day = String(date.getUTCDate());
    const dateIso = date.toISOString().slice(0, 10);
    const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", "");
    const monthLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" })
      .formatToParts(date)
      .find((part) => part.type === "month")?.value ?? "";
    const moonPhaseAngle = MoonPhase(date);
    const lunarLongitude = EclipticGeoMoon(date).lon;
    const { score, phaseScore, zodiacScore } = calculateMethodScore(
      moonPhaseAngle,
      lunarLongitude,
      intent.archetype,
      intent.zodiacProfile,
    );
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
      phaseScore,
      zodiacScore,
      rating: ratingForScore(score),
      moonPhaseAngle,
      moonPhaseLabel,
      targetPhaseAngle: archetypeTargets[intent.archetype],
      phaseDistance: angularDistance(moonPhaseAngle, archetypeTargets[intent.archetype]),
      lunarLongitude,
      zodiacSignName: zodiacSignNames[zodiacSignIndex(lunarLongitude)],
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
  { id: "catalog-preview", label: "найти дело в каталоге", group: "каталог", Icon: MagnifyingGlass, archetype: "planning", zodiacProfile: "learning" },
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

const intentResultCopy: Partial<Record<string, { verdict: string; advice: string }>> = {
  haircut: {
    verdict: "день для мягкого обновления",
    advice: "Освежите форму и детали, не меняя образ целиком.",
  },
  skincare: {
    verdict: "день для бережного ухода",
    advice: "Выберите знакомую процедуру и оставьте коже время на восстановление.",
  },
  cleaning: {
    verdict: "легче освободить пространство",
    advice: "Начните с одной заметной зоны — ритм дня поможет не бросить на середине.",
  },
  conversation: {
    verdict: "слова прозвучат спокойнее",
    advice: "Начните с главного и оставьте собеседнику место для ответа.",
  },
  trip: {
    verdict: "подходящий ритм для дороги",
    advice: "Заложите запас времени и заранее закройте бытовые мелочи.",
  },
  habit: {
    verdict: "хорошая точка для старта",
    advice: "Сделайте первый шаг настолько маленьким, чтобы повторить его завтра.",
  },
};

function buildResultCopy(intent: Intent, day: Day) {
  const specific = intentResultCopy[intent.id];
  if (specific) return specific;
  if (day.rating === "low" || day.rating === "caution") {
    return {
      verdict: "день просит меньше спешки",
      advice: "Если дата уже выбрана, оставьте больше времени и не перегружайте план.",
    };
  }
  return {
    verdict: "ритм дня поддерживает ваше дело",
    advice: "Выберите один ясный шаг и заранее освободите для него время.",
  };
}

function StartLogo() {
  return (
    <a className="start-logo" href="#top" aria-label="polune — на главную">
      <img src="/figma/start-logo.svg" alt="" />
      <span>polune</span>
    </a>
  );
}

function StartControls() {
  return (
    <header className="start-controls">
      <button className="start-header-action" type="button" aria-label="личный профиль — скоро" disabled>
        <img src="/figma/start-user.svg" alt="" />
      </button>
    </header>
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

function IntentLine({
  intent,
  onClick,
  animated = false,
  showCaret = false,
}: {
  intent: Intent;
  onClick: () => void;
  animated?: boolean;
  showCaret?: boolean;
}) {
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
          {showCaret && intent.id === "haircut"
            ? <img className="intent-leading-image" src="/figma/intent-scissors.svg" alt="" />
            : <IntentIcon weight="bold" aria-hidden="true" />}
          <span className="intent-text-line">{firstLine}</span>
          {showCaret && !secondLine && <img className="intent-caret" src="/figma/start-caret.svg" alt="" />}
        </span>
        {secondLine && (
          <span className="intent-second-row">
            <span className="intent-text-line intent-second-line">{secondLine}</span>
            {showCaret && <img className="intent-caret" src="/figma/start-caret.svg" alt="" />}
          </span>
        )}
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
            <div><span>фаза луны · {Math.round(PHASE_WEIGHT * 100)}%</span><strong>{day.phaseScore} / 100</strong></div>
            <span className="score-track"><span style={{ width: `${day.phaseScore}%` }} /></span>
          </div>
          <div className="score-factor">
            <div><span>луна в {day.zodiacSignName.toLowerCase()} · {Math.round(ZODIAC_WEIGHT * 100)}%</span><strong>{day.zodiacScore} / 100</strong></div>
            <span className="score-track"><span style={{ width: `${day.zodiacScore}%` }} /></span>
          </div>
        </div>
        <p className="score-footnote">фазовый угол дня — {Math.round(day.moonPhaseAngle)}°, символическая точка дела — {day.targetPhaseAngle}°, расстояние — {Math.round(day.phaseDistance)}°</p>
        <p className="score-footnote">эклиптическая долгота луны — {Math.round(day.lunarLongitude)}°, знак — {day.zodiacSignName}</p>
        <p className="score-footnote">день недели и близость даты не добавляют баллы, ближайшая дата получает приоритет только при равном результате</p>
      </section>
    </div>
  );
}

function PersonalizationSheet({
  current,
  onClose,
  onComplete,
}: {
  current: PersonalizationData | null;
  onClose: () => void;
  onComplete: (data: PersonalizationData) => void;
}) {
  const [step, setStep] = useState<"zodiac" | "birth">("zodiac");
  const [zodiac, setZodiac] = useState(current?.zodiac ?? "");
  const [birthDate, setBirthDate] = useState(current?.birthDate ?? "");
  const [birthTime, setBirthTime] = useState(current?.birthTime ?? "");
  const [birthPlace, setBirthPlace] = useState(current?.birthPlace ?? "");
  const [timeUnknown, setTimeUnknown] = useState(current?.timeUnknown ?? true);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function finish() {
    if (!zodiac) return;
    onComplete({ zodiac, birthDate, birthTime: timeUnknown ? "" : birthTime, birthPlace, timeUnknown });
  }

  return (
    <div className="profile-sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title">
        <header>
          <div>
            <p>{step === "zodiac" ? "шаг 1 из 2" : "необязательный шаг"}</p>
            <h2 id="profile-sheet-title">{step === "zodiac" ? "кто вы по знаку" : "данные рождения"}</h2>
          </div>
          <button type="button" className="round-button" onClick={onClose} aria-label="Закрыть персонализацию">
            <X weight="regular" />
          </button>
        </header>

        {step === "zodiac" ? (
          <>
            <p className="profile-sheet-lead">Этого достаточно для быстрого персонального уточнения. Регистрация пока не нужна.</p>
            <div className="zodiac-grid" role="radiogroup" aria-label="Знак зодиака">
              {zodiacSigns.map((sign) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={zodiac === sign}
                  className={zodiac === sign ? "selected" : ""}
                  key={sign}
                  onClick={() => setZodiac(sign)}
                >
                  {sign}
                </button>
              ))}
            </div>
            <button type="button" className="profile-primary" disabled={!zodiac} onClick={finish}>уточнить результат</button>
            <button type="button" className="profile-secondary" onClick={() => setStep("birth")}>указать дату рождения</button>
          </>
        ) : (
          <>
            <p className="profile-sheet-lead">Эти данные сохранятся только после входа. Пока они используются как черновик на этом экране.</p>
            <label className="profile-field">
              <span>дата рождения</span>
              <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </label>
            <label className="profile-check">
              <input type="checkbox" checked={timeUnknown} onChange={(event) => setTimeUnknown(event.target.checked)} />
              <span>не знаю точное время рождения</span>
            </label>
            {!timeUnknown && (
              <label className="profile-field">
                <span>время рождения</span>
                <input type="time" value={birthTime} onChange={(event) => setBirthTime(event.target.value)} />
              </label>
            )}
            <label className="profile-field">
              <span>место рождения <small>необязательно</small></span>
              <input value={birthPlace} onChange={(event) => setBirthPlace(event.target.value.slice(0, 80))} placeholder="город" maxLength={80} />
            </label>
            <button type="button" className="profile-primary" disabled={!zodiac} onClick={finish}>применить данные</button>
            <button type="button" className="profile-secondary" onClick={() => setStep("zodiac")}>назад к выбору знака</button>
          </>
        )}
      </section>
    </div>
  );
}

function createStarSeeds(count: number) {
  let seed = 0x51f15e;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, index) => {
    const intensity = random();
    return {
      left: random() * 100,
      top: random() * 100,
      size: intensity > .965 ? 4.2 : intensity > .86 ? 2.5 : intensity > .58 ? 1.45 : .8,
      opacity: .26 + intensity * .72,
      delay: -(random() * 7),
      duration: 3.4 + random() * 6.8,
      bright: intensity > .92,
      flare: intensity > .982,
      index,
    };
  });
}

const starSeeds = createStarSeeds(268);

function Starfield() {
  return (
    <div className="starfield" aria-hidden="true">
      <div className="star-nebula" />
      {starSeeds.map((star) => (
        <i
          className={`star ${star.bright ? "star-bright" : ""} ${star.flare ? "star-flare" : ""}`}
          key={star.index}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
      <i className="shooting-star shooting-star-one" />
      <i className="shooting-star shooting-star-two" />
    </div>
  );
}

function MoonPhaseIllustration({ angle, label }: { angle: number; label: string }) {
  const normalized = ((angle % 360) + 360) % 360;
  const waxing = normalized <= 180;
  const illumination = (1 - Math.cos((normalized * Math.PI) / 180)) / 2;
  const shadowShift = (waxing ? -1 : 1) * illumination * 110;
  return (
    <div
      className={`phase-moon ${waxing ? "is-waxing" : "is-waning"}`}
      role="img"
      aria-label={`${label}, освещено ${Math.round(illumination * 100)}%`}
      style={{ "--moon-shadow-shift": `${shadowShift}%` } as CSSProperties}
    >
      <span className="phase-moon-surface" />
      <span className="phase-moon-shadow" />
    </div>
  );
}

function ResultCalendar({
  days,
  activeId,
  expanded,
  onExpandedChange,
  onSelect,
}: {
  days: Day[];
  activeId: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (day: Day) => void;
}) {
  const dragStart = useRef<number | null>(null);
  const visibleDays = days.slice(0, 62);
  const todayIso = currentMoscowDate().toISOString().slice(0, 10);
  const peekDays = visibleDays.filter((day) => day.dateIso >= todayIso).slice(0, 14);
  const monthGroups = visibleDays.reduce<Array<{ key: string; title: string; days: Day[] }>>((groups, day) => {
    const key = day.dateIso.slice(0, 7);
    const last = groups.at(-1);
    if (last?.key === key) last.days.push(day);
    else groups.push({
      key,
      title: new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(new Date(`${day.dateIso}T12:00:00Z`)),
      days: [day],
    });
    return groups;
  }, []).slice(0, 2);

  return (
    <section className={`result-calendar ${expanded ? "is-expanded" : ""}`} aria-label="Календарь подходящих дней">
      <button
        type="button"
        className="calendar-grabber"
        aria-expanded={expanded}
        aria-label={expanded ? "Свернуть календарь" : "Развернуть календарь"}
        onClick={() => onExpandedChange(!expanded)}
        onPointerDown={(event) => {
          dragStart.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          if (dragStart.current === null) return;
          const distance = dragStart.current - event.clientY;
          if (Math.abs(distance) > 24) onExpandedChange(distance > 0);
          dragStart.current = null;
        }}
      ><span /></button>

      {!expanded ? (
        <div className="calendar-peek">
          {peekDays.map((day) => (
            <button
              type="button"
              key={day.id}
              className={`calendar-peek-day status-${day.rating} ${day.id === activeId ? "selected" : ""}`}
              onClick={() => onSelect(day)}
              aria-label={`${day.longDate}: ${day.score}%`}
            >
              <span>{day.day}</span>
              <small><img src={statusIcons[day.rating]} alt="" />{day.weekday}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="calendar-months">
          {monthGroups.map((group) => (
            <section key={group.key}>
              <h2>{group.title}</h2>
              <div className="calendar-weekdays" aria-hidden="true">
                {['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((weekday) => <span key={weekday}>{weekday}</span>)}
              </div>
              <div className="calendar-month-grid">
                {group.days.map((day, index) => (
                  <button
                    type="button"
                    key={day.id}
                    className={`status-${day.rating} ${day.id === activeId ? "selected" : ""}`}
                    onClick={() => onSelect(day)}
                    style={index === 0
                      ? { gridColumnStart: ((new Date(`${day.dateIso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1 }
                      : undefined}
                  >
                    <span>{day.day}</span>
                    <img src={statusIcons[day.rating]} alt="" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<"start" | "result">("start");
  const startTheme = "dark" as const;
  const [pendingReveal, setPendingReveal] = useState<{ intent: Intent; day: Day } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [intent, setIntent] = useState(intents[0]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const days = useMemo(() => buildCurrentWeek(intent), [intent]);
  const calendarDays = useMemo(() => buildCurrentWeek(intent, 62, true), [intent]);
  const initialBestId = pickPreferredDay(days).id;
  const [hasChosenIntent, setHasChosenIntent] = useState(false);
  const [activeId, setActiveId] = useState(initialBestId);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackAnswer, setFeedbackAnswer] = useState<"helpful" | "not_helpful" | null>(null);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null);
  const [personalizationBubbleVisible, setPersonalizationBubbleVisible] = useState(false);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const calendarStatusTimer = useRef<number | null>(null);
  const feedbackStatusTimer = useRef<number | null>(null);

  const active = days.find((day) => day.id === activeId) ?? calendarDays.find((day) => day.id === activeId) ?? days[1];
  const resultCopy = buildResultCopy(intent, active);

  useEffect(() => {
    if (screen !== "result" || pendingReveal) return;
    const timer = window.setTimeout(() => setPersonalizationBubbleVisible(true), 2200);
    return () => window.clearTimeout(timer);
  }, [active.id, pendingReveal, screen]);

  useEffect(() => () => {
    if (calendarStatusTimer.current) window.clearTimeout(calendarStatusTimer.current);
    if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
  }, []);

  useEffect(() => {
    const themeColor = "#020002";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [screen]);

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

      const restoredCalendarDays = buildCurrentWeek(restoredIntent, 62, true);
      const restoredDays = buildCurrentWeek(restoredIntent);
      const requestedDate = params.get("date");
      const restoredDay = restoredCalendarDays.find((day) => day.dateIso === requestedDate) ?? pickPreferredDay(restoredDays);
      setIntent(restoredIntent);
      setPersonalizationBubbleVisible(false);
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
    if (screen !== "start" || pickerOpen || pendingReveal || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ticker = window.setInterval(() => {
      setPreviewIndex((index) => (index + 1) % previewIntents.length);
    }, 2600);
    return () => window.clearInterval(ticker);
  }, [pendingReveal, pickerOpen, screen]);

  function chooseIntent(nextIntent: Intent) {
    const nextDays = buildCurrentWeek(nextIntent, 62).slice(0, 14);
    const nextDay = pickPreferredDay(nextDays);
    setIntent(nextIntent);
    setPersonalizationBubbleVisible(false);
    setHasChosenIntent(true);
    setPickerOpen(false);
    setActiveId(nextDay.id);
    setSaved(false);
    if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
    setFeedbackVisible(false);
    setFeedbackAnswer(null);
    setPendingReveal({ intent: nextIntent, day: nextDay });
    setScreen("result");
    trackEvent("intent_selected", { intentId: nextIntent.id, archetype: nextIntent.archetype });
  }

  function finishReveal() {
    if (!pendingReveal) return;
    const { intent: nextIntent, day: nextDay } = pendingReveal;
    setScreen("result");
    setPendingReveal(null);
    window.history.pushState({}, "", resultUrl(nextIntent.id, nextDay.dateIso));
    trackEvent("result_viewed", {
      intentId: nextIntent.id,
      archetype: nextIntent.archetype,
      selectedDate: nextDay.dateIso,
      score: nextDay.score,
    });
  }

  function chooseDay(day: Day) {
    if (day.id === activeId) return;
    setPersonalizationBubbleVisible(false);
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
      <main className={`app-shell start-screen theme-${startTheme}`} id="top">
        <Starfield />
        <div className="start-content">
          <StartControls />
          <StartLogo />
          <div className="start-prompt">
            <h1>узнать<br />благоприятный<br />день, чтобы</h1>
            <IntentLine
              intent={previewIntents[previewIndex]}
              animated={!pickerOpen}
              showCaret
              onClick={() => setPickerOpen(true)}
            />
          </div>
          <button className="start-primary" type="button" onClick={() => setPickerOpen(true)}>
            выбрать дело
          </button>
        </div>
        {pendingReveal && (
          <RevealTransition
            theme={startTheme}
            intentLabel={pendingReveal.intent.label}
            selectedDay={pendingReveal.day}
            candidates={days}
            onComplete={finishReveal}
          />
        )}
        {pickerOpen && <IntentPicker current={intent} showSelection={hasChosenIntent} onClose={() => setPickerOpen(false)} onSelect={chooseIntent} />}
      </main>
    );
  }

  return (
    <main className={`app-shell result-screen theme-${startTheme}`} id="top">
      <Starfield />
      <div className="result-content">
        <header className="result-topbar">
          <button
            className="result-icon-button"
            type="button"
            onClick={() => {
              window.history.pushState({}, "", window.location.pathname);
              setScreen("start");
              setHasChosenIntent(false);
              setCalendarExpanded(false);
              setPersonalizationBubbleVisible(false);
            }}
            aria-label="Вернуться и выбрать другое дело"
          >
            <img src="/figma/result-back.svg" alt="" />
          </button>
          <span />
          <button className="result-icon-button" type="button" onClick={shareResult} aria-label="Поделиться результатом">
            {shared ? <Check size={22} weight="bold" /> : <img src="/figma/result-share.svg" alt="" />}
          </button>
        </header>

        <article className="result-cosmic-card" key={active.id} aria-live="polite">
          <div className="moon-stage">
            <MoonPhaseIllustration angle={active.moonPhaseAngle} label={active.moonPhaseLabel} />
            {personalizationBubbleVisible && (
              <button type="button" className="personalization-bubble" onClick={() => setPersonalizationOpen(true)}>
                <img src="/figma/personalization-calendar.png" alt="" />
                {personalization ? `для вас · ${personalization.zodiac}` : "персонализировать под вас"}
              </button>
            )}
          </div>

          <div className="result-date-line">
            <strong>{active.day} {active.monthLabel.split(",")[0]}</strong>
          </div>

          <div className="result-guidance">
            <p>
              <strong>{active.rating === "excellent" ? "лучший " : ""}{resultCopy.verdict}.</strong>{" "}
              <ArrowCircleUpLeft className="result-guidance-icon" weight="regular" aria-hidden="true" />{" "}
              <span>{resultCopy.advice}</span>
            </p>
          </div>

          <button type="button" className={`result-score-row status-${active.rating}`} onClick={() => setScoreInfoOpen(true)}>
            <img src={statusIcons[active.rating]} alt="" />
            <span>{active.score}% совпадение</span>
            <Info weight="regular" aria-hidden="true" />
          </button>

          <button type="button" className={`result-calendar-action ${saved ? "saved" : ""}`} onClick={addToCalendar} disabled={saved} aria-live="polite">
            {saved ? "добавлено в календарь" : "добавить в календарь"}
          </button>
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

      </div>

      <ResultCalendar
        days={calendarDays}
        activeId={active.id}
        expanded={calendarExpanded}
        onExpandedChange={setCalendarExpanded}
        onSelect={(day) => {
          chooseDay(day);
          if (calendarExpanded) setCalendarExpanded(false);
        }}
      />

      {pickerOpen && <IntentPicker current={intent} showSelection={hasChosenIntent} onClose={() => setPickerOpen(false)} onSelect={chooseIntent} />}
      {pendingReveal && (
        <RevealTransition
          theme={startTheme}
          intentLabel={pendingReveal.intent.label}
          selectedDay={pendingReveal.day}
          candidates={days}
          onComplete={finishReveal}
        />
      )}
      {scoreInfoOpen && <ScoreInfoSheet day={active} onClose={() => setScoreInfoOpen(false)} />}
      {personalizationOpen && (
        <PersonalizationSheet
          current={personalization}
          onClose={() => setPersonalizationOpen(false)}
          onComplete={(data) => {
            setPersonalization(data);
            setPersonalizationOpen(false);
            trackEvent("personalization_completed", { intentId: intent.id, selectedDate: active.dateIso });
          }}
        />
      )}
    </main>
  );
}
