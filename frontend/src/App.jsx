import React from 'react';
import { BrowserRouter, Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Command, Search, Shield } from 'lucide-react';
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
import Sensors from './pages/Sensors';
import GlobalSearch from './components/GlobalSearch';
import PageTransition from './components/PageTransition';

function Application() {
    const location = useLocation();
    const isCommandCenter = location.pathname === '/' || location.pathname === '/attacks';
    const navigate = useNavigate();
    const [searchOpen, setSearchOpen] = React.useState(false);
    return <div className={`app-shell min-h-screen bg-gray-950 text-gray-100 selection:bg-primary-500/30 ${isCommandCenter ? 'command-shell' : ''}`}>
                <nav className="topbar fixed top-0 left-0 right-0 z-40 h-[72px]">
                    <div className="h-full flex items-center justify-between px-5 sm:px-7">
                        <div className="flex items-center space-x-3 text-white">
                            <div className="brand-mark"><Shield size={16} /></div>
                            <div>
                                <span className="text-lg font-bold tracking-[0.16em]">LLMPOT</span>
                                <span className="ml-2 text-[10px] text-primary-400 font-mono bg-primary-500/10 px-1.5 py-0.5 rounded">v2.0</span>
                            </div>
                        </div>
                        {isCommandCenter ? <div className="command-tabs"><Link to="/" className={location.pathname === '/' && !location.search ? 'active' : ''}><i />Overview</Link><Link to="/attacks?live=true" className={location.search.includes('live=true') ? 'active' : ''}>Live attacks</Link><Link to="/campaigns">Campaigns</Link><Link to="/?panel=sensors" className={location.search.includes('panel=sensors') ? 'active' : ''}>Sensors</Link><Link to="/attacks" className={location.pathname === '/attacks' && !location.search ? 'active' : ''}>Attacks</Link><Link to="/reports">Intelligence</Link></div> : <div className="hidden md:flex items-center gap-2 text-[11px] font-mono tracking-wider text-gray-500"><span className="live-dot" /> AUTONOMOUS THREAT INTELLIGENCE</div>}
                        <div className="flex items-center gap-2">
                            <button onClick={() => setSearchOpen(true)} className="topbar-action hidden sm:flex" aria-label="Search intelligence"><Search size={16} /></button>
                            <button onClick={() => navigate('/reports')} className="topbar-action" aria-label="Open threat reports"><Bell size={16} /><span className="notification-dot" /></button>
                            {isCommandCenter && <button onClick={() => navigate('/mitre')} className="topbar-action" aria-label="Open MITRE ATT&CK"><Command size={16} /></button>}
                            <div className="hidden sm:flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
                                <div className="operator-avatar">OP</div>
                                <div className="text-xs leading-tight"><p className="text-gray-200">Operator</p><p className="text-gray-500">Secure session</p></div>
                            </div>
                        </div>
                    </div>
                </nav>

                {!isCommandCenter && <Sidebar />}

                <main className={isCommandCenter ? 'command-main' : 'ml-60 mt-[72px] min-h-[calc(100vh-4.5rem)]'}>
                    <PageTransition>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/attacks" element={<Dashboard />} />
                        <Route path="/sensors" element={<Sensors />} />
                        <Route path="/profiles" element={<AttackerProfiles />} />
                        <Route path="/campaigns" element={<Campaigns />} />
                        <Route path="/reports" element={<ThreatReports />} />
                        <Route path="/mitre" element={<MitreView />} />
                        <Route path="/predictions" element={<Predictions />} />
                        <Route path="/iocs" element={<IOCs />} />
                        <Route path="/mitigations" element={<Mitigations />} />
                        <Route path="/deception" element={<DeceptionAnalytics />} />
                    </Routes>
                    </PageTransition>
                </main>
                <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
            </div>;
}
export default function App() { return <BrowserRouter><Application /></BrowserRouter>; }
