import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import './styles/styles.css';
import ThemeProvider from './ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ThemeProvider>
);