import React, { useEffect, useState } from 'react';
import { getPredictions } from '../services/api';
import { TrendingUp, Clock, Target } from 'lucide-react';

const WINDOW_BADGE = {
    'within session': 'bg-red-500/10 text-red-400 border-red-500/30',
    'next 1h': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    'next 24h': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    'next week': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

export default function Predictions() {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPredictions({ limit: 100, min_confidence: 0.3 })
            .then(setPredictions)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <TrendingUp size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">Attack Predictions</h1>
                </div>
                <p className="text-gray-400 text-sm">AI-predicted next attacker actions based on observed session behavior</p>
            </header>

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading predictions...</div>
            ) : predictions.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No predictions yet. Predictions are generated automatically after session analysis.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {predictions.map(p => (
                        <div key={p.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Target size={14} className="text-primary-400 shrink-0" />
                                        <span className="font-semibold text-sm">{p.predicted_action}</span>
                                    </div>
                                    {p.reasoning && (
                                        <p className="text-sm text-gray-400 pl-5">{p.reasoning}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0 space-y-1.5">
                                    <div className="text-lg font-bold font-mono text-primary-400">
                                        {Math.round(p.confidence * 100)}%
                                    </div>
                                    {p.time_window && (
                                        <span className={`text-xs px-2 py-0.5 rounded border ${WINDOW_BADGE[p.time_window] || 'border-gray-700 text-gray-400'}`}>
                                            {p.time_window}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2 border-t border-gray-800 text-xs text-gray-500">
                                {p.predicted_technique_id && (
                                    <span className="font-mono bg-gray-800 px-2 py-0.5 rounded text-gray-300">
                                        {p.predicted_technique_id}
                                    </span>
                                )}
                                <span className="font-mono">{p.attacker_ip}</span>
                                <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary-500"
                                        style={{ width: `${p.confidence * 100}%` }}
                                    />
                                </div>
                                <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    {new Date(p.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
