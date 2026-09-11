import React, { useMemo } from 'react';
import {
    Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

const SEVERITY = [
    { name: 'Critical', color: '#fb4b68' },
    { name: 'High', color: '#fb923c' },
    { name: 'Medium', color: '#facc15' },
    { name: 'Low', color: '#22d3ee' },
];

const tooltipStyle = {
    background: '#0b1324', border: '1px solid rgba(98, 169, 217, .22)',
    borderRadius: 8, color: '#dbeafe', fontSize: 11,
};

function Panel({ label, title, children, className = '' }) {
    return (
        <section className={`glass-panel analytics-panel ${className}`}>
            <div className="analytics-heading"><div><p className="panel-kicker">{label}</p><h3>{title}</h3></div><span className="analytics-live"><span className="live-dot" />LIVE</span></div>
            {children}
        </section>
    );
}

export function SeverityDistribution({ attacks }) {
    const data = useMemo(() => SEVERITY.map(item => ({ ...item, value: attacks.filter(a => a.severity === item.name).length })), [attacks]);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <Panel label="Risk posture" title="Threat distribution">
            <div className="relative h-[196px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" innerRadius={53} outerRadius={74} paddingAngle={3} stroke="none">
                            {data.map(item => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#dbeafe' }} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="text-center"><p className="text-2xl font-bold text-white">{total}</p><p className="text-[9px] uppercase tracking-wider text-gray-500">Events</p></div></div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-1 mt-1">
                {data.map(item => <div key={item.name} className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5 text-gray-400"><i className="legend-dot" style={{ background: item.color }} />{item.name}</span><span className="font-mono text-gray-200">{item.value}</span></div>)}
            </div>
        </Panel>
    );
}

export function ThreatTrend({ attacks }) {
    const data = useMemo(() => {
        const periods = Array.from({ length: 8 }, (_, i) => {
            const hour = new Date(Date.now() - (7 - i) * 60 * 60 * 1000);
            return { key: hour.toISOString().slice(0, 13), label: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), events: 0, critical: 0 };
        });
        attacks.forEach(attack => {
            const time = new Date(attack.created_at);
            const key = Number.isNaN(time.valueOf()) ? '' : time.toISOString().slice(0, 13);
            const period = periods.find(p => p.key === key);
            if (period) { period.events += 1; if (attack.severity === 'Critical') period.critical += 1; }
        });
        return periods;
    }, [attacks]);
    return (
        <Panel label="Network telemetry" title="Threat trend">
            <div className="h-[162px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
                        <defs><linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2dd4f5" stopOpacity=".35" /><stop offset="95%" stopColor="#2dd4f5" stopOpacity="0" /></linearGradient></defs>
                        <XAxis dataKey="label" tick={{ fill: '#63718a', fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis tick={{ fill: '#63718a', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#8ea0b9' }} />
                        <Area type="monotone" dataKey="events" stroke="#2dd4f5" strokeWidth={2} fill="url(#eventsGradient)" />
                        <Area type="monotone" dataKey="critical" stroke="#fb4b68" strokeWidth={1.5} fill="none" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="chart-key"><span><i className="legend-dot bg-primary-500" />All events</span><span><i className="legend-dot bg-danger-500" />Critical</span><span className="ml-auto">Last 8 hours</span></div>
        </Panel>
    );
}

export function ThreatBreakdown({ attacks }) {
    const data = useMemo(() => Object.entries(attacks.reduce((groups, attack) => {
        const name = attack.classification || 'Unclassified'; groups[name] = (groups[name] || 0) + 1; return groups;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([name, value]) => ({ name: name.length > 11 ? `${name.slice(0, 10)}…` : name, value })), [attacks]);
    return (
        <Panel label="Classification" title="Threats by type">
            <div className="h-[183px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 1, left: -27, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: '#63718a', fontSize: 8 }} tickLine={false} axisLine={false} interval={0} />
                        <YAxis tick={{ fill: '#63718a', fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(71, 125, 180, .08)' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#5b8cff" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Panel>
    );
}
