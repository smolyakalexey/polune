"use client";

import { ArrowCounterClockwise, Play } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./reveal-lab.module.css";

type Phase =
  | "start"
  | "arrive"
  | "shake"
  | "vanish"
  | "split"
  | "expand"
  | "result";

const timeline: ReadonlyArray<readonly [number, Phase]> = [
  [240, "arrive"],
  [820, "shake"],
  [1170, "vanish"],
  [1430, "split"],
  [1590, "expand"],
  [2590, "result"],
];

const phaseLabels: Record<Phase, string> = {
  start: "старт",
  arrive: "выезжает",
  shake: "немного трясётся",
  vanish: "исчезает первая картинка",
  split: "появляется вторая группа картинок",
  expand: "разъединяются, увеличиваются и встают на места",
  result: "готово",
};

export default function RevealLab() {
  const [phase, setPhase] = useState<Phase>("start");
  const timeoutIds = useRef<number[]>([]);

  const clearTimeline = useCallback(() => {
    timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIds.current = [];
  }, []);

  const play = useCallback(() => {
    clearTimeline();
    setPhase("start");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timeoutIds.current = [window.setTimeout(() => setPhase("result"), 220)];
      return;
    }

    timeoutIds.current = timeline.map(([delay, nextPhase]) =>
      window.setTimeout(() => setPhase(nextPhase), delay),
    );
  }, [clearTimeline]);

  useEffect(() => {
    const autoplayId = window.setTimeout(play, 260);
    return () => {
      window.clearTimeout(autoplayId);
      clearTimeline();
    };
  }, [clearTimeline, play]);

  const isRunning = phase !== "start" && phase !== "result";

  return (
    <main className={styles.stage}>
      <section
        className={styles.screen}
        data-phase={phase}
        aria-label="прототип анимации появления результата"
        aria-busy={isRunning}
      >
        <div className={styles.closedObject} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.glow} src="/reveal/figma-glow.svg" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.closedShell}
            src="/reveal/figma-shell-closed.png"
            alt=""
          />
        </div>

        <div className={styles.openObject} aria-hidden="true">
          <div className={`${styles.shellHalf} ${styles.topHalf}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/reveal/figma-shell-open.png" alt="" />
          </div>
          <div className={`${styles.shellHalf} ${styles.bottomHalf}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/reveal/figma-shell-open.png" alt="" />
          </div>
        </div>

        <div className={styles.controls}>
          <span aria-live="polite">{phaseLabels[phase]}</span>
          <button type="button" onClick={play} disabled={isRunning}>
            {phase === "start" ? (
              <Play aria-hidden="true" weight="fill" />
            ) : (
              <ArrowCounterClockwise aria-hidden="true" weight="bold" />
            )}
            {phase === "start" ? "воспроизвести" : "повторить"}
          </button>
        </div>
      </section>
    </main>
  );
}
