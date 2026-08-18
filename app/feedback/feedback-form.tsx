"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { configureAnalyticsFromUrl, getAnonymousSessionId, trackEvent } from "@/lib/analytics";
import { intentCatalog } from "@/lib/intent-catalog";

type Context = { intentId?: string; selectedDate?: string; score?: number };
type SubmitState = "idle" | "sending" | "sent" | "error";

function RatingField({ legend, name, value, onChange }: { legend: string; name: string; value: number | null; onChange: (value: number) => void }) {
  return (
    <fieldset className="feedback-fieldset">
      <legend>{legend}</legend>
      <div className="feedback-scale">
        {[1, 2, 3, 4, 5].map((option) => (
          <label key={option}>
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} required />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <div className="feedback-scale-labels"><span>совсем нет</span><span>полностью</span></div>
    </fieldset>
  );
}

export function FeedbackForm() {
  const context = useRef<Context>({});
  const [clarity, setClarity] = useState<number | null>(null);
  const [trust, setTrust] = useState<number | null>(null);
  const [wouldReturn, setWouldReturn] = useState("");
  const [missingIntent, setMissingIntent] = useState("");
  const [comment, setComment] = useState("");
  const [company, setCompany] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  useEffect(() => {
    configureAnalyticsFromUrl();
    const params = new URLSearchParams(window.location.search);
    const intentId = params.get("intent") ?? undefined;
    const selectedDate = params.get("date") ?? undefined;
    const parsedScore = Number(params.get("score"));
    const nextContext = {
      intentId: intentCatalog.some((intent) => intent.id === intentId) ? intentId : undefined,
      selectedDate: /^\d{4}-\d{2}-\d{2}$/.test(selectedDate ?? "") ? selectedDate : undefined,
      score: Number.isInteger(parsedScore) && parsedScore >= 0 && parsedScore <= 100 ? parsedScore : undefined,
    };
    context.current = nextContext;
    trackEvent("feedback_form_opened", { intentId: nextContext.intentId, selectedDate: nextContext.selectedDate, score: nextContext.score });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clarity || !trust || !wouldReturn || submitState === "sending") return;
    setSubmitState("sending");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: getAnonymousSessionId(),
          ...context.current,
          clarity,
          trust,
          wouldReturn,
          missingIntent,
          comment,
          company,
        }),
      });
      if (!response.ok) throw new Error("feedback_failed");
      trackEvent("feedback_form_submitted", { intentId: context.current.intentId, selectedDate: context.current.selectedDate, score: context.current.score });
      setSubmitState("sent");
    } catch {
      setSubmitState("error");
    }
  }

  if (submitState === "sent") {
    return (
      <section className="feedback-success" aria-live="polite">
        <strong>спасибо, ответ сохранён</strong>
        <p>мы посмотрим не на единичное мнение, а на повторяющиеся затруднения нескольких участников</p>
        <Link href="/">вернуться к выбору дня</Link>
      </section>
    );
  }

  return (
    <form className="feedback-form" onSubmit={submit}>
      <RatingField legend="насколько понятно, почему выбран этот день" name="clarity" value={clarity} onChange={setClarity} />
      <RatingField legend="насколько вы доверяете объяснению" name="trust" value={trust} onChange={setTrust} />

      <fieldset className="feedback-fieldset">
        <legend>вернулись бы вы выбрать дату для другого дела</legend>
        <div className="feedback-options">
          {[{ value: "yes", label: "да" }, { value: "maybe", label: "возможно" }, { value: "no", label: "нет" }].map((option) => (
            <label key={option.value}>
              <input type="radio" name="wouldReturn" value={option.value} checked={wouldReturn === option.value} onChange={() => setWouldReturn(option.value)} required />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="feedback-text-field">
        <span>какого дела не хватило в каталоге <em>необязательно</em></span>
        <input value={missingIntent} onChange={(event) => setMissingIntent(event.target.value.slice(0, 120))} maxLength={120} placeholder="например, подготовиться к собеседованию" />
      </label>

      <label className="feedback-text-field">
        <span>что было непонятно или вызвало сомнение <em>необязательно</em></span>
        <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 500))} maxLength={500} rows={5} placeholder="напишите своими словами" />
        <small>не указывайте контакты и личную информацию</small>
      </label>

      <label className="feedback-honeypot" aria-hidden="true">company<input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} /></label>

      {submitState === "error" && <p className="feedback-error" role="alert">не получилось отправить ответ — проверьте соединение и попробуйте ещё раз</p>}
      <button className="feedback-submit" type="submit" disabled={submitState === "sending" || !clarity || !trust || !wouldReturn}>
        {submitState === "sending" ? "отправляем…" : "отправить ответ"}
      </button>
    </form>
  );
}
