import React, { createContext, useContext, useState } from 'react';
import { formatDatetimeLocal } from '../utils/time';

const AppContext = createContext();

import { INITIAL_POIS } from '../data/pois';

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
  // AI Assist toggle — persisted in localStorage so the admin setting survives reloads
  const [aiAssistEnabled, setAiAssistEnabledState] = useState(
    () => localStorage.getItem('tt_ai_assist') !== 'false' // default: enabled
  );
  const setAiAssistEnabled = (val) => {
    localStorage.setItem('tt_ai_assist', val ? 'true' : 'false');
    setAiAssistEnabledState(val);
  };

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
      hoveredPoiId, setHoveredPoiId,
      aiAssistEnabled, setAiAssistEnabled,
    }}>
      {children}
    </AppContext.Provider>
  );

};

export const useAppContext = () => useContext(AppContext);
