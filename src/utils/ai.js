import { GoogleGenAI } from "@google/genai";

// ─── Gemini client ─────────────────────────────────────────────────────────────
let ai = null;
function getAI() {
    const key = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    if (key && !ai) ai = new GoogleGenAI({ apiKey: key });
    return ai;
}

// ─── Strip Spanish prepositions/phrases from city names ───────────────────────
function cleanCity(s) {
    if (!s) return '';
    let r = s.trim();

    // Strip trailing phrases that get caught by accident (e.g. "Madrid y voy", "Madrid y")
    r = r.replace(/\s+y\s+(voy|me dirijo|viajo|salgo).*$/gi, '');
    r = r.replace(/\s+y$/gi, '');

    // Multi-word travel phrases at start (order matters: longest first)
    r = r.replace(/^(estoy saliendo desde|estoy saliendo de|estoy viajando a|quiero ir hacia|quiero ir a|quiero ir de|me dirijo hacia|me dirijo a|me dirijo de|salgo desde|salgo de|vengo desde|vengo de|voy hacia|voy a|voy de|parto desde|parto de|llegando a|paso por)\s+/gi, '');

    // Single prepositions at the start
    r = r.replace(/^(desde|hacia|hasta|para|en|de|a)\s+/gi, '');

    return r.trim();
}

