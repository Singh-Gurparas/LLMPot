import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, GitBranch, FileText,
    Target, TrendingUp, Search, Shield, Eye, Activity, Radar
} from 'lucide-react';

const groups = [
    { label: 'Overview', links: [{ to: '/', label: 'Command center', icon: LayoutDashboard }] },
    { label: 'Intelligence', links: [
        { to: '/profiles', label: 'Attacker profiles', icon: Users },
        { to: '/campaigns', label: 'Campaigns', icon: GitBranch },
        { to: '/reports', label: 'Threat reports', icon: FileText },
        { to: '/mitre', label: 'MITRE ATT&CK', icon: Target },
        { to: '/iocs', label: 'IOC database', icon: Search },
    ] },
    { label: 'AI analysis', links: [{ to: '/predictions', label: 'Predictions', icon: TrendingUp }] },
    { label: 'Response', links: [
        { to: '/mitigations', label: 'Mitigations', icon: Shield },
        { to: '/deception', label: 'Deception analytics', icon: Eye },
    ] },
];

export default function Sidebar() {
    return (
        <aside className="sidebar fixed left-0 top-[72px] bottom-0 w-60 z-30 flex flex-col">
            <div className="px-5 pt-5 pb-3">
                <p className="sidebar-label">Workspace</p>
                <div className="sensor-chip"><Radar size={13} /><span>Global sensor mesh</span><span className="ml-auto text-accent-500">LIVE</span></div>
            </div>
            <div className="flex-1 overflow-y-auto pb-4 space-y-5 px-3">
                {groups.map(group => <div key={group.label} className="nav-group">
                    <p className="nav-group-label">{group.label}</p>
                    <div className="space-y-1">{group.links.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                    isActive ? 'bg-primary-500/20 text-primary-400 font-semibold border border-primary-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                                }`
                            }
                        >
                            <Icon size={16} className="shrink-0" />
                            <span>{label}</span>
                        </NavLink>
                    ))}</div>
                </div>)}
            </div>
            <div className="p-4 border-t border-white/5">
                <div className="sidebar-footer">
                    <Activity size={13} className="text-accent-500 animate-pulse" />
                    <div><p className="text-xs text-gray-300">All systems nominal</p><p className="text-[10px] text-gray-600 mt-0.5">LLMPot v2.0</p></div>
                </div>
            </div>
        </aside>
    );
}
