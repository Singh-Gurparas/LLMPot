import React, { useEffect, useState } from 'react';
import { getThreatReports, getThreatReportById } from '../services/api';
import { FileText, X, Download, ChevronRight } from 'lucide-react';

const SEV_COLOR = {
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

function ReportDetail({ report, onClose }) {
    const downloadMd = () => {
        if (!report.report_markdown) return;
        const blob = new Blob([report.report_markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `threat_report_${report.id?.slice(-8)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
                <div className="sticky top-0 bg-gray-900/95 px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText size={16} className="text-primary-400" />
                        <span className="font-bold text-sm truncate max-w-md">{report.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${SEV_COLOR[report.severity] || ''}`}>
                            {report.severity}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {report.report_markdown && (
                            <button
                                onClick={downloadMd}
                                className="flex items-center gap-1.5 text-xs bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Download size={12} /> Export Markdown
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full"><X size={18} /></button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Quick stats */}
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: 'Threat Score', value: `${(report.threat_score || 0).toFixed(1)}/10` },
                            { label: 'Attacker IP', value: report.attacker_ip || '—' },
                            { label: 'Country', value: report.country || '—' },
                            { label: 'Generated', value: report.generated_at ? new Date(report.generated_at).toLocaleString() : '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className="text-sm font-semibold mt-0.5 truncate">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Executive Summary */}
                    {report.executive_summary && (
                        <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-4">
                            <p className="text-xs text-primary-400 uppercase tracking-wider mb-2">Executive Summary</p>
                            <p className="text-sm text-gray-300 leading-relaxed">{report.executive_summary}</p>
                        </div>
                    )}

                    {/* Markdown report */}
                    {report.report_markdown && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Full Intelligence Report</p>
                            <div className="bg-gray-950 border border-gray-800 rounded-lg p-5 font-mono text-xs text-green-400/90 overflow-x-auto whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                                {report.report_markdown}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ThreatReports() {
    const [reports, setReports] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getThreatReports({ limit: 100 }).then(setReports).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleSelect = async (id) => {
        try { setSelected(await getThreatReportById(id)); } catch (e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-6">
            <header>
                <div className="flex items-center gap-3 mb-1">
                    <FileText size={22} className="text-primary-400" />
                    <h1 className="text-2xl font-bold">Threat Reports</h1>
                </div>
                <p className="text-gray-400 text-sm">Auto-generated full intelligence reports with MITRE mapping, IOCs, mitigations & export</p>
            </header>

            {loading ? (
                <div className="text-gray-500 text-center py-16">Loading reports...</div>
            ) : reports.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    <p>No reports yet. Reports are generated automatically after session analysis.</p>
                </div>
            ) : (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Title</th>
                                <th className="px-4 py-3 text-left">Severity</th>
                                <th className="px-4 py-3 text-left">Threat Score</th>
                                <th className="px-4 py-3 text-left">Generated</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {reports.map(r => (
                                <tr key={r.id} className="hover:bg-gray-800/30 cursor-pointer transition-colors" onClick={() => handleSelect(r.id)}>
                                    <td className="px-4 py-3">
                                        <p className="font-medium truncate max-w-md">{r.title}</p>
                                        {r.executive_summary && (
                                            <p className="text-xs text-gray-500 truncate max-w-md mt-0.5">{r.executive_summary}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded border ${SEV_COLOR[r.severity] || ''}`}>
                                            {r.severity || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-sm">
                                        <span className={r.threat_score >= 7 ? 'text-red-400' : r.threat_score >= 4 ? 'text-orange-400' : 'text-green-400'}>
                                            {(r.threat_score || 0).toFixed(1)}/10
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {r.generated_at ? new Date(r.generated_at).toLocaleString() : '—'}
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

            {selected && <ReportDetail report={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