// ─── Regex fallback (no Gemini key / Gemini error) ───────────────────────────
function regexFallback(transcript, appState) {
    const lower = transcript.toLowerCase().trim();
    const words = lower.split(/\s+/);
    const { routeDetails, addedRoutePoints, pois, filteredPois } = appState;
    const hasOrigin = !!(routeDetails?.originName);
    const hasDest = !!(routeDetails?.destinationName);
    const hasRoute = !!(routeDetails?.originName && routeDetails?.destinationName);
    const hasPendingRoute = !!(routeDetails?.pendingOrigin && routeDetails?.pendingDest);
    const lastQ = (window.__lastAssistantQuestion || '').toLowerCase();
    const poiList = filteredPois?.length > 0 ? filteredPois : pois;

    console.log('[REGEX] transcript:', transcript, '| lastQ:', lastQ);

    // ── HELPER: extract city from "paro en X", "paso por X", etc. ────────────
    function extractStopCity(text) {
        // Match: "paro en X", "parar en X", "para en X", "pare en X"
        // also: "también paro en X", "quiero parar en X", "voy a parar en X", "me paro en X"
        const m1 = text.match(
            /(?:tambi[eé]n\s+)?(?:(?:quiero?|voy\s+a)\s+)?(?:me\s+)?par(?:o|ar?|e)\s+en\s+([a-záéíóúñ][a-z\sáéíóúñ]{1,25})/i
        );
        if (m1) return cleanCity(m1[1].trim());
        // Match: "paso por X", "pasar por X", "pasando por X"
        const m2 = text.match(/pasan?d?o?\s+por\s+([a-záéíóúñ][a-z\sáéíóúñ]{1,25})/i);
        if (m2) return cleanCity(m2[1].trim());
        // Match: "parada en X", "hacer parada en X", "una parada en X"
        const m3 = text.match(/(?:hacer\s+)?(?:una\s+)?parada\s+en\s+([a-záéíóúñ][a-z\sáéíóúñ]{1,25})/i);
        if (m3) return cleanCity(m3[1].trim());
        return null;
    }

    // ── PRIORITY 1: city-stop phrases (paro en X, paso por X, parada en X) ──
    const stopCity = extractStopCity(lower);
    if (stopCity) {
        // Is this city also a known restaurant name? (unlikely but safe)
        const isPoi = poiList.some(p =>
            p.name.toLowerCase().split(/[\s,]+/).some(w => w.length > 3 && stopCity.toLowerCase().includes(w))
        );
        if (!isPoi) {
            // It's a geographic stop
            const origin = routeDetails?.pendingOrigin || routeDetails?.originName;
            const dest = routeDetails?.pendingDest || routeDetails?.destinationName;
            if (hasPendingRoute || (origin && dest && !hasRoute)) {
                // Still planning — include as waypoint in calculate_route
                return { speak: `Ruta vía ${stopCity} calculando.`, action: 'calculate_route', actionArgs: { origin, destination: dest, waypoints: [stopCity] } };
            } else if (hasRoute) {
                // Route already active — add as waypoint
                return { speak: `Parada en ${stopCity} añadida.`, action: 'add_waypoint', actionArgs: { waypoints: [stopCity] } };
            }
        }
        // If it IS a POI, fall through to POI handling below
    }

    // ── PRIORITY 2: Context — answering the waypoint question ───────────────
    // Only trigger this when we actually have a pending route waiting to be confirmed
    if (hasPendingRoute || (lastQ.includes('directo') && (lastQ.includes('paso') || lastQ.includes('parada')))) {
        const o = routeDetails?.pendingOrigin || routeDetails?.originName;
        const d = routeDetails?.pendingDest || routeDetails?.destinationName;
        if (/^(no|nada|directo|directos?|sin paradas?|sin ciudades?|adelante|va|venga|dale|ning[uú]n)/.test(lower)) {
            if (o && d) return { speak: `Calculando ruta directa de ${o} a ${d}.`, action: 'calculate_route', actionArgs: { origin: o, destination: d, waypoints: [] } };
        }
        // City name answer — only if response is short and looks like a city, NOT a full sentence
        if (!/quita|elimina|borra|restaurante|añade|filtro|qué|cómo|dónde|hay|no\s/.test(lower)) {
            const cleaned = cleanCity(transcript);
            // Must be 1-3 words and not contain verbs / sentence structure
            if (cleaned && cleaned.split(' ').length <= 3 && !/\b(salgo|voy|quiero|paro|quiere|tengo|vamos)\b/.test(lower)) {
                if (o && d) return { speak: `Parada en ${cleaned} añadida, ruta recalculando.`, action: 'calculate_route', actionArgs: { origin: o, destination: d, waypoints: [cleaned] } };
            }
        }
    }

    // ── PRIORITY 3: Remove ─────────────────────────────────────────────────────
    if (/quita|elimina|borra|saca/.test(lower)) {
        // Removing a city waypoint
        if (/parada|ciudad|paso|ruta|escala/.test(lower) || !addedRoutePoints.length) {
            const cityMatch = lower.match(/(?:quita|elimina|borra|saca)(?:\s+(?:la\s+)?parada)?(?:\s+de)?\s+([a-záéíóúñ][a-záéíóúñ\s]{1,20})/i);
            const city = cityMatch ? cleanCity(cityMatch[1]) : null;
            if (city) return { speak: `${city} quitada de la ruta.`, action: 'remove_waypoint', actionArgs: { waypoints: [city] } };
        }
        // Removing a restaurant
        const m = addedRoutePoints.find(p => p.name.toLowerCase().split(/[\s,]+/).some(w => w.length > 2 && lower.includes(w)));
        if (m) return { speak: `Quitado ${m.name}.`, action: 'remove_poi', actionArgs: { poi: m } };
        // Try to remove waypoint by name
        const anyCity = lower.match(/(?:quita|elimina|borra|saca)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,20})/i);
        if (anyCity) return { speak: `Parada eliminada.`, action: 'remove_waypoint', actionArgs: { waypoints: [cleanCity(anyCity[1])] } };
        return { speak: `¿Cuál parada quieres eliminar?`, action: 'none', actionArgs: {} };
    }

    // ── PRIORITY 4: POI add (restaurant) ────────────────────────────────────
    // Only triggers for explicit restaurant-add vocabulary, NOT city-stop phrases
    if (/\b(añade|añadir|incluye|agrega|pon|apunta|apúntalo)\b/.test(lower) ||
        /\b(quiero\s+(ese|este|aquel)|ese\s+restaurante|la\s+primera\s+opción|el\s+primero)\b/.test(lower) ||
        /\b(me\s+gusta(?:ría)?\s+(ese|este|ir\s+a))\b/.test(lower)) {
        let m = poiList.find(p => p.name.toLowerCase().split(/[\s,]+/).some(w => w.length > 2 && lower.includes(w)));
        if (!m) m = poiList.find(p => (p.address || '').toLowerCase().split(/[\s,]+/).some(w => w.length > 3 && lower.includes(w)));
        if (m) return { speak: `Apuntado. ${m.name} en tus paradas.`, action: 'add_poi', actionArgs: { poi: m } };
        return { speak: `No encuentro ese restaurante entre los recomendados en tu ruta. ¿Me dices el nombre?`, action: 'none', actionArgs: {} };
    }

    // ── PRIORITY 5: Filters ───────────────────────────────────────────────────
    const filterMap = { vegano: 'vegan', vegan: 'vegan', vegetariano: 'vegan', wifi: 'wifi', terraza: 'terraza', perro: 'petFriendly', mascota: 'petFriendly', parking: 'parking', cargador: 'evCharger', eléctrico: 'evCharger', abierto: 'openNow' };
    const filterLabels = { vegan: 'opción vegana', wifi: 'wifi', terraza: 'terraza', petFriendly: 'pet friendly', parking: 'parking', evCharger: 'cargador eléctrico', openNow: 'abiertos ahora' };
    for (const [kw, key] of Object.entries(filterMap)) {
        if (lower.includes(kw)) {
            const matching = poiList.filter(p => p.services?.includes(key));
            const label = filterLabels[key] || key;
            if (matching.length === 0) {
                return { speak: `Activado el filtro de ${label}, pero no veo ninguno disponible en tu ruta ahora mismo. ¿Pruebo otro filtro?`, action: 'set_filter', actionArgs: { key, value: true } };
            }
            const names = matching.slice(0, 3).map(p => p.name).join(', ');
            return { speak: `Filtro de ${label} activado. Hay ${matching.length === 1 ? 'uno' : matching.length} en ruta: ${names}. ¿Quieres añadir alguno a tus paradas?`, action: 'set_filter', actionArgs: { key, value: true } };
        }
    }

    // ── PRIORITY 6: Questions about POIs ─────────────────────────────────────
    if (/qué (otras |más )?(paradas|opciones|restaurantes|sitios|lugares) hay|cuánto.? (restaurantes|sitios|opciones)|qué (restaurantes|sitios) (me recomiendas|hay|tienes)|qué hay (para comer|en ruta)|opciones (hay|tienes)/.test(lower)) {
        const list = appState.filteredPois?.length > 0 ? appState.filteredPois : pois;
        if (list.length === 0) return { speak: `No hay restaurantes en ruta con los filtros actuales.`, action: 'none', actionArgs: {} };
        const top = list.slice(0, 3).map(p => p.name).join(', ');
        return { speak: `Tienes ${list.length} opciones. Los mejores: ${top}. ¿Te apetece alguno?`, action: 'none', actionArgs: {} };
    }

    // ── PRIORITY 7: Route detection ───────────────────────────────────────────
    const preClean = lower
        .replace(/^(quiero ir|me gustar[íi]a ir|voy a ir|me apetece ir|necesito ir)\s+/i, '')
        .replace(/^(salgo|vengo|voy|parto|me dirijo|estoy yendo|viajar)\s+/i, '');

    const routeRx = /(?:de|desde)\s+([a-záéíóúñ][a-z\sáéíóúñ]{1,20}?)\s+(?:a|hacia|hasta|para)\s+([a-záéíóúñ][a-z\sáéíóúñ]{1,20}?)[.,]?\s*$/i;
    const rm = preClean.match(routeRx);
    if (rm) {
        const o = rm[1].trim(), d = rm[2].trim();
        console.log('[REGEX] Route detected:', o, '→', d);
        return { speak: ``, action: 'calculate_route', actionArgs: { origin: o, destination: d } };
    }

    // ── PRIORITY 8: Context — origin/destination questions ───────────────────
    if (lastQ.includes('desde') || lastQ.includes('sales') || lastQ.includes('origen') || lastQ.includes('dónde sales')) {
        const city = cleanCity(transcript);
        if (city && city.split(' ').length <= 4) {
            if (!hasDest) return { speak: `¿Y hacia dónde vas?`, action: 'set_origin', actionArgs: { origin: city } };
            return { speak: ``, action: 'calculate_route', actionArgs: { origin: city, destination: routeDetails.destinationName } };
        }
    }
    if (lastQ.includes('destino') || lastQ.includes('vas') || lastQ.includes('adónde') || lastQ.includes('hacia dónde')) {
        const city = cleanCity(transcript);
        if (city && city.split(' ').length <= 4) {
            if (!hasOrigin) return { speak: `¿Y desde dónde sales?`, action: 'set_destination', actionArgs: { destination: city } };
            return { speak: ``, action: 'calculate_route', actionArgs: { origin: routeDetails.originName, destination: city } };
        }
    }

    // ── PRIORITY 9: Bare city name ────────────────────────────────────────────
    if (words.length <= 3 && !/[¿?]/.test(transcript) && !/qué|cómo|cuándo|dónde|hay/.test(lower)) {
        const city = cleanCity(transcript);
        if (city && city.length > 2) {
            if (!hasOrigin) return { speak: `¿Y hacia dónde vas?`, action: 'set_origin', actionArgs: { origin: city } };
            if (!hasDest) return { speak: ``, action: 'calculate_route', actionArgs: { origin: routeDetails.originName, destination: city } };
            if (hasRoute) return { speak: `Parada en ${city} añadida.`, action: 'add_waypoint', actionArgs: { waypoints: [city] } };
        }
    }

    console.log('[REGEX] No match found');
    return { speak: `No te he entendido bien. ¿Puedes repetirlo?`, action: 'none', actionArgs: {} };
}



