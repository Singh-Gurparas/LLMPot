import React, { useEffect, useState } from 'react';
import { getCampaigns, getCampaignById } from '../services/api';
import { GitBranch, X, ChevronRight, Globe } from 'lucide-react';

const LEVEL_COLOR = {
    Critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    High: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    Medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    Low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

function CampaignDetail({ campaign, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-900/95 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <GitBranch size={16} className="text-primary-400" />
                        <span className="font-bold">{campaign.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${LEVEL_COLOR[campaign.threat_level] || ''}`}>
                            {campaign.threat_level}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Sessions', value: campaign.total_sessions },
                            { label: 'Unique Attackers', value: campaign.total_attackers },
                            { label: 'Confidence', value: `${Math.round((campaign.confidence || 0) * 100)}%` },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className="text-xl font-bold">{value}</p>
                            </div>
                        ))}
                    </div>

                    {campaign.description && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Description</p>
                            <p className="text-sm text-gray-300">{campaign.description}</p>
                        </div>
                    )}

                    {campaign.primary_objective && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Primary Objective</p>
                            <p className="text-sm text-gray-300">{campaign.primary_objective}</p>
                        </div>
                    )}

                    {campaign.attribution_hypothesis && (
                        <div>
                            <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Attribution Hypothesis</p>
                            <p className="text-sm text-yellow-300/90 bg-yellow-500/5 border border-yellow-500/20 rounded p-3">
                                {campaign.attribution_hypothesis}
                            </p>
                        </div>
                    )}

                    {campaign.correlated_asns && campaign.correlated_asns.length > 0 && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Correlated ASNs</p>
                            <div className="flex flex-wrap gap-2">
                                {campaign.correlated_asns.map((asn, i) => (
                                    <span key={i} className="text-xs font-mono bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{asn}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {campaign.sessions && campaign.sessions.length > 0 && (
                        <div className="border border-gray-800 rounded-lg overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/60">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Linked Sessions</p>
                            </div>
                            <div className="divide-y divide-gray-800/50">
                                {campaign.sessions.map(s => (
                                    <div key={s.session_id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs text-gray-500">{s.attacker_ip}</span>
                                            <span className="text-xs text-gray-400">{s.country}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {s.threat_score != null && (
                                                <span className={`text-xs font-mono ${s.threat_score >= 7 ? 'text-red-400' : 'text-orange-400'}`}>
                                                    {s.threat_score.toFixed(1)}/10
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-600">{new Date(s.start_time).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCampaigns().then(setCampaigns).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleSelect = async (id) => {
        try { setSelected(await getCampaignById(id)); } catch (e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <GitBranch size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">Campaign Explorer</h1>
                </div>
                <p className="text-gray-400 text-sm">Correlated attack campaigns detected by the AI intelligence engine</p>
            </header>

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No campaigns detected yet. Campaigns form when correlated attacks share ASNs, payloads, or timing patterns.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {campaigns.map(c => (
                        <div
                            key={c.id}
                            onClick={() => handleSelect(c.id)}
                            className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors cursor-pointer space-y-3"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{new Date(c.first_seen).toLocaleDateString()} – {new Date(c.last_seen).toLocaleDateString()}</p>
                                </div>
                                <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded border ${LEVEL_COLOR[c.threat_level] || 'text-gray-500 border-gray-700'}`}>
                                    {c.threat_level}
                                </span>
                            </div>
                            {c.primary_objective && (
                                <p className="text-xs text-gray-400">{c.primary_objective}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{c.total_sessions} sessions</span>
                                <span>{Math.round((c.confidence || 0) * 100)}% confidence</span>
                            </div>
                            {c.status === 'active' && (
                                <div className="flex items-center gap-1.5 text-xs text-red-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    Active
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selected && <CampaignDetail campaign={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
