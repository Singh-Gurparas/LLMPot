import React, { useEffect, useState } from 'react';
import { getDeceptionSummary, getDeceptionRecommendations } from '../services/api';
import { Eye, Lightbulb, BarChart2 } from 'lucide-react';

function EffectivenessBar({ score }) {
    const pct = Math.min(1, Math.max(0, score)) * 100;
    const color = score >= 0.7 ? '#22c55e' : score >= 0.4 ? '#f97316' : '#6b7280';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-xs font-mono" style={{ color }}>{Math.round(pct)}%</span>
        </div>
    );
}

export default function DeceptionAnalytics() {
    const [summary, setSummary] = useState([]);
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getDeceptionSummary(), getDeceptionRecommendations()])
            .then(([s, r]) => { setSummary(s); setRecs(r); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const totalEngaged = summary.reduce((s, m) => s + m.engaged, 0);
    const totalSessions = summary.reduce((s, m) => s + m.total, 0);

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <Eye size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">Deception Analytics</h1>
                </div>
                <p className="text-gray-400 text-sm">
                    Honeypot effectiveness metrics — how well we engaged attackers & what we learned by letting them in
                </p>
            </header>

            {!loading && summary.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total Interactions', value: totalSessions },
                        { label: 'Attackers Engaged', value: totalEngaged },
                        { label: 'Engagement Rate', value: `${Math.round(totalEngaged / Math.max(totalSessions, 1) * 100)}%` },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 text-center">
                            <p className="text-3xl font-bold">{value}</p>
                            <p className="text-xs text-gray-500 mt-1">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Service breakdown */}
            {summary.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <BarChart2 size={14} className="text-primary-400" />
                        Effectiveness by Service
                    </h2>
                    <div className="space-y-3">
                        {summary.map(s => (
                            <div key={s.service} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-semibold text-sm">{s.service || 'Unknown Service'}</p>
                                        <p className="text-xs text-gray-500">{s.total} total interactions · {s.engaged} engaged</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Engagement Rate</p>
                                        <p className="text-lg font-bold text-primary-400">{Math.round(s.engagement_rate * 100)}%</p>
                                    </div>
                                </div>
                                <EffectivenessBar score={s.avg_effectiveness} />
                                <p className="text-xs text-gray-600 mt-1">Avg engagement depth: {s.avg_depth.toFixed(1)} requests</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Deception Recommendations */}
            {recs.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Lightbulb size={14} className="text-yellow-400" />
                        AI Deception Recommendations
                    </h2>
                    <div className="space-y-3">
                        {recs.map((r, i) => (
                            <div key={i} className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">{r.attacker_ip}</span>
                                    <span className="text-xs text-gray-500">{new Date(r.generated_at).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-yellow-200/80 leading-relaxed">{r.recommendation}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading deception data...</div>
            ) : summary.length === 0 && recs.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Eye size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No deception data yet. Metrics will appear as sessions are analyzed.</p>
                </div>
            ) : null}
        </div>
    );
}
