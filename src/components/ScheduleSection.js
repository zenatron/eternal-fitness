import React from 'react';
import { generateWorkoutSchedule } from './workoutGenerator';

const ScheduleSection = ({ formData, workoutSchedule, setWorkoutSchedule }) => {
    return (
        <div className="w-full max-w-lg">
            <h2 className="text-xl font-bold text-center mb-4">{formData.name}'s Weekly Workout Schedule</h2>
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 space-y-6">
                {workoutSchedule.map((workout, index) => {
                    const today = new Date();
                    const workoutDate = new Date(today);
                    workoutDate.setDate(today.getDate() + index + 1); // Start with tomorrow

                    const options = { weekday: 'short', month: 'short', day: 'numeric' };
                    const formattedDate = workoutDate.toLocaleDateString('en-US', options);

                    return (
                        <div key={index} className="border-b last:border-b-0 pb-4">
                            <h3 className="text-lg font-semibold mb-2">
                                Day {index + 1} ({formattedDate})
                            </h3>
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
                    );
                })}
            </div>
            <div className="mt-6 flex flex-col space-y-4">
                {/* Regenerate Schedule Button */}
                <button
                    onClick={() => {
                        const workoutsPerWeek = Number(formData.workoutsPerWeek);
                        const exercisesPerWorkout = Number(formData.exercisesPerWorkout);
                        const newSchedule = generateWorkoutSchedule(workoutsPerWeek, exercisesPerWorkout);
                        setWorkoutSchedule(newSchedule);
                    }}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 focus:outline-none focus:ring focus:ring-green-300"
                >
                    Regenerate Schedule
                </button>
                {/* Go Back Button */}
                <button
                    onClick={() => setWorkoutSchedule([])} // Reset to show form again
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
};

export default ScheduleSection;