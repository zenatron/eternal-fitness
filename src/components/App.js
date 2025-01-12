import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import FormSection from './FormSection';
import ScheduleSection from './ScheduleSection';
import Footer from './Footer';
import Header from './Header';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { generateWorkoutSchedule } from './workoutGenerator';

const App = () => {
    // State for form data
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

    // State for workout schedule
    const [workoutSchedule, setWorkoutSchedule] = useState([]);

    // State for user session
    const [user, setUser] = useState(null);

    // State for form to show (login or signup)
    const [formToShow, setFormToShow] = useState('login'); // 'login' or 'signup'

    // On component mount, check for existing session
    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { user } = session;
                const userData = {
                    email: user.email,
                    name: user.user_metadata?.name || 'User', // Retrieve name from metadata
                };
                setUser(userData);
            }
        };

        fetchSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                const { user } = session;
                const userData = {
                    email: user.email,
                    name: user.user_metadata?.name || 'User', // Retrieve name from metadata
                };
                setUser(userData);
            } else {
                setUser(null);
            }
        });

        return () => listener?.subscription.unsubscribe();
    }, []);

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

    // Handle logout
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            {/* Header with login/logout */}
            <Header user={user} handleLogout={handleLogout} setShowForm={setFormToShow} />

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center p-4">
                {user ? (
                    workoutSchedule.length === 0 ? (
                        <FormSection
                            formData={formData}
                            handleChange={handleChange}
                            handleSubmit={handleSubmit}
                            setFormData={setFormData} // Ensure setFormData is passed
                        />
                    ) : (
                        <ScheduleSection
                            formData={formData}
                            workoutSchedule={workoutSchedule}
                            setWorkoutSchedule={setWorkoutSchedule}
                        />
                    )
                ) : (
                    formToShow === 'login' ? (
                        <LoginForm switchToSignup={() => setFormToShow('signup')} />
                    ) : (
                        <SignupForm switchToLogin={() => setFormToShow('login')} />
                    )
                )}
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default App;