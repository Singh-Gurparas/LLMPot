import React, { useState } from 'react';
import { X, PlayCircle, Shield, Target, Cpu, Globe, Eye, Zap, AlertTriangle } from 'lucide-react';
import SessionReplay from './SessionReplay';

const SEVERITY_CLASS = {
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const SKILL_COLOR = {
    'Script Kiddie': 'text-green-400',
    'Intermediate': 'text-yellow-400',
    'Advanced': 'text-orange-400',
    'Nation-State': 'text-red-500',
};

function Badge({ children, className = '' }) {
    return (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
            {children}
        </span>
    );
}

function Section({ icon: Icon, title, color = 'text-gray-300', children }) {
    return (
        <div className="border border-gray-800 rounded-lg overflow-hidden">
            <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900/60`}>
                {Icon && <Icon size={14} className={color} />}
                <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</span>
            </div>
            <div className="p-4 space-y-3 text-sm">
                {children}
            </div>
        </div>
    );
}

function Row({ label, children, mono = false }) {
    return (
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
            <div className={`text-gray-300 ${mono ? 'font-mono text-xs' : ''}`}>{children}</div>
        </div>
    );
}

function NoveltyBar({ score }) {
    const pct = Math.min(10, Math.max(0, score || 0)) * 10;
    const color = score >= 7 ? '#ef4444' : score >= 4 ? '#f97316' : '#22c55e';
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-xs font-mono font-bold" style={{ color }}>{score}/10</span>
        </div>
    );
}

export default function AttackDetails({ attack, onClose }) {
    const [showReplay, setShowReplay] = useState(false);
    if (!attack) return null;

    const r = attack.report || {};
    const geo = attack.geo || {};
    const intel = attack.ip_intelligence || {};

    const skillLevel = r.skill_level?.split('/')[0]?.split(' — ')[0]?.trim() || r.skill_level;
    const skillColorClass = Object.entries(SKILL_COLOR).find(([k]) => skillLevel?.includes(k))?.[1] || 'text-gray-300';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">

                {/* Header */}
                <div className="sticky top-0 bg-gray-900/95 px-6 py-4 flex items-center justify-between border-b border-gray-800 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={18} className="text-red-400" />
                        <h2 className="text-base font-bold font-mono text-gray-100">Attack #{attack.id?.slice(-8)}</h2>
                        <Badge className={SEVERITY_CLASS[attack.severity] || SEVERITY_CLASS.Low}>
                            {attack.severity}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowReplay(true)}
                            className="flex items-center gap-1.5 text-xs bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-400 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <PlayCircle size={13} />
                            Session Replay
                        </button>
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">

                    {/* Quick facts row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Service', value: attack.service },
                            { label: 'Attack Type', value: attack.classification },
                            { label: 'Endpoint', value: attack.endpoint, mono: true },
                            { label: 'Confidence', value: r.confidence ? `${Math.round(r.confidence * 100)}%` : '—' },
                        ].map(({ label, value, mono }) => (
                            <div key={label} className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                                <p className="text-xs text-gray-500 mb-1">{label}</p>
                                <p className={`text-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
                            </div>
                        ))}
                    </div>

                    {/* Attacker Origin */}
                    <Section icon={Globe} title="Attacker Origin Intelligence" color="text-blue-400">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <Row label="IP Address" mono>{attack.attacker_ip || '—'}</Row>
                            <Row label="Location">{geo.city && geo.country ? `${geo.city}, ${geo.country}` : geo.country || '—'}</Row>
                            <Row label="Continent / TZ">{[geo.continent, geo.timezone].filter(Boolean).join(' · ') || '—'}</Row>
                            <Row label="ISP" mono>{intel.isp || '—'}</Row>
                            <Row label="Organization" mono>{intel.org || '—'}</Row>
                            <Row label="ASN" mono>{intel.asn || '—'}</Row>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {intel.is_proxy && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Proxy / VPN</Badge>}
                            {intel.is_hosting && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Hosting / Datacenter</Badge>}
                            {intel.is_mobile && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Mobile Network</Badge>}
                            {intel.hostname && <Badge className="bg-gray-700/50 text-gray-400 border-gray-600">{intel.hostname}</Badge>}
                            {!intel.is_proxy && !intel.is_hosting && <Badge className="bg-green-500/10 text-green-400 border-green-500/30">Direct / Residential</Badge>}
                        </div>
                    </Section>

                    {r.executive_summary && (
                        <Section icon={Shield} title="Executive Summary" color="text-primary-400">
                            <p className="text-gray-300 leading-relaxed">{r.executive_summary}</p>
                            {r.targeted_cve && r.targeted_cve !== 'No specific CVE / Generic technique' && (
                                <div className="mt-2">
                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-mono">{r.targeted_cve}</Badge>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Tool Fingerprinting */}
                    {(r.tool_fingerprint || r.attacker_tooling || r.automation_assessment) && (
                        <Section icon={Cpu} title="Tool & Technique Fingerprinting" color="text-cyan-400">
                            {r.tool_fingerprint && <Row label="Tool Fingerprint" mono>{r.tool_fingerprint}</Row>}
                            {r.attacker_tooling && <Row label="Full Toolchain">{r.attacker_tooling}</Row>}
                            {r.automation_assessment && <Row label="Automation">{r.automation_assessment}</Row>}
                        </Section>
                    )}

                    {/* Attacker Profile */}
                    {(r.skill_level || r.language_artifacts || r.opsec_quality || r.behavioral_signature || r.attacker_profile) && (
                        <Section icon={Eye} title="Attacker Profile" color="text-pink-400">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {r.skill_level && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Skill Level</p>
                                        <p className={`font-semibold ${skillColorClass}`}>{r.skill_level}</p>
                                    </div>
                                )}
                                {r.opsec_quality && <Row label="OPSEC Quality">{r.opsec_quality}</Row>}
                            </div>
                            {r.language_artifacts && r.language_artifacts !== 'None detected — clean' && (
                                <Row label="Language / Cultural Artifacts">{r.language_artifacts}</Row>
                            )}
                            {r.behavioral_signature && (
                                <Row label="Behavioral Signature">{r.behavioral_signature}</Row>
                            )}
                            {r.attacker_profile && (
                                <div className="border-l-2 border-pink-500 pl-3 py-1 bg-pink-500/5 rounded-r text-pink-300/90 text-sm italic leading-relaxed">
                                    {r.attacker_profile}
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Strategic Intelligence */}
                    {(r.specific_objective || r.novelty_score || r.campaign_hypothesis) && (
                        <Section icon={Target} title="Strategic Intelligence" color="text-yellow-400">
                            {r.specific_objective && <Row label="Specific Objective">{r.specific_objective}</Row>}
                            {r.novelty_score != null && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Novelty Score</p>
                                    <NoveltyBar score={r.novelty_score} />
                                    {r.novelty_explanation && (
                                        <p className="text-gray-400 text-xs mt-1.5">{r.novelty_explanation}</p>
                                    )}
                                </div>
                            )}
                            {r.campaign_hypothesis && <Row label="Campaign / Attribution">{r.campaign_hypothesis}</Row>}
                        </Section>
                    )}

                    {/* Honeypot Intelligence Strategy */}
                    {(r.deception_recommendation || r.next_attack_prediction) && (
                        <Section icon={Zap} title="Honeypot Intelligence Strategy" color="text-emerald-400">
                            {r.deception_recommendation && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Deception Recommendation</p>
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-3 text-emerald-300/90 text-sm leading-relaxed">
                                        {r.deception_recommendation}
                                    </div>
                                </div>
                            )}
                            {r.next_attack_prediction && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Next Attack Prediction</p>
                                    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-3 text-yellow-300/90 text-sm leading-relaxed">
                                        {r.next_attack_prediction}
                                    </div>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* Attack Steps */}
                    {r.attack_steps && r.attack_steps.length > 0 && (
                        <Section icon={Shield} title="Attack Steps" color="text-orange-400">
                            <ol className="space-y-1.5 list-none">
                                {r.attack_steps.map((step, i) => (
                                    <li key={i} className="flex gap-2.5 text-gray-300">
                                        <span className="text-orange-400 font-mono text-xs mt-0.5 w-4 shrink-0">{i + 1}.</span>
                                        <span className="text-sm">{step}</span>
                                    </li>
                                ))}
                            </ol>
                            {r.payload_capabilities && (
                                <div className="mt-3 pt-3 border-t border-gray-800">
                                    <Row label="If Payload Succeeds">{r.payload_capabilities}</Row>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* IoCs */}
                    {r.extracted_iocs && r.extracted_iocs.length > 0 && (
                        <Section icon={AlertTriangle} title="Indicators of Compromise" color="text-orange-400">
                            <ul className="space-y-1">
                                {r.extracted_iocs.map((ioc, i) => (
                                    <li key={i} className="font-mono text-xs text-orange-300/90 bg-orange-400/5 border border-orange-500/20 px-2.5 py-1 rounded">
                                        {ioc}
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    )}

                    {/* Mitigation */}
                    {(r.mitigation_suggestion || r.mitigation_recommendation) && (
                        <Section icon={Shield} title="Recommended Mitigation" color="text-green-400">
                            <p className="text-green-300/90 text-sm bg-green-400/5 border border-green-500/20 rounded p-3 leading-relaxed">
                                {r.mitigation_suggestion || r.mitigation_recommendation}
                            </p>
                        </Section>
                    )}

                    {/* Raw Payload */}
                    {attack.payload?.raw_data && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Raw Captured Payload</p>
                            <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 font-mono text-sm overflow-x-auto text-green-400/90 max-h-40">
                                <pre>{attack.payload.raw_data}</pre>
                            </div>
                            {attack.payload.hash && (
                                <p className="text-xs text-gray-600 mt-1.5 font-mono">SHA256: {attack.payload.hash}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showReplay && (
                <SessionReplay sessionId={attack.session_id} onClose={() => setShowReplay(false)} />
            )}
        </div>
    );
}
