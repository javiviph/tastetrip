import React, { createContext, useContext, useState } from 'react';
import { formatDatetimeLocal } from '../utils/time';

const AppContext = createContext();

// 50 POIs de test repartidos por toda España
const INITIAL_POIS = [
  // === ZONA CENTRO (Madrid y alrededores) ===
  { id: 1, name: 'Casa Lucio', description: 'Famoso por sus huevos rotos con jamón ibérico. Cocina castellana de toda la vida.', photos: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'], coords: [40.4128, -3.7090], category: 'Tradicional', rating: 4.9, address: 'Calle Cava Baja, 35, Madrid', hours: { open: '13:00', close: '23:30' }, services: ['parking', 'wifi'] },
  { id: 2, name: 'Sobrino de Botín', description: 'El restaurante más antiguo del mundo según Guinness. Cochinillo y cordero asado.', photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80'], coords: [40.4133, -3.7078], category: 'Histórico', rating: 4.7, address: 'Calle Cuchilleros, 17, Madrid', hours: { open: '13:00', close: '23:30' }, services: ['wifi'] },
  { id: 3, name: 'Mesón Cándido', description: 'Cochinillo asado segoviano de fama mundial.', photos: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'], coords: [40.9481, -4.1184], category: 'Asador', rating: 4.6, address: 'Plaza Azoguejo, 5, Segovia', hours: { open: '12:30', close: '23:00' }, services: ['ev_charger', 'parking'] },
  { id: 4, name: 'El Figón de Recoletos', description: 'Tapas creativas con producto de temporada en el centro de Madrid.', photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'], coords: [40.4230, -3.6910], category: 'Tapas', rating: 4.5, address: 'Calle Recoletos, 8, Madrid', hours: { open: '12:00', close: '00:00' }, services: ['vegan', 'wifi'] },
  { id: 5, name: 'Asador de Aranda', description: 'Lechazo asado en horno de leña tradicional.', photos: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80'], coords: [41.6541, -3.6889], category: 'Asador', rating: 4.4, address: 'Plaza Mayor, Aranda de Duero', hours: { open: '13:00', close: '23:00' }, services: ['parking', 'wifi'] },

  // === EJE MADRID - VALENCIA (A-3) ===
  { id: 6, name: 'Venta del Quijote', description: 'Migas manchegas y pisto en la ruta del Quijote.', photos: ['https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=80'], coords: [39.4295, -3.6130], category: 'Manchego', rating: 4.3, address: 'Puerto Lápice, Ciudad Real', hours: { open: '09:00', close: '22:00' }, services: ['ev_charger', 'parking'] },
  { id: 7, name: 'Restaurante San Huberto', description: 'Cocina de caza y guisos de la Mancha.', photos: ['https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'], coords: [39.5690, -1.8950], category: 'Tradicional', rating: 4.2, address: 'Motilla del Palancar, Cuenca', hours: { open: '12:00', close: '22:30' }, services: ['parking'] },
  { id: 8, name: 'Casa Juanito', description: 'Morteruelo y gazpacho manchego auténtico.', photos: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'], coords: [39.8500, -2.1400], category: 'Manchego', rating: 4.5, address: 'Tarancón, Cuenca', hours: { open: '10:00', close: '23:00' }, services: ['vegan', 'ev_charger'] },
  { id: 9, name: 'La Barraca Valencia', description: 'Paella valenciana auténtica con leña de naranjo.', photos: ['https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80'], coords: [39.4730, -0.3750], category: 'Arrocería', rating: 4.8, address: 'Calle Reina, 29, Valencia', hours: { open: '13:00', close: '23:30' }, services: ['wifi'] },
  { id: 10, name: 'Casa Roberto Valencia', description: 'Arroces y mariscos frente a la playa de la Malvarrosa.', photos: ['https://images.unsplash.com/photo-1515443961218-a51367888e4b?auto=format&fit=crop&w=800&q=80'], coords: [39.4820, -0.3250], category: 'Arrocería', rating: 4.6, address: 'Paseo Marítimo, Valencia', hours: { open: '12:30', close: '23:00' }, services: ['parking', 'wifi'] },

  // === EJE MADRID - ZARAGOZA - BARCELONA (A-2 / AP-2) ===
  { id: 11, name: 'Mesón La Cueva', description: 'Asados y migas pastoriles en plena Alcarria.', photos: ['https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?auto=format&fit=crop&w=800&q=80'], coords: [40.6320, -2.6370], category: 'Tradicional', rating: 4.1, address: 'Guadalajara', hours: { open: '12:00', close: '22:00' }, services: ['parking'] },
  { id: 12, name: 'Restaurante Goya', description: 'Ternasco de Aragón y borraja en tempura.', photos: ['https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80'], coords: [41.2300, -1.7270], category: 'Aragonés', rating: 4.5, address: 'Calatayud, Zaragoza', hours: { open: '13:00', close: '23:00' }, services: ['ev_charger'] },
  { id: 13, name: 'Los Cabezudos', description: 'Alta cocina aragonesa con producto de proximidad.', photos: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'], coords: [41.6488, -0.8891], category: 'Gastro', rating: 4.7, address: 'Calle Mayor, Zaragoza', hours: { open: '13:00', close: '00:00' }, services: ['vegan', 'wifi'] },
  { id: 14, name: 'Bodega del Somontano', description: 'Degustación de vinos DO Somontano con tabla de embutidos.', photos: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=800&q=80'], coords: [42.0310, -0.1280], category: 'Bodega', rating: 4.4, address: 'Barbastro, Huesca', hours: { open: '11:00', close: '23:00' }, services: ['parking', 'wifi'] },
  { id: 15, name: 'Cal Pep Barcelona', description: 'Tapas de mercado y mariscos en el Born.', photos: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'], coords: [41.3840, 2.1820], category: 'Tapas', rating: 4.8, address: 'Pl. de les Olles, 8, Barcelona', hours: { open: '13:00', close: '23:30' }, services: ['wifi'] },
  { id: 16, name: 'Can Culleretes', description: 'El segundo restaurante más antiguo de España. Cocina catalana de siempre.', photos: ['https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=80'], coords: [41.3807, 2.1740], category: 'Catalán', rating: 4.5, address: 'Carrer Quintana, 5, Barcelona', hours: { open: '13:00', close: '23:00' }, services: ['parking'] },
  { id: 17, name: 'El Lleida', description: 'Caracoles a la llauna y cargols a la brutesca.', photos: ['https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=800&q=80'], coords: [41.6148, 0.6260], category: 'Catalán', rating: 4.3, address: 'Lleida', hours: { open: '12:00', close: '22:30' }, services: ['ev_charger', 'parking'] },

  // === EJE MADRID - ANDALUCÍA (A-4 / A-44) ===
  { id: 18, name: 'Casa Pepe de la Judería', description: 'Salmorejo y flamenquín cordobés en la judería.', photos: ['https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80'], coords: [37.8794, -4.7794], category: 'Cordobés', rating: 4.6, address: 'Calle Romero, 1, Córdoba', hours: { open: '12:30', close: '23:30' }, services: ['wifi'] },
  { id: 19, name: 'Taberna El Pimpi', description: 'Vinos dulces y espetos de sardinas con vistas a la Alcazaba.', photos: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80'], coords: [36.7213, -4.4190], category: 'Malagueño', rating: 4.7, address: 'Calle Granada, 62, Málaga', hours: { open: '12:00', close: '01:00' }, services: ['vegan', 'wifi'] },
  { id: 20, name: 'El Faro de Cádiz', description: 'Tortillitas de camarones y pescaíto frito gaditano.', photos: ['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'], coords: [36.5297, -6.2926], category: 'Gaditano', rating: 4.8, address: 'Calle San Félix, 15, Cádiz', hours: { open: '13:00', close: '23:30' }, services: ['parking', 'wifi'] },
  { id: 21, name: 'La Tasca del Sur', description: 'Comida tradicional andaluza en un ambiente acogedor.', photos: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=800&q=80'], coords: [37.3891, -5.9845], category: 'Tradicional', rating: 4.5, address: 'Calle Sierpes, 10, Sevilla', hours: { open: '12:00', close: '00:00' }, services: ['vegan'] },
  { id: 22, name: 'Bodegas Campos', description: 'Rabo de toro y vinos de Montilla-Moriles en patio andaluz.', photos: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'], coords: [37.8840, -4.7710], category: 'Bodega', rating: 4.6, address: 'Calle Lineros, 32, Córdoba', hours: { open: '13:00', close: '23:30' }, services: ['parking'] }
];

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState('traveler');
  const [pois, setPois] = useState(INITIAL_POIS);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [addedRoutePoints, setAddedRoutePoints] = useState([]);
  const [routeDetails, setRouteDetails] = useState({
    origin: null,
    originName: '',
    destination: null,
    destinationName: ''
  });
  const [baseRoute, setBaseRoute] = useState(null);
  const [totalRoute, setTotalRoute] = useState(null);

  // Filters & Schedule
  const [searchRadius, setSearchRadius] = useState(30);
  const [onlyForward, setOnlyForward] = useState(true);

  // Initialize to current time
  const [departureTime, setDepartureTime] = useState(formatDatetimeLocal(new Date()));
  const [arrivalTime, setArrivalTime] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    openNow: false,
    evCharger: false,
    vegan: false,
    wifi: false,
    terraza: false,
    petFriendly: false,
    parking: false
  });
  const [hoveredPoiId, setHoveredPoiId] = useState(null);

  const addPoi = (newPoi) => {
    setPois(prev => [...prev, { ...newPoi, id: Date.now() }]);
  };

  const updatePoi = (id, updatedData) => {
    setPois(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
  };

  const deletePoi = (id) => {
    setPois(prev => prev.filter(p => p.id !== id));
    setAddedRoutePoints(prev => prev.filter(p => p.id !== id));
  };

  const removeRoutePoint = (id) => {
    setAddedRoutePoints(prev => prev.filter(p => p.id !== id));
  };

  return (
    <AppContext.Provider value={{
      userRole, setUserRole,
      pois, setPois,
      addPoi, updatePoi, deletePoi,
      selectedPoi, setSelectedPoi,
      routeDetails, setRouteDetails,
      addedRoutePoints, setAddedRoutePoints,
      baseRoute, setBaseRoute,
      totalRoute, setTotalRoute,
      removeRoutePoint,
      departureTime, setDepartureTime,
      arrivalTime, setArrivalTime,
      activeFilters, setActiveFilters,
      searchRadius, setSearchRadius,
      onlyForward, setOnlyForward,
      hoveredPoiId, setHoveredPoiId
    }}>
      {children}
    </AppContext.Provider>
  );

};

export const useAppContext = () => useContext(AppContext);
