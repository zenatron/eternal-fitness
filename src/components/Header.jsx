import React from 'react';

const Header = ({ user, handleLogout, setShowForm }) => {
    return (
        <header className="bg-gray-800 text-white py-4 px-8 flex justify-between items-center">
            <h1 className="text-lg font-bold">Eternal Fitness</h1>
            <nav>
                {user ? (
                    <div className="flex items-center space-x-4">
                        <span className="text-sm">Hello, {user.name}</span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setShowForm('login')}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setShowForm('signup')}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
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