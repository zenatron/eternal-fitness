/**
 * Gives the dev-bypass user ~16 weeks of push/pull/legs history, so the
 * strength insights, progress charts and exercise pages have something real to
 * draw locally.
 *
 *   bun run scripts/seed-dev-history.ts            # add (replaces an earlier seed)
 *   bun run scripts/seed-dev-history.ts --remove   # take it out again
 *
 * Only ever touches the dev user (dev@eternal-fitness.local), and only rows it
 * wrote itself — every seeded session carries the SEED_NOTE marker. It does
 * not rebuild records or stats; run `bun run db:rebuild-personal-records`
 * afterwards if you want the records page to match.
 *
 * The lifts progress at different rates on purpose — one climbs steadily, one
 * stalls halfway, one dips through a deload — so every trend state the UI can
 * show actually appears.
 */
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

const SEED_NOTE = 'seed:dev-history';
const DEV_EMAIL = 'dev@eternal-fitness.local';
const WEEKS = 16;

const sql = postgres(process.env.DATABASE_URL!);

// Deterministic, so two runs draw the same history.
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};

/** Working weight for week w (0-based) given a start, weekly gain, and shape. */
type Curve = (w: number) => number;
const steady = (start: number, perWeek: number): Curve => (w) => start + perWeek * w;
const stalls = (start: number, perWeek: number, at: number): Curve => (w) => start + perWeek * Math.min(w, at);
const deload = (start: number, perWeek: number, from: number, to: number): Curve => (w) =>
  w >= from && w < to ? (start + perWeek * from) * 0.85 : start + perWeek * (w >= to ? w - (to - from) : w);

interface Lift {
  key: string;
  curve: Curve;
  sets: number;
  reps: number;
  step: number;
}

const DAYS: { name: string; weekday: number; lifts: Lift[] }[] = [
  {
    name: 'Push',
    weekday: 1,
    lifts: [
      { key: 'Bench Press', curve: steady(135, 2.5), sets: 4, reps: 6, step: 5 },
      { key: 'Overhead Press', curve: stalls(85, 2.5, 7), sets: 3, reps: 6, step: 2.5 },
      { key: 'Incline Dumbbell Press', curve: steady(45, 1), sets: 3, reps: 10, step: 2.5 },
      { key: 'Tricep Pushdowns', curve: steady(40, 0.75), sets: 3, reps: 12, step: 2.5 },
    ],
  },
  {
    name: 'Pull',
    weekday: 3,
    lifts: [
      { key: 'Deadlifts', curve: deload(225, 5, 8, 10), sets: 3, reps: 5, step: 10 },
      { key: 'Barbell Rows', curve: steady(115, 2), sets: 4, reps: 8, step: 5 },
      { key: 'Lat Pulldown', curve: steady(100, 1.5), sets: 3, reps: 10, step: 5 },
      { key: 'Barbell Curls', curve: stalls(55, 1, 3), sets: 3, reps: 10, step: 2.5 },
    ],
  },
  {
    name: 'Legs',
    weekday: 5,
    lifts: [
      { key: 'Back Squats', curve: steady(185, 5), sets: 4, reps: 5, step: 5 },
      { key: 'Romanian Deadlifts', curve: steady(135, 2.5), sets: 3, reps: 8, step: 5 },
      { key: 'Leg Press', curve: steady(270, 7.5), sets: 3, reps: 10, step: 10 },
    ],
  },
];

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

async function main() {
  const [user] = await sql`select id from users where email = ${DEV_EMAIL}`;
  if (!user) throw new Error(`No ${DEV_EMAIL} user — sign in with the dev bypass once first.`);

  const removed = await sql`delete from workout_sessions where user_id = ${user.id} and notes = ${SEED_NOTE}`;
  console.log(`removed ${removed.count} seeded sessions`);
  if (process.argv.includes('--remove')) return;

  const today = new Date();
  today.setHours(18, 0, 0, 0);
  // Monday of the week WEEKS weeks ago.
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7 * WEEKS);

  let inserted = 0;
  for (let w = 0; w < WEEKS; w++) {
    for (const day of DAYS) {
      const date = new Date(start);
      date.setDate(start.getDate() + 7 * w + (day.weekday - 1));
      if (date >= today) continue;
      // Miss about one session in twelve, like a person does.
      if (rand() < 0.08) continue;

      const performance: Record<string, unknown> = {};
      let volume = 0;
      let sets = 0;
      for (const lift of day.lifts) {
        // A good or bad day: ±1 rep on the top set, occasionally.
        const weight = roundTo(lift.curve(w), lift.step);
        const performed = Array.from({ length: lift.sets }, (_, i) => {
          const wobble = i === 0 ? (rand() < 0.2 ? 1 : rand() < 0.15 ? -1 : 0) : 0;
          const reps = Math.max(1, lift.reps + wobble - (i === lift.sets - 1 && rand() < 0.3 ? 1 : 0));
          volume += reps * weight;
          sets += 1;
          return { setId: randomUUID(), actualReps: reps, actualWeight: weight, completed: true };
        });
        const id = randomUUID();
        performance[id] = {
          exerciseKey: lift.key,
          sets: performed,
          totalVolume: performed.reduce((t, s) => t + s.actualReps * s.actualWeight, 0),
        };
      }

      await sql`
        insert into workout_sessions
          (id, user_id, completed_at, duration, notes, total_volume, total_sets, total_exercises, performance_data)
        values
          (${randomUUID()}, ${user.id}, ${date}, ${3000 + Math.round(rand() * 1500)}, ${SEED_NOTE},
           ${volume}, ${sets}, ${day.lifts.length},
           ${sql.json({ templateSnapshot: { metadata: { name: day.name } }, performance } as never)})
      `;
      inserted += 1;
    }
  }
  console.log(`inserted ${inserted} sessions over ${WEEKS} weeks`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
