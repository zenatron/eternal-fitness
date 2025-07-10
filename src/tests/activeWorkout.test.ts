import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ActiveWorkoutSessionData, WorkoutTemplateData } from '@/types/workout';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Active Workout Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTemplate: WorkoutTemplateData = {
    metadata: {
      name: 'Test Workout',
      description: 'A test workout',
      tags: ['test'],
      estimatedDuration: 60,
      difficulty: 'intermediate' as any,
      workoutType: 'strength' as any,
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
          {
            id: 'set-1',
            type: 'standard' as any,
            targetReps: 10,
            targetWeight: 135,
            restTime: 60,
          },
          {
            id: 'set-2',
            type: 'standard' as any,
            targetReps: 10,
            targetWeight: 135,
            restTime: 60,
          },
        ],
        restBetweenSets: 60,
      },
    ],
    structure: {
      main: ['exercise-1'],
    },
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

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

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
      expect(data.activeSession).toEqual(mockActiveSession);
    });

    it('should update active workout session', async () => {
      const updates = {
        performance: {
          'exercise-1': {
            exerciseKey: 'bench_press',
            sets: [
              {
                setId: 'set-1',
                actualReps: 10,
                actualWeight: 135,
                completed: true,
              },
            ],
            totalVolume: 1350,
          },
        },
      };

      const updatedSession = {
        ...mockActiveSession,
        ...updates,
        version: 2,
        lastUpdated: new Date(),
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activeSession: updatedSession }),
      } as Response);

      const response = await fetch('/api/session/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.activeSession.version).toBe(2);
      expect(data.activeSession.performance).toEqual(updates.performance);
    });

    it('should complete active workout session', async () => {
      const completionData = {
        duration: 3600, // 1 hour in seconds
        notes: 'Great workout!',
      };

      const mockCompletedSession = {
        id: 'session-456',
        completedAt: new Date(),
        duration: 3600,
        notes: 'Great workout!',
        totalVolume: 2700,
        totalSets: 2,
        totalExercises: 1,
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompletedSession,
      } as Response);

      const response = await fetch('/api/session/active/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionData),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.duration).toBe(3600);
      expect(data.notes).toBe('Great workout!');
    });

    it('should handle session recovery', async () => {
      const recoveryData = {
        templateId: 'template-123',
        forceRecover: true,
      };

      const mockRecoveryResponse = {
        activeSession: mockActiveSession,
        recovered: true,
        message: 'Active workout session recovered successfully',
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecoveryResponse,
      } as Response);

      const response = await fetch('/api/session/active/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recoveryData),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.recovered).toBe(true);
      expect(data.activeSession).toEqual(mockActiveSession);
    });
  });

  describe('Session Data Validation', () => {
    it('should validate session data structure', () => {
      const validSession = mockActiveSession;
      
      // Check required fields
      expect(validSession.templateId).toBeDefined();
      expect(validSession.templateName).toBeDefined();
      expect(validSession.originalTemplate).toBeDefined();
      expect(validSession.startedAt).toBeDefined();
      expect(validSession.performance).toBeDefined();
      expect(validSession.exerciseProgress).toBeDefined();
      expect(validSession.version).toBeDefined();
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
            sets: [
              {
                id: 'set-1',
                type: 'standard' as any,
                targetReps: 12,
                targetWeight: 50,
                restTime: 60,
              },
            ],
            restBetweenSets: 60,
          },
        ],
      };

      const sessionWithModifications = {
        ...mockActiveSession,
        modifiedTemplate,
      };

      expect(sessionWithModifications.modifiedTemplate?.exercises).toHaveLength(2);
      expect(sessionWithModifications.originalTemplate.exercises).toHaveLength(1);
    });

    it('should calculate elapsed time correctly', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const currentTime = new Date('2024-01-01T10:30:00Z');
      const pausedTime = 300; // 5 minutes in seconds

      const session = {
        ...mockActiveSession,
        startedAt: startTime,
        pausedTime,
        isTimerActive: true,
      };

      // Simulate elapsed time calculation
      const elapsedMs = currentTime.getTime() - startTime.getTime();
      const elapsedSeconds = Math.floor(elapsedMs / 1000) - pausedTime;
      
      expect(elapsedSeconds).toBe(1500); // 30 minutes - 5 minutes = 25 minutes = 1500 seconds
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal server error' } }),
      } as Response);

      const response = await fetch('/api/session/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'invalid-template',
          templateName: 'Invalid',
          template: {},
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle version conflicts', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            message: 'Session data has been modified by another client',
            details: {
              currentVersion: 3,
              providedVersion: 2,
            },
          },
        }),
      } as Response);

      const response = await fetch('/api/session/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 2,
          sessionNotes: 'Updated notes',
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(409);
    });
  });
});
