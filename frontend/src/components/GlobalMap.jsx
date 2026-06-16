import React, { useState } from 'react';
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    ZoomableGroup
} from 'react-simple-maps';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function GlobalMap({ mapData }) {
    const [tooltip, setTooltip] = useState(null);

    if (!mapData || mapData.length === 0) {
        return (
            <div className="glass-panel p-6 h-[420px] flex flex-col items-center justify-center text-gray-500 space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-gray-700 flex items-center justify-center">
                    <span className="text-xs">0</span>
                </div>
                <p className="text-sm">No geolocation data yet</p>
                <p className="text-xs text-gray-600">Attacker origins will appear here</p>
            </div>
        );
    }

    const totalAttacks = mapData.reduce((sum, p) => sum + (p.attacks || 1), 0);

    return (
        <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Global Attack Origins</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
                        {mapData.length} origin{mapData.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-gray-600">·</span>
                    <span>{totalAttacks} total attacks</span>
                </div>
            </div>

            <div
                className="relative rounded-xl overflow-hidden border border-slate-800"
                style={{ height: '340px', background: '#050e1f' }}
            >
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 135, center: [10, 20] }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <ZoomableGroup zoom={1} minZoom={0.7} maxZoom={5}>
                        <Geographies geography={GEO_URL}>
                            {({ geographies }) =>
                                geographies.map(geo => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#0f2644"
                                        stroke="#1a3a64"
                                        strokeWidth={0.4}
                                        style={{
                                            default: { outline: 'none' },
                                            hover: { fill: '#1a3a64', outline: 'none' },
                                            pressed: { outline: 'none' },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>

                        {mapData.map((point, i) => {
                            if (point.lat == null || point.lon == null) return null;
                            const r = Math.max(3.5, Math.min(11, 3.5 + Math.sqrt(point.attacks || 1) * 2.2));
                            return (
                                <Marker
                                    key={`marker-${i}`}
                                    coordinates={[point.lon, point.lat]}
                                    onMouseEnter={() => setTooltip(point)}
                                    onMouseLeave={() => setTooltip(null)}
                                >
                                    {/* Glow ring */}
                                    <circle r={r * 2.4} fill="#ef4444" fillOpacity={0.08} />
                                    {/* Outer pulse ring */}
                                    <circle r={r * 1.5} fill="#ef4444" fillOpacity={0.18} />
                                    {/* Core dot */}
                                    <circle
                                        r={r}
                                        fill="#ef4444"
                                        fillOpacity={0.92}
                                        stroke="#ff6b6b"
                                        strokeWidth={0.8}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </Marker>
                            );
                        })}
                    </ZoomableGroup>
                </ComposableMap>

                {/* Tooltip overlay */}
                {tooltip && (
                    <div className="absolute top-3 right-3 bg-gray-900/95 border border-gray-700 rounded-lg px-3 py-2 text-sm shadow-xl pointer-events-none">
                        <p className="font-semibold text-white">{tooltip.country}</p>
                        <p className="text-red-400 text-xs mt-0.5">{tooltip.attacks} attack{tooltip.attacks !== 1 ? 's' : ''}</p>
                        {tooltip.lat && (
                            <p className="text-gray-500 text-xs font-mono mt-0.5">
                                {tooltip.lat.toFixed(2)}, {tooltip.lon.toFixed(2)}
                            </p>
                        )}
                    </div>
                )}

                {/* Zoom hint */}
                <div className="absolute bottom-2.5 left-3 text-xs text-gray-600 pointer-events-none select-none">
                    Scroll to zoom · Drag to pan
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500/90 inline-block" />
                    Attacker origin (dot size = volume)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-red-500/30 inline-block" />
                    Low activity
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60 inline-block" />
                    High activity
                </span>
            </div>
        </div>
    );
}