// ─── Build rich itinerary context for Gemini ─────────────────────────────────
function buildContext(appState) {
    const { pois, addedRoutePoints, routeDetails, activeFilters, filteredPois, totalRoute, currentDepartureTime } = appState;

    // Route summary
    let routeBlock = 'Sin ruta planificada.';
    if (totalRoute && routeDetails?.originName) {
        const km = Math.round(totalRoute.distance / 1000);
        const totalSec = totalRoute.duration;
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const dur = h > 0 ? `${h}h ${m}min` : `${m}min`;

        let times = '';
        if (currentDepartureTime) {
            const dep = new Date(currentDepartureTime);
            const arr = new Date(dep.getTime() + totalSec * 1000);
            const fmt = d => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
            times = ` | Salida: ${fmt(dep)} | Llegada estimada: ${fmt(arr)}`;
        }

        let wps = routeDetails?.waypoints && routeDetails.waypoints.length > 0
            ? ` → ${routeDetails.waypoints.map(w => w.name || 'Parada').join(' → ')}`
            : '';
        routeBlock = `${routeDetails.originName}${wps} → ${routeDetails.destinationName} | ${km} km | ${dur}${times}`;
    } else if (routeDetails?.pendingOrigin && routeDetails?.pendingDest) {
        routeBlock = `Ruta pendiente de confirmar: ${routeDetails.pendingOrigin} → ${routeDetails.pendingDest}. El asistente preguntó si el usuario quiere paradas; esperando respuesta.`;
    }

    const stopsBlock = addedRoutePoints.length > 0
        ? addedRoutePoints.map(p => `${p.name} (${p.address})`).join(' → ')
        : 'Ninguna parada añadida.';

    const filtersBlock = Object.entries(activeFilters).filter(([, v]) => v).map(([k]) => k).join(', ') || 'Ninguno';

    const poisOnRoute = filteredPois?.length > 0
        ? `${filteredPois.length} restaurantes visibles: ${filteredPois.slice(0, 8).map(p => p.name).join(', ')}`
        : 'Ningún restaurante visible con filtros actuales.';

    const catalog = pois.slice(0, 35).map(p =>
        `• ${p.name} [${p.category} | rating ${p.rating} | ${p.address} | ${p.hours?.open}-${p.hours?.close} | servicios: ${(p.services || []).join(', ') || 'ninguno'}]`
    ).join('\n');

    return { routeBlock, stopsBlock, filtersBlock, poisOnRoute, catalog };
}

