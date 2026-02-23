import React, { useState } from 'react';
import Navbar from './components/Navbar';
import MapView from './components/MapView';
import POIList from './components/POIList';
import POIDetail from './components/POIDetail';
import AdminPanel from './components/AdminPanel';
import RoutePlanner from './components/RoutePlanner';
import VoiceAssistant from './components/VoiceAssistant';
import { useAppContext } from './context/AppContext';
import { Search, ChevronRight, MapPin, Loader2, AlertCircle, X, Plus, Trash2 } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 10000,
      background: type === 'error' ? '#FF4B4B' : '#4CAF50',
      color: 'white',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '300px',
      animation: 'slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {type === 'error' ? <AlertCircle size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white' }} />}
      <span style={{ fontWeight: '600', flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ color: 'white', opacity: 0.8 }}><X size={18} /></button>
    </div>
  );
};

// Decode OSRM encoded polyline into [[lat,lng], ...] array
const decodePolyline = (encoded) => {
  const coords = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
};

// Fetch full OSRM route with geometry
const fetchOSRMRouteWithGeometry = async (origin, destination, waypoints = []) => {
  try {
    const coords = [
      `${origin.lng},${origin.lat}`,
      ...waypoints.map(w => `${w.lng},${w.lat}`),
      `${destination.lng},${destination.lat}`
    ].join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const geometry = decodePolyline(route.geometry);
      return {
        distance: route.distance,  // meters
        duration: route.duration,  // seconds
        geometry: geometry         // [[lat, lng], ...]
      };
    }
  } catch (err) {
    console.error('OSRM route error:', err);
  }
  return null;
};

