import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Plus, Crosshair, Trash2, Edit3, Save, X, MapPin, Star } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LocationMarker = ({ setCoords }) => {
    useMapEvents({
        click(e) {
            setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
};

const AdminPanel = () => {
    const { pois, addPoi, updatePoi, deletePoi } = useAppContext();
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        photos: '',
        lat: '',
        lng: '',
        category: 'Gastro',
        address: ''
    });

    const setCoords = ({ lat, lng }) => {
        setFormData(prev => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newPoi = {
            name: formData.name,
            description: formData.description,
            address: formData.address,
            category: formData.category,
            photos: [formData.photos || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
            coords: [parseFloat(formData.lat), parseFloat(formData.lng)],
            rating: 5.0
        };
        addPoi(newPoi);
        setFormData({ name: '', description: '', photos: '', lat: '', lng: '', category: 'Gastro', address: '' });
    };

    const startEdit = (poi) => {
        setEditingId(poi.id);
        setEditData({
            name: poi.name,
            description: poi.description,
            category: poi.category,
            address: poi.address || '',
            rating: poi.rating
        });
    };

    const saveEdit = (id) => {
        updatePoi(id, editData);
        setEditingId(null);
        setEditData({});
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    return (
        <div style={{ padding: '110px 40px 40px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>Panel de Administración</h2>
                <p style={{ color: 'var(--text-muted)' }}>Crea, edita y gestiona los puntos de interés gastronómico.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
                {/* Form */}
                <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                    <h3 style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>Nuevo punto de interés</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontWeight: '600', fontSize: '13px' }}>Nombre</label>
                            <input type="text" required placeholder="Nombre del local"
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '14px' }}
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontWeight: '600', fontSize: '13px' }}>Categoría</label>
                            <select style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '14px' }}
                                value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                <option>Gastro</option>
                                <option>Tradicional</option>
                                <option>Tapas</option>
                                <option>Fusión</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: '600', fontSize: '13px' }}>Dirección</label>
                        <input type="text" placeholder="Calle, Número, Ciudad"
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '14px' }}
                            value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: '600', fontSize: '13px' }}>Descripción</label>
                        <textarea required rows="2" placeholder="Descripción breve..."
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', resize: 'none', fontSize: '14px' }}
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontWeight: '600', fontSize: '13px' }}>Latitud</label>
                            <input type="number" step="any" required placeholder="Haz clic en el mapa"
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '14px' }}
                                value={formData.lat} onChange={e => setFormData({ ...formData, lat: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontWeight: '600', fontSize: '13px' }}>Longitud</label>
                            <input type="number" step="any" required placeholder="Haz clic en el mapa"
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '14px' }}
                                value={formData.lng} onChange={e => setFormData({ ...formData, lng: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontWeight: '600', fontSize: '13px' }}>URL de foto (opcional)</label>
                        <input type="url" placeholder="https://..."
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-offset)', fontSize: '14px' }}
                            value={formData.photos} onChange={e => setFormData({ ...formData, photos: e.target.value })} />
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }}>
                        <Plus size={18} />
                        Crear Punto
                    </button>
                </form>

                {/* Map */}
                <div style={{ height: '100%', minHeight: '500px', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', position: 'relative' }}>
                    <MapContainer center={[40.416775, -3.703790]} zoom={6} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; CARTO'
                        />
                        <LocationMarker setCoords={setCoords} />
                        {formData.lat && formData.lng && (
                            <Marker position={[parseFloat(formData.lat), parseFloat(formData.lng)]} />
                        )}
                        {pois.map(poi => (
                            <Marker key={poi.id} position={poi.coords} />
                        ))}
                    </MapContainer>
                    <div style={{
                        position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000,
                        backgroundColor: 'white', padding: '8px 14px', borderRadius: '10px',
                        border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow)'
                    }}>
                        <Crosshair size={16} color="var(--primary)" />
                        Haz clic en el mapa para seleccionar ubicación
                    </div>
                </div>
            </div>

            {/* POI List - CRUD */}
            <div>
                <h3 style={{ fontWeight: '700', fontSize: '20px', marginBottom: '20px' }}>
                    Puntos registrados ({pois.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {pois.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-offset)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                            No hay puntos de interés registrados. Crea uno arriba.
                        </div>
                    )}
                    {pois.map(poi => (
                        <div key={poi.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px' }}>
                            <img
                                src={poi.photos[0]}
                                alt={poi.name}
                                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {editingId === poi.id ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input type="text" value={editData.name}
                                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px', fontWeight: '700' }}
                                        />
                                        <input type="text" value={editData.description}
                                            onChange={e => setEditData({ ...editData, description: e.target.value })}
                                            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <select value={editData.category}
                                                onChange={e => setEditData({ ...editData, category: e.target.value })}
                                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px' }}>
                                                <option>Gastro</option>
                                                <option>Tradicional</option>
                                                <option>Tapas</option>
                                                <option>Fusión</option>
                                            </select>
                                            <input type="text" value={editData.address} placeholder="Dirección"
                                                onChange={e => setEditData({ ...editData, address: e.target.value })}
                                                style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', flex: 1 }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{poi.name}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
                                            <MapPin size={13} />
                                            <span>{poi.address || 'Sin dirección'}</span>
                                            <span>•</span>
                                            <span>{poi.category}</span>
                                            <span>•</span>
                                            <Star size={13} fill="var(--accent)" color="var(--accent)" />
                                            <span>{poi.rating}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {poi.coords[0].toFixed(4)}, {poi.coords[1].toFixed(4)}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                {editingId === poi.id ? (
                                    <>
                                        <button onClick={() => saveEdit(poi.id)}
                                            style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#22c55e', color: 'white' }}>
                                            <Save size={18} />
                                        </button>
                                        <button onClick={cancelEdit}
                                            style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-offset)', border: '1px solid var(--border)' }}>
                                            <X size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(poi)}
                                            style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-offset)', border: '1px solid var(--border)' }}
                                            title="Editar">
                                            <Edit3 size={18} />
                                        </button>
                                        <button onClick={() => {
                                            if (window.confirm(`¿Eliminar "${poi.name}"?`)) {
                                                deletePoi(poi.id);
                                            }
                                        }}
                                            style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }}
                                            title="Eliminar">
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
