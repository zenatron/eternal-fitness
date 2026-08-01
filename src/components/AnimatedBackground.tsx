'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useAccent } from '@/components/theme/AccentProvider';
import { readAccentHue } from '@/utils/accentHue';

/**
 * Ambient ember particles — the "molten energy" backdrop from the Forge
 * direction (.impeccable.md).
 *
 * This is decoration that runs on every screen of a phone app, so it is written
 * to be cheap:
 *
 *  - Glow sprites are pre-rendered once instead of building a radial gradient
 *    per particle per frame, which was the dominant cost.
 *  - Device pixel ratio is capped at 2. A modern phone reports 3, which meant
 *    rendering 9x the logical pixels for a blurred background nobody inspects.
 *  - The loop stops entirely when the page is hidden. Browsers throttle rAF in
 *    background tabs but an installed PWA is not always treated as one.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  /** Index into the pre-rendered sprite set. */
  sprite: number;
}

/** Distinct glow colours to pre-render. More is smoother but costs memory. */
const SPRITE_COUNT = 4;
const SPRITE_SIZE = 64;
const MAX_DPR = 2;

/** Fewer particles on small screens, where there is less area to fill. */
function particleBudget(width: number): number {
  if (width < 640) return 18;
  if (width < 1024) return 28;
  return 40;
}

/**
 * Renders the radial glow once per hue into an offscreen canvas. Drawing a
 * cached bitmap is dramatically cheaper than recreating a gradient each frame.
 */
function buildSprites(baseHue: number): HTMLCanvasElement[] {
  return Array.from({ length: SPRITE_COUNT }, (_, index) => {
    const sprite = document.createElement('canvas');
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;

    const context = sprite.getContext('2d');
    if (!context) return sprite;

    // Spread across a narrow band either side of the theme's hue, so the
    // embers vary without drifting into a neighbouring colour.
    const hue = baseHue - 3 + (index / (SPRITE_COUNT - 1)) * 20;
    const centre = SPRITE_SIZE / 2;

    const gradient = context.createRadialGradient(centre, centre, 0, centre, centre, centre);
    gradient.addColorStop(0, `hsla(${hue}, 90%, 55%, 1)`);
    gradient.addColorStop(0.4, `hsla(${hue}, 85%, 45%, 0.5)`);
    gradient.addColorStop(1, `hsla(${hue}, 80%, 35%, 0)`);

    context.fillStyle = gradient;
    context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

    // Hot core, drawn into the same sprite so each particle is a single blit.
    context.fillStyle = `hsla(${hue}, 95%, 78%, 0.9)`;
    context.beginPath();
    context.arc(centre, centre, SPRITE_SIZE * 0.045, 0, Math.PI * 2);
    context.fill();

    return sprite;
  });
}

export function AnimatedBackground() {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Not read directly — the hue comes from CSS. It is in the dependency list so
  // the sprite cache is rebuilt when the theme changes; without it the embers
  // would keep burning in the previous accent until a reload.
  const { accent } = useAccent();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const sprites = buildSprites(readAccentHue());
    const particles: Particle[] = [];
    let animationId: number | null = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let maxParticles = particleBudget(width);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      maxParticles = particleBudget(width);

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      // Assigning width/height resets the context transform, so the scale below
      // is applied to a clean state rather than compounding on every resize.
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    const spawnParticle = () => {
      if (particles.length >= maxParticles) return;
      particles.push({
        x: Math.random() * width,
        y: height + 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.2 + Math.random() * 0.5),
        life: 0,
        maxLife: 300 + Math.random() * 400,
        size: 1 + Math.random() * 2.5,
        sprite: Math.floor(Math.random() * SPRITE_COUNT),
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (Math.random() < 0.08) spawnParticle();

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.x += p.vx + Math.sin(p.life * 0.008) * 0.15;
        p.y += p.vy;
        p.life += 1;

        if (p.life > p.maxLife || p.y < -20) {
          particles.splice(i, 1);
          continue;
        }

        // Fade in over the first 10% of life and out over the last 30%.
        const progress = p.life / p.maxLife;
        const fade =
          progress < 0.1 ? progress * 10 : progress > 0.7 ? (1 - progress) / 0.3 : 1;

        const diameter = p.size * 16;
        ctx.globalAlpha = fade * 0.16;
        ctx.drawImage(
          sprites[p.sprite],
          p.x - diameter / 2,
          p.y - diameter / 2,
          diameter,
          diameter
        );
      }

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    const start = () => {
      if (animationId === null) animationId = requestAnimationFrame(draw);
    };

    const stop = () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        start();
      } else {
        stop();
        // Drop the particles too: resuming from an empty field looks the same
        // as resuming mid-flight, and this frees the memory while backgrounded.
        particles.length = 0;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', handleVisibility);
    if (document.visibilityState === 'visible') start();

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [prefersReducedMotion, accent]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
