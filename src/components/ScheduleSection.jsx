import React from 'react';
import { generateWorkoutSchedule } from './workoutGenerator';
import { exerciseDict } from './exercises';

const ScheduleSection = ({ formData, workoutSchedule, setWorkoutSchedule }) => {

    // Function to get all muscles targeted for a given day's exercises
    const getMusclesForDay = (exercises) => {
        const muscleSet = new Set();
        exercises.forEach((exercise) => {
            const exerciseData = exerciseDict[exercise] || [];
            if (exerciseData && exerciseData.muscles) {
                exerciseData.muscles.forEach((muscle) => muscleSet.add(muscle));
            }
        });
        return Array.from(muscleSet); // Convert Set to Array
    };

    return (
        <div className="w-full max-w-lg">
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 space-y-6">
            <h2 className="text-xl font-bold text-center mb-4 w-fit gradient-text-blue">{formData.name}'s Weekly Workout Schedule</h2>
                {workoutSchedule.map((workout, index) => {
                    const today = new Date();
                    const workoutDate = new Date(today);
                    workoutDate.setDate(today.getDate() + index + 1); // Start with tomorrow

                    const options = { weekday: 'short', month: 'short', day: 'numeric' };
                    const formattedDate = workoutDate.toLocaleDateString('en-US', options);

                    const musclesTargeted = Array.isArray(workout) ? getMusclesForDay(workout) : [];

                    return (
                        <div key={index} className="border-b last:border-b-0 pb-4 flex justify-between">
                            {/* Day Title and Exercises */}
                            <div>
                                <h4 className="text-md font-medium text-gray-500">Day {index + 1}</h4>
                                <h3 className="text-lg font-semibold mb-2">{formattedDate}</h3>
                                <ul className="list-disc ml-5 space-y-1">
                                    {Array.isArray(workout)
                                        ? workout.map((exercise, exerciseIndex) => (
                                            <li key={exerciseIndex} className="text-gray-700">
                                                {exercise}
                                            </li>
                                        ))
                                        : (
                                            <li className="text-gray-500 italic">{workout}</li> // For "Rest" days
                                        )}
                                </ul>
                            </div>
                            {/* Muscles Targeted */}
                            <div className="ml-6 text-sm text-gray-500">
                                {Array.isArray(workout) ? (
                                    <div>
                                        <h4 className="font-semibold mb-1">Muscles Targeted:</h4>
                                        <ul className="list-disc ml-4 space-y-1">
                                            {musclesTargeted.map((muscle, muscleIndex) => (
                                                <li key={muscleIndex}>{muscle}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <p className="italic font-medium">Enjoy your rest day!</p>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div className="mt-6 flex flex-col space-y-4">
                    {/* Regenerate Schedule Button */}
                    <button
                        onClick={() => {
                            const workoutsPerWeek = Number(formData.workoutsPerWeek);
                            const exercisesPerWorkout = Number(formData.exercisesPerWorkout);
                            const newSchedule = generateWorkoutSchedule(workoutsPerWeek, exercisesPerWorkout);
                            setWorkoutSchedule(newSchedule);
                        }}
                        className="btn btn-tertiary w-full"
                    >
                        Regenerate Schedule
                    </button>
                    {/* Go Back Button */}
                    <button
                        onClick={() => setWorkoutSchedule([])} // Reset to show form again
                        className="btn btn-primary w-full"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleSection;