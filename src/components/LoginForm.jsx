import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
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

    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-800">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 p-6 rounded shadow-md space-y-4 min-w-[400px] flex flex-col justify-between">
                <h1 className="text-2xl font-bold text-center gradient-text-blue">Login</h1>
                <form onSubmit={handleLogin} className="flex flex-col flex-grow space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2 form-item-heading">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2 form-item-heading">Password</label>
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
                        className="btn btn-primary w-full"
                    >
                        Login
                    </button>
                </form>
                <button
                    onClick={() => navigate('/signup')}
                    className="btn btn-secondary w-full"
                >
                    Create an Account
                </button>
            </div>
        </div>
    );
};

export default LoginForm;