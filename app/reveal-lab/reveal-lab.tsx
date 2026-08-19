"use client";

import {
  ArrowCounterClockwise,
  Check,
  Info,
  Moon,
  ShareNetwork,
  Sun,
} from "@phosphor-icons/react";
import "@fontsource/cormorant-garamond/400.css";
import { useEffect, useRef, useState } from "react";
import styles from "./reveal-lab.module.css";

type Phase = "ready" | "tension" | "opening" | "result";
type Theme = "light" | "dark";

const timers = [320, 1040] as const;

export default function RevealLab() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [theme, setTheme] = useState<Theme>("light");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutIds = useRef<number[]>([]);

  useEffect(
    () => () => timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId)),
    [],
  );

  const clearTimers = () => {
    timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIds.current = [];
  };

  const runReveal = () => {
    if (phase !== "ready") return;

    clearTimers();
    setDetailsOpen(false);
    setSaved(false);
    setPhase("tension");

    timeoutIds.current = [
      window.setTimeout(() => setPhase("opening"), timers[0]),
      window.setTimeout(() => setPhase("result"), timers[1]),
    ];
  };

  const reset = () => {
    clearTimers();
    setPhase("ready");
    setDetailsOpen(false);
    setSaved(false);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  const save = () => {
    setSaved(true);
    timeoutIds.current.push(window.setTimeout(() => setSaved(false), 1800));
  };

  const showResult = phase === "opening" || phase === "result";
  const isRunning = phase === "tension" || phase === "opening";

  return (
    <main
      className={styles.stage}
      data-phase={phase}
      data-theme={theme}
      aria-busy={isRunning}
    >
      <div className={styles.screen}>
        <header className={styles.header}>
          <button
            className={styles.iconButton}
            type="button"
            onClick={reset}
            aria-label="повторить анимацию"
            disabled={phase === "ready"}
          >
            <ArrowCounterClockwise aria-hidden="true" weight="bold" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.logo}
            src="/figma/polune-mark.svg"
            alt="polune"
          />

          <button
            className={styles.iconButton}
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "включить тёмную тему" : "включить светлую тему"}
          >
            {theme === "light" ? (
              <Moon aria-hidden="true" weight="fill" />
            ) : (
              <Sun aria-hidden="true" weight="fill" />
            )}
          </button>
        </header>

        <section className={styles.query} aria-hidden={showResult}>
          <h1>благоприятный<br />день, чтобы</h1>
          <p>постричься</p>
        </section>

        <div className={styles.objectStage} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.closedShell}
            src="/reveal/shell-closed.webp"
            alt=""
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.openShell}
            src="/reveal/shell-open.webp"
            alt=""
          />
        </div>

        {isRunning && (
          <p className={styles.progress} role="status">
            смотрим ритм дня
          </p>
        )}

        <section className={styles.result} aria-hidden={!showResult}>
          <article className={styles.resultCard}>
            <p className={styles.date}>
              <span>24</span>
              августа, пн
            </p>

            <div className={styles.rule} />

            <h1>день для мягкого обновления</h1>
            <p className={styles.advice}>
              освежите форму, не меняя себя целиком
            </p>
          </article>

          <button
            className={styles.methodButton}
            type="button"
            onClick={() => setDetailsOpen((isOpen) => !isOpen)}
            aria-expanded={detailsOpen}
          >
            как посчитали
            <Info aria-hidden="true" weight="regular" />
          </button>

          {detailsOpen && (
            <div className={styles.details}>
              растущая луна поддерживает обновление формы
              <br />
              день подходит для спокойных изменений без резких решений
            </div>
          )}
        </section>

        <div className={styles.actions} data-visible={phase === "ready" || phase === "result"}>
          {phase === "ready" ? (
            <button className={styles.primaryButton} type="button" onClick={runReveal}>
              узнать день
            </button>
          ) : (
            <>
              <button className={styles.primaryButton} type="button" onClick={save}>
                {saved ? (
                  <>
                    <Check aria-hidden="true" weight="bold" />
                    добавлено
                  </>
                ) : (
                  "добавить событие"
                )}
              </button>
              <button className={styles.shareButton} type="button" aria-label="поделиться">
                <ShareNetwork aria-hidden="true" weight="bold" />
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
