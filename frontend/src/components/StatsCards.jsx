import React from 'react';
import { Activity, ShieldAlert, Users, Server } from 'lucide-react';

export default function StatsCards({ metrics }) {
    if (!metrics) return null;

    const cards = [
        { title: 'Total Attacks', value: metrics.total_attacks, icon: ShieldAlert, color: 'text-danger-500' },
        { title: 'Critical Threats', value: metrics.critical_threats, icon: Activity, color: 'text-red-600' },
        { title: 'Unique Attackers (24h)', value: metrics.unique_attackers_24h, icon: Users, color: 'text-primary-500' },
        { title: 'Active Nodes', value: metrics.active_nodes, icon: Server, color: 'text-accent-500' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((c, i) => (
                <div key={i} className="metric-card glass-panel p-5 flex items-center justify-between" style={{ '--metric-color': i === 0 ? '#fb7185' : i === 1 ? '#fb923c' : i === 2 ? '#22d3ee' : '#34d399' }}>
                    <div>
                        <p className="text-gray-500 text-[11px] uppercase tracking-[0.12em] font-semibold">{c.title}</p>
                        <h3 className="text-3xl font-bold mt-1.5 tracking-tight">
                            {Number(c.value || 0).toLocaleString()}
                        </h3>
                    </div>

                    <div className={`metric-icon p-3 rounded-xl ${c.color}`}>
                        <c.icon size={24} />
                    </div>
                </div>
            ))}
        </div>
    );
}
