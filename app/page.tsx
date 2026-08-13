"use client";

import { useMemo, useState } from "react";

type Intent = { id: string; label: string; short: string; icon: string; accent: string };
type DayResult = { date: Date; score: number; verdict: string; phase: string; explanation: string; advice: string };

const intents: Intent[] = [
  { id: "haircut", label: "Подстричься", short: "Стрижка", icon: "✂", accent: "peach" },
  { id: "color", label: "Покрасить волосы", short: "Окрашивание", icon: "◒", accent: "lavender" },
  { id: "nails", label: "Сделать маникюр", short: "Маникюр", icon: "⌁", accent: "rose" },
  { id: "care", label: "Начать уход", short: "Уход", icon: "✦", accent: "mint" },
  { id: "habit", label: "Начать привычку", short: "Привычка", icon: "↗", accent: "sky" },
  { id: "talk", label: "Важный разговор", short: "Разговор", icon: "◌", accent: "sand" },
];

const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const weekDays = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()) }
function moonAge(date: Date) {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - knownNewMoon) / 86400000;
  return ((days % 29.53058867) + 29.53058867) % 29.53058867;
}
function moonInfo(age: number) {
  if (age < 1.5 || age > 28.2) return { phase: "Новолуние", base: 54 };
  if (age < 7.4) return { phase: "Растущая Луна", base: 79 };
  if (age < 9.2) return { phase: "Первая четверть", base: 85 };
  if (age < 13.5) return { phase: "Растущая Луна", base: 88 };
  if (age < 16.2) return { phase: "Полнолуние", base: 61 };
  if (age < 21.9) return { phase: "Убывающая Луна", base: 74 };
  if (age < 23.7) return { phase: "Последняя четверть", base: 68 };
  return { phase: "Убывающая Луна", base: 72 };
}

function resultFor(date: Date, intent: Intent): DayResult {
  const age = moonAge(date);
  const moon = moonInfo(age);
  const growing = age > 1.5 && age < 14.8;
  const weekday = date.getDay();
  const bias: Record<string, number> = { haircut: growing ? 7 : -1, color: age > 2 && age < 13.5 ? 6 : -2, nails: weekday === 5 || weekday === 6 ? 7 : 1, care: age > 16 ? 8 : 2, habit: growing ? 9 : -2, talk: weekday === 2 || weekday === 4 ? 7 : 0 };
  const dateNoise = ((date.getDate() * 7 + date.getMonth() * 3 + intent.id.length) % 9) - 4;
  const score = Math.max(42, Math.min(96, moon.base + bias[intent.id] + dateNoise));
  const verdict = score >= 86 ? "Отлично подходит" : score >= 74 ? "Хороший день" : score >= 62 ? "Можно планировать" : "Лучше без спешки";
  const explanations: Record<string, [string, string]> = {
    haircut: ["Растущая фаза традиционно связывается с обновлением и более быстрым ростом волос.", "Убывающая фаза подходит, если хочется дольше сохранить форму стрижки."],
    color: ["Период роста символически поддерживает заметные изменения и обновление образа.", "Спокойная фаза — хороший момент для знакомого оттенка без радикальных экспериментов."],
    nails: ["День подходит для аккуратного обновления и процедур, результат которых хочется сохранить.", "Выберите привычную процедуру и оставьте достаточно времени без спешки."],
    care: ["Растущая фаза подходит для питания и добавления нового шага в уход.", "Убывающая фаза традиционно подходит для очищения и восстанавливающих процедур."],
    habit: ["Растущая фаза поддерживает символику начала и постепенного набора темпа.", "Начните с минимального действия, которое легко повторить уже завтра."],
    talk: ["Фон дня располагает к ясному разговору без лишнего давления.", "Сначала сформулируйте один результат, которого хотите добиться разговором."],
  };
  return { date, score, verdict, phase: moon.phase, explanation: growing ? explanations[intent.id][0] : explanations[intent.id][1], advice: score >= 74 ? "Практический совет: заранее забронируйте время и сохраните референс результата." : "Если перенести нельзя — это не запрет. Просто выберите знакомого мастера и не экспериментируйте в спешке." };
}

function formatDate(date: Date, full = false) {
  if (full) return `${date.getDate()} ${monthNames[date.getMonth()]}, ${weekDays[date.getDay()]}`;
  return `${date.getDate()} ${monthNames[date.getMonth()]}`;
}

