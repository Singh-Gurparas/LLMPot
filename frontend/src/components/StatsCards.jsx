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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((c, i) => (
                <div key={i} className="glass-panel p-6 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">{c.title}</p>
                        <h3 className="text-3xl font-bold mt-2">
                            {Number(c.value || 0).toLocaleString()}
                        </h3>
                    </div>

                    <div className={`p-3 rounded-full bg-gray-800/50 ${c.color}`}>
                        <c.icon size={24} />
                    </div>
                </div>
            ))}
        </div>
    );
}