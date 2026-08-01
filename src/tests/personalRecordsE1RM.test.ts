import { describe, test, expect } from 'bun:test';
import { detectPersonalRecords, updatePersonalRecords, getTopPRs } from '@/utils/personalRecords';
import type { UserPersonalRecords } from '@/types/personalRecords';
import type { PerformedSet } from '@/types/workout';
import { estimateOneRepMax } from '@/utils/oneRepMax';
import { prTypeFromApi, PR_TYPE_LABELS, formatPRValue } from '@/utils/prFormatting';

const set = (weight: number, reps: number, extra: Partial<PerformedSet> = {}): PerformedSet =>
  ({ setId: `s${weight}-${reps}`, actualWeight: weight, actualReps: reps, completed: true, ...extra }) as PerformedSet;

const EMPTY: UserPersonalRecords = {};

describe('estimated 1RM records', () => {
  test('a first strength set sets an e1RM record', () => {
    const prs = detectPersonalRecords('Bench Press', [set(100, 5)], EMPTY, 'sess-1');
    const e1rm = prs.find((p) => p.type === 'maxOneRepMax');
    expect(e1rm).toBeDefined();
    expect(e1rm!.value).toBeCloseTo(estimateOneRepMax(100, 5)!, 6);
    expect(e1rm!.weight).toBe(100);
    expect(e1rm!.reps).toBe(5);
  });

  test('records the best set, not the last or the heaviest', () => {
    const prs = detectPersonalRecords(
      'Bench Press',
      [set(105, 1), set(100, 5), set(90, 3)],
      EMPTY,
      'sess-1'
    );
    const e1rm = prs.find((p) => p.type === 'maxOneRepMax')!;
    expect(e1rm.weight).toBe(100);
    expect(e1rm.reps).toBe(5);
  });

  test('fires independently of the max-weight record', () => {
    // The point of the metric: 100x5 beats a previous 105x1 estimate without
    // touching the heaviest single lifted.
    const existing: UserPersonalRecords = {
      'Bench Press': {
        maxWeight: { value: 105, reps: 1, achievedAt: '2020-01-01T00:00:00Z', sessionId: 'old' },
        maxOneRepMax: {
          value: estimateOneRepMax(105, 1)!,
          weight: 105,
          reps: 1,
          achievedAt: '2020-01-01T00:00:00Z',
          sessionId: 'old',
        },
      },
    };
    const prs = detectPersonalRecords('Bench Press', [set(100, 5)], existing, 'sess-2');
    expect(prs.some((p) => p.type === 'maxWeight')).toBe(false);
    expect(prs.some((p) => p.type === 'maxOneRepMax')).toBe(true);
  });

  test('does not fire when the estimate ties or loses', () => {
    const existing: UserPersonalRecords = {
      'Bench Press': {
        maxOneRepMax: {
          value: estimateOneRepMax(100, 5)!,
          weight: 100,
          reps: 5,
          achievedAt: '2020-01-01T00:00:00Z',
          sessionId: 'old',
        },
      },
    };
    expect(
      detectPersonalRecords('Bench Press', [set(100, 5)], existing, 's').some(
        (p) => p.type === 'maxOneRepMax'
      )
    ).toBe(false);
    expect(
      detectPersonalRecords('Bench Press', [set(80, 5)], existing, 's').some(
        (p) => p.type === 'maxOneRepMax'
      )
    ).toBe(false);
  });

  test('claims no record for high-rep work, where the formulas break down', () => {
    const prs = detectPersonalRecords('Bench Press', [set(40, 30)], EMPTY, 'sess-1');
    expect(prs.some((p) => p.type === 'maxOneRepMax')).toBe(false);
    // A max-weight record is still legitimate for that set.
    expect(prs.some((p) => p.type === 'maxWeight')).toBe(true);
  });

  test('ignores incomplete and bodyweight sets', () => {
    expect(
      detectPersonalRecords('Pull Ups', [set(100, 5, { completed: false })], EMPTY, 's').some(
        (p) => p.type === 'maxOneRepMax'
      )
    ).toBe(false);
    expect(
      detectPersonalRecords('Pull Ups', [set(0, 10)], EMPTY, 's').some(
        (p) => p.type === 'maxOneRepMax'
      )
    ).toBe(false);
  });

  test('cardio sets produce no e1RM record', () => {
    const cardio = [{ setId: 'c1', actualDuration: 1800, completed: true }] as PerformedSet[];
    const prs = detectPersonalRecords('Running', cardio, EMPTY, 's');
    expect(prs.some((p) => p.type === 'maxOneRepMax')).toBe(false);
    expect(prs.some((p) => p.type === 'maxDuration')).toBe(true);
  });
});

describe('persisting e1RM records', () => {
  test('stores value, source set and session', () => {
    const prs = detectPersonalRecords('Squat', [set(140, 3)], EMPTY, 'sess-9');
    const updated = updatePersonalRecords(EMPTY, prs);
    const rec = updated['Squat'].maxOneRepMax!;
    expect(rec.value).toBeCloseTo(estimateOneRepMax(140, 3)!, 6);
    expect(rec.weight).toBe(140);
    expect(rec.reps).toBe(3);
    expect(rec.sessionId).toBe('sess-9');
    expect(Number.isNaN(Date.parse(rec.achievedAt))).toBe(false);
  });

  test('leaves other record types untouched', () => {
    const before: UserPersonalRecords = {
      Squat: { maxVolume: { value: 5000, achievedAt: 'x', sessionId: 'old', sets: 4, avgWeight: 100 } },
    };
    const updated = updatePersonalRecords(
      before,
      detectPersonalRecords('Squat', [set(140, 3)], before, 'sess-9')
    );
    expect(updated['Squat'].maxVolume!.value).toBe(5000);
    expect(updated['Squat'].maxOneRepMax).toBeDefined();
  });

  test('getTopPRs surfaces e1RM alongside the others', () => {
    const prs = updatePersonalRecords(
      EMPTY,
      detectPersonalRecords('Deadlift', [set(180, 5)], EMPTY, 'sess-1')
    );
    const top = getTopPRs(prs, 10);
    expect(top.some((p) => p.type === 'maxOneRepMax')).toBe(true);
    const e = top.find((p) => p.type === 'maxOneRepMax')!;
    expect(e.weight).toBe(180);
    expect(e.reps).toBe(5);
  });
});

describe('PR type mapping', () => {
  test('every API type name resolves', () => {
    expect(prTypeFromApi('weight')).toBe('maxWeight');
    expect(prTypeFromApi('oneRepMax')).toBe('maxOneRepMax');
    expect(prTypeFromApi('volume')).toBe('maxVolume');
    expect(prTypeFromApi('duration')).toBe('maxDuration');
    expect(prTypeFromApi('distance')).toBe('maxDistance');
  });

  test('an unknown type degrades instead of throwing', () => {
    expect(prTypeFromApi('nonsense')).toBe('maxWeight');
  });

  test('every record type has a label', () => {
    for (const t of Object.keys(PR_TYPE_LABELS)) {
      expect(PR_TYPE_LABELS[t as keyof typeof PR_TYPE_LABELS].length).toBeGreaterThan(0);
    }
  });

  test('e1RM formats as a weight, keeping a decimal', () => {
    expect(formatPRValue(112.83, 'maxOneRepMax', true)).toBe('112.8 kg');
    // Volume stays whole; it is a running total.
    expect(formatPRValue(4500.4, 'maxVolume', true)).toBe('4500 kg');
  });
});
