import React, { useEffect, useState } from 'react';
import { getMitigations, getMitigationById } from '../services/api';
import { Shield, X, Copy, Check, ChevronRight } from 'lucide-react';

const PRIORITY_COLOR = {
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function CodeBlock({ label, code }) {
    const [copied, setCopied] = useState(false);
    if (!code) return null;
    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs font-mono text-green-400/90 overflow-x-auto whitespace-pre-wrap">{code}</pre>
        </div>
    );
}

function MitigationDetail({ mitigation, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-900/95 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield size={16} className="text-green-400" />
                        <span className="font-mono font-semibold">{mitigation.attacker_ip}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${PRIORITY_COLOR[mitigation.priority] || ''}`}>
                            {mitigation.priority}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-5">
                    {mitigation.recommendation_summary && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                            <p className="text-sm text-green-300/90">{mitigation.recommendation_summary}</p>
                        </div>
                    )}
                    <CodeBlock label="iptables Rule" code={mitigation.iptables_rule} />
                    <CodeBlock label="nftables Rule" code={mitigation.nftables_rule} />
                    <CodeBlock label="Fail2Ban Filter" code={mitigation.fail2ban_filter} />
                    <CodeBlock label="WAF Rule (ModSecurity)" code={mitigation.waf_rule} />
                    <CodeBlock label="Suricata Rule" code={mitigation.suricata_rule} />
                    <CodeBlock label="Sigma Rule" code={mitigation.sigma_rule} />
                    <CodeBlock label="YARA Rule" code={mitigation.yara_rule} />
                </div>
            </div>
        </div>
    );
}

export default function Mitigations() {
    const [mitigations, setMitigations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMitigations({ limit: 100 }).then(setMitigations).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleSelect = async (id) => {
        try { setSelected(await getMitigationById(id)); } catch (e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <Shield size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">Mitigation Rules</h1>
                </div>
                <p className="text-gray-400 text-sm">Auto-generated iptables, Fail2Ban, Suricata, Sigma, YARA, and WAF rules for each attacker</p>
            </header>

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading mitigations...</div>
            ) : mitigations.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Shield size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No mitigation rules yet. Rules are generated automatically during session analysis.</p>
                </div>
            ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Attacker IP</th>
                                <th className="px-4 py-3 text-left">Priority</th>
                                <th className="px-4 py-3 text-left">Summary</th>
                                <th className="px-4 py-3 text-left">Generated</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {mitigations.map(m => (
                                <tr key={m.id} className="hover:bg-gray-800/30 cursor-pointer transition-colors" onClick={() => handleSelect(m.id)}>
                                    <td className="px-4 py-3 font-mono text-sm">{m.attacker_ip}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded border ${PRIORITY_COLOR[m.priority] || ''}`}>
                                            {m.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                                        {m.recommendation_summary || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(m.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3"><ChevronRight size={14} className="text-gray-600" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && <MitigationDetail mitigation={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
