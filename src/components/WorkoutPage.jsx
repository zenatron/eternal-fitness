import React, { useState } from 'react';
import FormSection from './FormSection';
import ScheduleSection from './ScheduleSection';
import { generateWorkoutSchedule } from './workoutGenerator';

const WorkoutPage = () => {
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

    const [workoutSchedule, setWorkoutSchedule] = useState([]);

    // Handle form changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        const schedule = generateWorkoutSchedule(Number(formData.workoutsPerWeek), Number(formData.exercisesPerWorkout));
        setWorkoutSchedule(schedule);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800 mt-8 mb-8">
            {workoutSchedule.length === 0 ? (
                <FormSection
                    formData={formData}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    setFormData={setFormData}
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

export default WorkoutPage;