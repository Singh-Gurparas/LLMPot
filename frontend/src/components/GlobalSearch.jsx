import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { getAttacks, getCampaigns, getIOCs, getNodes } from '../services/api';

export default function GlobalSearch({ open, onClose }) {
    const [query, setQuery] = useState('');
    const [data, setData] = useState({ attacks: [], campaigns: [], iocs: [], nodes: [] });
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (!open) return undefined;
        setQuery(''); setLoading(true);
        Promise.all([getAttacks({ limit: 40 }), getCampaigns({ limit: 40 }), getIOCs({ limit: 40 }), getNodes()])
            .then(([attacks, campaigns, iocs, nodes]) => setData({ attacks, campaigns, iocs, nodes }))
            .catch(console.error).finally(() => setLoading(false));
        const escape = event => event.key === 'Escape' && onClose(); window.addEventListener('keydown', escape);
        return () => window.removeEventListener('keydown', escape);
    }, [open, onClose]);
    const results = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return [];
        const match = value => String(value || '').toLowerCase().includes(term);
        return [
            ...data.attacks.filter(item => [item.attacker_ip, item.classification, item.country, item.service].some(match)).slice(0, 5).map(item => ({ type: 'Attack', label: item.classification || 'Unclassified attack', detail: item.attacker_ip || item.country || 'Unknown source', to: `/attacks?selected=${item.id}` })),
            ...data.campaigns.filter(item => [item.name, item.primary_objective, item.threat_level].some(match)).slice(0, 5).map(item => ({ type: 'Campaign', label: item.name, detail: item.threat_level || 'No threat level', to: `/campaigns?selected=${item.id}` })),
            ...data.iocs.filter(item => [item.value, item.indicator, item.type].some(match)).slice(0, 5).map(item => ({ type: 'IOC', label: item.value || item.indicator || 'IOC', detail: item.type || 'Indicator', to: `/iocs?q=${encodeURIComponent(item.value || item.indicator || '')}` })),
            ...data.nodes.filter(item => [item.region, item.ip, item.status].some(match)).slice(0, 5).map(item => ({ type: 'Sensor', label: item.region || item.ip || 'LLMPot sensor', detail: item.status || 'Unknown status', to: '/sensors' })),
        ];
    }, [data, query]);
    if (!open) return null;
    return <div className="global-search-backdrop" onMouseDown={onClose}><section className="global-search smoked-panel" onMouseDown={event => event.stopPropagation()}><div className="search-input"><Search size={17}/><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search attacks, IPs, campaigns, sensors, IOCs…" /><button aria-label="Close search" onClick={onClose}><X size={17}/></button></div>{loading ? <p className="search-state">Loading available intelligence…</p> : !query ? <p className="search-state">Search across records currently available to LLMPot.</p> : results.length ? <div className="search-results">{results.map((result, index) => <Link to={result.to} onClick={onClose} key={`${result.type}-${index}`}><span>{result.type}</span><b>{result.label}</b><small>{result.detail}</small></Link>)}</div> : <p className="search-state">No matching records were found.</p>}</section></div>;
}
