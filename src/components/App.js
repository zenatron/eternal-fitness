import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// Components
import Header from './Header';
import Footer from './Footer';

import LoginPage from './LoginPage';
import WorkoutPage from './WorkoutPage';
import SignupPage from './SignupPage';

// Functions
import { generateWorkoutSchedule } from './workoutGenerator';

import '../styles/styles.css';

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

    // Loading state
    const [loading, setLoading] = useState(true);

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
            setLoading(false);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <Router basename='/eternal-fitness'>
            <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-slate-800">
                <Header user={user} handleLogout={handleLogout} setShowForm={setFormToShow}/>

                <main className="flex-grow">
                    <Routes>
                        {/* Redirect to login or workout based on user session */}
                        <Route path="/" element={<Navigate to={user ? "/workout" : "/login"} />} />

                        {/* Login Route */}
                        <Route path="/login" element={user ? <Navigate to="/workout" /> : <LoginPage />} />

                        {/* Signup Route */}
                        <Route path="/signup" element={user ? <Navigate to="/workout" /> : <SignupPage />} />

                        {/* Workout Form Route */}
                        <Route
                            path="/workout"
                            element={
                                user ? (
                                    <WorkoutPage
                                        formData={formData}
                                        setFormData={setFormData}
                                        handleChange={handleChange}
                                        handleSubmit={handleSubmit}
                                    />
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        />

                        {/* Schedule Route
                        <Route
                            path="/schedule"
                            element={
                                user ? (
                                    <SchedulePage
                                        formData={formData}
                                        workoutSchedule={workoutSchedule}
                                        setWorkoutSchedule={setWorkoutSchedule}
                                    />
                                ) : (
                                    <Navigate to="/login" />
                                )
                            }
                        /> */}
                    </Routes>
                </main>

                <Footer />
            </div>
        </Router>
    );
};

export default App;