// ─── Main agent ───────────────────────────────────────────────────────────────
export const processAgentTurn = async (transcript, appState, history = []) => {
    const gemini = getAI();
    if (!gemini) {
        console.info('[AI] No Gemini key — regex fallback');
        return regexFallback(transcript, appState);
    }

    const { pois } = appState;
    const { routeBlock, stopsBlock, filtersBlock, poisOnRoute, catalog } = buildContext(appState);

    const systemPrompt = `Eres TasteTrip, compañera de viaje por España. Hablas en castellano, de tú, con tono natural y cercano como una amiga. Nunca suenas robótica.

ESTADO DEL VIAJE:
- Ruta: ${routeBlock}
- Paradas del usuario: ${stopsBlock}
- Filtros activos: ${filtersBlock}
- En ruta: ${poisOnRoute}

CATÁLOGO COMPLETO:
${catalog}

REGLAS (no negociables):
1. Responde ÚNICAMENTE con JSON válido. Ningún texto fuera del JSON.
2. Escribe números y horas SIEMPRE en palabras: "13:00"→"las trece", "2h 30min"→"dos horas y media", "4.8"→"cuatro coma ocho", "350 km"→"trescientos cincuenta kilómetros".
3. origin y destination: SOLO el nombre de la ciudad, SIN preposiciones ni conectores. "Madrid" ✓. "desde Madrid" ✗. "Madrid y voy a" ✗.
4. Cuando actives un filtro: cuenta cuántos restaurantes del catálogo tienen ese servicio y nombra los mejores.
5. Para hablar de duración/llegada: usa los datos de ESTADO DEL VIAJE.
6. Sé breve y conversacional. Máximo 2-3 frases.
7. ¡IMPORTANTE SOBRE RUTAS! Cuando el usuario mencione origen y destino POR PRIMERA VEZ (estado: "Sin ruta planificada") sin especificar paradas, responde con action:"none" preguntando si quiere paradas. Si ya existe una ruta calculada en el estado y el usuario menciona el mismo destino, NO preguntes otra vez — simplemente confirma o recalcula.
8. Si ves en ESTADO DEL VIAJE "Ruta pendiente de confirmar: X → Y", significa que ya preguntaste sobre paradas y el usuario está respondiendo ahora. Tú debes: a) Si dicen "no/directo/sin paradas": action:"calculate_route" con origin=X, destination=Y, waypoints:[]. b) Si mencionan una ciudad (ej: "Tarragona", "me gustaría pasar por Tarragona"): action:"calculate_route" con origin=X, destination=Y, waypoints:["Tarragona"]. c) Si quieren varias paradas: inclúyelas todas en waypoints:.
9. ¡MUY IMPORTANTE! SÓLO puedes añadir restaurantes (action:"add_poi") si están en la sección "En ruta". Si no está en ruta, di que no está de camino.
10. Si tras tener la ruta calculada el usuario pide una parada en una ciudad o lugar geográfico (NO restaurante): action:"add_waypoint", waypoints:["Ciudad"].
11. Si quieren quitar una ciudad de la ruta: action:"remove_waypoint", waypoints:["Ciudad"].
12. ¡MUY IMPORTANTE sobre FILTROS! Cuando actives o desactives un filtro (set_filter/clear_filter): NO termines la conversación. Di cuántos restaurantes hay con ese servicio y cuáles son los mejores, y termina con una pregunta abierta para seguir. No respondas con "Listo" sin más.
13. Si el usuario vuelve a decir la misma ruta que ya está calculada (ej: ruta ya existe Cádiz→Barcelona y dice "voy de Cádiz a Barcelona"), simplemente confirma la ruta existente con action:"none".

FORMATO JSON (todos los campos, siempre):
{"speak":"texto en voz alta","action":"accion","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}

ACCIONES: calculate_route | add_poi | remove_poi | add_waypoint | remove_waypoint | set_filter | clear_filter | set_departure_time | none

EJEMPLOS:
// Ruta pendiente Madrid→Andorra, usuario responde con ciudad de paso:
[ESTADO: "Ruta pendiente de confirmar: Madrid → Andorra"] + "me gustaría pasar por Tarragona" → {"speak":"Perfecto, ruta pasando por Tarragona en camino a Andorra.","action":"calculate_route","origin":"Madrid","destination":"Andorra","waypoints":["Tarragona"],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
// Ruta pendiente, usuario dice no quiere paradas:
[ESTADO: "Ruta pendiente de confirmar: Madrid → Andorra"] + "no, directo" → {"speak":"Venga, calculando ruta directa.","action":"calculate_route","origin":"Madrid","destination":"Andorra","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"voy de Bilbao a San Sebastián" → {"speak":"Perfecto. ¿Quieres que añadamos alguna parada o ciudad de paso en el camino?","action":"none","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"¿hay opción vegana?" → {"speak":"Perfecto, activo el filtro vegano. Hay tres restaurantes con opción vegana en tu ruta: La Huerta Verde, El Jardín Ecológico y Casa Natural. ¿Quieres añadir alguno o te cuento más detalles?","action":"set_filter","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"vegan","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"activa terraza" → {"speak":"Hecho, filtro terraza activado. Hay dos sitios con terraza en ruta: El Figón y Casa Lucio. ¿Añadimos alguno a las paradas?","action":"set_filter","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"terraza","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"añade Casa Lucio" → {"speak":"¡Apuntado! Casa Lucio en tus paradas.","action":"add_poi","origin":"","destination":"","waypoints":[],"poiName":"Casa Lucio","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"añade Zaragoza a la ruta" → {"speak":"Claro, recalculando la ruta pasando por Zaragoza.","action":"add_waypoint","origin":"","destination":"","waypoints":["Zaragoza"],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"quita Zaragoza de la ruta" → {"speak":"Zaragoza eliminada de tus paradas.","action":"remove_waypoint","origin":"","destination":"","waypoints":["Zaragoza"],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"¿cuándo llego?" → {"speak":"Según la ruta, llegas sobre las diecisiete y media.","action":"none","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}`;

    const contents = [
        ...history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: transcript }] }
    ];

    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];
    let res = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`[AI] Intentando usar modelo: ${modelName}`);
            res = await gemini.models.generateContent({
                model: modelName,
                contents,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: 'application/json',
                    temperature: 0.3
                }
            });
            break; // Éxito
        } catch (e) {
            console.warn(`[AI] Fallo con modelo ${modelName}:`, e.message);
            lastError = e;
        }
    }

    if (!res) {
        console.warn('[AI] Todos los modelos Gemini fallaron:', lastError?.message, '→ regex fallback');
        return regexFallback(transcript, appState);
    }

    try {
        const raw = res.text?.trim();
        console.log('[AI] Raw:', raw);
        if (!raw) throw new Error('Empty Gemini response');

        const clean = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const p = JSON.parse(clean);
        console.log('[AI] Action:', p.action, '| Origin:', p.origin, '| Dest:', p.destination, '| POI:', p.poiName);

        const result = {
            speak: p.speak || '',
            action: p.action || 'none',
            actionArgs: {
                origin: cleanCity(p.origin || ''),
                destination: cleanCity(p.destination || ''),
                waypoints: Array.isArray(p.waypoints) ? p.waypoints.map(cleanCity) : [],
                poiName: p.poiName || '',
                key: p.filterKey || '',
                value: p.filterValue !== undefined ? p.filterValue : true,
                hours: p.hours || 0,
                minutes: p.minutes || 0,
                tomorrow: p.tomorrow || false
            }
        };

        // Resolve POI name → actual POI object
        if ((result.action === 'add_poi' || result.action === 'remove_poi') && result.actionArgs.poiName) {
            const q = result.actionArgs.poiName.toLowerCase();
            // Validate ONLY against filteredPois if adding, else from full list to remove
            const listToSearch = result.action === 'add_poi' ? (appState.filteredPois || appState.pois) : appState.pois;
            const matched = listToSearch.find(poi =>
                poi.name.toLowerCase().includes(q) ||
                q.includes(poi.name.toLowerCase().split(' ')[0])
            );
            if (matched) {
                result.actionArgs.poi = matched;
            } else {
                console.warn('[AI] POI not found in valid list:', result.actionArgs.poiName);
                if (result.action === 'add_poi') {
                    result.speak = `Ese lugar no me aparece en los restaurantes recomendados y abiertos de la ruta actual. Trata de buscar otro de los que te he propuesto.`;
                } else {
                    result.speak = `No encontré ese restaurante para quitarlo.`;
                }
                result.action = 'none';
            }
        }

        return result;

    } catch (e) {
        console.warn('[AI] Gemini failed:', e.message, '→ regex fallback');
        return regexFallback(transcript, appState);
    }
};

