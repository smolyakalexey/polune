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
  base: boolean;
};

const timeline: ReadonlyArray<readonly [number, RevealPhase]> = [
  [60, "ignite"],
  [360, "count"],
  [1700, "wave"],
  [2850, "lock"],
  [3300, "lift"],
  [3900, "reveal"],
  [4950, "leave"],
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
      size: energy > .975 ? 3.4 : energy > .86 ? 2 : energy > .52 ? 1.2 : .72,
      opacity: .28 + energy * .7,
      birthDelay: random() * 1.25,
      waveDelay: Math.max(0, (100 - top) / 100 * 1.05 + random() * .08),
      base: id < 38,
    };
  });
}

const transitionStars = createTransitionStars(420);

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
  const [counterValue, setCounterValue] = useState("47281");
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
    const completeId = window.setTimeout(() => completeRef.current(), 5300);

    return () => {
      document.body.style.overflow = previousOverflow;
      phaseIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.clearTimeout(completeId);
    };
  }, []);

  useEffect(() => {
    if (phase !== "count" && phase !== "wave") return;

    let seed = phase === "count" ? 0x91ab2f : 0x410cd7;
    const intervalId = window.setInterval(() => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      setCounterValue(String(10000 + (seed % 89999)));
    }, 58);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  const month = selectedDay.monthLabel.split(",")[0];
  const locked = phase === "lock" || phase === "lift" || phase === "reveal" || phase === "leave";
  const displayedValue = locked ? selectedDay.day : counterValue;

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

      <div className={styles.waveField} aria-hidden="true">
        <i className={styles.waveGlow} />
        <i className={styles.waveRing} />
        <i className={`${styles.waveRing} ${styles.waveRingDelay}`} />
      </div>

      <div className={styles.counterCluster} aria-hidden="true">
        <div className={`${styles.counterValue} ${locked ? styles.lockedValue : ""}`} key={displayedValue}>
          <strong>{displayedValue}</strong>
          {locked && <span>{month}</span>}
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

      <div className={styles.progress} aria-hidden="true"><span /></div>
    </div>
  );
}
