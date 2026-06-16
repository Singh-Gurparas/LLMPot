import React, { useEffect, useState } from 'react';
import { getMitreSummary, getMitreTactics } from '../services/api';
import { Target } from 'lucide-react';

const TACTIC_COLORS = {
    'Reconnaissance': '#3b82f6',
    'Resource Development': '#8b5cf6',
    'Initial Access': '#ef4444',
    'Execution': '#f97316',
    'Persistence': '#eab308',
    'Privilege Escalation': '#f59e0b',
    'Defense Evasion': '#10b981',
    'Credential Access': '#06b6d4',
    'Discovery': '#6366f1',
    'Lateral Movement': '#ec4899',
    'Collection': '#14b8a6',
    'Command and Control': '#84cc16',
    'Exfiltration': '#f43f5e',
    'Impact': '#dc2626',
};

function TechniqueCard({ technique }) {
    const color = TACTIC_COLORS[technique.tactic] || '#6b7280';
    const intensity = Math.min(technique.count / 5, 1);
    return (
        <div
            className="border rounded-lg p-3 space-y-1.5 hover:scale-[1.02] transition-transform cursor-default"
            style={{
                borderColor: `${color}40`,
                background: `${color}${Math.round(intensity * 15 + 5).toString(16).padStart(2, '0')}`,
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-bold" style={{ color }}>{technique.technique_id}</span>
                <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded font-mono">{technique.count}×</span>
            </div>
            <p className="text-xs text-gray-300 font-medium leading-tight">{technique.technique_name}</p>
            <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{technique.tactic}</span>
                <span className="text-xs text-gray-500">{Math.round(technique.avg_confidence * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${technique.avg_confidence * 100}%`, background: color }} />
            </div>
        </div>
    );
}

export default function MitreView() {
    const [summary, setSummary] = useState([]);
    const [tactics, setTactics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTactic, setSelectedTactic] = useState('All');

    useEffect(() => {
        Promise.all([getMitreSummary(), getMitreTactics()])
            .then(([s, t]) => { setSummary(s); setTactics(t); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const allTactics = ['All', ...new Set(summary.map(t => t.tactic))];
    const filtered = selectedTactic === 'All' ? summary : summary.filter(t => t.tactic === selectedTactic);

    const totalTechniques = summary.length;
    const totalObservations = summary.reduce((s, t) => s + t.count, 0);

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <Target size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">MITRE ATT&CK Mapping</h1>
                </div>
                <p className="text-gray-400 text-sm">Automatic mapping of observed behaviors to MITRE ATT&CK framework techniques</p>
            </header>

            {!loading && summary.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Unique Techniques', value: totalTechniques },
                        { label: 'Total Observations', value: totalObservations },
                        { label: 'Tactics Covered', value: tactics.length },
                        { label: 'Avg Confidence', value: `${Math.round(summary.reduce((s, t) => s + t.avg_confidence, 0) / Math.max(summary.length, 1) * 100)}%` },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold">{value}</p>
                            <p className="text-xs text-gray-500 mt-1">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tactic filter pills */}
            {allTactics.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {allTactics.map(t => (
                        <button
                            key={t}
                            onClick={() => setSelectedTactic(t)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                selectedTactic === t
                                    ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading MITRE data...</div>
            ) : summary.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Target size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No MITRE mappings yet. Techniques are extracted automatically from session analysis.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filtered.map(t => (
                        <TechniqueCard key={t.technique_id} technique={t} />
                    ))}
                </div>
            )}
        </div>
    );
}
