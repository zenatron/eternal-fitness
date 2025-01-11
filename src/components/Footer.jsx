import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-gray-800 text-white py-4">
            <div className="container mx-auto text-center">
                <p className="text-sm">&copy; {new Date().getFullYear()} Eternal Fitness. All rights reserved.</p>
                <p className="text-sm mt-2">
                    Built with ❤️ by <a href="https://github.com/zenatron" className="text-blue-400 hover:underline">zenatron</a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;