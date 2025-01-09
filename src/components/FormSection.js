import React from 'react';

const FormSection = ({ formData, handleChange, handleSubmit }) => {
    return (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-lg">
            <h1 className="text-2xl font-bold text-center mb-2">Eternal Fitness</h1>
            <h3 className="text-sm text-center mb-4">Complete your Fitness Profile and click Submit to generate your Workout Schedule</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2">Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder='ex. John Doe'
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    />
                </div>

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
                        placeholder='ex. 25'
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

                {/* Fitness Goal */}
                <div>
                    <div className="flex items-center mb-2">
                        <label className="text-gray-700 font-bold">Fitness Goal</label>
                        <div className="relative group inline-block ml-2">
                            <span className="text-blue-500 font-bold cursor-pointer">?</span>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-2 bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                Select a goal that best matches your fitness objectives.
                            </div>
                        </div>
                    </div>
                    <select
                        name="fitnessGoal"
                        value={formData.fitnessGoal}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    >
                        <option value="">Select Fitness Goal</option>
                        <option value="weight_loss">Weight Loss</option>
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="strength">Strength</option>
                    </select>
                </div>

                {/* Intensity */}
                <div>
                    <div className="flex items-center mb-2">
                        <label className="text-gray-700 font-bold">Intensity</label>
                        <div className="relative group inline-block ml-2">
                            <span className="text-blue-500 font-bold cursor-pointer">?</span>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-2 bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                Intensity 1-9 of each workout.
                            </div>
                        </div>
                    </div>
                    <select
                        name="intensity"
                        value={formData.intensity}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    >
                        <option value="">Select Intensity</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                    </select>
                </div>

                {/* Exercises Per Workout */}
                <div>
                    <div className="flex items-center mb-2">
                        <label className="text-gray-700 font-bold">Exercises Per Workout</label>
                        <div className="relative group inline-block ml-2">
                            <span className="text-blue-500 font-bold cursor-pointer">?</span>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-2 bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                How many exercises you would like to do per workout.
                            </div>
                        </div>
                    </div>
                    <select
                        name="exercisesPerWorkout"
                        value={formData.exercisesPerWorkout}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    >
                        <option value="">Select a Number</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                    </select>
                </div>

                {/* Workouts Per Week */}
                <div>
                    <div className="flex items-center mb-2">
                        <label className="text-gray-700 font-bold">Workouts Per Week</label>
                        <div className="relative group inline-block ml-2">
                            <span className="text-blue-500 font-bold cursor-pointer">?</span>
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-2 bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                How many times per week you would like to workout.
                            </div>
                        </div>
                    </div>
                    <select
                        name="workoutsPerWeek"
                        value={formData.workoutsPerWeek}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    >
                        <option value="">Select a Number</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                    </select>
                </div>

                {/* Equipment
                <div>
                    <label className="block text-gray-700 font-bold mb-2">Equipment</label>
                    <input
                        type="text"
                        name="equipment"
                        value={formData.equipment}
                        onChange={handleChange}
                        placeholder="Nonfunctional for now"
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                        required
                    />
                </div> */}


                {/* Skill Level
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
                </div> */}

                {/* Submit Button */}
                <div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300 mt-4"
                    >
                        Submit
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FormSection;