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
  waveX: number;
  waveY: number;
  glow: boolean;
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
      waveX: Math.sin(left / 100 * Math.PI * 5) * (14 + random() * 24),
      waveY: -(10 + random() * 19),
      glow: energy > .965,
      base: id < 52,
    };
  });
}

const transitionStars = createTransitionStars(680);
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
      const density = clamp((elapsed - 60) / 1380);
      const wave = clamp((elapsed - 1350) / 1650);
      const waveFront = 1.1 - wave * 1.22;
      const settle = clamp((elapsed - 4050) / 920);
      context.clearRect(0, 0, width, height);

      for (const star of transitionStars) {
        const birth = clamp((elapsed - 60 - star.birthDelay * 1000) / 420);
        const baseOpacity = star.base ? star.opacity * .34 : star.opacity * density;
        if (birth <= 0 || baseOpacity <= .01) continue;

        const easedBirth = 1 - Math.pow(1 - birth, 3);
        const normalizedY = star.top / 100;
        const distance = (normalizedY - waveFront) / .082;
        const impulse = wave > 0 && wave < 1 ? Math.exp(-(distance * distance)) : 0;
        const twinkle = .9 + Math.sin(now * .0022 + star.id * 1.73) * .1;
        const calmScale = 1.18 + density * .28;
        const scale = (calmScale + impulse * 1.9) * (.3 + easedBirth * .7) * (1 - settle * .38);
        const opacity = Math.min(1, baseOpacity * easedBirth * twinkle * (1 + impulse * 1.35)) * (1 - settle * .5);
        const x = star.left / 100 * width + star.waveX * impulse;
        const y = star.top / 100 * height + star.waveY * impulse;
        const radius = star.size * scale;

        context.fillStyle = `rgba(224, 251, 255, ${opacity})`;
        if (star.glow) {
          context.shadowColor = `rgba(145, 235, 255, ${Math.min(.9, opacity)})`;
          context.shadowBlur = 5 + impulse * 7;
        }

        if (radius < 1.25) {
          context.fillRect(x, y, Math.max(.75, radius), Math.max(.75, radius));
        } else {
          context.beginPath();
          context.ellipse(x, y, radius * (1 + impulse * .65), radius * (1 - impulse * .3), 0, 0, Math.PI * 2);
          context.fill();
        }

        if (star.glow) context.shadowBlur = 0;
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
        <div className={styles.reelViewport}>
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
