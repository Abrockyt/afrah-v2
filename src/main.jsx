import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './v7/App.jsx';
import './v7/styles/tokens.css';
import './v7/styles/base.css';
import './v7/styles/sections.css';
import './v7/styles/pages-theme.css';
import './v7/styles/afrah.css';
import './v7/styles/refinement.css';

const PagesApp = React.lazy(() => import('./v7/PagesApp.jsx'));
const isHome = location.pathname === '/' || location.pathname === '/index.html';
createRoot(document.getElementById('root')).render(isHome ? <App /> : <React.Suspense fallback={<div className="page-loading">AFRAH</div>}><PagesApp /></React.Suspense>);
