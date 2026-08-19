"use client";

/* eslint-disable @next/next/no-img-element -- exact local PNG/SVG assets exported from Figma */

import { useEffect, useRef, useState } from "react";
import styles from "./reveal-transition.module.css";

type RevealPhase = "start" | "arrive" | "shake" | "morph" | "expand" | "result";

const timeline: ReadonlyArray<readonly [number, RevealPhase]> = [
  [40, "arrive"],
  [560, "shake"],
  [800, "morph"],
  [940, "expand"],
  [1900, "result"],
];

export default function RevealTransition({ theme, onComplete }: { theme: "dark" | "light"; onComplete: () => void }) {
  const [phase, setPhase] = useState<RevealPhase>("start");
  const completeRef = useRef(onComplete);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionId = window.setTimeout(() => completeRef.current(), 240);
      return () => window.clearTimeout(reducedMotionId);
    }

    const phaseIds = timeline.map(([delay, nextPhase]) =>
      window.setTimeout(() => setPhase(nextPhase), delay),
    );
    const completeId = window.setTimeout(() => completeRef.current(), 2080);

    return () => {
      phaseIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      window.clearTimeout(completeId);
    };
  }, []);

  return (
    <div className={styles.transition} data-phase={phase} data-theme={theme} role="status" aria-label="подбираем благоприятный день">
      <div className={styles.closedObject} aria-hidden="true">
        <img className={styles.glow} src="/reveal/figma-glow.svg" alt="" />
        <img className={styles.closedShell} src="/reveal/figma-shell-closed.png" alt="" />
      </div>

      <div className={styles.openObject} aria-hidden="true">
        <div className={`${styles.shellHalf} ${styles.topHalf}`}>
          <img src="/reveal/figma-shell-open.png" alt="" />
        </div>
        <div className={`${styles.shellHalf} ${styles.bottomHalf}`}>
          <img src="/reveal/figma-shell-open.png" alt="" />
        </div>
      </div>
    </div>
  );
}
