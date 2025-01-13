import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ user, handleLogout }) => {

    const navigate = useNavigate();

    return (
        <header className="bg-gray-800 text-white py-4 px-8 flex justify-between items-center">
            <h1 className="text-lg font-bold">Eternal Fitness</h1>
            <nav>
                {user ? (
                    <div className="flex items-center space-x-4">
                        <span className="text-sm">Hello, {user.name}!</span>
                        <button
                            onClick={handleLogout}
                            className="btn btn-danger"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex space-x-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-primary"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => navigate('/signup')}
                            className="btn btn-secondary"
                        >
                            Signup
                        </button>
                    </div>
                )}
            </nav>
        </header>
    );
};

export default Header;