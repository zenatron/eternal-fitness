import React, { useState } from 'react';
import { generateWorkoutSchedule } from './workoutGenerator';
import FormSection from './FormSection';
import ScheduleSection from './ScheduleSection';

const App = () => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        fitnessGoal: '',
        intensity: '',
        exercisesPerWorkout: '',
        workoutsPerWeek: '',
    });

    const [workoutSchedule, setWorkoutSchedule] = useState([]); // Store the generated schedule

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const schedule = generateWorkoutSchedule(Number(formData.workoutsPerWeek), Number(formData.exercisesPerWorkout));
        setWorkoutSchedule(schedule); // Update the schedule state
    };

    //////////////////////////////
    const seatedBarbellCurls = {
        name: "Seated Barbell Curls",
        description: "A strength exercise focusing on the biceps, performed while seated with a barbell.",
        durationPerSet: "45 seconds", // Duration for a standard set
        equipment: ["Barbell", "Bench"], // Required equipment
        musclesTargeted: ["Biceps"], // Primary muscles worked
        difficulty: "Intermediate", // Difficulty level
        instructions: [
            "Sit on a bench with your back straight and feet flat on the ground.",
            "Hold a barbell with an underhand grip, hands shoulder-width apart.",
            "Curl the barbell upwards while keeping your upper arms stationary.",
            "Slowly lower the barbell back to the starting position.",
        ],
    };

    console.log(seatedBarbellCurls.description);

    //////////////////////////////

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            {workoutSchedule.length === 0 ? (
                <FormSection
                    formData={formData}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                />
            ) : (
                <ScheduleSection
                    formData={formData}
                    workoutSchedule={workoutSchedule}
                    setWorkoutSchedule={setWorkoutSchedule}
                />
            )}
        </div>
    );
};

export default App;