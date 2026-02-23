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

// ─── Regex fallback (no Gemini key) ───────────────────────────────────────────
function regexFallback(transcript, appState) {
    const lower = transcript.toLowerCase().trim();
    const words = lower.split(/\s+/);
    const { routeDetails, addedRoutePoints, pois } = appState;
    const hasOrigin = !!(routeDetails?.originName);
    const hasDest = !!(routeDetails?.destinationName);
    const lastQ = (window.__lastAssistantQuestion || '').toLowerCase();

    console.log('[REGEX] transcript:', transcript);

    // POI add
    if (/añade|añadir|incluye|agrega|quiero parar/.test(lower)) {
        const m = pois.find(p => p.name.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w)));
        if (m) return { speak: `Añadido ${m.name}.`, action: 'add_poi', actionArgs: { poi: m } };
        return { speak: `¿Qué restaurante quieres añadir?`, action: 'none', actionArgs: {} };
    }

    // POI remove
    if (/quita|elimina|borra|saca/.test(lower)) {
        const m = addedRoutePoints.find(p => p.name.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w)));
        if (m) return { speak: `Quitado ${m.name}.`, action: 'remove_poi', actionArgs: { poi: m } };
        return { speak: `¿Cuál parada elimino?`, action: 'none', actionArgs: {} };
    }

    // Filters
    const filters = { vegano: 'vegan', vegan: 'vegan', vegetariano: 'vegan', wifi: 'wifi', terraza: 'terraza', perro: 'petFriendly', mascota: 'petFriendly', parking: 'parking', cargador: 'evCharger', eléctrico: 'evCharger', abierto: 'openNow' };
    for (const [kw, key] of Object.entries(filters)) {
        if (lower.includes(kw)) return { speak: `Listo.`, action: 'set_filter', actionArgs: { key, value: true } };
    }

    // Conversational questions about POIs — handle before route detection
    if (/qué (otras |más )?(paradas|opciones|restaurantes|sitios|lugares) hay|cuánto.? (restaurantes|sitios|opciones|paradas)|qué (restaurantes|sitios) (me recomiendas|hay|tienes|ves)|qué hay (para comer|en)|opciones (hay|tienes)/.test(lower)) {
        const list = appState.filteredPois?.length > 0
            ? appState.filteredPois
            : pois;
        if (list.length === 0) return { speak: `No hay restaurantes en ruta con los filtros actuales.`, action: 'none', actionArgs: {} };
        const top = list.slice(0, 3).map(p => p.name).join(', ');
        return { speak: `Tienes ${list.length} opciones. Los mejores: ${top}.`, action: 'none', actionArgs: {} };
    }

    // Route detection — pre-strip leading verbs so "salgo desde X a Y" → "desde X a Y"
    const preClean = lower
        .replace(/^(quiero ir|me gustaría ir|voy a ir|me apetece ir|necesito ir)\s+/i, '')
        .replace(/^(salgo|vengo|voy|parto|me dirijo|estoy yendo|viajar)\s+/i, '');

    // "de/desde X a/hacia Y"
    const routeRx = /(?:de|desde)\s+([a-záéíóúñ][a-z\sáéíóúñ]{1,20}?)\s+(?:a|hacia|hasta|para)\s+([a-záéíóúñ][a-z\sáéíóúñ]{1,20}?)[\.,]?\s*$/i;
    const rm = preClean.match(routeRx);
    if (rm) {
        const o = rm[1].trim(), d = rm[2].trim();
        console.log('[REGEX] Route detected:', o, '→', d);
        return { speak: `Calculando ruta.`, action: 'calculate_route', actionArgs: { origin: o, destination: d } };
    }

    // Context-aware: last question was about origin
    if (lastQ.includes('desde') || lastQ.includes('sales') || lastQ.includes('origen') || lastQ.includes('punto de partida')) {
        const city = cleanCity(transcript);
        if (city && city.split(' ').length <= 4) {
            console.log('[REGEX] Origin from context:', city);
            if (!hasDest) return { speak: `¿Y el destino?`, action: 'set_origin', actionArgs: { origin: city } };
            return { speak: `Calculando.`, action: 'calculate_route', actionArgs: { origin: city, destination: routeDetails.destinationName } };
        }
    }

    // Context-aware: last question was about destination
    if (lastQ.includes('destino') || lastQ.includes('vas') || lastQ.includes('adónde') || lastQ.includes('a dónde')) {
        const city = cleanCity(transcript);
        if (city && city.split(' ').length <= 4) {
            console.log('[REGEX] Destination from context:', city);
            if (!hasOrigin) return { speak: `¿Y el origen?`, action: 'set_destination', actionArgs: { destination: city } };
            return { speak: `Calculando.`, action: 'calculate_route', actionArgs: { origin: routeDetails.originName, destination: city } };
        }
    }

    // Bare city name (1-3 words, no question marks)
    if (words.length <= 3 && !/[¿?]/.test(transcript) && !/qué|cómo|cuándo|dónde|hay/.test(lower)) {
        const city = cleanCity(transcript);
        if (city) {
            console.log('[REGEX] Bare city:', city, 'hasOrigin:', hasOrigin, 'hasDest:', hasDest);
            if (!hasOrigin) return { speak: `¿Y el destino?`, action: 'set_origin', actionArgs: { origin: city } };
            if (!hasDest) return { speak: `Calculando.`, action: 'calculate_route', actionArgs: { origin: routeDetails.originName, destination: city } };
        }
    }

    console.log('[REGEX] No match found');
    return { speak: `Di origen y destino, o pídeme algo más concreto.`, action: 'none', actionArgs: {} };
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

        routeBlock = `${routeDetails.originName} → ${routeDetails.destinationName} | ${km} km | ${dur}${times}`;
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

