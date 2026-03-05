import React, { useEffect, useState } from 'react';
import { getAnalyticsOverview, getAttacks, getNodes, getAttackDetails } from '../services/api';
import StatsCards from '../components/StatsCards';
import GlobalMap from '../components/GlobalMap';
import AttackFeed from '../components/AttackFeed';
import NodeStatus from '../components/NodeStatus';
import AttackDetails from '../components/AttackDetails';
import { Activity } from 'lucide-react';

export default function Dashboard() {
    const [metrics, setMetrics] = useState(null);
    const [mapData, setMapData] = useState([]);
    const [attacks, setAttacks] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [selectedAttack, setSelectedAttack] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const overview = await getAnalyticsOverview();
            setMetrics(overview.metrics);
            setMapData(overview.map_data);

            const recentAttacks = await getAttacks({ limit: 50 });
            setAttacks(recentAttacks);

            const activeNodes = await getNodes();
            setNodes(activeNodes);

            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Poll every 5 seconds for real-time feel
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSelectAttack = async (id) => {
        try {
            const details = await getAttackDetails(id);
            setSelectedAttack(details);
        } catch (error) {
            console.error("Failed to fetch attack details:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-3 text-primary-500">
                    <Activity className="animate-spin" size={32} />
                    <span className="text-xl font-bold tracking-widest">INITIALIZING LLMPOT SENSORS...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                        LLMPot Global Overview
                    </h1>
                    <p className="text-gray-400 mt-2 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
                        Real-time Threat Intelligence Network Active
                    </p>
                </div>
            </header>

            <StatsCards metrics={metrics} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <GlobalMap mapData={mapData} />
                    <AttackFeed attacks={attacks} onSelectAttack={handleSelectAttack} />
                </div>
                <div className="space-y-8">
                    <NodeStatus nodes={nodes} />

                    {/* Top Attack Types Panel */}
                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Threat Vectors</h3>
                        <div className="space-y-3">
                            {metrics && attacks && attacks.length > 0 ? (
                                attacks.slice(0, 5).map((a, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-800 pb-2">
                                        <span className="text-gray-300">{a.classification}</span>
                                        <span className={`font-mono ${a.severity === 'Critical' ? 'text-red-500' : 'text-orange-400'}`}>
                                            {a.severity}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm">Waiting for telemetry...</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {
                selectedAttack && (
                    <AttackDetails attack={selectedAttack} onClose={() => setSelectedAttack(null)} />
                )
            }
        </div >
    );
}
