import { exerciseDict } from "./exercises";
import { dayExercises } from "./days";

export const generateWorkoutSchedule = (daysPerWeek) => {

    // Choose a random split
    const chooseRandomSplit = (split) => {
        const splits = Object.keys(split);
        const randomIndex = Math.floor(Math.random() * splits.length);
        return split[splits[randomIndex]];
    };

    // Generate workout schedule
    switch (daysPerWeek) {
        case 2:
            return chooseRandomSplit(twoDaySplits);
        case 3:
            return chooseRandomSplit(threeDaySplits);
        case 4:
            return chooseRandomSplit(fourDaySplits);
        case 5:
            return chooseRandomSplit(fiveDaySplits);
        case 6:
            return chooseRandomSplit(sixDaySplits);
        default:
            return ['Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest'];
    }
};