import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shield } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AttackerProfiles from './pages/AttackerProfiles';
import Campaigns from './pages/Campaigns';
import ThreatReports from './pages/ThreatReports';
import MitreView from './pages/MitreView';
import Predictions from './pages/Predictions';
import IOCs from './pages/IOCs';
import Mitigations from './pages/Mitigations';
import DeceptionAnalytics from './pages/DeceptionAnalytics';

export default function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-primary-500/30">
                <nav className="fixed top-0 left-0 right-0 border-b border-gray-800 bg-gray-900/50 backdrop-blur-lg z-40 h-16">
                    <div className="h-full flex items-center justify-between px-6">
                        <div className="flex items-center space-x-3 text-white">
                            <Shield className="text-primary-500" size={28} />
                            <div>
                                <span className="text-xl font-bold tracking-wide">LLMPOT</span>
                                <span className="ml-2 text-xs text-primary-400 font-mono bg-primary-500/10 px-1.5 py-0.5 rounded">v2.0</span>
                            </div>
                        </div>
                        <div className="text-xs font-mono text-gray-500">
                            AUTONOMOUS AI THREAT INTELLIGENCE
                        </div>
                    </div>
                </nav>

                <Sidebar />

                <main className="ml-56 mt-16 min-h-[calc(100vh-4rem)]">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/profiles" element={<AttackerProfiles />} />
                        <Route path="/campaigns" element={<Campaigns />} />
                        <Route path="/reports" element={<ThreatReports />} />
                        <Route path="/mitre" element={<MitreView />} />
                        <Route path="/predictions" element={<Predictions />} />
                        <Route path="/iocs" element={<IOCs />} />
                        <Route path="/mitigations" element={<Mitigations />} />
                        <Route path="/deception" element={<DeceptionAnalytics />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}
