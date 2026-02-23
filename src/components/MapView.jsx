import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppContext } from '../context/AppContext';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { minDistanceToRoute, isPoiForward } from '../utils/geo';
import { addTimeToTime, isPoiOpenAt } from '../utils/time';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const createPoiIcon = (poi, isHovered, isSelected) => {
    return L.divIcon({
        className: `custom-poi-marker ${isHovered ? 'is-hovered' : ''} ${isSelected ? 'is-selected' : ''}`,
        html: `
            <div class="poi-marker-container ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}">
                <img src="${poi.photos[0]}" alt="POI" class="poi-marker-img" />
                <div class="poi-marker-label">
                    <div class="poi-label-name">${poi.name}</div>
                    <div class="poi-label-rating">★ ${poi.rating}</div>
                </div>
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 54],
        popupAnchor: [0, -54]
    });
};

const RoutingMachine = ({ origin, destination, intermediateWaypoints = [], points = [] }) => {
    const map = useMap();
    const routingControlRef = useRef(null);
    const { setTotalRoute } = useAppContext();

    useEffect(() => {
        if (!map || !origin || !destination) return;

        // Clean up previous routing control
        if (routingControlRef.current) {
            try { map.removeControl(routingControlRef.current); } catch (e) { }
            routingControlRef.current = null;
        }

        const waypoints = [
            L.latLng(origin.lat, origin.lng),
            ...intermediateWaypoints.map(w => L.latLng(w.lat, w.lng)),
            ...points.map(p => L.latLng(p.coords[0], p.coords[1])),
            L.latLng(destination.lat, destination.lng)
        ];

        const routingControl = L.Routing.control({
            waypoints: waypoints,
            lineOptions: {
                styles: [{ color: '#FF4D00', weight: 6 }]
            },
            show: false,
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            createMarker: () => null
        }).addTo(map);

        routingControl.on('routesfound', (e) => {
            const routes = e.routes;
            const r = routes[0];
            setTotalRoute({
                distance: r.summary.totalDistance,
                duration: r.summary.totalTime,
                // LRM provides waypointIndices which help split instructions into legs
                // but some providers also give actual legs with durations
                legs: r.instructions.filter(inst => inst.type === 'WaypointReached' || inst.type === 'DestinationReached').map(inst => ({
                    time: inst.time, // cumulative time in seconds
                    distance: inst.distance // cumulative distance in meters
                }))
            });
        });

        routingControlRef.current = routingControl;

        return () => {
            if (routingControlRef.current) {
                try { map.removeControl(routingControlRef.current); } catch (e) { }
                routingControlRef.current = null;
            }
        };
    }, [map, origin, destination, points, setTotalRoute]);

    return null;
};

const MapView = () => {
    const {
        pois, setSelectedPoi, selectedPoi, routeDetails, addedRoutePoints, baseRoute,
        searchRadius, onlyForward, hoveredPoiId, setHoveredPoiId,
        activeFilters, departureTime, totalRoute
    } = useAppContext();
    const [center] = useState([40.416775, -3.703790]);

    const hasRoute = routeDetails.origin && routeDetails.destination && baseRoute;

    // Filter POIs for the map based on the same logic as the list
    const visiblePois = useMemo(() => {
        let filtered = pois;

        if (hasRoute) {
            filtered = filtered.filter(poi => {
                // Distancia a la ruta
                const dist = minDistanceToRoute(poi.coords[0], poi.coords[1], baseRoute.geometry);
                if (dist > searchRadius) return false;

                // Filtro de dirección
                if (onlyForward) {
                    if (!isPoiForward(poi.coords[0], poi.coords[1], routeDetails.origin, routeDetails.destination)) return false;
                }
                return true;
            });
        }

        // Apply shared filters
        if (activeFilters?.openNow) {
            filtered = filtered.filter(poi => {
                let estimatedTime = departureTime;
                if (hasRoute && routeDetails.origin && routeDetails.destination && totalRoute) {
                    const R = 6371e3; // meters
                    const getDistance = (c1, c2) => {
                        const lat1 = c1[0] * Math.PI / 180;
                        const lat2 = c2[0] * Math.PI / 180;
                        const deltaLat = (c2[0] - c1[0]) * Math.PI / 180;
                        const deltaLon = (c2[1] - c1[1]) * Math.PI / 180;
                        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
                        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    };
                    const distOriginToPoi = getDistance([routeDetails.origin.lat, routeDetails.origin.lng], poi.coords);
                    const distOriginToDest = getDistance([routeDetails.origin.lat, routeDetails.origin.lng], [routeDetails.destination.lat, routeDetails.destination.lng]);
                    const ratio = Math.min(1, distOriginToPoi / (distOriginToDest || 1));
                    const estimatedTravelSeconds = Math.floor(totalRoute.duration * ratio);
                    estimatedTime = addTimeToTime(departureTime, estimatedTravelSeconds);
                }
                return isPoiOpenAt(poi, estimatedTime);
            });
        }
        if (activeFilters?.evCharger) {
            filtered = filtered.filter(poi => poi.services?.includes('ev_charger'));
        }
        if (activeFilters?.vegan) {
            filtered = filtered.filter(poi => poi.services?.includes('vegan'));
        }
        if (activeFilters?.wifi) {
            filtered = filtered.filter(poi => poi.services?.includes('wifi'));
        }
        if (activeFilters?.terraza) {
            filtered = filtered.filter(poi => poi.services?.includes('terraza'));
        }
        if (activeFilters?.petFriendly) {
            filtered = filtered.filter(poi => poi.services?.includes('pet_friendly'));
        }
        if (activeFilters?.parking) {
            filtered = filtered.filter(poi => poi.services?.includes('parking'));
        }

        return filtered;
    }, [hasRoute, pois, baseRoute?.geometry, searchRadius, onlyForward, routeDetails.origin, routeDetails.destination, activeFilters, departureTime, totalRoute]);

    return (
        <div style={{ height: '100%', width: '100%', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <MapContainer
                center={center}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                {routeDetails.origin && routeDetails.destination && (
                    <RoutingMachine
                        origin={routeDetails.origin}
                        destination={routeDetails.destination}
                        intermediateWaypoints={routeDetails.waypoints || []}
                        points={addedRoutePoints}
                    />
                )}
                {visiblePois.map(poi => (
                    <Marker
                        key={poi.id}
                        position={poi.coords}
                        icon={createPoiIcon(
                            poi,
                            hoveredPoiId === poi.id,
                            selectedPoi?.id === poi.id
                        )}
                        eventHandlers={{
                            click: () => setSelectedPoi(poi),
                            mouseover: () => setHoveredPoiId(poi.id),
                            mouseout: () => setHoveredPoiId(null)
                        }}
                    />
                ))}
            </MapContainer>
        </div>
    );
};

export default MapView;
