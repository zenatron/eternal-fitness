import { exerciseDict as exercises } from '../components/exercises';
import { dayExercises } from '../components/days';
import { twoDaySplits, threeDaySplits, fourDaySplits, fiveDaySplits, sixDaySplits } from '../components/splitVariations';

const splitVariations = {
    twoDaySplits,
    threeDaySplits,
    fourDaySplits,
    fiveDaySplits,
    sixDaySplits,
};

describe('Workout Generator Validation', () => {
    // Helper function to collect all unique "days" from split variations
    const collectDaysFromSplits = (splits) => {
        const allDays = new Set();
        Object.values(splits).forEach((variations) => {
            Object.values(variations).forEach((variation) => {
                variation.forEach((day) => {
                    if (day !== 'Rest') allDays.add(day);
                });
            });
        });
        return Array.from(allDays);
    };

    it('should ensure all exercises in dayExercises are defined in exercises.js', () => {
        const collectExerciseNames = (days) => {
            const allExercises = new Set();
            Object.values(days).forEach((day) => {
                day.primary.forEach((exercise) => allExercises.add(exercise));
                day.secondary.forEach((exercise) => allExercises.add(exercise));
            });
            return Array.from(allExercises);
        };

        const dayExerciseNames = collectExerciseNames(dayExercises);
        const missingExercises = dayExerciseNames.filter((exercise) => !exercises[exercise]);

        // Assert that there are no missing exercises
        expect(missingExercises).toEqual([]);
    });

    it('should ensure all "days" in split variations are defined in days', () => {
        const uniqueDays = collectDaysFromSplits(splitVariations);
        const missingDays = uniqueDays.filter((day) => !dayExercises[day]);

        // Assert that there are no missing "days"
        expect(missingDays).toEqual([]);
    });
});