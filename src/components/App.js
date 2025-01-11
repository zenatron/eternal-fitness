import React, { useState } from 'react';
import { generateWorkoutSchedule } from './workoutGenerator';
import FormSection from './FormSection';
import ScheduleSection from './ScheduleSection';
import Footer from './Footer';

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

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-4">
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
            </main>

            <Footer />
        </div>
    );
};

export default App;