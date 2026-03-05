import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import { Shield } from 'lucide-react';

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-primary-500/30">
                {/* Global Top Nav */}
                <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-lg sticky top-0 z-40">
                    <div className="max-w-[1600px] mx-auto px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-white">
                            <Shield className="text-primary-500" size={28} />
                            <span className="text-xl font-bold tracking-wide">UNHARMD</span>
                        </div>
                        <div className="text-xs font-mono text-gray-500">
                            SYSTEM TIME: {new Date().toISOString()}
                        </div>
                    </div>
                </nav>

                <main>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}
