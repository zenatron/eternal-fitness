import React from 'react';
import { generateWorkoutSchedule } from './workoutGenerator';

const ScheduleSection = ({ formData, workoutSchedule, setWorkoutSchedule }) => {

    const regenerateSchedule = () => {
        const days = Number(formData.workoutsPerWeek); // Use the selected number of workouts per week
        const newSchedule = generateWorkoutSchedule(days); // Generate a new random schedule
        setWorkoutSchedule(newSchedule); // Update the state with the new schedule
    };    

    return (
        //{/* Workout Schedule Section */}
        <div className="w-full max-w-lg">
        {/* Show the workout schedule */}
        <h2 className="text-xl font-bold text-center mb-4">{formData.name}'s Weekly Workout Schedule</h2>
        <ul className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            {workoutSchedule.length > 0 ? (
                workoutSchedule.map((workout, index) => {
                    // Calculate the date for each day starting from tomorrow
                    const today = new Date();
                    const workoutDate = new Date(today);
                    workoutDate.setDate(today.getDate() + index + 1); // Start with tomorrow

                    // Format the date (e.g., "Wed, Jan 8")
                    const options = { weekday: 'short', month: 'short', day: 'numeric' };
                    const formattedDate = workoutDate.toLocaleDateString('en-US', options);

                    return (
                        <li
                            key={index}
                            className="py-2 border-b last:border-b-0 text-gray-700"
                        >
                            <strong>Day {index + 1} ({formattedDate}):</strong> {workout}
                        </li>
                    );
                })
            ) : (
                <p className="text-gray-500">No schedule generated yet. Submit the form to generate a plan.</p>
            )}
        </ul>
        <div className="mt-6 flex flex-col space-y-4">
            {/* Regenerate Schedule Button */}
            <button
                onClick={regenerateSchedule}
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