8. ¡IMPORTANTE SOBRE RUTAS! Si el usuario te pide una ruta (ej: "voy de Madrid a Barcelona") POR PRIMERA VEZ y no especifica paradas intermedias, DEBES responderle preguntando si quiere añadir alguna parada (ej: "¿Quieres que busquemos restaurantes antes de trazar la ruta o añadir alguna otra ciudad de paso?") y devuelve action:"none".
9. Si el usuario te dice que no quiere paradas extra, o si te da las paradas en ese momento (ej: "sí, quiero parar en Zaragoza"), ENTONCES responde con action:"calculate_route" y si te dio paradas, mételas en el array "waypoints" : ["Zaragoza"].

FORMATO JSON (todos los campos, siempre):
{"speak":"texto en voz alta","action":"accion","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}

ACCIONES: calculate_route | add_poi | remove_poi | set_filter | clear_filter | set_departure_time | none

EJEMPLOS:
"voy de Bilbao a San Sebastián" → {"speak":"Perfecto. Antes de trazar la ruta, ¿quieres que añadamos alguna parada intermedia o restaurante en el camino?","action":"none","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"no, directo" → {"speak":"Venga, calculando ahora mismo ruta directa.","action":"calculate_route","origin":"Bilbao","destination":"San Sebastián","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"sí, pasemos por Pamplona" → {"speak":"Hecho, ruta pasando por Pamplona en curso.","action":"calculate_route","origin":"Bilbao","destination":"San Sebastián","waypoints":["Pamplona"],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"salgo desde Madrid hacia Sevilla y quiero parar en Córdoba" → {"speak":"Genial, incluyo Córdoba en tus paradas en camino a Sevilla.","action":"calculate_route","origin":"Madrid","destination":"Sevilla","waypoints":["Córdoba"],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"¿cuándo llego?" → {"speak":"Según la ruta, llegas sobre las diecisiete y media.","action":"none","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"activa terraza" → {"speak":"Hecho. Con terraza hay dos sitios en ruta: El Figón y Casa Lucio. ¿Te apetece alguno?","action":"set_filter","origin":"","destination":"","waypoints":[],"poiName":"","filterKey":"terraza","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}
"añade Casa Lucio" → {"speak":"¡Apuntado! Casa Lucio en tus paradas.","action":"add_poi","origin":"","destination":"","waypoints":[],"poiName":"Casa Lucio","filterKey":"","filterValue":true,"hours":0,"minutes":0,"tomorrow":false}`;

    const contents = [
        ...history.map(h => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.text }]
        })),
        { role: 'user', parts: [{ text: transcript }] }
    ];

    try {
        const res = await gemini.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                temperature: 0.3
            }
        });

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
            const matched = pois.find(poi =>
                poi.name.toLowerCase().includes(q) ||
                q.includes(poi.name.toLowerCase().split(' ')[0])
            );
            if (matched) {
                result.actionArgs.poi = matched;
            } else {
                console.warn('[AI] POI not found:', result.actionArgs.poiName);
                result.speak = `No encontré ese restaurante en la lista. ¿Puedes repetir el nombre?`;
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
