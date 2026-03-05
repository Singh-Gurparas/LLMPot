import React, { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';
import SessionReplay from './SessionReplay';

const getSeverityClass = (severity) => {
    switch (severity) {
        case 'Critical': return 'bg-red-500/20 text-red-500';
        case 'High': return 'bg-orange-500/20 text-orange-500';
        case 'Medium': return 'bg-yellow-500/20 text-yellow-500';
        default: return 'bg-blue-500/20 text-blue-500';
    }
};

export default function AttackDetails({ attack, onClose }) {
    const [showReplay, setShowReplay] = useState(false);

    if (!attack) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm shadow-2xl z-50 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="sticky top-0 bg-gray-900/90 p-6 flex items-center justify-between border-b border-gray-800 backdrop-blur-md">
                    <h2 className="text-xl font-bold">Attack Analysis: {attack.id}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Service</p>
                            <p className="font-semibold">{attack.service}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Classification</p>
                            <p className="font-semibold">{attack.classification}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Severity</p>
                            <span className={"px-2 py-1 rounded text-sm font-semibold inline-block mt-1 " + getSeverityClass(attack.severity)}>
                                {attack.severity}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Source IP / Location</p>
                            <p className="font-mono mt-1">{attack.attacker_ip}</p>
                            {attack.geo && attack.geo.country && (
                                <p className="text-xs text-gray-400 mt-1">{attack.geo.city}, {attack.geo.country}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={() => setShowReplay(true)}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-sm"
                        >
                            <PlayCircle size={18} />
                            <span>View Full Session Replay</span>
                        </button>
                    </div>

                    {attack.report && (
                        <div className="bg-primary-500/10 border border-primary-500/20 p-4 rounded-lg">
                            <h3 className="font-semibold text-primary-400 mb-2">AI Intelligence Report</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-300">Executive Summary:</span>
                                    <p className="mt-1 text-gray-400 leading-relaxed">{attack.report.executive_summary}</p>
                                </div>
                                {attack.report.attack_steps && attack.report.attack_steps.length > 0 && (
                                    <div>
                                        <span className="font-medium text-gray-300">Steps Taken:</span>
                                        <ul className="list-disc pl-5 mt-1 text-gray-400 space-y-1">
                                            {attack.report.attack_steps.map((step, i) => <li key={i}>{step}</li>)}
                                        </ul>
                                    </div>
                                )}
                                <div>
                                    <span className="font-medium text-gray-300">Mitigation:</span>
                                    <p className="mt-1 text-gray-400">{attack.report.mitigation_recommendation}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {attack.payload && (
                        <div>
                            <h3 className="font-semibold mb-2">Threat Payload</h3>
                            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 font-mono text-sm overflow-x-auto text-green-500">
                                <pre>{attack.payload.raw_data}</pre>
                            </div>
                            {attack.payload.hash && (
                                <p className="text-xs text-gray-500 mt-2 font-mono">SHA256: {attack.payload.hash}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showReplay && (
                <SessionReplay
                    sessionId={attack.session_id}
                    onClose={() => setShowReplay(false)}
                />
            )}
        </div>
    );
}
