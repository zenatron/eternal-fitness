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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('User Input:', formData);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-lg">
                <h1 className="text-2xl font-bold text-center mb-6">Eternal Fitness</h1>
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
        </div>
    );
};

export default App;