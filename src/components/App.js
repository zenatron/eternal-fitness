import React, { useState } from 'react';

const App = () => {
    const [formData, setFormData] = useState({
        age: '',
        gender: '',
        height: '',
        weight: '',
        skillLevel: '',
        fitnessGoals: '',
    });

    const [workoutSchedule, setWorkoutSchedule] = useState([]); // Store the generated schedule

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Generate a workout schedule based on fitness goals
        const schedule = generateWorkoutSchedule(formData.fitnessGoals);
        setWorkoutSchedule(schedule); // Update the schedule state
    };

    const generateWorkoutSchedule = (fitnessGoal) => {
        const workouts = {
            weight_loss: ['Cardio', 'HIIT', 'Strength Training', 'Yoga', 'Cardio', 'Rest', 'Active Recovery'],
            muscle_gain: ['Strength Training', 'Strength Training', 'Rest', 'Strength Training', 'Cardio', 'Strength Training', 'Rest'],
            endurance: ['Running', 'Cycling', 'Swimming', 'Rest', 'Running', 'HIIT', 'Active Recovery'],
            flexibility: ['Yoga', 'Pilates', 'Active Recovery', 'Rest', 'Stretching', 'Yoga', 'Pilates'],
            general_fitness: ['Cardio', 'Strength Training', 'Yoga', 'Rest', 'Cardio', 'Strength Training', 'Active Recovery'],
        };

        return workouts[fitnessGoal] || ['Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest'];
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            {workoutSchedule.length === 0 ? (
                <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-lg">
                    <h1 className="text-2xl font-bold text-center mb-2">Eternal Fitness</h1>
                    <h3 className="text-sm text-center mb-4">Complete your Fitness Profile and click Submit to generate your Workout Schedule</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Age */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Age</label>
                            <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleChange}
                                min="0"
                                max="99"
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                                required
                            />
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Gender</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                                required
                            >
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Height */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Height (in inches)</label>
                            <input
                                type="number"
                                name="height"
                                value={formData.height}
                                onChange={handleChange}
                                min="0"
                                placeholder="ex. 72"
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                                required
                            />
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Weight (in lbs)</label>
                            <input
                                type="text"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                min="0"
                                placeholder="ex. 160"
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                                required
                            />
                        </div>

                        {/* Skill Level */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Skill Level</label>
                            <select
                                name="skillLevel"
                                value={formData.skillLevel}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                                required
                            >
                                <option value="">Select Skill Level</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        {/* Fitness Goals */}
                        <div>
                            <label className="block text-gray-700 font-bold mb-2">Fitness Goals</label>
                            <select
                                name="fitnessGoals"
                                value={formData.fitnessGoals}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                                required
                            >
                                <option value="">Select Fitness Goal</option>
                                <option value="weight_loss">Weight Loss</option>
                                <option value="muscle_gain">Muscle Gain</option>
                                <option value="endurance">Endurance</option>
                                <option value="flexibility">Flexibility</option>
                                <option value="general_fitness">General Fitness</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <div>
                            <button
                                type="submit"
                                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                            >
                                Submit
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                //{/* Workout Schedule Section */}
                <div className="w-full max-w-lg">
                    {/* Show the workout schedule */}
                    <h2 className="text-xl font-bold text-center mb-4">Weekly Workout Schedule</h2>
                    <ul className="bg-white shadow-md rounded px-8 pt-6 pb-8">
                        {workoutSchedule.length > 0 ? (
                            workoutSchedule.map((workout, index) => (
                                <li
                                    key={index}
                                    className="py-2 border-b last:border-b-0 text-gray-700"
                                >
                                    <strong>Day {index + 1}:</strong> {workout}
                                </li>
                            ))
                        ) : (
                            <p className="text-gray-500">No schedule generated yet. Submit the form to generate a plan.</p>
                        )}
                    </ul>
                    <button
                        onClick={() => setWorkoutSchedule([])} // Reset to show form again
                        className="mt-6 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        Go Back
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;