// Fetch simple OSRM route (no geometry, for detour calc)
const fetchOSRMRoute = async (originLat, originLng, poiLat, poiLng, destLat, destLng) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${poiLng},${poiLat};${destLng},${destLat}?overview=false`;
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

export { fetchOSRMRoute };

const TravelerDashboard = () => {
  const [search, setSearch] = useState({ origin: '', destination: '', waypoints: [] });
  const { routeDetails, setRouteDetails, setBaseRoute, setTotalRoute, setAddedRoutePoints } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 5000);
  };

  const geocode = async (query) => {
    if (!query) return null;
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Error al conectar con el servidor de geocodificación.');
      const data = await resp.json();
      if (data && data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        const p = data.features[0].properties;
        const name = [p.name, p.city, p.country].filter(Boolean).join(', ');
        return { lat, lng, name: name || query };
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            name: data[0].display_name
          };
        }
      } catch (e) {
        console.error('Fallback geocoding error:', e);
      }
      throw new Error('No se pudo encontrar la ubicación. Revisa tu conexión.');
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const sanitizeCity = (s) => {
    if (!s) return s;
    let r = s.trim();
    // Strip trailing phrases that get caught by accident (e.g. "Madrid y voy", "Madrid y")
    r = r.replace(/\s+y\s+(voy|me dirijo|viajo|salgo).*$/gi, '');
    r = r.replace(/\s+y$/gi, '');

    r = r.replace(/^(estoy saliendo desde|salgo desde|salgo de|vengo desde|vengo de|voy hacia|voy a|me dirijo a|me dirijo hacia|parto desde|parto de|llegando a)\s+/gi, '');
    r = r.replace(/^(desde|hacia|hasta|para|de|a)\s+/gi, '');
    return r.trim();
  };

  const clearRoute = () => {
    setSearch({ origin: '', destination: '', waypoints: [] });
    setRouteDetails({ origin: null, originName: '', destination: null, destinationName: '', waypoints: [] });
    setBaseRoute(null);
    setTotalRoute(null);
    setAddedRoutePoints([]);
  };

  const handleSearch = async (overrideOrigin, overrideDest, overrideWaypoints = null) => {
    let o = search.origin;
    let d = search.destination;
    let w = search.waypoints;

    // Check if arguments were explicitly provided as strings by VoiceAssistant
    if (typeof overrideOrigin === 'string') o = sanitizeCity(overrideOrigin);
    if (typeof overrideDest === 'string') d = sanitizeCity(overrideDest);
    if (Array.isArray(overrideWaypoints)) w = overrideWaypoints.map(sanitizeCity);

    if (overrideOrigin || overrideDest || overrideWaypoints) {
      // Update user-visible inputs as well
      setSearch({ origin: o, destination: d, waypoints: w });
    }

    if (!o || !d) {
      showToast('Por favor, indica origen y destino');
      return;
    }

    setLoading(true);
    setToast({ message: '', type: '' });

    try {
      // Step 1: Geocode Origin
      let originCoords;
      try {
        originCoords = await geocode(o);
        if (!originCoords) throw new Error(`No se encontró el origen: ${o}`);
      } catch (e) {
        showToast(e.message);
        return;
      }

      // Small delay to respect Nominatim's 1 req/sec policy
      await sleep(1100);

      // Step 2: Geocode Destination
      let destCoords;
      try {
        destCoords = await geocode(d);
        if (!destCoords) throw new Error(`No se encontró el destino: ${d}`);
      } catch (e) {
        showToast(e.message);
        return;
      }

      // Step 2.5: Geocode Waypoints
      let waypointsCoords = [];
      for (const wp of w) {
        if (!wp.trim()) continue;
        try {
          const coords = await geocode(wp);
          if (!coords) throw new Error(`No se encontró la parada: ${wp}`);
          waypointsCoords.push(coords);
          await sleep(1100);
        } catch (e) {
          showToast(e.message);
          return;
        }
      }

      setRouteDetails({
        origin: { lat: originCoords.lat, lng: originCoords.lng },
        originName: originCoords.name,
        destination: { lat: destCoords.lat, lng: destCoords.lng },
        destinationName: destCoords.name,
        waypoints: waypointsCoords
      });

      // Step 3: Fetch the full route with geometry from OSRM
      const routeInfo = await fetchOSRMRouteWithGeometry(originCoords, destCoords, waypointsCoords);
      if (routeInfo) {
        setBaseRoute(routeInfo);
        console.log(`Ruta calculada: ${(routeInfo.distance / 1000).toFixed(1)} km`);
      } else {
        showToast('Error al calcular la ruta física. Inténtalo de nuevo.');
      }
    } catch (err) {
      console.error('Search error:', err);
      showToast('Ocurrió un error inesperado al calcular la ruta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: '' })}
      />

      <div className="sidebar-panel">
        {/* Search Section */}
        <div className="card glass-morphism" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={20} color="var(--primary)" />
            ¿A dónde vamos?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Origen (Cualquier lugar de España)"
                style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '15px' }}
                value={search.origin}
                onChange={e => setSearch({ ...search, origin: e.target.value })}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
              />
              <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
            </div>

            {search.waypoints.map((wp, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Parada intermedia"
                    style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '15px' }}
                    value={wp}
                    onChange={e => {
                      const newW = [...search.waypoints];
                      newW[i] = e.target.value;
                      setSearch({ ...search, waypoints: newW });
                    }}
                    onKeyPress={e => e.key === 'Enter' && handleSearch()}
                  />
                  <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                </div>
                <button
                  onClick={() => setSearch({ ...search, waypoints: search.waypoints.filter((_, idx) => idx !== i) })}
                  style={{ padding: '14px', color: '#ef4444', backgroundColor: 'var(--bg-offset)', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <button
              onClick={() => setSearch({ ...search, waypoints: [...search.waypoints, ''] })}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: '600', alignSelf: 'flex-start', padding: '4px 8px', fontSize: '14px' }}
            >
              <Plus size={16} /> Añadir parada
            </button>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Destino"
                style={{ width: '100%', padding: '14px 14px 14px 40px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '15px' }}
                value={search.destination}
                onChange={e => setSearch({ ...search, destination: e.target.value })}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
              />
              <MapPin size={18} color="var(--primary)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
            </div>
            <button
              className="btn-primary"
              style={{ marginTop: '8px', justifyContent: 'center', height: '52px' }}
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="spin" size={18} />
                  Calculando...
                </>
              ) : (
                <>
                  Ver rutas sugeridas
                  <ChevronRight size={18} />
                </>
              )}
            </button>

            {routeDetails?.origin && routeDetails?.destination && (
              <button
                onClick={clearRoute}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#ef4444', fontWeight: '600', padding: '12px', fontSize: '14px', borderRadius: '12px', border: '1px solid #fee2e2', backgroundColor: 'transparent', transition: 'all 0.2s', marginTop: '4px' }}
                className="delete-btn-hover"
              >
                <Trash2 size={16} /> Borrar toda la ruta
              </button>
            )}
          </div>
        </div>

        {/* List Section */}
        <RoutePlanner />
        <POIList />
      </div>

      <div className="map-panel" style={{ position: 'relative' }}>
        <MapView />
      </div>

      <POIDetail />
      <VoiceAssistant onSearchRequest={handleSearch} />
    </div>
  );
};

const App = () => {
  const { userRole } = useAppContext();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Navbar />
      {userRole === 'traveler' ? <TravelerDashboard /> : <AdminPanel />}
    </div>
  );
};

export default App;
