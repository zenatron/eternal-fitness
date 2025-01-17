import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const SignupForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [signupSuccess, setSignupSuccess] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
    
        // Ensure name, email, and password are passed correctly
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }, // Store the name in user_metadata
            },
        });
    
        if (error) {
            setError(error.message);
        } else {
            console.log('Signup successful:', data);
            setSignupSuccess(true);
        }
    };

    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 p-6 rounded shadow-md space-y-4 min-w-[400px] flex flex-col justify-between">
                {signupSuccess ? (
                    // Success message
                    <div className="text-center space-y-4">
                        <h1 className="gradient-text-blue text-2xl font-bold w-fit">Thank You for Signing Up!</h1>
                        <p className="text-gray-700 dark:text-gray-300">
                            Please check your email for a confirmation link to activate your Eternal Fitness account.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-primary"
                        >
                            Go to Login
                        </button>
                    </div>
                ) : (
                    <>
                    <h1 className="text-2xl font-bold bg-center text-center gradient-text-green">Sign Up</h1>
                    <form onSubmit={handleSignup} className="flex flex-col flex-grow space-y-4">
                        <div>
                            <label className="form-item-heading">Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-item-heading">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="form-item-heading">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            type="submit"
                            className="btn btn-tertiary w-full"
                        >
                            Sign Up
                        </button>
                    </form>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn btn-secondary w-full"
                    >
                        Already Have an Account?
                    </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default SignupForm;