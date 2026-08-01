import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { db } from '@/lib/db';
import { userStats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { UserPersonalRecords } from '@/types/personalRecords';

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const typeFilter = searchParams.get('type') || 'all';
    const sort = searchParams.get('sort') || 'date';

    const [stats] = await db
      .select({ personalRecords: userStats.personalRecords })
      .from(userStats)
      .where(eq(userStats.userId, userId));

    const personalRecords: UserPersonalRecords = (stats?.personalRecords as UserPersonalRecords) || {};

    const allRecords: Array<{
      exerciseKey: string;
      exerciseName: string;
      type: string;
      value: number;
      achievedAt: string;
    }> = [];

    Object.entries(personalRecords).forEach(([exerciseName, exercisePR]) => {
      if (!exercisePR) return;

      if (exercisePR.maxOneRepMax) {
        allRecords.push({
          exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
          exerciseName,
          type: 'oneRepMax',
          value: exercisePR.maxOneRepMax.value,
          achievedAt: exercisePR.maxOneRepMax.achievedAt,
        });
      }
      if (exercisePR.maxWeight) {
        allRecords.push({
          exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
          exerciseName,
          type: 'weight',
          value: exercisePR.maxWeight.value,
          achievedAt: exercisePR.maxWeight.achievedAt,
        });
      }
      if (exercisePR.maxVolume) {
        allRecords.push({
          exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
          exerciseName,
          type: 'volume',
          value: exercisePR.maxVolume.value,
          achievedAt: exercisePR.maxVolume.achievedAt,
        });
      }
      if (exercisePR.maxDuration) {
        allRecords.push({
          exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
          exerciseName,
          type: 'duration',
          value: exercisePR.maxDuration.value,
          achievedAt: exercisePR.maxDuration.achievedAt,
        });
      }
      if (exercisePR.maxDistance) {
        allRecords.push({
          exerciseKey: exerciseName.toLowerCase().replace(/\s+/g, '_'),
          exerciseName,
          type: 'distance',
          value: exercisePR.maxDistance.value,
          achievedAt: exercisePR.maxDistance.achievedAt,
        });
      }
    });

    let filtered = allRecords;
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }
    if (search) {
      filtered = filtered.filter(r => r.exerciseName.toLowerCase().includes(search));
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'value':
          return b.value - a.value;
        case 'exercise':
          return a.exerciseName.localeCompare(b.exerciseName);
        case 'date':
        default:
          return new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime();
      }
    });

    return NextResponse.json({ records: sorted, total: sorted.length });
  } catch (error) {
    console.error('Error fetching personal records:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
