'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ACHIEVEMENT_DEFINITIONS, TIER_COLORS, TIER_NAMES, localizeAchievement } from '@/types/achievements';
import { formatVolume } from '@/utils/formatters';
import { formatPRValue } from '@/utils/prFormatting';

const springSnappy = { type: 'spring' as const, stiffness: 400, damping: 30, mass: 0.8 };
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20, mass: 0.7 };
const springGentle = { type: 'spring' as const, stiffness: 200, damping: 25, mass: 0.9 };

interface VictoryData {
  workoutName: string;
  durationMinutes: number;
  totalVolume: number;
  totalSets: number;
  totalExercises: number;
  totalDistance: number;
  newAchievementIds: string[];
  pointsAwarded: number;
  progress: Record<string, number>;
  newPRs: Array<{
    exerciseName: string;
    type: string;
    value: number;
  }>;
  useMetric: boolean;
}

interface VictoryPopupProps {
  data: VictoryData;
  isOpen: boolean;
  onContinue: () => void;
}

function formatDistance(value: number, useMetric: boolean): string {
  const unit = useMetric ? 'km' : 'mi';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${unit}`;
  if (value >= 1) return `${value.toFixed(1)} ${unit}`;
  return `${(value * 1000).toFixed(0)}m`;
}

function SparkCanvas({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isActive || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      radius: number;
      hue: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const spawnBurst = () => {
      for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particles.push({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 0,
          maxLife: 60 + Math.random() * 120,
          radius: 2 + Math.random() * 3,
          hue: 25 + Math.random() * 40,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles = particles.filter(p => p.life < p.maxLife);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.01;
        p.life++;

        const alpha = 1 - p.life / p.maxLife;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${alpha})`);
        gradient.addColorStop(0.5, `hsla(${p.hue}, 90%, 55%, ${alpha * 0.6})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 80%, 40%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 85%, ${alpha})`;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    spawnBurst();
    let burstCount = 1;
    const interval = setInterval(() => {
      if (burstCount >= 3) {
        clearInterval(interval);
        return;
      }
      spawnBurst();
      burstCount++;
    }, 2000);
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%' }}
    />
  );
}

function ScrollingXP({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target <= 0) return;
    const startTime = Date.now();
    const totalDuration = 1500;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  if (target <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springBouncy, delay: 0.5 }}
      className="flex items-center justify-center gap-2 my-4"
    >
      <span className="text-2xl">⭐</span>
      <span className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 tabular-nums">
        +{display}
      </span>
      <span className="text-lg font-display font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">
        XP
      </span>
    </motion.div>
  );
}

function HighlightPill({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springBouncy, delay }}
      className="flex flex-col items-center px-5 py-3 rounded-2xl bg-surface-950 dark:bg-surface-200/60 backdrop-blur-sm border border-surface-200/60 dark:border-surface-300/40"
    >
      <span className="text-2xl font-display font-black text-surface-800 dark:text-white">{value}</span>
      <span className="text-xs font-medium text-surface-600 dark:text-surface-600 uppercase tracking-wider mt-1">{label}</span>
    </motion.div>
  );
}

function RecordCard({ pr, formattedValue, delay }: { pr: { exerciseName: string; type: string; value: number }; formattedValue: string; delay: number }) {
  const typeLabel = {
    maxWeight: 'Max Weight',
    maxVolume: 'Max Volume',
    maxDuration: 'Max Duration',
    maxDistance: 'Max Distance',
  }[pr.type] || pr.type;

  const icon = {
    maxWeight: '🏋️',
    maxVolume: '📊',
    maxDuration: '⏱️',
    maxDistance: '📍',
  }[pr.type] || '🏆';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ ...springBouncy, delay }}
      className="relative p-3 rounded-xl border-2 border-forge-400/40 dark:border-forge-500/30 bg-gradient-to-br from-forge-50/80 to-amber-50/60 dark:from-forge-900/20 dark:to-amber-900/10"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-display font-bold text-surface-800 dark:text-white text-sm tracking-wide">
            {pr.exerciseName}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-forge-500 text-white">
              {typeLabel}
            </span>
            <span className="text-xs font-semibold text-forge-600 dark:text-forge-400">
              {formattedValue}
            </span>
          </div>
        </div>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...springSnappy, delay: delay + 0.2 }}
          className="text-xs font-bold text-forge-600 dark:text-forge-400 uppercase tracking-wider"
        >
          NEW PR
        </motion.span>
      </div>
    </motion.div>
  );
}

