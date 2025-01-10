import { exerciseDict } from "./exercises";

export const generateWorkoutSchedule = (daysPerWeek) => {

    // Define workout splits
    const twoDaySplits = {
        variation1: ['Upper', 'Rest', 'Lower', 'Rest', 'Rest', 'Rest', 'Rest'],
        variation2: ['Upper', 'Rest', 'Rest', 'Lower', 'Rest', 'Rest', 'Rest'],
        variation3: ['Upper', 'Rest', 'Rest', 'Rest', 'Lower', 'Rest', 'Rest'],
        variation4: ['Upper', 'Rest', 'Rest', 'Rest', 'Rest', 'Lower', 'Rest'],
        variation5: ['Rest', 'Upper', 'Rest', 'Lower', 'Rest', 'Rest', 'Rest'],
        variation6: ['Rest', 'Upper', 'Rest', 'Rest', 'Lower', 'Rest', 'Rest'],
        variation7: ['Rest', 'Upper', 'Rest', 'Rest', 'Rest', 'Lower', 'Rest'],
        variation8: ['Rest', 'Upper', 'Rest', 'Rest', 'Rest', 'Rest', 'Lower'],
        variation9: ['Rest', 'Rest', 'Upper', 'Rest', 'Lower', 'Rest', 'Rest'],
        variation10: ['Rest', 'Rest', 'Upper', 'Rest', 'Rest', 'Lower', 'Rest'],
        variation11: ['Rest', 'Rest', 'Upper', 'Rest', 'Rest', 'Rest', 'Lower'],
        variation12: ['Rest', 'Rest', 'Rest', 'Upper', 'Rest', 'Lower', 'Rest'],
        variation13: ['Rest', 'Rest', 'Rest', 'Upper', 'Rest', 'Rest', 'Lower'],
        variation14: ['Rest', 'Rest', 'Rest', 'Rest', 'Upper', 'Rest', 'Lower'],
    };
    
    const threeDaySplits = {
        variation1: ['Push', 'Rest', 'Pull', 'Rest', 'Legs', 'Rest', 'Rest'],
        variation2: ['Rest', 'Push', 'Rest', 'Pull', 'Rest', 'Legs', 'Rest'],
    };
    
    const fourDaySplits = {
        variation1: ['UA', 'LA', 'Rest', 'UB', 'LB', 'Rest', 'Rest'],
        variation2: ['UA', 'Rest', 'LA', 'UB', 'Rest', 'LB', 'Rest'],
        variation3: ['UA', 'Rest', 'LA', 'Rest', 'UB', 'LB', 'Rest'],
        variation4: ['UA', 'Rest', 'Rest', 'LA', 'UB', 'Rest', 'LB'],
        variation5: ['Rest', 'UA', 'LA', 'Rest', 'UB', 'LB', 'Rest'],
        variation6: ['Rest', 'UA', 'Rest', 'LA', 'UB', 'Rest', 'LB'],
        variation7: ['Rest', 'Rest', 'UA', 'LA', 'Rest', 'UB', 'LB'],
        variation8: ['Rest', 'Rest', 'UA', 'Rest', 'LA', 'UB', 'Rest'],
        variation9: ['UB', 'LB', 'Rest', 'UA', 'LA', 'Rest', 'Rest'],
        variation10: ['UB', 'Rest', 'LB', 'UA', 'Rest', 'LA', 'Rest'],
        variation11: ['UB', 'Rest', 'LB', 'Rest', 'UA', 'LA', 'Rest'],
        variation12: ['UB', 'Rest', 'Rest', 'LB', 'UA', 'Rest', 'LA'],
        variation13: ['Rest', 'UB', 'LB', 'Rest', 'UA', 'LA', 'Rest'],
        variation14: ['Rest', 'UB', 'Rest', 'LB', 'UA', 'Rest', 'LA'],
        variation15: ['Rest', 'Rest', 'UB', 'LB', 'Rest', 'UA', 'Rest'],
        variation16: ['Rest', 'Rest', 'UB', 'Rest', 'LB', 'UA', 'Rest'],
    };
    
    // TODO: Implement 5 and 6 day splits
    const fiveDaySplits = {
        variation1: ['Upper Body', 'Lower Body', 'Rest', 'Push', 'Pull', 'Legs', 'Rest'],
        variation2: ['Upper Body', 'Rest', 'Lower Body', 'Push', 'Rest', 'Pull', 'Legs'],
        variation3: ['Rest', 'Upper Body', 'Lower Body', 'Push', 'Rest', 'Pull', 'Legs'],
        variation4: ['Upper Body', 'Lower Body', 'Push', 'Rest', 'Pull', 'Rest', 'Legs'],
        variation5: ['Upper Body', 'Rest', 'Lower Body', 'Rest', 'Push', 'Pull', 'Legs'],
        variation6: ['Rest', 'Upper Body', 'Pull', 'Rest', 'Lower Body', 'Push', 'Legs'],
        variation7: ['Push', 'Rest', 'Pull', 'Legs', 'Rest', 'Upper Body', 'Lower Body'],
        variation8: ['Pull', 'Rest', 'Legs', 'Push', 'Rest', 'Upper Body', 'Lower Body'],
        variation9: ['Rest', 'Push', 'Pull', 'Rest', 'Upper Body', 'Lower Body', 'Legs'],
        variation10: ['Push', 'Pull', 'Rest', 'Legs', 'Rest', 'Upper Body', 'Lower Body'],
        variation11: ['Pull', 'Rest', 'Legs', 'Rest', 'Upper Body', 'Lower Body', 'Push'],
        variation12: ['Rest', 'Pull', 'Legs', 'Rest', 'Push', 'Upper Body', 'Lower Body'],
    };
    
    const sixDaySplits = {
        // Rest at the Start
        variation1: ['Rest', 'Push', 'Pull', 'Legs A', 'Push', 'Pull', 'Legs B'],
        variation2: ['Rest', 'Push', 'Pull', 'Legs A', 'Pull', 'Push', 'Legs B'],
        variation3: ['Rest', 'Push', 'Legs A', 'Pull', 'Push', 'Pull', 'Legs B'],
        variation4: ['Rest', 'Pull', 'Push', 'Legs A', 'Push', 'Pull', 'Legs B'],
        // Rest in the Middle
        variation5: ['Push', 'Pull', 'Legs A', 'Rest', 'Push', 'Pull', 'Legs B'],
        variation6: ['Push', 'Pull', 'Rest', 'Legs A', 'Push', 'Pull', 'Legs B'],
        variation7: ['Push', 'Legs A', 'Pull', 'Rest', 'Push', 'Pull', 'Legs B'],
        variation8: ['Pull', 'Push', 'Legs A', 'Rest', 'Pull', 'Push', 'Legs B'],
        // Rest at the End
        variation9: ['Push', 'Pull', 'Legs A', 'Push', 'Pull', 'Legs B', 'Rest'],
        variation10: ['Push', 'Pull', 'Legs A', 'Pull', 'Push', 'Legs B', 'Rest'],
        variation11: ['Push', 'Legs A', 'Pull', 'Push', 'Pull', 'Legs B', 'Rest'],
        variation12: ['Pull', 'Push', 'Legs A', 'Push', 'Pull', 'Legs B', 'Rest'],
    };  

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

// TODO: Write tests to ensure that exercises are present in the main exercise dictionary

export const dayExercises = {
    Upper: {
        primary: [
            'Bench Press',
            'Lat Pulldown',
            'Overhead Press',
        ],
        secondary: [
            'Pull-Ups',
            'Bicep Curls',
            'Lateral Raises',
            'Barbell Rows',
            'Tricep Pushdowns',
            'Dumbbell Incline Press',
            'Push-Ups',
        ],
    },
    Lower: {
        primary: [
            'Romanian Deadlifts',
            'Dumbbell Lunges',
            'Pull-Ups',
        ],
        secondary: [
            'Incline Dumbbell Press',
            'Hanging Leg Raises',
            'Bulgarian Split Squats',
            'Step-Ups',
            'Hamstring Curls',
            'Leg Press',
            'Calf Raises',
        ],
    },
    Push: {
        primary: [
            'Overhead Tricep Extension',
            'Incline Dumbbell Press',
            'Dumbbell Lateral Raises',
        ],
        secondary: [
            'Bench Press',
            'Dips',
            'Arnold Press',
            'Cable Chest Flys',
            'Close-Grip Bench Press',
            'Push-Ups',
            'Face Pulls',
        ],
    },
    Pull: {
        primary: [
            'Hammer Curls',
            'Barbell Rows',
            'Lat Pulldown',
        ],
        secondary: [
            'Dumbbell Bicep Curls',
            'Face Pulls',
            'T-Bar Rows',
            'Pull-Ups',
            'Seated Cable Rows',
            'Inverted Rows',
            'Preacher Curls',
        ],
    },
    Legs: {
        primary: [
            'Back Squats',
            'Romanian Deadlifts',
            'Bulgarian Split Squats',
        ],
        secondary: [
            'Leg Press',
            'Walking Lunges',
            'Hamstring Curls',
            'Sumo Deadlifts',
            'Step-Ups',
            'Calf Raises',
            'Frog Pumps',
        ],
    },
    UpperBodyA: {
        primary: [
            'Bench Press',
            'Pull-Ups',
            'Overhead Press',
        ],
        secondary: [
            'Barbell Rows',
            'Tricep Dips',
            'Incline Dumbbell Press',
            'Face Pulls',
            'Dumbbell Flys',
            'Lat Pulldown',
            'Overhead Tricep Extension',
        ],
    },
    LowerBodyA: {
        primary: [
            'Squats',
            'Romanian Deadlifts',
            'Step-Ups',
        ],
        secondary: [
            'Glute Bridges',
            'Calf Raises',
            'Leg Extensions',
            'Walking Lunges',
            'Hamstring Curls',
            'Sumo Deadlifts',
            'Frog Pumps',
        ],
    },
    UpperBodyB: {
        primary: [
            'Incline Dumbbell Press',
            'Dumbbell Rows',
            'Lateral Raises',
        ],
        secondary: [
            'Hammer Curls',
            'Push-Ups',
            'Seated Cable Rows',
            'Arnold Press',
            'Barbell Curls',
            'Dumbbell Flys',
            'Chin-Ups',
        ],
    },
    LowerBodyB: {
        primary: [
            'Deadlifts',
            'Bulgarian Split Squats',
            'Hamstring Curls',
        ],
        secondary: [
            'Sumo Squats',
            'Frog Pumps',
            'Leg Press',
            'Single-Leg Deadlifts',
            'Glute Kickbacks',
            'Walking Lunges',
            'Step-Ups',
        ],
    },
    LegsA: {
        primary: [
            'Squats',
            'Leg Extensions',
            'Bulgarian Split Squats',
        ],
        secondary: [
            'Goblet Squats',
            'Step-Ups',
            'Sissy Squats',
            'Hack Squats',
            'Wall Sits',
            'Calf Raises',
            'Good Mornings',
        ],
    },
    LegsB: {
        primary: [
            'Romanian Deadlifts',
            'Hip Thrusts',
            'Hamstring Curls',
        ],
        secondary: [
            'Sumo Deadlifts',
            'Good Mornings',
            'Single-Leg Deadlifts',
            'Bulgarian Split Squats',
            'Cable Kickbacks',
            'Walking Lunges',
            'Glute Bridges',
        ],
    },
};