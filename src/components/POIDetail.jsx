import React from 'react';
import { useAppContext } from '../context/AppContext';
import { X, Star, MapPin, Navigation, CheckCircle } from 'lucide-react';

const POIDetail = () => {
    const { selectedPoi, setSelectedPoi, addedRoutePoints, setAddedRoutePoints, routeDetails } = useAppContext();

    if (!selectedPoi) return null;

    const isAlreadyAdded = addedRoutePoints.some(p => p.id === selectedPoi.id);
    const hasRoute = routeDetails.origin && routeDetails.destination;

    return (
        <>
            {/* Overlay backdrop */}
            <div
                onClick={() => setSelectedPoi(null)}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    zIndex: 1999
                }}
            />
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90%',
                maxWidth: '600px',
                backgroundColor: 'var(--bg)',
                borderRadius: '24px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                zIndex: 2000,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
            }}>
                <div style={{ position: 'relative', height: '280px', flexShrink: 0 }}>
                    <img
                        src={selectedPoi.photos[0]}
                        alt={selectedPoi.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                        onClick={() => setSelectedPoi(null)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '32px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>{selectedPoi.name}</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                <MapPin size={18} />
                                <span>{selectedPoi.address || 'Sin dirección'}</span>
                            </div>
                        </div>
                        <div style={{
                            backgroundColor: 'var(--bg-offset)',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: '1px solid var(--border)',
                            flexShrink: 0
                        }}>
                            <Star size={18} fill="var(--accent)" color="var(--accent)" />
                            <span style={{ fontWeight: '700' }}>{selectedPoi.rating}</span>
                        </div>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
                        {selectedPoi.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-offset)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Horario</div>
                            <div style={{ fontWeight: '600' }}>
                                {selectedPoi.hours ? `${selectedPoi.hours.open} - ${selectedPoi.hours.close}` : 'Consultar horario'}
                            </div>
                        </div>
                        <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: 'var(--bg-offset)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Categoría</div>
                            <div style={{ fontWeight: '600' }}>{selectedPoi.category}</div>
                        </div>
                    </div>

                    {selectedPoi.services?.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Servicios disponibles</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {selectedPoi.services.map(s => {
                                    const labels = {
                                        'ev_charger': 'Carga EV',
                                        'vegan': 'Vegano',
                                        'parking': 'Parking',
                                        'wifi': 'WiFi'
                                    };
                                    return (
                                        <span key={s} style={{
                                            padding: '6px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-offset)',
                                            fontSize: '12px', fontWeight: '700', border: '1px solid var(--border)'
                                        }}>
                                            {labels[s] || s}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {hasRoute ? (
                        isAlreadyAdded ? (
                            <button
                                className="btn-secondary"
                                style={{ width: '100%', justifyContent: 'center', padding: '18px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e' }}
                                disabled
                            >
                                <CheckCircle size={20} />
                                Ya añadido a la ruta
                            </button>
                        ) : (
                            <button
                                className="btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '18px', fontSize: '16px' }}
                                onClick={() => {
                                    setAddedRoutePoints(prev => [...prev, selectedPoi]);
                                    setSelectedPoi(null);
                                }}
                            >
                                <Navigation size={20} />
                                Añadir punto a la ruta
                            </button>
                        )
                    ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '14px', backgroundColor: 'var(--bg-offset)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            Calcula una ruta primero para poder añadir este punto.
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default POIDetail;