function AchievementCard({ achievement, delay, isNew, useMetric }: { achievement: any; delay: number; isNew?: boolean; useMetric: boolean }) {
  const tierGradient = TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS] || 'from-amber-400 to-amber-600';
  const tierName = TIER_NAMES[achievement.tier as keyof typeof TIER_NAMES] || achievement.tier;
  const localized = useMemo(() => localizeAchievement(achievement, useMetric), [achievement, useMetric]);

  return (
    <motion.div
      initial={{ opacity: 0, x: isNew ? -30 : 0, y: isNew ? 0 : 10, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ ...springBouncy, delay }}
      className={`relative p-4 rounded-xl border-2 overflow-hidden ${
        isNew
          ? 'border-amber-400/60 dark:border-amber-500/50 bg-gradient-to-br from-amber-50/80 to-yellow-50/60 dark:from-amber-900/30 dark:to-yellow-900/20'
          : 'border-surface-200 dark:border-surface-300/30 bg-surface-950/60 dark:bg-surface-200/30'
      }`}
    >
      {isNew && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: 2, ease: 'easeInOut', delay: delay + 0.5 }}
        />
      )}
      <div className="flex items-center gap-3 relative z-10">
        <span className="text-2xl">{achievement.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-surface-800 dark:text-white text-sm tracking-wide">
              {achievement.name}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r ${tierGradient} text-white`}>
              {tierName}
            </span>
          </div>
          <p className="text-xs text-surface-500 dark:text-surface-600 mt-0.5 line-clamp-1">
            {localized.description}
          </p>
        </div>
        {isNew && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...springSnappy, delay: delay + 0.3 }}
            className="text-xs font-bold text-amber-600 dark:text-amber-400"
          >
            +{achievement.points} XP
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

function ProgressBar({ achievement, delay }: { achievement: any; delay: number }) {
  const tierGradient = TIER_COLORS[achievement.tier as keyof typeof TIER_COLORS] || 'from-amber-400 to-amber-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springGentle, delay }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{achievement.icon}</span>
          <span className="text-xs font-medium text-surface-700 dark:text-surface-500">{achievement.name}</span>
        </div>
        <span className="text-xs font-bold text-surface-600 dark:text-surface-500 tabular-nums">
          {Math.round(achievement.progressPercentage || 0)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-300/40 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${tierGradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, achievement.progressPercentage || 0)}%` }}
          transition={{ duration: 1, delay: delay + 0.2, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

export default function VictoryPopup({ data, isOpen, onContinue }: VictoryPopupProps) {
  const prefersReducedMotion = useReducedMotion();

  const newAchievements = useMemo(() => {
    return data.newAchievementIds
      .map(id => ACHIEVEMENT_DEFINITIONS.find(a => a.id === id))
      .filter(Boolean) as typeof ACHIEVEMENT_DEFINITIONS;
  }, [data.newAchievementIds]);

  const closestAchievements = useMemo(() => {
    const unlocked = new Set(data.newAchievementIds);
    const scored = ACHIEVEMENT_DEFINITIONS
      .filter(a => !unlocked.has(a.id))
      .map(a => {
        const currentProgress = data.progress[a.category] || 0;
        const progressPercentage = Math.min(100, (currentProgress / a.requirement) * 100);
        return { ...a, progress: currentProgress, progressPercentage, requirement: a.requirement };
      })
      .filter(a => a.progressPercentage > 0 && a.progressPercentage < 100)
      .sort((a, b) => b.progressPercentage - a.progressPercentage);

    const selected: typeof scored = [];
    const categoriesSeen = new Set<string>();
    for (const a of scored) {
      if (categoriesSeen.has(a.category)) continue;
      categoriesSeen.add(a.category);
      selected.push(a);
      if (selected.length >= 3) break;
    }
    return selected;
  }, [data.progress, data.newAchievementIds]);

  const pillItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (data.totalVolume > 0) {
      items.push({ label: 'Volume', value: formatVolume(data.totalVolume, data.useMetric) });
    }
    if (data.totalDistance > 0) {
      items.push({ label: 'Distance', value: formatDistance(data.totalDistance, data.useMetric) });
    }
    items.push({ label: 'Sets', value: String(data.totalSets) });
    items.push({ label: 'Exercises', value: String(data.totalExercises) });
    items.push({ label: 'Duration', value: `${data.durationMinutes}m` });
    return items;
  }, [data.totalVolume, data.totalDistance, data.totalSets, data.totalExercises, data.durationMinutes, data.useMetric]);

  const formattedPRs = useMemo(() => {
    return data.newPRs.map(pr => ({
      ...pr,
      formattedValue: formatPRValue(pr.value, pr.type as any, data.useMetric),
    }));
  }, [data.newPRs, data.useMetric]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-sm"
            onClick={onContinue}
          />

          <SparkCanvas isActive={isOpen} />

          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.85, y: 40 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9, y: 20 }}
            transition={springBouncy}
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-surface-100 shadow-2xl border border-surface-200 dark:border-surface-300"
          >
            <div className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 opacity-10 dark:opacity-[0.07]" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-surface-100" />

              <div className="relative px-6 sm:px-8 pt-8 pb-4">
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ ...springGentle, delay: 0.1 }}
                  className="text-center"
                >
                  <motion.h2
                    initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
                    animate={prefersReducedMotion ? {} : { scale: 1, opacity: 1 }}
                    transition={{ ...springBouncy, delay: 0.2 }}
                    className="text-3xl sm:text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 tracking-wide uppercase"
                  >
                    Workout Complete!
                  </motion.h2>
                  <p className="text-surface-600 dark:text-surface-500 text-sm mt-1 font-display tracking-wide">
                    {data.workoutName}
                  </p>
                </motion.div>

                <ScrollingXP target={data.pointsAwarded} />

                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-wrap justify-center gap-3 mt-4"
                >
                  {pillItems.map((pill, i) => (
                    <HighlightPill key={pill.label} label={pill.label} value={pill.value} delay={0.7 + i * 0.1} />
                  ))}
                </motion.div>
              </div>

              <div className="relative px-6 sm:px-8 pb-6 space-y-4">
                {data.newPRs.length > 0 && (
                  <motion.div
                    initial={prefersReducedMotion ? {} : { opacity: 0 }}
                    animate={prefersReducedMotion ? {} : { opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🏆</span>
                      <h3 className="text-sm font-display font-bold text-surface-800 dark:text-white uppercase tracking-wider">
                        New Personal Records
                      </h3>
                      <motion.span
                        animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-forge-500 text-white rounded-full"
                      >
                        {data.newPRs.length} NEW
                      </motion.span>
                    </div>
                    {formattedPRs.map((pr, i) => (
                      <RecordCard key={`${pr.exerciseName}-${pr.type}`} pr={pr} formattedValue={pr.formattedValue} delay={0.8 + i * 0.1} />
                    ))}
                  </motion.div>
                )}

                {newAchievements.length > 0 && (
                  <motion.div
                    initial={prefersReducedMotion ? {} : { opacity: 0 }}
                    animate={prefersReducedMotion ? {} : { opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎉</span>
                      <h3 className="text-sm font-display font-bold text-surface-800 dark:text-white uppercase tracking-wider">
                        New Achievements
                      </h3>
                      <motion.span
                        animate={prefersReducedMotion ? {} : { scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full"
                      >
                        {newAchievements.length} NEW
                      </motion.span>
                    </div>
                    {newAchievements.map((a, i) => (
                      <AchievementCard key={a.id} achievement={a} delay={0.9 + i * 0.12} isNew useMetric={data.useMetric} />
                    ))}
                  </motion.div>
                )}

                {closestAchievements.length > 0 && (
                  <motion.div
                    initial={prefersReducedMotion ? {} : { opacity: 0 }}
                    animate={prefersReducedMotion ? {} : { opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">📊</span>
                      <h3 className="text-sm font-display font-bold text-surface-800 dark:text-white uppercase tracking-wider">
                        Almost There
                      </h3>
                    </div>
                    {closestAchievements.map((a, i) => (
                      <ProgressBar key={a.id} achievement={a} delay={1.3 + i * 0.1} />
                    ))}
                  </motion.div>
                )}
              </div>

              <div className="relative px-6 sm:px-8 pb-8 pt-3">
                <motion.button
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                  animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  onClick={onContinue}
                  className="w-full py-3.5 font-display font-bold text-white text-base uppercase tracking-widest rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
                >
                  Continue
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
