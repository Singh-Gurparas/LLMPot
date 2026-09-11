import React from 'react';

export default function NodeStatus({ nodes }) {
    if (!nodes || nodes.length === 0) {
        return (
            <div className="glass-panel p-6 flex items-center justify-center text-gray-500">
                No active nodes detected.
            </div>
        );
    }

    return (
        <div className="glass-panel overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <div><p className="panel-kicker">Infrastructure health</p><h3 className="text-lg font-semibold mt-1">Active sensors</h3></div>
                <span className="text-xs font-mono text-primary-400">{nodes.length} online</span>
            </div>
            <div className="p-4 space-y-4">
                {nodes.map(n => (
                    <div key={n.id} className="sensor-row bg-gray-900/50 p-4 rounded-lg flex items-center justify-between border border-gray-800/50 hover:border-gray-700 transition-colors">
                        <div>
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${n.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                <h4 className="font-medium text-gray-200">{n.region}</h4>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 font-mono">{n.ip}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 capitalize">{n.status}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Uptime: {Math.floor(n.uptime_seconds / 3600)}h {Math.floor((n.uptime_seconds % 3600) / 60)}m
                            </p>
                        </div>
                    </div>
                ))}
        </div>
        </div >
    );
}
