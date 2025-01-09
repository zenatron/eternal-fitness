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

    };

    const sixDaySplits = {

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
        default:
            return ['Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest'];
    }
};