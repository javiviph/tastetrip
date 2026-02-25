import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Trash2, Navigation, Clock, Flag, Info, Timer, ChevronDown } from 'lucide-react';
import { addTimeToTime, subtractTimeFromTime, isPoiOpenAt, formatDisplayDatetime } from '../utils/time';

const RoutePlanner = () => {
    const {
        routeDetails,
        addedRoutePoints,
        removeRoutePoint,
        totalRoute,
        departureTime, setDepartureTime,
        arrivalTime, setArrivalTime,
        setAddedRoutePoints,
        setHoveredPoiId,
        setSelectedPoi
    } = useAppContext();

    const hasRoute = routeDetails.origin && routeDetails.destination;
    const [timeMode, setTimeMode] = useState('departure');

    useEffect(() => {
        if (!totalRoute || !hasRoute) return;
        const expectedDuration = totalRoute.duration + addedRoutePoints.length * 45 * 60;
        if (timeMode === 'departure') {
            const computedArrival = addTimeToTime(departureTime, expectedDuration);
            if (computedArrival !== arrivalTime) setArrivalTime(computedArrival);
        } else {
            const computedDeparture = subtractTimeFromTime(arrivalTime, expectedDuration);
            if (computedDeparture !== departureTime) setDepartureTime(computedDeparture);
        }
    }, [departureTime, arrivalTime, totalRoute?.duration, addedRoutePoints.length, timeMode, hasRoute]);

    const handleDepartureChange = (val) => {
        setDepartureTime(val);
        if (totalRoute) {
            const expectedDuration = totalRoute.duration + addedRoutePoints.length * 45 * 60;
            setArrivalTime(addTimeToTime(val, expectedDuration));
        }
    };

    const handleArrivalChange = (val) => {
        setArrivalTime(val);
        if (totalRoute) {
            const expectedDuration = totalRoute.duration + addedRoutePoints.length * 45 * 60;
            setDepartureTime(subtractTimeFromTime(val, expectedDuration));
        }
    };

    if (!hasRoute) return null;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}min`;
        return `${m} min`;
    };

    const formatDistance = (meters) => {
        return `${(meters / 1000).toFixed(1)} km`;
    };

    // Calculate schedule
    // We assume a 45-minute stay at each point for eating/visiting
    const STAY_TIME = 45 * 60; // seconds

    const stopsWithTimes = addedRoutePoints.map((poi, index) => {
        // Try to get time from LRM legs if available, else estimate
        const legTime = totalRoute?.legs?.[index]?.time || (totalRoute?.duration / (addedRoutePoints.length + 1)) * (index + 1);
        const currentCumulativeDelay = index * STAY_TIME;
        const expectedArrival = addTimeToTime(departureTime, legTime + currentCumulativeDelay);
        const isOpen = isPoiOpenAt(poi, expectedArrival);
        return { ...poi, arrivalTime: expectedArrival, isOpen };
    });

    const citiesWithTimes = (routeDetails.waypoints || []).map((wp, index) => {
        let expectedArrival = departureTime;
        if (totalRoute && routeDetails.origin && routeDetails.destination) {
            const getHaversineDistanceInline = (c1, c2) => {
                const R = 6371e3;
                const lat1 = c1[0] * Math.PI / 180;
                const lat2 = c2[0] * Math.PI / 180;
                const deltaLat = (c2[0] - c1[0]) * Math.PI / 180;
                const deltaLon = (c2[1] - c1[1]) * Math.PI / 180;
                const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };
            const distOriginToPoi = getHaversineDistanceInline([routeDetails.origin.lat, routeDetails.origin.lng], [wp.lat, wp.lng]);
            const distOriginToDest = getHaversineDistanceInline([routeDetails.origin.lat, routeDetails.origin.lng], [routeDetails.destination.lat, routeDetails.destination.lng]);
            const ratio = Math.min(1, distOriginToPoi / (distOriginToDest || 1));
            const estimatedTravelSeconds = Math.floor(totalRoute.duration * ratio);
            expectedArrival = addTimeToTime(departureTime, estimatedTravelSeconds);
        }
        return { ...wp, arrivalTime: expectedArrival };
    });

    const totalDelaySeconds = addedRoutePoints.length * STAY_TIME;
    const finalArrivalTime = totalRoute
        ? addTimeToTime(departureTime, totalRoute.duration + totalDelaySeconds)
        : '--:--';

    return (
        <div className="card glass-morphism" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Navigation size={20} color="var(--primary)" />
                    Resumen itinerario
                </h3>
            </div>

            {/* Summary Box */}
            {totalRoute && (
                <div className="itinerary-summary-grid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Flag size={12} /> Distancia
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>{formatDistance(totalRoute.distance)}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Tiempo de viaje
                        </span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--primary)' }}>{formatTime(totalRoute.duration + totalDelaySeconds)}</span>
                        </div>
                    </div>
                </div>
            )}
            {/* Scheduling Controls */}
            {totalRoute && (
                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column', backgroundColor: 'var(--bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Timer size={16} color="var(--primary)" />
                        <div style={{ position: 'relative' }}>
                            <select
                                value={timeMode}
                                onChange={e => setTimeMode(e.target.value)}
                                style={{
                                    appearance: 'none', backgroundColor: 'transparent', border: 'none',
                                    color: 'var(--text)', fontSize: '14px', fontWeight: '700',
                                    outline: 'none', padding: '0 16px 0 0', margin: 0, cursor: 'pointer',
                                }}
                            >
                                <option value="departure">Marcharé el</option>
                                <option value="arrival">Llegaré el</option>
                            </select>
                            <ChevronDown size={14} color="var(--text)" style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        </div>
                    </div>

                    <input
                        type="datetime-local"
                        value={timeMode === 'departure' ? departureTime : arrivalTime}
                        onChange={(e) => timeMode === 'departure' ? handleDepartureChange(e.target.value) : handleArrivalChange(e.target.value)}
                        style={{
                            border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', padding: '8px 12px', borderRadius: '8px',
                            fontSize: '15px', fontWeight: '600', color: 'var(--primary)', outline: 'none', width: '100%'
                        }}
                    />

                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {timeMode === 'departure' ? (
                            <span>Llegarás <strong style={{ color: 'var(--primary)' }}>{formatDisplayDatetime(arrivalTime, true)}</strong></span>
                        ) : (
                            <span>Sal <strong style={{ color: 'var(--primary)' }}>{formatDisplayDatetime(departureTime, true)}</strong></span>
                        )}
                    </div>
                </div>
            )}

            {/* Stops List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {/* Origin */}
                <div style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '3px solid var(--text-muted)', backgroundColor: 'var(--bg)', zIndex: 2 }} />
                        <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border)', zIndex: 1 }} />
                    </div>
                    <div style={{ paddingBottom: '20px', flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>SALIDA • {formatDisplayDatetime(departureTime)}</div>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{routeDetails.originName || 'Inicio'}</div>
                    </div>
                </div>

                {/* City Waypoints */}
                {citiesWithTimes.map((city, idx) => (
                    <div
                        key={`city-${idx}`}
                        style={{ display: 'flex', gap: '16px', position: 'relative' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f59e0b', zIndex: 2 }} />
                            <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border)', zIndex: 1 }} />
                        </div>

                        <div style={{ paddingBottom: '20px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    flex: 1, padding: '12px', backgroundColor: 'var(--bg-offset)',
                                    borderRadius: '12px', border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>PASO • {formatDisplayDatetime(city.arrivalTime)}</div>
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{city.name}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Added Stops */}
                {stopsWithTimes.map((poi) => (
                    <div
                        key={poi.id}
                        style={{ display: 'flex', gap: '16px', position: 'relative' }}
                        onMouseEnter={() => setHoveredPoiId(poi.id)}
                        onMouseLeave={() => setHoveredPoiId(null)}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', zIndex: 2 }} />
                            <div style={{ width: '2px', flex: 1, backgroundColor: 'var(--border)', zIndex: 1 }} />
                        </div>

                        <div style={{ paddingBottom: '20px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    flex: 1, padding: '12px', backgroundColor: 'var(--bg)',
                                    borderRadius: '12px', border: '1px solid ' + (poi.isOpen ? 'var(--border)' : '#fee2e2'),
                                    cursor: 'pointer', transition: 'var(--transition)'
                                }}
                                    onClick={() => setSelectedPoi(poi)}
                                    className="stop-item-hover"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>LLEGADA • {formatDisplayDatetime(poi.arrivalTime)}</div>
                                        {poi.isOpen ? (
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#10b981' }}>Estará abierto cuando llegues</span>
                                        ) : (
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Info size={12} /> Estará cerrado cuando llegues
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{poi.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estancia estimada: 45 min</div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeRoutePoint(poi.id); }}
                                    style={{ color: '#EF4444', padding: '8px' }}
                                    className="delete-btn-hover"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Destination */}
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '24px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '3px solid var(--primary)', backgroundColor: 'var(--bg)', zIndex: 2 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>LLEGADA • {formatDisplayDatetime(finalArrivalTime)}</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>{routeDetails.destinationName || 'Destino'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoutePlanner;
