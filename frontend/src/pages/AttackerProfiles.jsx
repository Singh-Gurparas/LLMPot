import React, { useEffect, useState } from 'react';
import { getProfiles, getProfileById } from '../services/api';
import { Users, ChevronRight, X, AlertTriangle, Shield, Globe, Cpu, Brain } from 'lucide-react';

const SKILL_COLOR = {
    'Nation-State': 'text-red-400 bg-red-500/10 border-red-500/30',
    'Advanced': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    'Intermediate': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    'Script Kiddie': 'text-green-400 bg-green-500/10 border-green-500/30',
};

function ThreatBar({ score }) {
    const pct = Math.min(10, Math.max(0, score || 0)) * 10;
    const color = score >= 7 ? '#ef4444' : score >= 4 ? '#f97316' : '#22c55e';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-xs font-mono font-bold" style={{ color }}>{(score || 0).toFixed(1)}</span>
        </div>
    );
}

function ProfileDetail({ profile, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-900/95 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={16} className="text-red-400" />
                        <span className="font-mono font-bold">{profile.attacker_ip}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${SKILL_COLOR[profile.skill_level] || 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                            {profile.skill_level || 'Unknown'}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Sessions', value: profile.total_sessions },
                            { label: 'Attacks', value: profile.total_attacks },
                            { label: 'Threat Score', value: `${(profile.threat_score || 0).toFixed(1)}/10` },
                            { label: 'Confidence', value: `${Math.round((profile.confidence || 0) * 100)}%` },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 text-center">
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className="text-lg font-bold mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Origin */}
                    <div className="border border-gray-800 rounded-lg p-4">
                        <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"><Globe size={12} />Origin</p>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-xs text-gray-500">Country</p><p>{profile.country || '—'}</p></div>
                            <div><p className="text-xs text-gray-500">ISP</p><p className="font-mono text-xs">{profile.isp || '—'}</p></div>
                            <div><p className="text-xs text-gray-500">ASN</p><p className="font-mono text-xs">{profile.asn || '—'}</p></div>
                            <div className="flex gap-2 items-center">
                                {profile.is_proxy && <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded border border-red-500/30">Proxy/VPN</span>}
                                {profile.is_hosting && <span className="text-xs px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/30">Hosting</span>}
                            </div>
                        </div>
                    </div>

                    {/* Profile */}
                    <div className="border border-gray-800 rounded-lg p-4">
                        <p className="text-xs text-pink-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"><Brain size={12} />Profile</p>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                            <div><p className="text-xs text-gray-500">OPSEC Quality</p><p>{profile.opsec_quality || '—'}</p></div>
                            <div><p className="text-xs text-gray-500">Motivation</p><p>{profile.primary_motivation || '—'}</p></div>
                        </div>
                        {profile.profile_summary && (
                            <div className="border-l-2 border-pink-500 pl-3 py-1 text-pink-300/90 text-sm italic">
                                {profile.profile_summary}
                            </div>
                        )}
                        {profile.behavioral_fingerprint && (
                            <div className="mt-3 bg-gray-800/50 rounded p-3">
                                <p className="text-xs text-gray-500 mb-1">Behavioral Fingerprint</p>
                                <p className="text-sm font-mono text-gray-300">{profile.behavioral_fingerprint}</p>
                            </div>
                        )}
                        {profile.attributed_threat_actor && (
                            <div className="mt-3">
                                <p className="text-xs text-gray-500">Attribution Hypothesis</p>
                                <p className="text-sm text-yellow-300 mt-0.5">{profile.attributed_threat_actor}</p>
                            </div>
                        )}
                        {profile.tool_signatures && profile.tool_signatures.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-1">Tool Signatures</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {profile.tool_signatures.map((t, i) => (
                                        <span key={i} className="text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sessions */}
                    {profile.sessions && profile.sessions.length > 0 && (
                        <div className="border border-gray-800 rounded-lg overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/60">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Session History</p>
                            </div>
                            <div className="divide-y divide-gray-800/50">
                                {profile.sessions.map(s => (
                                    <div key={s.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                                        <div>
                                            <span className="font-mono text-xs text-gray-500">{s.id?.slice(-8)}</span>
                                            <span className="ml-3 text-gray-300">{s.primary_intent || '—'}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {s.threat_score != null && (
                                                <span className={`text-xs font-mono ${s.threat_score >= 7 ? 'text-red-400' : s.threat_score >= 4 ? 'text-orange-400' : 'text-green-400'}`}>
                                                    {s.threat_score.toFixed(1)}
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

export default function AttackerProfiles() {
    const [profiles, setProfiles] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getProfiles({ limit: 100 }).then(setProfiles).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleSelect = async (id) => {
        try {
            const detail = await getProfileById(id);
            setSelected(detail);
        } catch (e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <Users size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">Attacker Profiles</h1>
                </div>
                <p className="text-gray-400 text-sm">Persistent dossiers built from all sessions per attacker IP</p>
            </header>

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading profiles...</div>
            ) : profiles.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Users size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No profiles yet. Profiles are built automatically after sessions are analyzed.</p>
                </div>
            ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">IP / Country</th>
                                <th className="px-4 py-3 text-left">ISP / ASN</th>
                                <th className="px-4 py-3 text-left">Skill</th>
                                <th className="px-4 py-3 text-left">Threat Score</th>
                                <th className="px-4 py-3 text-left">Sessions</th>
                                <th className="px-4 py-3 text-left">Attribution</th>
                                <th className="px-4 py-3 text-left">Last Seen</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {profiles.map(p => (
                                <tr key={p.id} className="hover:bg-gray-800/30 transition-colors cursor-pointer" onClick={() => handleSelect(p.id)}>
                                    <td className="px-4 py-3">
                                        <p className="font-mono font-semibold">{p.attacker_ip}</p>
                                        <p className="text-xs text-gray-500">{p.country || '—'}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-xs font-mono truncate max-w-[180px]">{p.isp || '—'}</p>
                                        <p className="text-xs text-gray-500">{p.asn || '—'}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-1.5 py-0.5 rounded border ${SKILL_COLOR[p.skill_level] || 'text-gray-500 border-gray-700'}`}>
                                            {p.skill_level || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 w-36">
                                        <ThreatBar score={p.threat_score} />
                                    </td>
                                    <td className="px-4 py-3 text-center">{p.total_sessions}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate">
                                        {p.attributed_threat_actor || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(p.last_seen).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ChevronRight size={14} className="text-gray-600" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && <ProfileDetail profile={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