// ─── ElevenLabs TTS ─────────────────────────────────────────────────────────
export const synthesizeSpeech = async (text) => {
    const elKey = (import.meta.env.VITE_ELEVENLABS_API_KEY || '').trim();
    if (elKey) {
        try {
            const voiceId = (import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'XrExE9yKIg1WjnnlVkGX').trim();
            const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=4`, {
                method: 'POST',
                headers: { 'xi-api-key': elKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_turbo_v2_5',
                    language_code: 'es',
                    voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.05, use_speaker_boost: false }
                })
            });
            if (res.ok) {
                const blob = await res.blob();
                return URL.createObjectURL(blob);
            }
            console.warn('[TTS] ElevenLabs error:', res.status, await res.text());
        } catch (e) {
            console.warn('[TTS] ElevenLabs error:', e.message);
        }
    }

    // Fallback: Google Cloud TTS
    const gKey = (import.meta.env.VITE_GOOGLE_TTS_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    if (gKey) {
        try {
            const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${gKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text },
                    voice: { languageCode: 'es-ES', name: 'es-ES-Neural2-F' },
                    audioConfig: { audioEncoding: 'MP3' }
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.audioContent) return `data:audio/mp3;base64,${data.audioContent}`;
            }
        } catch (e) {
            console.warn('[TTS] Google TTS error:', e.message);
        }
    }

    return null; // browser SpeechSynthesis fallback in VoiceAssistant
};
