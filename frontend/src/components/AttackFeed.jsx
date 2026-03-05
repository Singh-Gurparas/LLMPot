import React from 'react';

const getSeverityClass = (severity) => {
    switch (severity) {
        case 'Critical': return 'bg-red-500/20 text-red-500';
        case 'High': return 'bg-orange-500/20 text-orange-500';
        case 'Medium': return 'bg-yellow-500/20 text-yellow-500';
        default: return 'bg-blue-500/20 text-blue-500';
    }
};

export default function AttackFeed({ attacks, onSelectAttack }) {
    if (!attacks || attacks.length === 0) {
        return <div className="p-4 text-center text-gray-500">No recent attacks</div>;
    }

    return (
        <div className="glass-panel overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold">Real-time Attack Feed</h3>
            </div>
            <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/50 text-gray-400 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 font-medium">Time</th>
                            <th className="px-6 py-3 font-medium">Service</th>
                            <th className="px-6 py-3 font-medium">Type</th>
                            <th className="px-6 py-3 font-medium">Severity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {attacks.map((a) => (
                            <tr
                                key={a.id}
                                onClick={() => onSelectAttack(a.id)}
                                className="cursor-pointer hover:bg-gray-800/30 transition-colors"
                            >
                                <td className="px-6 py-3 whitespace-nowrap">
                                    {new Date(a.created_at).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-3">{a.service}</td>
                                <td className="px-6 py-3">{a.classification}</td>
                                <td className="px-6 py-3">
                                    <span className={"px-2 py-1 rounded text-xs font-semibold " + getSeverityClass(a.severity)}>
                                        {a.severity}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
