"use client";

/* eslint-disable @next/next/no-img-element -- local brand and status assets */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./reveal-transition.module.css";

type RevealPhase = "enter" | "scan" | "lock" | "reveal" | "leave";

type RevealDay = {
  id: string;
  day: string;
  weekday: string;
  monthLabel: string;
  score: number;
};

const timeline: ReadonlyArray<readonly [number, RevealPhase]> = [
  [40, "enter"],
  [280, "scan"],
  [1420, "lock"],
  [1780, "reveal"],
  [2460, "leave"],
];

export default function RevealTransition({
  theme,
  intentLabel,
  selectedDay,
  candidates,
  onComplete,
}: {
  theme: "dark" | "light";
  intentLabel: string;
  selectedDay: RevealDay;
  candidates: RevealDay[];
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<RevealPhase>("enter");
  const completeRef = useRef(onComplete);
  const searchDays = useMemo(
    () => [...candidates.filter((day) => day.id !== selectedDay.id).slice(0, 4), selectedDay],
    [candidates, selectedDay],
  );

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionId = window.setTimeout(() => completeRef.current(), 220);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.clearTimeout(reducedMotionId);
      };
    }

    const phaseIds = timeline.map(([delay, nextPhase]) =>
      window.setTimeout(() => setPhase(nextPhase), delay),
    );
    const completeId = window.setTimeout(() => completeRef.current(), 2660);

    return () => {
      document.body.style.overflow = previousOverflow;
      phaseIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.clearTimeout(completeId);
    };
  }, []);

  return (
    <div
      className={styles.transition}
      data-phase={phase}
      data-theme={theme}
      role="status"
      aria-label={`подбираем благоприятный день, чтобы ${intentLabel}`}
    >
      <div className={styles.aurora} aria-hidden="true" />

      <header className={styles.brand} aria-hidden="true">
        <img src="/figma/start-logo.svg" alt="" />
        <span>polune</span>
      </header>

      <div className={styles.searchCopy}>
        <span>подбираем день, чтобы</span>
        <strong>{intentLabel}</strong>
      </div>

      <div className={styles.foundCopy}>
        <span className={styles.checkmark} aria-hidden="true">✓</span>
        <span>подходящий день найден</span>
      </div>

      <div className={styles.dateViewport} aria-hidden="true">
        <div className={styles.focusHalo} />
        <div className={styles.dateRail}>
          {searchDays.map((day, index) => (
            <div
              className={`${styles.dateCard} ${day.id === selectedDay.id ? styles.selectedDate : ""}`}
              key={day.id}
              style={{ "--card-index": index } as CSSProperties}
            >
              <span className={styles.dateNumber}>{day.day}</span>
              <span className={styles.dateMeta}>
                <strong>{day.monthLabel.split(",")[0]}</strong>
                <small>{day.weekday}</small>
              </span>
              <span className={styles.searchDot} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.resultPreview} aria-hidden="true">
        <div className={styles.resultScore}>
          <img src="/figma/status-excellent.svg" alt="" />
          <span>{selectedDay.score}% · лучший день</span>
        </div>
        <div className={styles.resultDate}>
          <strong>{selectedDay.day}</strong>
          <span>{selectedDay.monthLabel}</span>
        </div>
        <div className={styles.resultLine} />
        <div className={`${styles.resultLine} ${styles.shortLine}`} />
      </div>

      <div className={styles.homeIndicator} aria-hidden="true" />
    </div>
  );
}
