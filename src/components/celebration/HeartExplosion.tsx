"use client";

import { useEffect, useMemo } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

const HEART_SYMBOLS = ["❤️", "💗", "💖", "💕"];
const PARTICLE_COUNT = 20;
const DURATION_MS = 1300;

type Particle = {
  id: number;
  symbol: string;
  angleDeg: number;
  distancePx: number;
  rotateDeg: number;
  sizePx: number;
  delayMs: number;
};

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, id) => {
    const angleDeg = (360 / PARTICLE_COUNT) * id + (Math.random() * 20 - 10);
    return {
      id,
      symbol: HEART_SYMBOLS[Math.floor(Math.random() * HEART_SYMBOLS.length)],
      angleDeg,
      distancePx: 90 + Math.random() * 130,
      rotateDeg: Math.random() * 360 - 180,
      sizePx: 22 + Math.random() * 26,
      delayMs: Math.random() * 120,
    };
  });
}

/**
 * Full-screen heart-explosion overlay (specification §13/§14). Pure CSS
 * transforms/keyframes — no animation library, capped particle count to
 * stay cheap on older phones. Auto-removes after a fixed duration and
 * never blocks interaction (pointer-events: none).
 */
export function HeartExplosion({ onDone }: { onDone: () => void }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const particles = useMemo(() => createParticles(), []);

  useEffect(() => {
    const timeout = setTimeout(onDone, prefersReducedMotion ? 900 : DURATION_MS);
    return () => clearTimeout(timeout);
  }, [onDone, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
        aria-hidden
      >
        <span className="animate-heart-pop-in text-8xl">💖</span>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {particles.map((particle) => {
        const radians = (particle.angleDeg * Math.PI) / 180;
        const tx = Math.cos(radians) * particle.distancePx;
        const ty = Math.sin(radians) * particle.distancePx;

        return (
          <span
            key={particle.id}
            className="animate-heart-fly-out absolute left-1/2 top-1/2"
            style={{
              fontSize: `${particle.sizePx}px`,
              animationDelay: `${particle.delayMs}ms`,
              ["--heart-tx" as string]: `${tx}px`,
              ["--heart-ty" as string]: `${ty}px`,
              ["--heart-rotate" as string]: `${particle.rotateDeg}deg`,
            }}
          >
            {particle.symbol}
          </span>
        );
      })}
    </div>
  );
}
