import { exerciseDict } from '../components/exercises'; // Adjust the path to your exercises.js
import { dayExercises } from '../components/workoutGenerator'; // Adjust the path to your dayExercises.js

describe('Workout Generator Validation', () => {
    // Helper function to collect all unique exercise names from dayExercises
    const collectExerciseNames = (days) => {
        const allExercises = new Set();
        Object.values(days).forEach((day) => {
            day.primary.forEach((exercise) => allExercises.add(exercise));
            day.secondary.forEach((exercise) => allExercises.add(exercise));
        });
        return Array.from(allExercises);
    };

    it('should ensure all exercises in dayExercises are defined in exercises.js', () => {
        const dayExerciseNames = collectExerciseNames(dayExercises);
        const missingExercises = dayExerciseNames.filter((exercise) => !exerciseDict[exercise]);

        // Assert that there are no missing exercises
        expect(missingExercises).toEqual([]);
    });
});