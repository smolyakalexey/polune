"use client";

import { memo, useEffect, useRef, useState } from "react";
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
  depth: 0 | 1 | 2;
  twinkleOffset: number;
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
    const depth: 0 | 1 | 2 = id < count * .75 ? 0 : id < count * .965 ? 1 : 2;
    const sizeSeed = random();
    const size = depth === 0
      ? .38 + sizeSeed * .52
      : depth === 1
        ? .75 + sizeSeed * .78
        : 1.5 + sizeSeed * 1.35;
    const opacity = depth === 0
      ? .32 + random() * .36
      : depth === 1
        ? .5 + random() * .4
        : .26 + random() * .34;
    return {
      id,
      left,
      top,
      size,
      opacity,
      birthDelay: random() * .72,
      depth,
      twinkleOffset: random() * Math.PI * 2,
      base: id < 58,
    };
  });
}

const transitionStars = createTransitionStars(960);
const reelDays = Array.from({ length: 62 }, (_, index) => index % 31 + 1);

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

const StarCanvas = memo(function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    const startedAt = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now: number) => {
      const elapsed = now - startedAt;
      const density = clamp((elapsed - 60) / 1100);
      const wave = clamp((elapsed - 1350) / 1650);
      const waveFront = .82 - wave * .78;
      const calm = clamp((elapsed - 3000) / 1050);
      const settle = clamp((elapsed - 4050) / 920);
      context.clearRect(0, 0, width, height);

      for (const star of transitionStars) {
        const birth = clamp((elapsed - 60 - star.birthDelay * 1000) / 420);
        const baseOpacity = star.base ? star.opacity * .66 : star.opacity * density;
        if (birth <= 0 || baseOpacity <= .01) continue;

        const easedBirth = 1 - Math.pow(1 - birth, 3);
        const normalizedY = star.top / 100;
        const edge = Math.abs(star.left / 100 - .5) * 2;
        const curvedFront = waveFront + edge * edge * .055;
        const distance = (normalizedY - curvedFront) / .09;
        const impulse = wave > 0 && wave < 1 ? Math.exp(-(distance * distance)) : 0;
        const crest = wave > 0 && wave < 1 ? Math.exp(-(distance * distance) * 4.4) : 0;
        const twinkle = .93 + Math.sin(now * .0018 + star.twinkleOffset) * .07;
        const waveScale = star.depth === 0 ? .78 : star.depth === 1 ? 1.05 : .55;
        const calmScale = star.depth === 0 ? .78 : star.depth === 1 ? .86 : .92;
        const finalScale = star.depth === 2 ? 1 + settle * .42 : 1 - settle * (star.depth === 0 ? .28 : .14);
        const scale = (1 + density * .1 + impulse * waveScale)
          * (.32 + easedBirth * .68)
          * (1 - calm * (1 - calmScale))
          * finalScale;
        const settleOpacity = star.depth === 0 ? .36 : star.depth === 1 ? .52 : .62;
        const densityBoost = impulse * (star.depth === 0 ? .16 : .09) + crest * (star.depth === 0 ? .08 : .14);
        const opacity = Math.min(1, baseOpacity * easedBirth * twinkle * (1 + impulse * 1.15) + densityBoost)
          * (1 - calm * .16)
          * (1 - settle * (1 - settleOpacity));
        const perspective = impulse * (.012 + star.depth * .01);
        const sourceX = star.left / 100 * width;
        const sourceY = star.top / 100 * height;
        const x = width * .5 + (sourceX - width * .5) * (1 + perspective);
        const y = height * .52 + (sourceY - height * .52) * (1 + perspective) - impulse * (3 + star.depth * 1.5);
        const radius = star.size * scale;

        const color = star.depth === 0 ? "195, 231, 238" : star.depth === 1 ? "215, 249, 252" : "188, 234, 241";
        context.fillStyle = `rgba(${color}, ${opacity})`;
        const crestGlow = crest > .12 && star.id % 5 === 0;
        if (star.depth === 2 || crestGlow) {
          context.shadowColor = `rgba(145, 235, 247, ${Math.min(.72, opacity + crest * .24)})`;
          context.shadowBlur = star.depth === 2 ? 4 + impulse * 3 : 3 + crest * 8;
        }

        context.beginPath();
        context.arc(x, y, Math.max(.42, radius), 0, Math.PI * 2);
        context.fill();

        if (star.depth === 2 || crestGlow) context.shadowBlur = 0;
      }

      if (elapsed < 5600) frameId = window.requestAnimationFrame(draw);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    frameId = window.requestAnimationFrame(draw);
    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.starCanvas} aria-hidden="true" />;
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

  const month = selectedDay.monthLabel.split(",")[0];
  const locked = phase === "lock" || phase === "lift" || phase === "reveal" || phase === "leave";

  return (
    <div
      className={styles.transition}
      data-phase={phase}
      data-theme={theme}
      role="status"
      aria-label={`определяем лучший день, чтобы ${intentLabel}`}
    >
      <div className={styles.spaceGlow} aria-hidden="true" />
      <StarCanvas />

      <div className={styles.counterCluster} aria-hidden="true">
        <div className={`${styles.reelViewport} ${locked ? styles.reelViewportLocked : ""}`}>
          {locked ? (
            <div className={styles.lockedDate}>
              <strong>{selectedDay.day}</strong>
              <span>{month}</span>
            </div>
          ) : (
            <div className={styles.dayReel}>
              <div className={styles.dayReelTrack}>
                {reelDays.map((day, index) => <span key={`rail-${index}`}>{day}</span>)}
              </div>
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
