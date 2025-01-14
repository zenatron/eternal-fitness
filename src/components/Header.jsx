import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import ThemeSwitch from './ThemeSwitch';

const Header = ({ user, handleLogout }) => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useContext(ThemeContext); // Access theme and toggle function from ThemeContext

    return (
        <header className="bg-gray-800 text-white py-4 px-8 flex justify-between items-center dark:bg-gray-900 dark:text-gray-300">
            {/* Website Logo/Title */}
            <h1 className="text-lg font-bold">Eternal Fitness</h1>

            {/* Navigation and User Section */}
            <nav className="flex items-center space-x-6">
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

                {/* Dark Mode Toggle */}
                <ThemeSwitch />
            </nav>
        </header>
    );
};

export default Header;