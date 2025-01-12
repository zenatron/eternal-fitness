import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const SignupForm = ({ switchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

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
            window.location.reload();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md bg-white p-6 rounded shadow-md space-y-4 min-h-[400px] flex flex-col justify-between">
                <h1 className="text-2xl font-bold text-center">Sign Up</h1>
                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-green-300"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-green-300"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-green-300"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        type="submit"
                        className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
                    >
                        Sign Up
                    </button>
                </form>
                <button
                    onClick={switchToLogin}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                >
                    Already Have an Account?
                </button>
            </div>
        </div>
    );
};

export default SignupForm;