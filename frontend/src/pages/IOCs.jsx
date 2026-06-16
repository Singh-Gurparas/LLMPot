import React, { useEffect, useState } from 'react';
import { getIOCs, getIOCStats } from '../services/api';
import { Search, Copy, Check } from 'lucide-react';

const TYPE_COLOR = {
    ip: 'bg-red-500/10 text-red-400 border-red-500/30',
    domain: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    url: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    user_agent: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    hash: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    command: 'bg-red-600/10 text-red-300 border-red-600/30',
    filename: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    payload_pattern: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
};

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy} className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-500 hover:text-gray-300">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>
    );
}

export default function IOCs() {
    const [iocs, setIOCs] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const fetchData = () => {
        const params = {};
        if (search) params.search = search;
        if (typeFilter) params.ioc_type = typeFilter;
        return getIOCs({ limit: 200, ...params });
    };

    useEffect(() => {
        Promise.all([fetchData(), getIOCStats()])
            .then(([i, s]) => { setIOCs(i); setStats(s); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSearch = async () => {
        const params = { limit: 200 };
        if (search) params.search = search;
        if (typeFilter) params.ioc_type = typeFilter;
        try {
            setIOCs(await getIOCs(params));
        } catch (e) { console.error(e); }
    };

    const types = [...new Set(iocs.map(i => i.type))];

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <Search size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">IOC Database</h1>
                </div>
                <p className="text-gray-400 text-sm">Searchable repository of extracted Indicators of Compromise</p>
            </header>

            {/* Stats pills */}
            {stats.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => { setTypeFilter(''); handleSearch(); }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            !typeFilter ? 'bg-primary-500/20 border-primary-500/50 text-primary-400' : 'border-gray-700 text-gray-400'
                        }`}
                    >
                        All ({iocs.length})
                    </button>
                    {stats.map(s => (
                        <button
                            key={s.type}
                            onClick={() => { setTypeFilter(s.type); }}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                typeFilter === s.type ? 'bg-primary-500/20 border-primary-500/50 text-primary-400' : 'border-gray-700 text-gray-400'
                            }`}
                        >
                            {s.type} ({s.count})
                        </button>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search IOC values..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-gray-300 placeholder:text-gray-600"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-primary-600/20 hover:bg-primary-600/30 border border-primary-500/30 text-primary-400 text-sm rounded-lg transition-colors"
                >
                    Search
                </button>
            </div>

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading IOCs...</div>
            ) : iocs.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <Search size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No IOCs found. They are extracted automatically from attack sessions.</p>
                </div>
            ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-left">Value</th>
                                <th className="px-4 py-3 text-left">Context</th>
                                <th className="px-4 py-3 text-left">Confidence</th>
                                <th className="px-4 py-3 text-left">Seen</th>
                                <th className="px-4 py-3 text-center">Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {iocs.map(i => (
                                <tr key={i.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLOR[i.type] || 'border-gray-700 text-gray-400'}`}>
                                            {i.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-300 max-w-xs truncate">{i.value}</span>
                                            <CopyButton text={i.value} />
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-gray-400 max-w-xs truncate">{i.context || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs font-mono">{Math.round(i.confidence * 100)}%</td>
                                    <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(i.last_seen).toLocaleDateString()}</td>
                                    <td className="px-4 py-2.5 text-center">
                                        <span className="text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">{i.occurrence_count}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
