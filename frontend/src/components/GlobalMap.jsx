import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';

export default function GlobalMap({ mapData }) {
    // A simplified map visualization using Recharts ScatterPlot for locations
    // In a fully-blown prod app, you might use Leaflet or react-simple-maps.
    // Here we map Lat/Lon to X/Y.

    if (!mapData || mapData.length === 0) {
        return (
            <div className="glass-panel p-6 h-[400px] flex items-center justify-center text-gray-500">
                No geolocation data available.
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-xl text-sm">
                    <p className="font-bold">{data.country}</p>
                    <p className="text-gray-400">Attacks: {data.attacks}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-6">Global Attack Origins</h3>
            <div className="h-[300px] w-full bg-blue-900/10 rounded-xl relative overflow-hidden">
                {/* Simplified Map Background via CSS/SVG or just context */}
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        {/* Domain roughly maps to World Lat/Lon bounds */}
                        <XAxis type="number" dataKey="lon" name="Longitude" domain={[-180, 180]} hide />
                        <YAxis type="number" dataKey="lat" name="Latitude" domain={[-90, 90]} hide />
                        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name="Attacks" data={mapData} fill="#ef4444" shape="circle">
                            {
                                mapData.map((entry, index) => {
                                    // Scale dot size by attacks count (capped)
                                    const size = Math.min(100 + (entry.attacks * 10), 1000);
                                    return <circle key={`cell-${index}`} r={Math.sqrt(size) / 2} opacity={0.7} className="animate-pulse" />
                                })
                            }
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
                <div className="absolute bottom-4 left-4 text-xs text-gray-500 pointer-events-none">
                    * Simplified Coordinate Map
                </div>
            </div>
        </div>
    );
}
