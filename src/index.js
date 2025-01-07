import React from 'react';
import ReactDOM from 'react-dom/client'; // Correct import for React 18+
import App from './components/App';
import './styles/tailwind.css';

const root = ReactDOM.createRoot(document.getElementById('root')); // Create the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);