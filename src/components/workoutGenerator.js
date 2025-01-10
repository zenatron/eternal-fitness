import { exerciseDict } from "./exercises";
import { dayExercises } from "./days";
import { twoDaySplits, threeDaySplits, fourDaySplits, fiveDaySplits, sixDaySplits } from "./splitVariations";

export const generateWorkoutSchedule = (daysPerWeek, exercisesPerWorkout) => {
    // Choose a random split
    const chooseRandomSplit = (split) => {
        const splits = Object.keys(split);
        const randomIndex = Math.floor(Math.random() * splits.length);
        return split[splits[randomIndex]];
    };

    // Generate the full workout for a single day
    const generateDayWorkout = (dayKey) => {
        const dayPlan = dayExercises[dayKey];
        if (!dayPlan) {
            return "Rest"; // Fallback if dayKey is not found
        }

        const primaryExercises = dayPlan.primary; // All primary exercises
        const secondaryExercises = dayPlan.secondary; // Secondary exercises pool

        // Calculate how many secondary exercises to add
        const additionalExercisesCount = Math.max(
            0,
            Math.min(exercisesPerWorkout - primaryExercises.length, secondaryExercises.length)
        );

        // Randomly select additional secondary exercises
        const selectedSecondaryExercises = [];
        const usedIndices = new Set();
        while (selectedSecondaryExercises.length < additionalExercisesCount) {
            const randomIndex = Math.floor(Math.random() * secondaryExercises.length);
            if (!usedIndices.has(randomIndex)) {
                selectedSecondaryExercises.push(secondaryExercises[randomIndex]);
                usedIndices.add(randomIndex);
            }
        }

        // Combine primary and selected secondary exercises
        return [...primaryExercises, ...selectedSecondaryExercises];
    };

    // Generate the full weekly plan
    const generateWeeklyPlan = (split) => {
        return split.map((dayKey) => generateDayWorkout(dayKey));
    };

    // Generate the workout schedule based on the days per week
    switch (daysPerWeek) {
        case 2:
            return generateWeeklyPlan(chooseRandomSplit(twoDaySplits));
        case 3:
            return generateWeeklyPlan(chooseRandomSplit(threeDaySplits));
        case 4:
            return generateWeeklyPlan(chooseRandomSplit(fourDaySplits));
        case 5:
            return generateWeeklyPlan(chooseRandomSplit(fiveDaySplits));
        case 6:
            return generateWeeklyPlan(chooseRandomSplit(sixDaySplits));
        default:
            return ["Rest", "Rest", "Rest", "Rest", "Rest", "Rest", "Rest"];
    }
};