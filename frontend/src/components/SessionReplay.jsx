import React, { useEffect, useState } from 'react';
import { getSessionReplay } from '../services/api';
import { X, Clock, Server, ArrowRight } from 'lucide-react';

export default function SessionReplay({ sessionId, onClose }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReplay = async () => {
            try {
                const data = await getSessionReplay(sessionId);
                setSession(data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch replay data", err);
                setLoading(false);
            }
        };
        if (sessionId) fetchReplay();
    }, [sessionId]);

    if (!sessionId) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/90">
                    <h2 className="text-xl font-bold font-mono text-primary-400">SESSION REPLAY: {sessionId}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-500">
                            Loading timeline...
                        </div>
                    ) : session ? (
                        <>
                            <div className="bg-gray-900/50 p-4 rounded-lg flex items-center justify-between border border-gray-800">
                                <div className="flex items-center space-x-2">
                                    <Server className="text-accent-500" size={20} />
                                    <span className="font-mono text-gray-300">{session.attacker_ip}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-gray-400">
                                    <Clock size={16} />
                                    <span>{new Date(session.start_time).toLocaleString()} - {session.end_time ? new Date(session.end_time).toLocaleString() : 'Ongoing'}</span>
                                </div>
                            </div>

                            <div className="relative border-l border-gray-800 ml-4 space-y-8 pb-8">
                                {session.events.map((e, idx) => (
                                    <div key={idx} className="relative pl-8">
                                        <div className="absolute -left-2 top-2 w-4 h-4 rounded-full bg-primary-500 ring-4 ring-gray-950"></div>
                                        <div className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="font-mono text-xs text-gray-400">
                                                    {new Date(e.timestamp).toISOString()}
                                                </div>
                                                <div className="bg-gray-900 px-2 py-1 rounded text-xs font-mono text-gray-500">
                                                    Target Port: {e.port}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono overflow-x-auto">
                                                <div className="bg-blue-900/10 border border-blue-900/30 p-3 rounded text-blue-400">
                                                    <div className="font-bold flex items-center mb-2">
                                                        <span>ATTACKER REQUEST</span>
                                                        <ArrowRight size={14} className="ml-2 inline" />
                                                    </div>
                                                    <div><span className="font-bold">{e.request.method}</span> {e.request.path}</div>
                                                    {e.request.body && <pre className="mt-2 text-xs opacity-80 whitespace-pre-wrap break-all">{e.request.body}</pre>}
                                                </div>
                                                <div className="bg-green-900/10 border border-green-900/30 p-3 rounded text-green-400">
                                                    <div className="font-bold mb-2">HONEYPOT RESPONSE</div>
                                                    <div>Status: <span className={e.response.status >= 400 ? 'text-red-400' : 'text-green-400'}>{e.response.status}</span></div>
                                                    {e.response.body && <pre className="mt-2 text-xs opacity-80 whitespace-pre-wrap break-all limit-lines">{e.response.body.substring(0, 250)}{e.response.body.length > 250 ? '...' : ''}</pre>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-500">No session data found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
