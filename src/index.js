import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Admin from './Admin';

const path = window.location.pathname.replace(/\/+$/, '');
const isAdmin = path === '/admin';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode>{isAdmin ? <Admin /> : <App />}</React.StrictMode>);
