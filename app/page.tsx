"use client";

/* eslint-disable @next/next/no-img-element -- exact local SVG assets exported from Figma */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Fuse from "fuse.js";
import {
  METHOD_VERSION,
  PHASE_WEIGHT,
  pickPreferredDay,
  ZODIAC_WEIGHT,
} from "@/lib/methodology";
import type { Rating, ZodiacProfile } from "@/lib/methodology";
import {
  buildCalendarDays,
  buildTwoMonthCalendarDays,
  currentMoscowDate,
  moscowDateIso,
  resolveRequestedCalendarDay,
} from "@/lib/calendar";
import type { CalendarDay } from "@/lib/calendar";
import { intentCatalog } from "@/lib/intent-catalog";
import type { CatalogIconKey, IntentDefinition } from "@/lib/intent-catalog";
import { intentZodiacProfiles } from "@/lib/intent-profiles";
import { classifyQuerySafety, isConfidentCatalogMatch } from "@/lib/query-safety";
import { configureAnalyticsFromUrl, trackEvent } from "@/lib/analytics";
import { keepRussianPrepositionsWithNextWord } from "@/lib/typography";
import { buildGoogleCalendarUrl, buildIcsCalendarEvent } from "@/lib/calendar-actions";
import { detectCalendarProvider } from "@/lib/calendar-preference";
import type { CalendarProvider } from "@/lib/calendar-preference";
import type { GeocodedBirthPlace } from "@/lib/geocoding";
import type { BirthTimePeriod } from "@/lib/natal";
import {
  personalizeCalendar,
  resolvePersonalProfile,
} from "@/lib/personal-calendar";
import type { PersonalizedCalendarDay } from "@/lib/personal-calendar";
import { PERSONAL_METHOD_VERSION } from "@/lib/personal-methodology";
import {
  birthDateInputFromIso,
  birthPlaceMatchesSelection,
  formatBirthDateInput,
  formatPersonalizationSummary,
  formatBirthTimeInput,
  isValidBirthPlace,
  isValidBirthTime,
  normalizeBirthPlace,
  parseBirthDateInput,
  zodiacForBirthDate,
} from "@/lib/personalization";
import RevealTransition from "./reveal-transition";
import type { Icon } from "@phosphor-icons/react";
import {
  AirplaneTilt,
  ArrowsLeftRight,
  Bed,
  BookOpenText,
  Briefcase,
  Broom,
  CalendarBlank,
  CalendarCheck,
  CalendarPlus,
  Check,
  ChatCircle,
  Clock,
  Compass,
  CookingPot,
  Crosshair,
  FlowerLotus,
  Gift,
  GlobeHemisphereEast,
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
type Day = CalendarDay & Partial<Omit<PersonalizedCalendarDay, keyof CalendarDay>>;

type PersonalizationData = {
  zodiac: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeUnknown: boolean;
  birthTimePeriod: BirthTimePeriod | "";
  birthPlaceId: string;
  latitude?: number;
  longitude?: number;
  timeZone: string;
};

const PERSONALIZATION_STORAGE_KEY = "polune-personalization-v1";
const CALENDAR_PREFERENCE_STORAGE_KEY = "polune-calendar-preference-v1";

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

function resultUrl(intentId: string, dateIso: string, methodVersion = METHOD_VERSION) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.searchParams.set("intent", intentId);
  url.searchParams.set("date", dateIso);
  url.searchParams.set("method", methodVersion);
  return url;
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
  { id: "catalog-preview", label: "найти дело в каталоге", group: "каталог", keywords: [], Icon: MagnifyingGlass, archetype: "planning", zodiacProfile: "learning" },
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

type ResultCopy = { verdict: string; advice: string };

const intentResultCopy: Partial<Record<string, ResultCopy>> = {
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

const archetypePositiveCopy: Record<Intent["archetype"], ResultCopy> = {
  growth: {
    verdict: "ритм дня поддерживает новое начало",
    advice: "Сделайте первый понятный шаг и оставьте немного пространства для продолжения.",
  },
  connection: {
    verdict: "легче найти общий ритм",
    advice: "Начните с главного и дайте разговору развиваться без лишнего давления.",
  },
  planning: {
    verdict: "удобный день, чтобы всё разложить",
    advice: "Определите опорные точки и сразу оставьте запас для изменений.",
  },
  care: {
    verdict: "подходящий день для заботы о себе",
    advice: "Выберите мягкий формат и ориентируйтесь на собственное самочувствие.",
  },
  release: {
    verdict: "проще отпустить лишнее",
    advice: "Начните с заметной части и остановитесь, когда почувствуете достаточно.",
  },
};

const archetypeDayCopy: Record<Exclude<Rating, "excellent" | "good">, Record<Intent["archetype"], ResultCopy>> = {
  caution: {
    growth: {
      verdict: "лучше двигаться без рывка",
      advice: "Начните с пробной версии и не требуйте от себя быстрого результата.",
    },
    connection: {
      verdict: "разговору нужен мягкий темп",
      advice: "Оставьте место для пауз и не пытайтесь решить всё за один подход.",
    },
    planning: {
      verdict: "плану пригодится запас",
      advice: "Проверьте ключевые детали и заложите больше времени на изменения.",
    },
    care: {
      verdict: "выберите бережный режим",
      advice: "Снизьте интенсивность и оставьте достаточно времени на восстановление.",
    },
    release: {
      verdict: "освобождайте пространство постепенно",
      advice: "Возьмите одну понятную часть и не старайтесь закончить всё сразу.",
    },
  },
  neutral: {
    growth: {
      verdict: "день для небольшого шага",
      advice: "Проверьте идею в малом масштабе, прежде чем набирать скорость.",
    },
    connection: {
      verdict: "сначала присмотритесь к настроению",
      advice: "Начните с лёгкого контакта и переходите к главному только по готовности.",
    },
    planning: {
      verdict: "сначала уточните детали",
      advice: "Соберите недостающую информацию и пока не фиксируйте план слишком жёстко.",
    },
    care: {
      verdict: "ориентируйтесь на самочувствие",
      advice: "Выберите привычный формат и сократите нагрузку, если это потребуется.",
    },
    release: {
      verdict: "начните с самого простого",
      advice: "Уберите один источник лишнего и оцените, хочется ли продолжать.",
    },
  },
  low: {
    growth: {
      verdict: "лучше не форсировать старт",
      advice: "Если дата уже выбрана, ограничьтесь подготовкой и сохраните силы на продолжение.",
    },
    connection: {
      verdict: "сложные темы лучше не торопить",
      advice: "Если разговор нельзя перенести, говорите короче и оставьте выводы на потом.",
    },
    planning: {
      verdict: "план может потребовать пересмотра",
      advice: "Не принимайте необратимых решений и сначала проверьте исходные данные.",
    },
    care: {
      verdict: "день просит больше отдыха",
      advice: "Откажитесь от лишней нагрузки и выберите самый мягкий доступный вариант.",
    },
    release: {
      verdict: "не берите всё сразу",
      advice: "Если дело нельзя перенести, ограничьте объём и заранее обозначьте точку остановки.",
    },
  },
};

function buildResultCopy(intent: Intent, day: Day) {
  if (day.rating === "excellent" || day.rating === "good") {
    return intentResultCopy[intent.id] ?? archetypePositiveCopy[intent.archetype];
  }
  return archetypeDayCopy[day.rating][intent.archetype];
}

function buildResultHeading(verdict: string, isBestDay: boolean) {
  if (!isBestDay) return verdict;
  if (verdict.startsWith("хорошая ")) return verdict.replace(/^хорошая /, "лучшая ");
  if (verdict.startsWith("подходящий ")) return verdict.replace(/^подходящий /, "лучший ");
  if (verdict.startsWith("день ") || verdict.startsWith("ритм ")) return `лучший ${verdict}`;
  return verdict;
}

function buildResultPresentation(intent: Intent, day: Day, isBestDay: boolean) {
  const copy = buildResultCopy(intent, day);
  return {
    heading: keepRussianPrepositionsWithNextWord(buildResultHeading(copy.verdict, isBestDay)),
    advice: keepRussianPrepositionsWithNextWord(
      `${copy.advice.charAt(0).toLowerCase()}${copy.advice.slice(1)}`.replace(/[.!?]+$/, ""),
    ),
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
  const words = label.trim().split(" ");
  if (label.length <= 15 || words.length < 2) return [label];

  let splitAt = 1;
  let smallestDifference = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const firstLength = words.slice(0, index).join(" ").length;
    const secondLength = words.slice(index).join(" ").length;
    const difference = Math.abs(firstLength - secondLength);
    if (difference < smallestDifference) {
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
}: {
  intent: Intent;
  onClick: () => void;
  animated?: boolean;
}) {
  const IntentIcon = intent.Icon;
  const protectedLabel = keepRussianPrepositionsWithNextWord(intent.label);
  const [firstLine, secondLine] = splitIntentLabel(protectedLabel);
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
          {intent.id === "haircut"
            ? <img className="intent-leading-image" src="/figma/intent-scissors.svg" alt="" />
            : <IntentIcon weight="bold" aria-hidden="true" />}
          <span className="intent-text-line">{firstLine}</span>
        </span>
        {secondLine && (
          <span className="intent-second-row">
            <span className="intent-text-line intent-second-line">{secondLine}</span>
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
          <span>{keepRussianPrepositionsWithNextWord(intent.label)}</span>
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
              <div><h3>{keepRussianPrepositionsWithNextWord(feedback.title)}</h3><p>{keepRussianPrepositionsWithNextWord(feedback.text)}</p></div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

function ScoreInfoSheet({ day, onClose }: { day: Day; onClose: () => void }) {
  const isPersonalized = day.personalLevel !== undefined
    && day.generalScore !== undefined
    && day.personalScore !== undefined
    && day.personalWeight !== undefined;
  const generalWeight = isPersonalized ? 1 - day.personalWeight! : 1;

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
            <p>прозрачная формула</p>
            <h2 id="score-sheet-title">как получили {day.score} из&nbsp;100</h2>
          </div>
          <button type="button" className="round-button" onClick={onClose} aria-label="Закрыть объяснение">
            <X weight="regular" />
          </button>
        </header>
        <p className="score-explainer">{keepRussianPrepositionsWithNextWord("это индекс совпадения по нашей методике, а не вероятность события и не обещание результата")}</p>
        <div className="score-factors">
          {isPersonalized ? (
            <>
              <div className="score-factor">
                <div><span>общая основа · {Math.round(generalWeight * 100)}%</span><strong>{day.generalScore} / 100</strong></div>
                <span className="score-track"><span style={{ width: `${day.generalScore}%` }} /></span>
                <small>фаза Луны {day.phaseScore} · знак Луны {day.zodiacScore}</small>
              </div>
              <div className="score-factor">
                <div><span>личные факторы · {Math.round(day.personalWeight! * 100)}%</span><strong>{day.personalScore} / 100</strong></div>
                <span className="score-track"><span style={{ width: `${day.personalScore}%` }} /></span>
                <small>{keepRussianPrepositionsWithNextWord(day.personalLevel === "date"
                  ? "по дате рождения"
                  : day.personalLevel === "approximate"
                    ? "по дате и примерному времени рождения"
                    : "по дате, времени и месту рождения")}</small>
              </div>
              <div className="score-personal-details" aria-label="использованные личные факторы">
                <div><span>натальное Солнце{day.personalLevel === "approximate" ? " · 55% личной части" : day.personalLevel === "exact" ? " · 40% личной части" : ""}</span><strong>{day.sunScore} / 100</strong></div>
                {day.moonScore !== undefined && <div><span>натальная Луна · {day.personalLevel === "exact" ? "35" : "45"}% личной части</span><strong>{day.moonScore} / 100</strong></div>}
                {day.ascendantScore !== undefined && <div><span>Асцендент · 25% личной части</span><strong>{day.ascendantScore} / 100</strong></div>}
              </div>
              <p className="score-personal-note">{keepRussianPrepositionsWithNextWord("личная часть сравнивает Луну выбранного дня с рассчитанными точками карты рождения по символической шкале аспектов")}</p>
            </>
          ) : (
            <>
              <div className="score-factor">
                <div><span>фаза луны · {Math.round(PHASE_WEIGHT * 100)}%</span><strong>{day.phaseScore} / 100</strong></div>
                <span className="score-track"><span style={{ width: `${day.phaseScore}%` }} /></span>
              </div>
              <div className="score-factor">
                <div><span>луна в&nbsp;{day.zodiacSignName.toLowerCase()} · {Math.round(ZODIAC_WEIGHT * 100)}%</span><strong>{day.zodiacScore} / 100</strong></div>
                <span className="score-track"><span style={{ width: `${day.zodiacScore}%` }} /></span>
              </div>
            </>
          )}
        </div>
        <div className="score-technical" aria-label="технические параметры расчёта">
          <div><MoonStars weight="regular" aria-hidden="true" /><span>фазовый угол дня</span><strong>{Math.round(day.moonPhaseAngle)}°</strong></div>
          <div><Crosshair weight="regular" aria-hidden="true" /><span>точка выбранного дела</span><strong>{day.targetPhaseAngle}°</strong></div>
          <div><ArrowsLeftRight weight="regular" aria-hidden="true" /><span>расстояние между точками</span><strong>{Math.round(day.phaseDistance)}°</strong></div>
          <div><Compass weight="regular" aria-hidden="true" /><span>долгота луны</span><strong>{Math.round(day.lunarLongitude)}°</strong></div>
          <div><GlobeHemisphereEast weight="regular" aria-hidden="true" /><span>луна в&nbsp;знаке</span><strong>{day.zodiacSignName.toLowerCase()}</strong></div>
        </div>
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
  const [birthDateInput, setBirthDateInput] = useState(birthDateInputFromIso(current?.birthDate ?? ""));
  const [birthTime, setBirthTime] = useState(current?.birthTime ?? "");
  const [birthPlace, setBirthPlace] = useState(current?.birthPlace ?? "");
  const [timeUnknown, setTimeUnknown] = useState(current?.timeUnknown ?? false);
  const [birthTimePeriod, setBirthTimePeriod] = useState<BirthTimePeriod | "">(current?.birthTimePeriod ?? "");
  const [selectedPlace, setSelectedPlace] = useState<GeocodedBirthPlace | null>(() => (
    current?.birthPlaceId
      && current.latitude !== undefined
      && current.longitude !== undefined
      && current.timeZone
      ? {
          id: current.birthPlaceId,
          label: current.birthPlace,
          latitude: current.latitude,
          longitude: current.longitude,
          timeZone: current.timeZone,
        }
      : null
  ));
  const [placeResults, setPlaceResults] = useState<GeocodedBirthPlace[]>([]);
  const [placeSearchPending, setPlaceSearchPending] = useState(false);
  const [placeSearchFailed, setPlaceSearchFailed] = useState(false);
  const [placeSearchAttribution, setPlaceSearchAttribution] = useState("powered by Geoapify");
  const [placeInputFocused, setPlaceInputFocused] = useState(false);
  const [formError, setFormError] = useState<"date" | "time" | "place" | null>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const profileScrollRef = useRef<HTMLDivElement>(null);
  const placeFieldRef = useRef<HTMLDivElement>(null);
  const placeInputRef = useRef<HTMLInputElement>(null);
  const placeResultsRef = useRef<HTMLDivElement>(null);
  const placeScrollOriginRef = useRef(0);
  const placeSearchActiveRef = useRef(false);
  const placeSelectionPendingRef = useRef(false);
  const birthDate = parseBirthDateInput(birthDateInput);
  const zodiac = birthDate ? zodiacForBirthDate(birthDate) : null;

  useEffect(() => {
    const normalized = normalizeBirthPlace(birthPlace);
    if (birthPlaceMatchesSelection(normalized, selectedPlace?.label) || normalized.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPlaceSearchPending(true);
      setPlaceSearchFailed(false);
      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: normalized, mode: "autocomplete" }),
          signal: controller.signal,
        });
        const payload = await response.json() as {
          places?: GeocodedBirthPlace[];
          attribution?: string;
        };
        if (!response.ok) throw new Error("Autocomplete failed");
        setPlaceResults(payload.places ?? []);
        setPlaceSearchAttribution(payload.attribution ?? "powered by Geoapify");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPlaceResults([]);
        setPlaceSearchFailed(true);
      } finally {
        if (!controller.signal.aborted) setPlaceSearchPending(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [birthPlace, selectedPlace?.label]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function openPlaceSearch() {
    const scroller = profileScrollRef.current;
    const field = placeFieldRef.current;
    if (!scroller || !field) return;
    if (!placeSearchActiveRef.current) {
      placeScrollOriginRef.current = scroller.scrollTop;
      placeSearchActiveRef.current = true;
    }
    scroller.classList.add("is-place-active");
    const targetTop = field.getBoundingClientRect().top
      - scroller.getBoundingClientRect().top
      + scroller.scrollTop
      - 14;
    scroller.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    setPlaceInputFocused(true);
  }

  function closePlaceSearch({ restoreScroll = true } = {}) {
    placeSearchActiveRef.current = false;
    profileScrollRef.current?.classList.remove("is-place-active");
    setPlaceInputFocused(false);
    if (!restoreScroll) return;
    window.requestAnimationFrame(() => {
      profileScrollRef.current?.scrollTo({
        top: placeScrollOriginRef.current,
        behavior: "smooth",
      });
    });
  }

  useEffect(() => {
    if (!placeInputFocused) return;
    const alignPlaceSearch = () => {
      const scroller = profileScrollRef.current;
      const field = placeFieldRef.current;
      if (!scroller || !field) return;
      const targetTop = field.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top
        + scroller.scrollTop
        - 14;
      scroller.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    };
    const animationFrame = window.requestAnimationFrame(alignPlaceSearch);
    const focusTimer = window.setTimeout(alignPlaceSearch, 60);
    const keyboardTimer = window.setTimeout(alignPlaceSearch, 360);
    const settleTimer = window.setTimeout(alignPlaceSearch, 760);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(focusTimer);
      window.clearTimeout(keyboardTimer);
      window.clearTimeout(settleTimer);
    };
  }, [placeInputFocused]);

  const needsVerifiedPlace = Boolean((!timeUnknown && birthTime) || (timeUnknown && birthTimePeriod));

  function finish() {
    if (!birthDate || !zodiac) {
      setFormError("date");
      return;
    }
    if (!timeUnknown && birthTime && !isValidBirthTime(birthTime)) {
      setFormError("time");
      return;
    }
    if (birthPlace && !isValidBirthPlace(birthPlace)) {
      setFormError("place");
      return;
    }
    if (
      (birthPlace || needsVerifiedPlace)
      && (!selectedPlace || !birthPlaceMatchesSelection(birthPlace, selectedPlace.label))
    ) {
      setFormError("place");
      return;
    }
    setFormError(null);
    onComplete({
      zodiac: zodiac.name,
      birthDate,
      birthTime: timeUnknown ? "" : birthTime,
      birthPlace: normalizeBirthPlace(birthPlace),
      timeUnknown,
      birthTimePeriod: timeUnknown ? birthTimePeriod : "",
      birthPlaceId: selectedPlace?.id ?? "",
      latitude: selectedPlace?.latitude,
      longitude: selectedPlace?.longitude,
      timeZone: selectedPlace?.timeZone ?? "",
    });
  }

  function openDatePicker() {
    const picker = datePickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return (
    <div className="profile-sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title">
        <header>
          <div>
            <p>персонализация</p>
            <h2 id="profile-sheet-title">данные рождения</h2>
          </div>
          <button type="button" className="round-button" onClick={onClose} aria-label="Закрыть персонализацию">
            <X weight="regular" />
          </button>
        </header>

        <div className={`profile-sheet-scroll ${placeInputFocused ? "is-place-active" : ""}`} ref={profileScrollRef}>
        <p className="profile-sheet-lead">{keepRussianPrepositionsWithNextWord("укажите дату — знак зодиака определится автоматически. данные сохраняются только на этом устройстве.")}</p>
        <label className="profile-field">
          <span>дата рождения</span>
          <span className="profile-input-shell">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="дд.мм.гггг"
              value={birthDateInput}
              maxLength={10}
              aria-invalid={formError === "date"}
              onChange={(event) => {
                setBirthDateInput(formatBirthDateInput(event.target.value));
                setFormError(null);
              }}
            />
            <button type="button" className="profile-input-action" onClick={openDatePicker} aria-label="Выбрать дату в календаре">
              <CalendarBlank weight="regular" aria-hidden="true" />
            </button>
            <input
              ref={datePickerRef}
              className="profile-native-picker"
              type="date"
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                setBirthDateInput(birthDateInputFromIso(event.target.value));
                setFormError(null);
              }}
            />
          </span>
        </label>
        {zodiac && (
          <div className="profile-zodiac-result" aria-live="polite">
            <span className="zodiac-symbol" aria-hidden="true">{zodiac.symbol}</span>
            <span><small>ваш знак зодиака</small><strong>{zodiac.name}</strong></span>
          </div>
        )}
        {!timeUnknown && (
          <label className="profile-field">
            <span>время рождения</span>
            <span className="profile-input-shell">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="bday-time"
                placeholder="чч:мм"
                value={birthTime}
                maxLength={5}
                aria-invalid={formError === "time"}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && birthTime.endsWith(":")) {
                    event.preventDefault();
                    setBirthTime(birthTime.slice(0, -2));
                  }
                }}
                onChange={(event) => {
                  setBirthTime(formatBirthTimeInput(event.target.value));
                  setFormError(null);
                }}
              />
              <Clock weight="regular" aria-hidden="true" />
            </span>
          </label>
        )}
        <label className="profile-check">
          <input type="checkbox" checked={timeUnknown} onChange={(event) => {
            setTimeUnknown(event.target.checked);
            setFormError(null);
          }} />
          <span className="profile-check-control" aria-hidden="true"><Check weight="bold" /></span>
          <span>не знаю точное время рождения</span>
        </label>
        {timeUnknown && (
          <fieldset className="profile-period-field">
            <legend>если помните примерно</legend>
            <div>
              {([
                ["night", "ночь"],
                ["morning", "утро"],
                ["day", "день"],
                ["evening", "вечер"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={birthTimePeriod === value ? "selected" : ""}
                  onClick={() => {
                    setBirthTimePeriod(birthTimePeriod === value ? "" : value);
                    setFormError(null);
                  }}
                  aria-pressed={birthTimePeriod === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <div ref={placeFieldRef} className={`profile-place-block ${placeInputFocused ? "is-active" : ""}`}>
          <label className="profile-field profile-place-field">
            <span>место рождения</span>
            <span className="profile-input-shell profile-place-shell">
              <input
                ref={placeInputRef}
                value={birthPlace}
                onChange={(event) => {
                  const nextPlace = event.target.value.slice(0, 80);
                  setBirthPlace(nextPlace);
                  if (!birthPlaceMatchesSelection(nextPlace, selectedPlace?.label)) setSelectedPlace(null);
                  setPlaceResults([]);
                  setPlaceSearchPending(false);
                  setPlaceSearchFailed(false);
                  setFormError(null);
                }}
                placeholder="город"
                maxLength={80}
                autoComplete="address-level2"
                aria-invalid={formError === "place"}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={placeResults.length > 0}
                aria-controls="profile-place-results"
                onPointerDown={(event) => {
                  openPlaceSearch();
                  event.currentTarget.focus({ preventScroll: true });
                }}
                onFocus={openPlaceSearch}
                onBlur={(event) => {
                  if (placeSelectionPendingRef.current) return;
                  const nextFocused = event.relatedTarget;
                  if (nextFocused instanceof Node && placeResultsRef.current?.contains(nextFocused)) return;
                  closePlaceSearch();
                }}
              />
            </span>
            <small>{selectedPlace
              ? "место и часовой пояс проверены"
              : placeSearchPending
                ? "ищем город…"
                : placeSearchFailed
                  ? "не удалось загрузить подсказки"
                  : normalizeBirthPlace(birthPlace).length < 3
                    ? "введите минимум три буквы"
                    : "выберите город из списка"}</small>
          </label>
          {placeResults.length > 0 && (
            <div ref={placeResultsRef} id="profile-place-results" className="profile-place-results" role="listbox" aria-label="Найденные места">
              {placeResults.map((place) => (
                <button type="button" role="option" aria-selected="false" key={place.id} onPointerDown={() => {
                  placeSelectionPendingRef.current = true;
                }} onPointerCancel={() => {
                  placeSelectionPendingRef.current = false;
                }} onClick={() => {
                  setSelectedPlace(place);
                  setBirthPlace(place.label);
                  setPlaceResults([]);
                  setPlaceSearchPending(false);
                  setPlaceSearchFailed(false);
                  placeSelectionPendingRef.current = false;
                  placeInputRef.current?.blur();
                  closePlaceSearch();
                  setFormError(null);
                }}>
                  <span>{place.label}</span>
                  <small>{place.timeZone}</small>
                </button>
              ))}
              <small>{placeSearchAttribution}</small>
            </div>
          )}
        </div>
        {formError === "date" && <p className="profile-inline-error" role="status">введите корректную дату в&nbsp;формате дд.мм.гггг</p>}
        {formError === "time" && <p className="profile-inline-error" role="status">введите время от&nbsp;00:00 до&nbsp;23:59</p>}
        {formError === "place" && <p className="profile-inline-error" role="status">найдите и выберите населённый пункт</p>}
        </div>
        <footer className="profile-sheet-footer">
          <button type="button" className="profile-primary" onClick={finish} disabled={placeSearchPending}>{placeSearchPending ? "ищем место…" : "применить"}</button>
        </footer>
      </section>
    </div>
  );
}

function CalendarActionSheet({
  onClose,
  onApple,
  onGoogle,
}: {
  onClose: () => void;
  onApple: () => void;
  onGoogle: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="calendar-action-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="calendar-action-sheet" role="dialog" aria-modal="true" aria-labelledby="calendar-action-title">
        <header>
          <div>
            <p>сохранить дату</p>
            <h2 id="calendar-action-title">выберите календарь</h2>
          </div>
          <button type="button" className="round-button" onClick={onClose} aria-label="Закрыть выбор календаря">
            <X weight="regular" />
          </button>
        </header>
        <p className="calendar-action-lead">
          {keepRussianPrepositionsWithNextWord("мы не добавляем событие напрямую: для Apple подготовим файл, для Google откроем форму события")}
        </p>
        <div className="calendar-action-options">
          <button type="button" onClick={onApple}>
            <span className="calendar-action-icon"><CalendarBlank weight="regular" aria-hidden="true" /></span>
            <span><strong>Apple Calendar</strong><small>подготовить файл .ics</small></span>
          </button>
          <button type="button" onClick={onGoogle}>
            <span className="calendar-action-icon"><GlobeHemisphereEast weight="regular" aria-hidden="true" /></span>
            <span><strong>Google Calendar</strong><small>открыть форму события</small></span>
          </button>
        </div>
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

function MoonPhaseIllustration({ angle, label, compact = false }: { angle: number; label: string; compact?: boolean }) {
  const normalized = ((angle % 360) + 360) % 360;
  const waxing = normalized <= 180;
  const illumination = (1 - Math.cos((normalized * Math.PI) / 180)) / 2;
  const shadowShift = illumination * 100;
  return (
    <div
      className={`phase-moon ${compact ? "calendar-moon" : ""} ${waxing ? "is-waxing" : "is-waning"}`}
      role={compact ? undefined : "img"}
      aria-hidden={compact ? "true" : undefined}
      aria-label={compact ? undefined : `${label}, освещено ${Math.round(illumination * 100)}%`}
      style={{
        "--moon-waxing-shadow-shift": `-${shadowShift}%`,
        "--moon-waning-shadow-shift": `${shadowShift}%`,
      } as CSSProperties}
    >
      <img className="phase-moon-surface" src="/figma/moon-base.png" alt="" />
      <span className="phase-moon-mask" aria-hidden="true">
        <span className="phase-moon-shadow phase-moon-shadow-waxing" />
        <span className="phase-moon-shadow phase-moon-shadow-waning" />
      </span>
    </div>
  );
}

function ResultCalendar({
  days,
  activeId,
  preferredId,
  expanded,
  onExpandedChange,
  onSelect,
}: {
  days: Day[];
  activeId: string;
  preferredId: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (day: Day) => void;
}) {
  const dragStart = useRef<number | null>(null);
  const todayIso = moscowDateIso();
  const upcomingDays = days.filter((day) => day.dateIso >= todayIso);
  const peekDays = upcomingDays.slice(0, 14);
  const monthGroups = upcomingDays.reduce<Array<{ key: string; title: string; days: Day[] }>>((groups, day) => {
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
          {peekDays.map((day) => {
            const isPreferred = day.id === preferredId;
            const isSuitable = isPreferred || day.rating === "good";
            const isWeak = day.rating === "low";
            return <button
              type="button"
              key={day.id}
              className={`calendar-peek-day ${isSuitable ? "is-suitable" : ""} ${isPreferred ? "is-preferred" : ""} ${isWeak ? "is-weak" : ""} ${day.id === activeId ? "selected" : ""}`}
              onClick={() => onSelect(day)}
              aria-label={`${day.longDate}: ${day.score}%${isPreferred ? ", лучший день" : isSuitable ? ", подходит" : ""}`}
            >
              <span className="calendar-day-moon">
                <MoonPhaseIllustration angle={day.moonPhaseAngle} label={day.moonPhaseLabel} compact />
              </span>
              {isPreferred ? <Sparkle className="calendar-best-mark" weight="fill" aria-hidden="true" /> : null}
              <small><strong>{day.day}</strong><span>{day.weekday}</span></small>
            </button>
          })}
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
                {group.days.map((day, index) => {
                  const isPreferred = day.id === preferredId;
                  const isSuitable = isPreferred || day.rating === "good";
                  const isWeak = day.rating === "low";
                  return <button
                    type="button"
                    key={day.id}
                    className={`${isSuitable ? "is-suitable" : ""} ${isPreferred ? "is-preferred" : ""} ${isWeak ? "is-weak" : ""} ${day.id === activeId ? "selected" : ""}`}
                    onClick={() => onSelect(day)}
                    aria-label={`${day.longDate}: ${day.score}%${isPreferred ? ", лучший день" : isSuitable ? ", подходит" : ""}`}
                    style={index === 0
                      ? { gridColumnStart: ((new Date(`${day.dateIso}T12:00:00Z`).getUTCDay() + 6) % 7) + 1 }
                      : undefined}
                  >
                    <span className="calendar-day-moon">
                      <MoonPhaseIllustration angle={day.moonPhaseAngle} label={day.moonPhaseLabel} compact />
                    </span>
                    {isPreferred ? <Sparkle className="calendar-best-mark" weight="fill" aria-hidden="true" /> : null}
                    <small>{day.day}</small>
                  </button>
                })}
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
  const generalDays = useMemo(() => buildCalendarDays(intent), [intent]);
  const generalCalendarDays = useMemo(() => buildTwoMonthCalendarDays(intent), [intent]);
  const initialBestId = pickPreferredDay(generalDays).id;
  const [hasChosenIntent, setHasChosenIntent] = useState(false);
  const [activeId, setActiveId] = useState(initialBestId);
  const [calendarActionOpen, setCalendarActionOpen] = useState(false);
  const [calendarActionStatus, setCalendarActionStatus] = useState<"ics_prepared" | "google_opened" | "google_blocked" | null>(null);
  const [preferredCalendarProvider, setPreferredCalendarProvider] = useState<CalendarProvider | null>(null);
  const [shared, setShared] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackAnswer, setFeedbackAnswer] = useState<"helpful" | "not_helpful" | null>(null);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null);
  const [personalizationBubblePhase, setPersonalizationBubblePhase] = useState<"hidden" | "visible" | "leaving">("hidden");
  const [dayMotionPhase, setDayMotionPhase] = useState<"idle" | "out" | "in">("idle");
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const calendarStatusTimer = useRef<number | null>(null);
  const feedbackStatusTimer = useRef<number | null>(null);
  const dayMotionTimer = useRef<number | null>(null);
  const personalizationBubbleHasAppeared = useRef(false);

  const resolvedPersonalization = useMemo(() => {
    if (!personalization) return null;
    try {
      return resolvePersonalProfile(personalization);
    } catch {
      return null;
    }
  }, [personalization]);
  const personalizedCalendar = useMemo(() => (
    resolvedPersonalization
      ? personalizeCalendar(generalCalendarDays, generalDays, resolvedPersonalization.profile)
      : null
  ), [generalCalendarDays, generalDays, resolvedPersonalization]);
  const days: Day[] = personalizedCalendar?.recommendationDays ?? generalDays;
  const calendarDays: Day[] = personalizedCalendar?.calendarDays ?? generalCalendarDays;
  const methodVersion = personalizedCalendar ? PERSONAL_METHOD_VERSION : METHOD_VERSION;

  const active = days.find((day) => day.id === activeId) ?? calendarDays.find((day) => day.id === activeId) ?? days[1];
  const isPreferredInResultWindow = days.some((day) => day.id === active.id && day.isPreferred);
  const preferredId = pickPreferredDay(days).id;
  const generalPreferredId = pickPreferredDay(generalDays).id;
  const personalRecommendationChanged = Boolean(personalizedCalendar && preferredId !== generalPreferredId);
  const activeDisplayRating: Rating = isPreferredInResultWindow ? "excellent" : active.rating;
  const resultPresentation = buildResultPresentation(intent, active, isPreferredInResultWindow);
  const pendingResultPresentation = pendingReveal
    ? buildResultPresentation(pendingReveal.intent, pendingReveal.day, pendingReveal.day.isPreferred)
    : null;
  const personalizationSummary = personalization ? formatPersonalizationSummary(personalization) : "";
  const personalizationResultLabel = !resolvedPersonalization
    ? "личный расчёт не удалось применить"
    : resolvedPersonalization.fellBackToDate
      ? "применён расчёт по дате рождения"
      : personalRecommendationChanged
        ? "рекомендация изменилась для вас"
        : active.id === preferredId
          ? "персональный расчёт подтвердил эту дату"
          : "персональный расчёт применён ко всем датам";

  useEffect(() => {
    if (screen !== "result" || !personalizedCalendar) return;
    const currentMethod = new URLSearchParams(window.location.search).get("method");
    if (currentMethod === PERSONAL_METHOD_VERSION) return;
    window.history.replaceState({}, "", resultUrl(intent.id, active.dateIso, PERSONAL_METHOD_VERSION));
  }, [active.dateIso, intent.id, personalizedCalendar, screen]);

  useEffect(() => {
    if (personalization) return;
    if (screen !== "result" || pendingReveal || personalizationOpen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setPersonalizationBubblePhase("visible"), 2200);
      return () => window.clearTimeout(timer);
    }

    const timers: number[] = [];
    let cancelled = false;
    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };
    const showBubble = (delay: number) => {
      schedule(() => {
        if (cancelled) return;
        personalizationBubbleHasAppeared.current = true;
        setPersonalizationBubblePhase("visible");
        schedule(() => {
          if (cancelled) return;
          setPersonalizationBubblePhase("leaving");
          schedule(() => {
            if (cancelled) return;
            setPersonalizationBubblePhase("hidden");
            showBubble(18000);
          }, 360);
        }, 6500);
      }, delay);
    };

    showBubble(personalizationBubbleHasAppeared.current ? 18000 : 2200);
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [active.id, pendingReveal, personalization, personalizationOpen, screen]);

  useEffect(() => {
    let restoreTimer: number | null = null;
    try {
      const savedPersonalization = window.localStorage.getItem(PERSONALIZATION_STORAGE_KEY);
      if (!savedPersonalization) return;
      const parsed = JSON.parse(savedPersonalization) as Partial<PersonalizationData>;
      if (typeof parsed.zodiac !== "string" || !parsed.zodiac) return;
      restoreTimer = window.setTimeout(() => {
        setPersonalization({
          zodiac: parsed.zodiac!,
          birthDate: typeof parsed.birthDate === "string" ? parsed.birthDate : "",
          birthTime: typeof parsed.birthTime === "string" ? parsed.birthTime : "",
          birthPlace: typeof parsed.birthPlace === "string" ? parsed.birthPlace : "",
          timeUnknown: Boolean(parsed.timeUnknown),
          birthTimePeriod: parsed.birthTimePeriod === "night"
            || parsed.birthTimePeriod === "morning"
            || parsed.birthTimePeriod === "day"
            || parsed.birthTimePeriod === "evening"
            ? parsed.birthTimePeriod
            : "",
          birthPlaceId: typeof parsed.birthPlaceId === "string" ? parsed.birthPlaceId : "",
          latitude: typeof parsed.latitude === "number" ? parsed.latitude : undefined,
          longitude: typeof parsed.longitude === "number" ? parsed.longitude : undefined,
          timeZone: typeof parsed.timeZone === "string" ? parsed.timeZone : "",
        });
      }, 0);
    } catch {
      window.localStorage.removeItem(PERSONALIZATION_STORAGE_KEY);
    }
    return () => {
      if (restoreTimer !== null) window.clearTimeout(restoreTimer);
    };
  }, []);

  useEffect(() => {
    let provider: CalendarProvider | null = null;
    try {
      const savedProvider = window.localStorage.getItem(CALENDAR_PREFERENCE_STORAGE_KEY);
      if (savedProvider === "apple" || savedProvider === "google") provider = savedProvider;
    } catch {
      // Platform detection remains available when storage is blocked.
    }
    if (!provider) {
      const navigatorWithHints = navigator as Navigator & { userAgentData?: { platform?: string } };
      provider = detectCalendarProvider({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        userAgentDataPlatform: navigatorWithHints.userAgentData?.platform,
      });
    }
    const timer = window.setTimeout(() => setPreferredCalendarProvider(provider), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (calendarStatusTimer.current) window.clearTimeout(calendarStatusTimer.current);
    if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
    if (dayMotionTimer.current) window.clearTimeout(dayMotionTimer.current);
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

      const restoredCalendarDays = buildTwoMonthCalendarDays(restoredIntent);
      const restoredDays = buildCalendarDays(restoredIntent);
      const requestedDate = params.get("date");
      const restoredDay = resolveRequestedCalendarDay(requestedDate, restoredCalendarDays, restoredDays, moscowDateIso());
      setIntent(restoredIntent);
      setPersonalizationBubblePhase("hidden");
      setDayMotionPhase("idle");
      setHasChosenIntent(true);
      setScreen("result");
      setActiveId(restoredDay.id);
      setCalendarActionOpen(false);
      setCalendarActionStatus(null);
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
    const nextGeneralDays = buildCalendarDays(nextIntent);
    const nextDays = resolvedPersonalization
      ? personalizeCalendar(
          buildTwoMonthCalendarDays(nextIntent),
          nextGeneralDays,
          resolvedPersonalization.profile,
        ).recommendationDays
      : nextGeneralDays;
    const nextDay = pickPreferredDay(nextDays);
    if (dayMotionTimer.current) window.clearTimeout(dayMotionTimer.current);
    setDayMotionPhase("idle");
    setIntent(nextIntent);
    personalizationBubbleHasAppeared.current = false;
    setPersonalizationBubblePhase("hidden");
    setHasChosenIntent(true);
    setPickerOpen(false);
    setActiveId(nextDay.id);
    setCalendarActionOpen(false);
    setCalendarActionStatus(null);
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
    window.history.pushState({}, "", resultUrl(nextIntent.id, nextDay.dateIso, methodVersion));
    trackEvent("reveal_viewed", {
      intentId: nextIntent.id,
      archetype: nextIntent.archetype,
      selectedDate: nextDay.dateIso,
      score: nextDay.score,
    });
    trackEvent("result_viewed", {
      intentId: nextIntent.id,
      archetype: nextIntent.archetype,
      selectedDate: nextDay.dateIso,
      score: nextDay.score,
    });
  }

  function chooseDay(day: Day) {
    if (day.id === activeId) return;
    setPersonalizationBubblePhase("hidden");
    if (calendarStatusTimer.current) window.clearTimeout(calendarStatusTimer.current);
    if (dayMotionTimer.current) window.clearTimeout(dayMotionTimer.current);
    setDayMotionPhase("out");
    dayMotionTimer.current = window.setTimeout(() => {
      dayMotionTimer.current = null;
      setActiveId(day.id);
      setCalendarActionOpen(false);
      setCalendarActionStatus(null);
      if (feedbackStatusTimer.current) window.clearTimeout(feedbackStatusTimer.current);
      setFeedbackVisible(false);
      setFeedbackAnswer(null);
      window.history.pushState({}, "", resultUrl(intent.id, day.dateIso, methodVersion));
      trackEvent("day_selected", {
        intentId: intent.id,
        archetype: intent.archetype,
        selectedDate: day.dateIso,
        score: day.score,
      });
      const distanceFromToday = Math.round(
        (new Date(`${day.dateIso}T12:00:00Z`).getTime() - currentMoscowDate().getTime()) / 86_400_000,
      );
      if (distanceFromToday >= 14) {
        trackEvent("distant_day_selected", {
          intentId: intent.id,
          archetype: intent.archetype,
          selectedDate: day.dateIso,
          score: day.score,
        });
      }
      setDayMotionPhase("in");
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => setDayMotionPhase("idle")));
    }, 150);
  }

  function calendarEventInput() {
    return {
      dateIso: active.dateIso,
      intentId: intent.id,
      intentLabel: intent.label,
      description: `${active.score} из 100 · ${ratingLabels[active.rating]}`,
      resultUrl: resultUrl(intent.id, active.dateIso, methodVersion).toString(),
    };
  }

  function showCalendarStatus(status: "ics_prepared" | "google_opened" | "google_blocked") {
    setCalendarActionStatus(status);
    if (calendarStatusTimer.current) window.clearTimeout(calendarStatusTimer.current);
    calendarStatusTimer.current = window.setTimeout(() => setCalendarActionStatus(null), 3200);
  }

  function prepareAppleCalendarFile() {
    const body = buildIcsCalendarEvent(calendarEventInput());
    const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `polune-${active.dateIso}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setCalendarActionOpen(false);
    showCalendarStatus("ics_prepared");
    if (!feedbackAnswer) setFeedbackVisible(true);
    trackEvent("calendar_ics_prepared", {
      intentId: intent.id,
      archetype: intent.archetype,
      selectedDate: active.dateIso,
      score: active.score,
    });
  }

  function openGoogleCalendar() {
    const googleWindow = window.open(buildGoogleCalendarUrl(calendarEventInput()), "_blank");
    if (googleWindow) {
      googleWindow.opener = null;
      setCalendarActionOpen(false);
      showCalendarStatus("google_opened");
      if (!feedbackAnswer) setFeedbackVisible(true);
      trackEvent("calendar_google_opened", {
        intentId: intent.id,
        archetype: intent.archetype,
        selectedDate: active.dateIso,
        score: active.score,
      });
      return;
    }
    showCalendarStatus("google_blocked");
    trackEvent("calendar_google_blocked", {
      intentId: intent.id,
      archetype: intent.archetype,
      selectedDate: active.dateIso,
      score: active.score,
    });
  }

  function openCalendarOptions() {
    setCalendarActionOpen(true);
    trackEvent("calendar_options_opened", {
      intentId: intent.id,
      archetype: intent.archetype,
      selectedDate: active.dateIso,
      score: active.score,
    });
  }

  function performCalendarAction(provider: CalendarProvider | null) {
    if (provider === "apple") prepareAppleCalendarFile();
    else if (provider === "google") openGoogleCalendar();
    else openCalendarOptions();
  }

  function chooseCalendarProvider(provider: CalendarProvider) {
    setPreferredCalendarProvider(provider);
    try {
      window.localStorage.setItem(CALENDAR_PREFERENCE_STORAGE_KEY, provider);
    } catch {
      // The choice still applies to the current page when storage is unavailable.
    }
    performCalendarAction(provider);
  }

  async function shareResult() {
    const text = `${active.longDate} — ${active.score} из 100 для дела «${intent.label}» · подсказка polune`;
    const url = resultUrl(intent.id, active.dateIso, methodVersion).toString();
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

  function openPersonalization() {
    setPersonalizationBubblePhase("hidden");
    setPersonalizationOpen(true);
    trackEvent("personalization_started", {
      intentId: intent.id,
      archetype: intent.archetype,
      selectedDate: active.dateIso,
      score: active.score,
    });
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
            resultHeading={pendingResultPresentation?.heading ?? ""}
            resultAdvice={pendingResultPresentation?.advice ?? ""}
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
              setPersonalizationBubblePhase("hidden");
              setDayMotionPhase("idle");
            }}
            aria-label="Вернуться и выбрать другое дело"
          >
            <img src="/figma/result-back.svg" alt="" />
          </button>
          <span />
          <button className="result-icon-button" type="button" onClick={shareResult} aria-label="Поделиться результатом">
            {shared ? <Check size={26} weight="bold" /> : <img src="/figma/result-share.svg" alt="" />}
          </button>
        </header>

        <article className="result-cosmic-card" aria-live="polite">
          <div className="moon-stage">
            <MoonPhaseIllustration angle={active.moonPhaseAngle} label={active.moonPhaseLabel} />
          </div>

          <div className={`result-changing-content is-${dayMotionPhase}`}>
            <div className="result-date-line">
              <strong>{active.day} {active.monthLabel.split(",")[0]}</strong>
            </div>

            <div className="result-guidance">
              <h2>{resultPresentation.heading}</h2>
              <p>{resultPresentation.advice}</p>
            </div>

            <button type="button" className={`result-score-row status-${activeDisplayRating}`} onClick={() => {
              setScoreInfoOpen(true);
              trackEvent("score_explanation_opened", {
                intentId: intent.id,
                archetype: intent.archetype,
                selectedDate: active.dateIso,
                score: active.score,
              });
            }}>
              <img src={statusIcons[activeDisplayRating]} alt="" />
              <span>{active.score}% совпадение</span>
              <Info weight="regular" aria-hidden="true" />
            </button>
          </div>

          <div className={`result-actions ${personalization ? "is-personalized" : ""}`}>
            {!personalization && personalizationBubblePhase !== "hidden" && (
              <button
                type="button"
                className={`personalization-bubble ${personalizationBubblePhase === "leaving" ? "is-leaving" : ""}`}
                onClick={openPersonalization}
              >
                <span className="personalization-dot personalization-dot-one" aria-hidden="true" />
                <span className="personalization-dot personalization-dot-two" aria-hidden="true" />
                <span className="personalization-bubble-body">
                  <img src="/figma/personalization-calendar.png" alt="" />
                  <span>поможет получать более точные рекомендации</span>
                </span>
              </button>
            )}
            {!personalization && (
              <button
                type="button"
                className="result-personalization-action"
                onClick={openPersonalization}
              >
                указать свои данные о рождении
              </button>
            )}
            {personalization && (
              <button
                type="button"
                className="result-personalization-summary"
                onClick={openPersonalization}
                aria-label={`Изменить данные рождения: ${personalizationSummary}. ${personalizationResultLabel}`}
              >
                <span><strong>данные рождения</strong><em>изменить</em></span>
                <small title={personalizationSummary}>{personalizationSummary}</small>
                <small>{keepRussianPrepositionsWithNextWord(personalizationResultLabel)}</small>
              </button>
            )}
            <button type="button" className={`result-calendar-action ${calendarActionStatus ? "has-status" : ""} ${calendarActionStatus === "google_blocked" ? "has-error" : ""}`} onClick={() => performCalendarAction(preferredCalendarProvider)} aria-live="polite">
              {calendarActionStatus === "ics_prepared"
                ? "файл .ics подготовлен"
                : calendarActionStatus === "google_opened"
                  ? "календарь открыт"
                  : calendarActionStatus === "google_blocked"
                    ? "календарь не открылся"
                    : "добавить в календарь"}
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

      </div>

      {!pendingReveal && (
        <ResultCalendar
          days={calendarDays}
          activeId={active.id}
          preferredId={preferredId}
          expanded={calendarExpanded}
          onExpandedChange={(expanded) => {
            setCalendarExpanded(expanded);
            if (expanded) {
              trackEvent("calendar_expanded", {
                intentId: intent.id,
                archetype: intent.archetype,
                selectedDate: active.dateIso,
                score: active.score,
              });
            }
          }}
          onSelect={(day) => {
            chooseDay(day);
            if (calendarExpanded) setCalendarExpanded(false);
          }}
        />
      )}

      {pickerOpen && <IntentPicker current={intent} showSelection={hasChosenIntent} onClose={() => setPickerOpen(false)} onSelect={chooseIntent} />}
      {pendingReveal && (
        <RevealTransition
          theme={startTheme}
          intentLabel={pendingReveal.intent.label}
          selectedDay={pendingReveal.day}
          resultHeading={pendingResultPresentation?.heading ?? ""}
          resultAdvice={pendingResultPresentation?.advice ?? ""}
          onComplete={finishReveal}
        />
      )}
      {scoreInfoOpen && <ScoreInfoSheet day={active} onClose={() => setScoreInfoOpen(false)} />}
      {calendarActionOpen && (
        <CalendarActionSheet
          onClose={() => setCalendarActionOpen(false)}
          onApple={() => chooseCalendarProvider("apple")}
          onGoogle={() => chooseCalendarProvider("google")}
        />
      )}
      {personalizationOpen && (
        <PersonalizationSheet
          current={personalization}
          onClose={() => setPersonalizationOpen(false)}
          onComplete={(data) => {
            const resolved = resolvePersonalProfile(data);
            const nextCalendar = personalizeCalendar(generalCalendarDays, generalDays, resolved.profile);
            const nextDay = pickPreferredDay(nextCalendar.recommendationDays);
            setPersonalization(data);
            setActiveId(nextDay.id);
            window.localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(data));
            window.history.pushState({}, "", resultUrl(intent.id, nextDay.dateIso, PERSONAL_METHOD_VERSION));
            setPersonalizationBubblePhase("hidden");
            setPersonalizationOpen(false);
            trackEvent("personalization_completed", {
              intentId: intent.id,
              archetype: intent.archetype,
              selectedDate: nextDay.dateIso,
              score: nextDay.score,
              methodVersion: PERSONAL_METHOD_VERSION,
            });
          }}
        />
      )}
    </main>
  );
}
