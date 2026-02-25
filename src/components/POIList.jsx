import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Star, MapPin, Clock, AlertCircle, Route, Loader, SlidersHorizontal, Leaf, Zap, Wifi, Timer, Navigation, Dog, Coffee } from 'lucide-react';
import { minDistanceToRoute, isPoiForward } from '../utils/geo';
import { addTimeToTime, subtractTimeFromTime, isPoiOpenAt } from '../utils/time';

// Fetch OSRM detour route: origin -> POI -> destination
const fetchDetourRoute = async (origin, poiCoords, destination) => {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${poiCoords[1]},${poiCoords[0]};${destination.lng},${destination.lat}?overview=false`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            return {
                distance: data.routes[0].distance,
                duration: data.routes[0].duration
            };
        }
    } catch (err) {
        console.error('OSRM detour error:', err);
    }
    return null;
};

// Slider steps: non-linear for better UX (fine control at low values)
const SLIDER_MIN = 5;
const SLIDER_MAX = 100;
const SLIDER_DEFAULT = 30;

const POIList = () => {
    const {
        pois, setSelectedPoi, routeDetails, baseRoute, totalRoute, addedRoutePoints,
        searchRadius, setSearchRadius, onlyForward, setOnlyForward,
        setHoveredPoiId, departureTime, setDepartureTime,
        activeFilters, setActiveFilters
    } = useAppContext();
    const hasRoute = routeDetails.origin && routeDetails.destination && baseRoute;

    const [detourData, setDetourData] = useState({});
    const [loadingDetours, setLoadingDetours] = useState(false);
    const [poiDistances, setPoiDistances] = useState({});

    // Helper to calculate haversine distance in meters for estimating POI arrival time
    const getHaversineDistance = (coords1, coords2) => {
        const R = 6371e3; // meters
        const lat1 = coords1[0] * Math.PI / 180;
        const lat2 = coords2[0] * Math.PI / 180;
        const deltaLat = (coords2[0] - coords1[0]) * Math.PI / 180;
        const deltaLon = (coords2[1] - coords1[1]) * Math.PI / 180;
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const toggleFilter = (key) => {
        setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };


    // Calculate distances from each POI to the real route geometry
    useEffect(() => {
        if (!hasRoute || !baseRoute?.geometry) {
            setPoiDistances({});
            return;
        }

        const distances = {};
        for (const poi of pois) {
            const dist = minDistanceToRoute(poi.coords[0], poi.coords[1], baseRoute.geometry);
            distances[poi.id] = dist;
        }
        setPoiDistances(distances);
    }, [hasRoute, baseRoute?.geometry, pois]);

    // Filter and sort POIs by proximity and direction
    const nearbyPois = useMemo(() => {
        let filtered = pois;

        if (hasRoute) {
            filtered = filtered.filter(poi => {
                // 1. Distance filter
                const isClose = (poiDistances[poi.id] ?? Infinity) <= searchRadius;
                if (!isClose) return false;

                // 2. Direction filter (vectorial) - only if toggled
                if (onlyForward) {
                    if (!isPoiForward(poi.coords[0], poi.coords[1], routeDetails.origin, routeDetails.destination)) return false;
                }
                return true;
            });
        }

        // Apply shared filters
        if (activeFilters.openNow) {
            filtered = filtered.filter(poi => {
                let estimatedTime = departureTime;
                if (hasRoute && routeDetails.origin && routeDetails.destination && totalRoute) {
                    const distOriginToPoi = getHaversineDistance([routeDetails.origin.lat, routeDetails.origin.lng], poi.coords);
                    const distOriginToDest = getHaversineDistance([routeDetails.origin.lat, routeDetails.origin.lng], [routeDetails.destination.lat, routeDetails.destination.lng]);
                    const ratio = Math.min(1, distOriginToPoi / (distOriginToDest || 1));
                    const estimatedTravelSeconds = Math.floor(totalRoute.duration * ratio);
                    estimatedTime = addTimeToTime(departureTime, estimatedTravelSeconds);
                }
                return isPoiOpenAt(poi, estimatedTime);
            });
        }
        if (activeFilters.evCharger) {

            filtered = filtered.filter(poi => poi.services?.includes('ev_charger'));
        }
        if (activeFilters.vegan) {
            filtered = filtered.filter(poi => poi.services?.includes('vegan'));
        }
        if (activeFilters.wifi) {
            filtered = filtered.filter(poi => poi.services?.includes('wifi'));
        }
        if (activeFilters.terraza) {
            filtered = filtered.filter(poi => poi.services?.includes('terraza'));
        }
        if (activeFilters.petFriendly) {
            filtered = filtered.filter(poi => poi.services?.includes('pet_friendly'));
        }
        if (activeFilters.parking) {
            filtered = filtered.filter(poi => poi.services?.includes('parking'));
        }


        if (hasRoute) {
            return filtered.sort((a, b) => (poiDistances[a.id] ?? Infinity) - (poiDistances[b.id] ?? Infinity));
        }
        return filtered;
    }, [hasRoute, pois, poiDistances, searchRadius, onlyForward, routeDetails.origin, routeDetails.destination, activeFilters, departureTime]);

    // Calculate real detours via OSRM for nearby POIs
    useEffect(() => {
        if (!hasRoute || nearbyPois.length === 0) {
            setDetourData({});
            return;
        }

        const poisToCalc = nearbyPois.filter(p => !detourData[p.id]);
        if (poisToCalc.length === 0) return;

        let cancelled = false;
        const calculateDetours = async () => {
            setLoadingDetours(true);
            const results = { ...detourData };

            for (const poi of poisToCalc) {
                if (cancelled) break;
                const detourRoute = await fetchDetourRoute(
                    routeDetails.origin,
                    poi.coords,
                    routeDetails.destination
                );
                if (detourRoute && baseRoute) {
                    const extraDistance = detourRoute.distance - baseRoute.distance;
                    const extraDuration = detourRoute.duration - baseRoute.duration;
                    results[poi.id] = {
                        extraKm: Math.max(0, extraDistance / 1000).toFixed(1),
                        extraMin: Math.max(0, Math.round(extraDuration / 60))
                    };
                }
            }

            if (!cancelled) {
                setDetourData(results);
                setLoadingDetours(false);
            }
        };

        calculateDetours();
        return () => { cancelled = true; };
    }, [hasRoute, nearbyPois.map(p => p.id).join(','), baseRoute?.distance]);

    // Reset detour data when route changes
    useEffect(() => {
        setDetourData({});
    }, [routeDetails.origin?.lat, routeDetails.destination?.lat]);

    const displayPois = nearbyPois;

    // Slider progress
    const sliderProgress = ((searchRadius - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                    {hasRoute ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Route size={18} color="var(--primary)" />
                            Paradas recomendadas ({nearbyPois.length})
                        </span>
                    ) : 'Puntos de interés disponibles'}
                </h3>
                {loadingDetours && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <Loader size={14} className="spin" />
                        Calculando...
                    </div>
                )}
            </div>

            {/* Smart Filters & Time Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => toggleFilter('openNow')} style={{
                        padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeFilters.openNow ? 'var(--primary)' : 'var(--bg-offset)',
                        color: activeFilters.openNow ? 'white' : 'var(--text)',
                        border: '1px solid ' + (activeFilters.openNow ? 'var(--primary)' : 'var(--border)'),
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Clock size={14} /> Abierto
                    </button>
                    <button onClick={() => toggleFilter('evCharger')} style={{
                        padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeFilters.evCharger ? '#10b981' : 'var(--bg-offset)',
                        color: activeFilters.evCharger ? 'white' : 'var(--text)',
                        border: '1px solid ' + (activeFilters.evCharger ? '#10b981' : 'var(--border)'),
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Zap size={14} /> Carga EV
                    </button>
                    <button onClick={() => toggleFilter('vegan')} style={{
                        padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeFilters.vegan ? '#84cc16' : 'var(--bg-offset)',
                        color: activeFilters.vegan ? 'white' : 'var(--text)',
                        border: '1px solid ' + (activeFilters.vegan ? '#84cc16' : 'var(--border)'),
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Leaf size={14} /> Vegano
                    </button>
                    <button onClick={() => toggleFilter('wifi')} style={{
                        padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeFilters.wifi ? '#3b82f6' : 'var(--bg-offset)',
                        color: activeFilters.wifi ? 'white' : 'var(--text)',
                        border: '1px solid ' + (activeFilters.wifi ? '#3b82f6' : 'var(--border)'),
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Wifi size={14} /> WiFi
                    </button>
                    <button onClick={() => toggleFilter('terraza')} style={{
                        padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeFilters.terraza ? '#f59e0b' : 'var(--bg-offset)',
                        color: activeFilters.terraza ? 'white' : 'var(--text)',
                        border: '1px solid ' + (activeFilters.terraza ? '#f59e0b' : 'var(--border)'),
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Coffee size={14} /> Terraza
                    </button>
                    <button onClick={() => toggleFilter('petFriendly')} style={{
                        padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                        backgroundColor: activeFilters.petFriendly ? '#6366f1' : 'var(--bg-offset)',
                        color: activeFilters.petFriendly ? 'white' : 'var(--text)',
                        border: '1px solid ' + (activeFilters.petFriendly ? '#6366f1' : 'var(--border)'),
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <Dog size={14} /> Pet Friendly
                    </button>
                </div>
            </div>

            {/* Controls — only visible when route is active */}
            {hasRoute && (
                <div style={{
                    padding: '20px', backgroundColor: 'var(--bg-offset)', borderRadius: '16px', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    {/* Proximity Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                                <SlidersHorizontal size={15} color="var(--primary)" />
                                Radio de búsqueda
                            </div>
                            <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                {searchRadius} km
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={5} value={searchRadius}
                                onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                                style={{
                                    width: '100%', height: '6px', appearance: 'none', borderRadius: '3px', outline: 'none',
                                    background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${sliderProgress}%, var(--border) ${sliderProgress}%, var(--border) 100%)`
                                }}
                            />
                        </div>
                    </div>

                    {/* Directional Filter Toggle */}
                    <div
                        onClick={() => setOnlyForward(!onlyForward)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)', cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <div style={{
                                width: '32px', height: '18px', borderRadius: '10px',
                                backgroundColor: onlyForward ? 'var(--primary)' : '#ccc',
                                position: 'relative', transition: '0.3s'
                            }}>
                                <div style={{
                                    width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white',
                                    position: 'absolute', top: '2px', left: onlyForward ? '16px' : '2px',
                                    transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                            </div>
                            <span style={{ fontWeight: onlyForward ? '600' : '400' }}>Solo en sentido del viaje</span>
                        </div>
                    </div>
                </div>
            )}

            {/* POI List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {displayPois.length > 0 ? (
                    displayPois.map(poi => {
                        const detour = detourData[poi.id];
                        const distFromRoute = poiDistances[poi.id];

                        let estimatedTime = departureTime;
                        if (hasRoute && routeDetails.origin && routeDetails.destination && totalRoute) {
                            const getHaversineDistanceInline = (c1, c2) => {
                                const R = 6371e3;
                                const lat1 = c1[0] * Math.PI / 180;
                                const lat2 = c2[0] * Math.PI / 180;
                                const deltaLat = (c2[0] - c1[0]) * Math.PI / 180;
                                const deltaLon = (c2[1] - c1[1]) * Math.PI / 180;
                                const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
                                return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            };
                            const distOriginToPoi = getHaversineDistanceInline([routeDetails.origin.lat, routeDetails.origin.lng], poi.coords);
                            const distOriginToDest = getHaversineDistanceInline([routeDetails.origin.lat, routeDetails.origin.lng], [routeDetails.destination.lat, routeDetails.destination.lng]);
                            const ratio = Math.min(1, distOriginToPoi / (distOriginToDest || 1));
                            const estimatedTravelSeconds = Math.floor(totalRoute.duration * ratio);
                            estimatedTime = addTimeToTime(departureTime, estimatedTravelSeconds);
                        }
                        const isOpen = isPoiOpenAt(poi, estimatedTime);
                        return (
                            <div
                                key={poi.id} className="poi-card"
                                onClick={() => setSelectedPoi(poi)}
                                onMouseEnter={() => setHoveredPoiId(poi.id)} onMouseLeave={() => setHoveredPoiId(null)}
                                style={{ cursor: 'pointer', display: 'flex', gap: '16px', transition: 'all 0.2s ease' }}
                            >
                                <div style={{ position: 'relative' }}>
                                    <img src={poi.photos[0]} alt={poi.name} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px' }} />
                                    {isOpen ? (
                                        <div style={{ position: 'absolute', bottom: '6px', left: '6px', backgroundColor: '#10b981', color: 'white', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>ABIERTO</div>
                                    ) : (
                                        <div style={{ position: 'absolute', bottom: '6px', left: '6px', backgroundColor: '#ef4444', color: 'white', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>CERRADO</div>
                                    )}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{poi.name}</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Star size={12} fill="var(--accent)" color="var(--accent)" />
                                            {poi.rating}
                                        </div>
                                        <span>•</span>
                                        <span>{poi.category}</span>
                                        {poi.services?.includes('ev_charger') && <Zap size={12} color="#10b981" />}
                                        {poi.services?.includes('vegan') && <Leaf size={12} color="#84cc16" />}
                                    </div>

                                    {hasRoute && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                                            {detour ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: '700' }}>
                                                    <Clock size={13} /> +{detour.extraMin} min
                                                </div>
                                            ) : loadingDetours ? (
                                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>Calculando...</div>
                                            ) : null}
                                            {distFromRoute != null && (
                                                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{distFromRoute.toFixed(1)} km desvío</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={32} />
                        <p>No se encontraron resultados con estos filtros.</p>
                        <button onClick={() => { setActiveFilters({ openNow: false, evCharger: false, vegan: false, wifi: false, terraza: false, petFriendly: false, parking: false }); setSearchRadius(100); }} style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '14px' }}>Limpiar filtros</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default POIList;
