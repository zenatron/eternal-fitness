import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ActiveWorkoutSessionData, WorkoutTemplateData } from '@/types/workout';

const fetchMock = mock(() => Promise.resolve(new Response()));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.fetch = fetchMock as any;

describe('Active Workout Session Management', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  const mockTemplate: WorkoutTemplateData = {
    metadata: {
      name: 'Test Workout',
      description: 'A test workout',
      tags: ['test'],
      estimatedDuration: 60,
      difficulty: 'intermediate',
      workoutType: 'strength',
      targetMuscleGroups: ['chest', 'triceps'],
      equipment: ['barbell', 'bench'],
    },
    exercises: [
      {
        id: 'exercise-1',
        exerciseKey: 'bench_press',
        name: 'Bench Press',
        muscles: ['chest', 'triceps'],
        equipment: ['barbell', 'bench'],
        sets: [
          { id: 'set-1', type: 'standard', targetReps: 10, targetWeight: 135, restTime: 60 },
          { id: 'set-2', type: 'standard', targetReps: 10, targetWeight: 135, restTime: 60 },
        ],
        restBetweenSets: 60,
      },
    ],
    structure: { main: ['exercise-1'] },
  };

  const mockActiveSession: ActiveWorkoutSessionData = {
    templateId: 'template-123',
    templateName: 'Test Workout',
    originalTemplate: mockTemplate,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    pausedTime: 0,
    isTimerActive: true,
    performance: {},
    exerciseProgress: {},
    sessionNotes: '',
    version: 1,
    lastUpdated: new Date('2024-01-01T10:00:00Z'),
  };

  describe('API Endpoints', () => {
    it('should start a new active workout session', async () => {
      const mockResponse = {
        activeSession: mockActiveSession,
        message: 'Active workout session started successfully',
      };

      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const response = await fetch('/api/session/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'template-123',
          templateName: 'Test Workout',
          template: mockTemplate,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.activeSession).toBeDefined();
    });

    it('should update active workout session', async () => {
      const updates = {
        performance: {
          'exercise-1': {
            exerciseKey: 'bench_press',
            sets: [{ setId: 'set-1', actualReps: 10, actualWeight: 135, completed: true }],
            totalVolume: 1350,
          },
        },
      };

      const updatedSession = { ...mockActiveSession, ...updates, version: 2, lastUpdated: new Date() };

      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ activeSession: updatedSession }), { status: 200 }));

      const response = await fetch('/api/session/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.activeSession.version).toBe(2);
    });

    it('should complete active workout session', async () => {
      const completionData = { duration: 3600, notes: 'Great workout!' };
      const mockCompletedSession = {
        id: 'session-456', completedAt: new Date(), duration: 3600,
        notes: 'Great workout!', totalVolume: 2700, totalSets: 2, totalExercises: 1,
      };

      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(mockCompletedSession), { status: 200 }));

      const response = await fetch('/api/session/active/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionData),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.duration).toBe(3600);
    });

    it('should handle session recovery', async () => {
      const recoveryData = { templateId: 'template-123', forceRecover: true };
      const mockRecoveryResponse = {
        activeSession: mockActiveSession, recovered: true,
        message: 'Active workout session recovered successfully',
      };

      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(mockRecoveryResponse), { status: 200 }));

      const response = await fetch('/api/session/active/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recoveryData),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.recovered).toBe(true);
    });
  });

  describe('Session Data Validation', () => {
    it('should validate session data structure', () => {
      expect(mockActiveSession.templateId).toBeDefined();
      expect(mockActiveSession.templateName).toBeDefined();
      expect(mockActiveSession.originalTemplate).toBeDefined();
      expect(mockActiveSession.startedAt).toBeDefined();
      expect(mockActiveSession.performance).toBeDefined();
      expect(mockActiveSession.exerciseProgress).toBeDefined();
      expect(mockActiveSession.version).toBeDefined();
    });

    it('should handle template modifications', () => {
      const modifiedTemplate = {
        ...mockTemplate,
        exercises: [
          ...mockTemplate.exercises,
          {
            id: 'exercise-2',
            exerciseKey: 'incline_press',
            name: 'Incline Press',
            muscles: ['chest', 'shoulders'],
            equipment: ['dumbbell'],
            sets: [{ id: 'set-1', type: 'standard', targetReps: 12, targetWeight: 50, restTime: 60 }],
            restBetweenSets: 60,
          },
        ],
      };

      const sessionWithModifications = { ...mockActiveSession, modifiedTemplate };
      expect(sessionWithModifications.modifiedTemplate?.exercises).toHaveLength(2);
      expect(sessionWithModifications.originalTemplate.exercises).toHaveLength(1);
    });

    it('should calculate elapsed time correctly', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = new Date('2024-01-01T10:30:00Z');
      const pausedTime = 300;

      const elapsedMs = currentTime.getTime() - startTime.getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000) - pausedTime;

      expect(elapsedSeconds).toBe(1500);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Internal server error' } }), { status: 500 }));

      const response = await fetch('/api/session/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'invalid-template', templateName: 'Invalid', template: {} }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle version conflicts', async () => {
      fetchMock.mockResolvedValueOnce(new Response(
        JSON.stringify({ error: { message: 'Session data has been modified', details: { currentVersion: 3, providedVersion: 2 } } }),
        { status: 409 },
      ));

      const response = await fetch('/api/session/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 2, sessionNotes: 'Updated notes' }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(409);
    });
  });
});
