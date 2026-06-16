import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Users, GitBranch, FileText,
    Target, TrendingUp, Search, Shield, Eye, Activity
} from 'lucide-react';

const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profiles', label: 'Attacker Profiles', icon: Users },
    { to: '/campaigns', label: 'Campaigns', icon: GitBranch },
    { to: '/reports', label: 'Threat Reports', icon: FileText },
    { to: '/mitre', label: 'MITRE ATT&CK', icon: Target },
    { to: '/predictions', label: 'Predictions', icon: TrendingUp },
    { to: '/iocs', label: 'IOC Database', icon: Search },
    { to: '/mitigations', label: 'Mitigations', icon: Shield },
    { to: '/deception', label: 'Deception Analytics', icon: Eye },
];

export default function Sidebar() {
    return (
        <aside className="fixed left-0 top-16 bottom-0 w-56 bg-gray-900/80 border-r border-gray-800 backdrop-blur-lg z-30 flex flex-col">
            <div className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
                {links.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                isActive
                                    ? 'bg-primary-500/20 text-primary-400 font-semibold border border-primary-500/30'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                            }`
                        }
                    >
                        <Icon size={16} className="shrink-0" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </div>
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Activity size={10} className="text-green-500 animate-pulse" />
                    LLMPot v2.0
                </div>
            </div>
        </aside>
    );
}