export default function Home() {
  const [intentId, setIntentId] = useState("haircut");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const intent = intents.find((item) => item.id === intentId) ?? intents[0];
  const results = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() + index); return resultFor(date, intent) });
  }, [intent]);
  const best = [...results].sort((a, b) => b.score - a.score).slice(0, 3);
  const active = selectedDate ? results.find((item) => item.date.toISOString() === selectedDate) ?? best[0] : best[0];

  function chooseIntent(id: string) { setIntentId(id); setSelectedDate(null); setSaved(false) }
  async function shareResult() {
    const text = `${formatDate(active.date)} — ${active.verdict.toLowerCase()} для «${intent.short.toLowerCase()}». Символическая рекомендация сервиса «Благоприятный день».`;
    if (navigator.share) await navigator.share({ title: "Благоприятный день", text });
    else { await navigator.clipboard.writeText(text); setShared(true); window.setTimeout(() => setShared(false), 1800) }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Благоприятный день — на главную"><span className="brand-mark"><span /></span><span>Благоприятный день</span></a>
        <button className="about-button" onClick={() => document.getElementById("method")?.scrollIntoView({ behavior: "smooth" })}>Как это работает</button>
      </header>

      <section className="hero" id="top">
        <div className="eyebrow"><span>✦</span> Спокойный помощник в выборе даты</div>
        <h1>Когда лучше?</h1>
        <p className="hero-copy">Выберите дело — покажем ближайшие подходящие дни и объясним рекомендацию без страшных прогнозов.</p>
        <div className="intent-panel">
          <p className="panel-label">Что хотите сделать?</p>
          <div className="intent-grid">
            {intents.map((item) => <button key={item.id} className={`intent-card ${item.accent} ${intentId === item.id ? "active" : ""}`} onClick={() => chooseIntent(item.id)} aria-pressed={intentId === item.id}><span className="intent-icon">{item.icon}</span><span>{item.label}</span><span className="intent-check">✓</span></button>)}
          </div>
        </div>
      </section>

      <section className="result-section" aria-live="polite">
        <div className="section-heading"><div><span className="step">Ваш результат</span><h2>Три ближайших окна</h2></div><span className="range">на 14 дней</span></div>
        <div className="date-strip">
          {best.map((item, index) => {
            const isActive = item.date.toISOString() === active.date.toISOString();
            return <button className={`date-card ${isActive ? "selected" : ""}`} key={item.date.toISOString()} onClick={() => { setSelectedDate(item.date.toISOString()); setSaved(false) }}><span className="date-rank">{index === 0 ? "Лучший выбор" : index === 1 ? "Ещё вариант" : "Подойдёт"}</span><span className="date-main"><b>{item.date.getDate()}</b> {monthNames[item.date.getMonth()]}</span><span className="date-weekday">{weekDays[item.date.getDay()]}</span><span className="score"><i style={{ width: `${item.score}%` }} />{item.score}%</span></button>;
          })}
        </div>

        <article className="result-card">
          <div className="result-top"><div className="result-symbol"><span>{intent.icon}</span></div><div className="result-title"><span>{formatDate(active.date, true)}</span><h3>{active.verdict}</h3></div><div className="score-ring" style={{ "--score": `${active.score * 3.6}deg` } as React.CSSProperties}><div><b>{active.score}</b><small>из 100</small></div></div></div>
          <div className="reason-grid"><div className="reason-item"><span className="reason-icon">☾</span><div><b>{active.phase}</b><p>{active.explanation}</p></div></div><div className="reason-item"><span className="reason-icon">✓</span><div><b>Без категоричных запретов</b><p>{active.advice}</p></div></div></div>
          <div className="actions"><button className={`primary-action ${saved ? "done" : ""}`} onClick={() => setSaved(!saved)}><span>{saved ? "✓" : "+"}</span>{saved ? "Дата сохранена" : "Запланировать"}</button><button className="secondary-action" onClick={shareResult}><span>↗</span>{shared ? "Скопировано" : "Поделиться"}</button></div>
        </article>

        <div className="all-days"><p>Посмотреть другой день</p><div className="mini-calendar">{results.map((item) => <button key={item.date.toISOString()} className={item.date.toISOString() === active.date.toISOString() ? "active" : ""} onClick={() => { setSelectedDate(item.date.toISOString()); setSaved(false) }} title={`${formatDate(item.date)} — ${item.score}%`}><small>{weekDays[item.date.getDay()]}</small><b>{item.date.getDate()}</b><i className={item.score >= 80 ? "high" : item.score >= 65 ? "medium" : "low"} /></button>)}</div></div>
      </section>

      <section className="method" id="method"><div><span className="step">Наш подход</span><h2>Подсказка, а не предсказание</h2></div><div className="method-grid"><p><b>01</b><span>Используем реальные фазы Луны и одну последовательную традицию.</span></p><p><b>02</b><span>Отделяем астрономический факт от символической интерпретации.</span></p><p><b>03</b><span>Не советуем откладывать медицинские, финансовые и другие важные решения.</span></p></div><p className="disclaimer">Рекомендации носят развлекательный и рефлексивный характер. Важные решения принимайте на основе фактов и совета специалистов.</p></section>
      <footer><div className="brand"><span className="brand-mark"><span /></span><span>Благоприятный день</span></div><p>Первая тестовая версия · 2026</p></footer>
    </main>
  );
}
