"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./reveal-transition.module.css";

type RevealPhase = "enter" | "ignite" | "count" | "wave" | "lock" | "lift" | "reveal" | "leave";

type RevealDay = {
  id: string;
  day: string;
  weekday: string;
  monthLabel: string;
  score: number;
};

type TransitionStar = {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
  birthDelay: number;
  waveDelay: number;
  waveX: number;
  waveY: number;
  base: boolean;
};

const timeline: ReadonlyArray<readonly [number, RevealPhase]> = [
  [60, "ignite"],
  [260, "count"],
  [1350, "wave"],
  [3000, "lock"],
  [3440, "lift"],
  [4050, "reveal"],
  [5180, "leave"],
];

function createTransitionStars(count: number): TransitionStar[] {
  let seed = 0x734a91;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, (_, id) => {
    const left = random() * 100;
    const top = random() * 100;
    const energy = random();
    return {
      id,
      left,
      top,
      size: energy > .985 ? 4.8 : energy > .92 ? 3 : energy > .62 ? 1.65 : .9,
      opacity: .36 + energy * .64,
      birthDelay: random() * 1.35,
      waveDelay: Math.max(0, (100 - top) / 100 * .72 + random() * .055),
      waveX: Math.sin(left / 100 * Math.PI * 5) * (14 + random() * 24),
      waveY: -(10 + random() * 19),
      base: id < 52,
    };
  });
}

const transitionStars = createTransitionStars(760);

const StarCloud = memo(function StarCloud() {
  return (
    <div className={styles.stars} aria-hidden="true">
      {transitionStars.map((star) => (
        <i
          className={`${styles.star} ${star.base ? styles.baseStar : ""}`}
          key={star.id}
          style={{
            "--star-left": `${star.left}%`,
            "--star-top": `${star.top}%`,
            "--star-size": `${star.size}px`,
            "--star-opacity": star.opacity,
            "--birth-delay": `${star.birthDelay}s`,
            "--wave-delay": `${star.waveDelay}s`,
            "--wave-x": `${star.waveX}px`,
            "--wave-y": `${star.waveY}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
});

export default function RevealTransition({
  theme,
  intentLabel,
  selectedDay,
  resultHeading,
  resultAdvice,
  onComplete,
}: {
  theme: "dark" | "light";
  intentLabel: string;
  selectedDay: RevealDay;
  resultHeading: string;
  resultAdvice: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<RevealPhase>("enter");
  const [reelDay, setReelDay] = useState(1);
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionId = window.setTimeout(() => completeRef.current(), 260);
      return () => {
        document.body.style.overflow = previousOverflow;
        window.clearTimeout(reducedMotionId);
      };
    }

    const phaseIds = timeline.map(([delay, nextPhase]) =>
      window.setTimeout(() => setPhase(nextPhase), delay),
    );
    const completeId = window.setTimeout(() => completeRef.current(), 5520);

    return () => {
      document.body.style.overflow = previousOverflow;
      phaseIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.clearTimeout(completeId);
    };
  }, []);

  useEffect(() => {
    if (phase !== "count" && phase !== "wave") return;

    const intervalId = window.setInterval(() => {
      setReelDay((day) => day === 31 ? 1 : day + 1);
    }, 76);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  const month = selectedDay.monthLabel.split(",")[0];
  const locked = phase === "lock" || phase === "lift" || phase === "reveal" || phase === "leave";
  const reelDays = [-2, -1, 0, 1, 2].map((offset) => ((reelDay + offset + 30) % 31) + 1);

  return (
    <div
      className={styles.transition}
      data-phase={phase}
      data-theme={theme}
      role="status"
      aria-label={`определяем лучший день, чтобы ${intentLabel}`}
    >
      <div className={styles.spaceGlow} aria-hidden="true" />
      <StarCloud />

      <div className={styles.counterCluster} aria-hidden="true">
        <div className={styles.reelViewport}>
          {locked ? (
            <div className={styles.lockedDate}>
              <strong>{selectedDay.day}</strong>
              <span>{month}</span>
            </div>
          ) : (
            <div className={styles.dayReel} key={reelDay}>
              {reelDays.map((day, index) => (
                <span className={index === 2 ? styles.activeReelDay : ""} key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
          )}
        </div>
        <p className={styles.counterCopy}>
          <span>{locked ? "лучший день найден" : "определяем лучший день, чтобы"}</span>
          {!locked && <strong>{intentLabel}</strong>}
        </p>
      </div>

      <div className={styles.finalCopy} aria-hidden="true">
        <h2>{resultHeading}</h2>
        <p>{resultAdvice}</p>
      </div>
    </div>
  );
}
