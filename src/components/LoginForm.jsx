import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const LoginForm = ({ switchToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-lg bg-white p-6 rounded shadow-md space-y-4 min-w-[300px] flex flex-col justify-between">
                <h1 className="text-2xl font-bold text-center">Login</h1>
                <form onSubmit={handleLogin} className="flex flex-col flex-grow space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                    >
                        Login
                    </button>
                </form>
                <button
                    onClick={switchToSignup}
                    className="btn btn-secondary w-full"
                >
                    Create an Account
                </button>
            </div>
        </div>
    );
};

export const LoginPage = ({ handleLogin, switchToSignup }) => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <LoginForm handleLogin={handleLogin} switchToSignup={switchToSignup} />
        </div>
    );
};

export default LoginForm;
