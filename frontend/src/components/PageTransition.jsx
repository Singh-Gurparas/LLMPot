import React from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
    const location = useLocation();
    return <div key={`${location.pathname}${location.search}`} className={`route-transition ${location.pathname === '/' ? 'route-command' : 'route-workspace'}`}>{children}</div>;
}
