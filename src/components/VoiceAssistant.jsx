import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, MicOff, Loader2, X, Sparkles, RotateCcw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDatetimeLocal, isPoiOpenAt, addTimeToTime } from '../utils/time';
import { minDistanceToRoute, isPoiForward } from '../utils/geo';
import { processAgentTurn, synthesizeSpeech } from '../utils/ai';
import { numberToSpanish } from '../utils/numberToSpanish';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

const VoiceAssistant = ({ onSearchRequest }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [conversation, setConversation] = useState([]);
    const [assistantState, setAssistantState] = useState('IDLE'); // IDLE | LISTENING | PROCESSING | SPEAKING

    const {
        setActiveFilters,
        setDepartureTime,
        routeDetails,
        setRouteDetails,
        pois,
        baseRoute,
        totalRoute,
        activeFilters,
        searchRadius,
        onlyForward,
        departureTime: currentDepartureTime,
        addedRoutePoints,
        setAddedRoutePoints,
        aiAssistEnabled,
    } = useAppContext();

    const stateRef = useRef('IDLE');
    const isOpenRef = useRef(false);   // sync ref so closures see the correct value
    const recognitionRef = useRef(null);
    const audioRef = useRef(null);
    const conversationEndRef = useRef(null);
    const chatHistoryRef = useRef([]); // Full conversation history for Gemini
    const pendingOriginRef = useRef('');
    const pendingDestRef = useRef('');
    // Track which destination we already asked the user about stops for
    // (so we don’t ask again if the user repeats the same route)
    const askedWaypointsForDestRef = useRef('');
    const hasGreetedRef = useRef(false); // remember if we've already greeted this session
    const lastStatusRef = useRef(''); // last spoken assistant message (for display)
    const [lastStatus, setLastStatus] = useState('');

    // ── Filtered POIs (for context) ──────────────────────────────────────────
    const filteredPois = useMemo(() => {
        if (!baseRoute?.geometry) return [];
        let filtered = pois.filter(poi => {
            const dist = minDistanceToRoute(poi.coords[0], poi.coords[1], baseRoute.geometry);
            if (dist > searchRadius) return false;
            if (onlyForward && !isPoiForward(poi.coords[0], poi.coords[1], routeDetails?.origin, routeDetails?.destination)) return false;
            return true;
        });

        if (activeFilters.openNow) filtered = filtered.filter(p => isPoiOpenAt(p, currentDepartureTime));
        if (activeFilters.evCharger) filtered = filtered.filter(p => p.services?.includes('ev_charger'));
        if (activeFilters.vegan) filtered = filtered.filter(p => p.services?.includes('vegan'));
        if (activeFilters.wifi) filtered = filtered.filter(p => p.services?.includes('wifi'));
        if (activeFilters.terraza) filtered = filtered.filter(p => p.services?.includes('terraza'));
        if (activeFilters.petFriendly) filtered = filtered.filter(p => p.services?.includes('pet_friendly'));
        if (activeFilters.parking) filtered = filtered.filter(p => p.services?.includes('parking'));

        return filtered;
    }, [pois, baseRoute, searchRadius, onlyForward, activeFilters, currentDepartureTime, routeDetails]);

    // ── State helper ─────────────────────────────────────────────────────────
    const changeState = (s) => { stateRef.current = s; setAssistantState(s); };

    // ── Scroll chat to bottom ─────────────────────────────────────────────────
    useEffect(() => {
        conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    // ── Cleanup on unmount ────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }
            if (audioRef.current) try { audioRef.current.pause(); } catch (e) { }
        };
    }, []);

    // ── Auto-summarize when a new route is calculated ─────────────────────────
    const prevRouteKeyRef = useRef('');
    useEffect(() => {
        const wps = (routeDetails?.waypoints || []).map(w => w.name || '').join(',');
        const key = `${routeDetails?.originName}|${routeDetails?.destinationName}|${wps}`;
        if (isOpen && totalRoute && baseRoute && key && key !== prevRouteKeyRef.current) {
            prevRouteKeyRef.current = key;
            const km = Math.round(totalRoute.distance / 1000);
            const h = Math.floor(totalRoute.duration / 3600);
            const m = Math.floor((totalRoute.duration % 3600) / 60);
            const count = filteredPois.length;
            const best = [...filteredPois].sort((a, b) => b.rating - a.rating)[0];

            // All numbers as words for TTS
            const kmWords = numberToSpanish(km);
            const hWords = h > 0 ? `${numberToSpanish(h)} hora${h > 1 ? 's' : ''} y ` : '';
            const mWords = `${numberToSpanish(m)} minutos`;
            const countWords = numberToSpanish(count);

            let summary = `Ruta calculada. ${hWords}${mWords}, ${kmWords} kilómetros. `;
            summary += count > 0
                ? `Hay ${countWords} paradas en tu camino${best ? `, y la mejor valorada es ${best.name}` : ''}. ¿Quieres que te cuente más o añadimos alguna?`
                : `No encontré paradas con los filtros actuales.`;

            speak(summary, true);
        }
    }, [totalRoute, baseRoute, routeDetails, isOpen]);

    // ── Core speak function ───────────────────────────────────────────────────
    const speak = async (text, askAndListen = true) => {
        if (!text) { if (askAndListen) setTimeout(() => startListening(), 100); return; }

        if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }
        if (audioRef.current) try { audioRef.current.pause(); } catch (e) { }

        changeState('SPEAKING');
        window.__lastAssistantQuestion = text;
        lastStatusRef.current = text;
        setLastStatus(text);

        // Guard: onFinished must only fire once
        let finished = false;
        const onFinished = () => {
            if (finished) return;
            finished = true;
            changeState('IDLE');
            if (isOpenRef.current && askAndListen) setTimeout(() => startListening(), 200);
        };

        try {
            const dataUri = await synthesizeSpeech(text);
            if (dataUri) {
                const audio = new Audio(dataUri);
                audioRef.current = audio;
                audio.onended = () => { audioRef.current = null; onFinished(); };
                audio.onerror = () => { audioRef.current = null; onFinished(); };
                await audio.play();
                // Safety: if onended never fires, unblock after audio duration + 2s
                audio.addEventListener('loadedmetadata', () => {
                    setTimeout(onFinished, (audio.duration || 5) * 1000 + 2000);
                });
            } else {
                // Browser SpeechSynthesis fallback
                if (!window.speechSynthesis) { onFinished(); return; }
                window.speechSynthesis.cancel();
                const msg = new SpeechSynthesisUtterance(text);
                msg.lang = 'es-ES';
                msg.rate = 1.0;
                const voices = window.speechSynthesis.getVoices();
                const v = voices.find(v => v.lang === 'es-ES' && v.name.includes('Google'))
                    || voices.find(v => v.lang === 'es-ES')
                    || voices.find(v => v.lang.startsWith('es'));
                if (v) msg.voice = v;
                msg.onend = onFinished;
                msg.onerror = onFinished;
                window.speechSynthesis.speak(msg);
                // CHROME BUG: speechSynthesis.onend is unreliable on HTTPS.
                // Fallback: estimate duration from word count (~120 words/min) + 1s buffer
                const estimatedMs = Math.max(2000, (text.split(/\s+/).length / 2) * 1000);
                setTimeout(onFinished, estimatedMs);
            }
        } catch (e) {
            console.error('TTS error:', e);
            onFinished();
        }
    };


    // ── Execute agent actions ─────────────────────────────────────────────────
    const executeAction = (action, args) => {
        console.log('[VA] executeAction:', action, args);
        if (!action || action === 'none') return;

        switch (action) {
            case 'calculate_route': {
                const origin = args.origin || pendingOriginRef.current || routeDetails?.originName;
                const destination = args.destination || pendingDestRef.current || routeDetails?.destinationName;
                const waypoints = args.waypoints && args.waypoints.length > 0 ? args.waypoints : null;
                if (args.origin) pendingOriginRef.current = args.origin;
                if (args.destination) pendingDestRef.current = args.destination;

                if (origin && destination) {
                    // Only intercept if going to a NEW destination we haven't asked about yet
                    const destKey = destination.toLowerCase().trim();
                    const alreadyAsked = askedWaypointsForDestRef.current === destKey;
                    const routeAlreadyExists = routeDetails?.destinationName?.toLowerCase().trim() === destKey;
                    const shouldIntercept = !routeAlreadyExists && !alreadyAsked && !waypoints;

                    if (shouldIntercept) {
                        // Store pending so fallback & Gemini know where we're going
                        setRouteDetails(prev => ({ ...prev, pendingOrigin: origin, pendingDest: destination }));
                        askedWaypointsForDestRef.current = destKey;
                        const interruptMsg = `¿Vamos directos a ${destination} o quieres añadir alguna parada de paso?`;
                        window.__lastAssistantQuestion = interruptMsg;
                        speak(interruptMsg, true);
                        return;
                    }

                    console.log('[VA] Calling onSearchRequest:', origin, '→', destination, 'via', waypoints);
                    const finalWaypoints = waypoints || routeDetails?.waypoints?.map(w => w.name || 'Parada') || [];
                    onSearchRequest(origin, destination, finalWaypoints.length > 0 ? finalWaypoints : null);
                    pendingOriginRef.current = '';
                    pendingDestRef.current = '';
                    // Clear pending
                    setRouteDetails(prev => ({ ...prev, pendingOrigin: null, pendingDest: null }));
                }
                break;
            }
            case 'add_waypoint': {
                const newWaypoints = args.waypoints && args.waypoints.length > 0 ? args.waypoints : null;
                const origin = routeDetails?.originName || pendingOriginRef.current;
                const destination = routeDetails?.destinationName || pendingDestRef.current;

                if (origin && destination && newWaypoints) {
                    const currentWaypoints = routeDetails?.waypoints?.map(w => w.name || 'Parada') || [];
                    const finalWaypoints = [...currentWaypoints, ...newWaypoints];
                    console.log('[VA] Calling onSearchRequest to add waypoint:', origin, '→', destination, 'via', finalWaypoints);
                    onSearchRequest(origin, destination, finalWaypoints);
                    askedForWaypointsRef.current = false;
                    setRouteDetails(prev => ({ ...prev, pendingOrigin: null, pendingDest: null }));
                }
                break;
            }
            case 'remove_waypoint': {
                const wpToRemove = args.waypoints && args.waypoints[0];
                const origin = routeDetails?.originName;
                const destination = routeDetails?.destinationName;
                if (origin && destination && wpToRemove) {
                    const currentWaypoints = routeDetails?.waypoints?.map(w => w.name || 'Parada') || [];
                    const finalWaypoints = currentWaypoints.filter(w => !w.toLowerCase().includes(wpToRemove.toLowerCase()));
                    onSearchRequest(origin, destination, finalWaypoints.length > 0 ? finalWaypoints : null);
                }
                break;
            }
            case 'set_origin':
                pendingOriginRef.current = args.origin;
                break;
            case 'set_destination':
                pendingDestRef.current = args.destination;
                if (pendingOriginRef.current && pendingDestRef.current) {
                    const waypoints = args.waypoints && args.waypoints.length > 0 ? args.waypoints : null;
                    onSearchRequest(pendingOriginRef.current, pendingDestRef.current, waypoints);
                    pendingOriginRef.current = '';
                    pendingDestRef.current = '';
                }
                break;
            case 'add_poi': {
                const poi = args.poi;
                if (poi) {
                    const alreadyIn = addedRoutePoints.some(p => p.id === poi.id);
                    if (!alreadyIn) setAddedRoutePoints(prev => [...prev, poi]);
                }
                break;
            }
            case 'remove_poi': {
                const poi = args.poi;
                if (poi) setAddedRoutePoints(prev => prev.filter(p => p.id !== poi.id));
                break;
            }
            case 'set_filter':
                // args.key comes from filterKey, args.value from filterValue
                if (args.key) setActiveFilters(prev => ({ ...prev, [args.key]: args.value ?? true }));
                break;
            case 'clear_filter':
                if (args.key) setActiveFilters(prev => ({ ...prev, [args.key]: false }));
                break;
            case 'set_departure_time': {
                const d = new Date();
                if (args.tomorrow) d.setDate(d.getDate() + 1);
                d.setHours(args.hours || 0, args.minutes || 0, 0, 0);
                setDepartureTime(formatDatetimeLocal(d));
                break;
            }
            default:
                break;
        }
    };

    // ── Conversation phase state machine ─────────────────────────────────────
    // Phases: ASKING_ORIGIN → ASKING_DEST → ASKING_WAYPOINTS → ACTIVE
    const conversationPhaseRef = useRef('ASKING_ORIGIN');

    // City extractor: strips filler words and travel phrases, returns just the city name
    const extractCity = (text) => {
        let s = text.toLowerCase().trim();
        // 1. Strip leading discourse fillers
        s = s.replace(/^(mira(me)?|oye|oye mira|pues|bueno|a ver|venga|hola|bien|eh|vale|ok|no sé[,]?|es que[,]?)\s+/gi, '');
        // Repeat in case of multiple fillers (e.g. "mira pues salgo de...")
        s = s.replace(/^(mira(me)?|oye|pues|bueno|a ver|venga|hola|bien|eh|vale)\s+/gi, '');
        // 2. Strip leading travel phrases
        s = s.replace(/^(salgo de nuevo desde|salgo desde|salgo de|salgo|voy desde|voy de|vengo de|parto de|me voy de|desde)\s+/i, '');
        s = s.replace(/^(voy a|hacia|hasta|para|mi destino es|el destino es|me dirijo a|destino)\s+/i, '');
        // 3. Strip trailing noise
        s = s.replace(/[¿?.,!]/g, '').trim();
        if (!s || s.length < 2) return null;
        // 4. If multiple words remain, take only the last 1-2 words (the city tends to be at the end)
        const words = s.split(/\s+/);
        // If the result is 1-2 words, use as-is; if longer, take last 2 words (handles "comunidad de madrid" etc)
        const city = words.length <= 2 ? words.join(' ') : words.slice(-2).join(' ');
        return city.charAt(0).toUpperCase() + city.slice(1);
    };

    // ── Process user speech ───────────────────────────────────────────────────
    const processTranscript = async (transcript) => {
        changeState('PROCESSING');

        const lower = transcript.toLowerCase().trim();

        // ── Phase: ASKING_ORIGIN ─────────────────────────────────────────────
        if (conversationPhaseRef.current === 'ASKING_ORIGIN') {
            // Try to extract both origin and destination from a single phrase like "de Madrid a Sevilla"
            const fullRouteRx = /(?:de|desde)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,20}?)\s+(?:a|hacia|hasta|para)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,20}?)[.,]?\s*$/i;
            const rm = lower.replace(/^(salgo|voy|parto|vengo)\s+/i, '').match(fullRouteRx);
            if (rm) {
                const origin = rm[1].trim().charAt(0).toUpperCase() + rm[1].trim().slice(1);
                const dest = rm[2].trim().charAt(0).toUpperCase() + rm[2].trim().slice(1);
                pendingOriginRef.current = origin;
                pendingDestRef.current = dest;
                conversationPhaseRef.current = 'ASKING_WAYPOINTS';
                askedWaypointsForDestRef.current = dest.toLowerCase();
                const msg = `Perfecto, de ${origin} a ${dest}. ¿Vamos directos o quieres hacer alguna parada?`;
                window.__lastAssistantQuestion = msg;
                chatHistoryRef.current.push({ role: 'user', text: transcript });
                chatHistoryRef.current.push({ role: 'assistant', text: msg });
                await speak(msg, true);
                return;
            }

            const city = extractCity(lower);
            if (city) {
                pendingOriginRef.current = city;
                conversationPhaseRef.current = 'ASKING_DEST';
                const msg = `¿Y a dónde vas?`;
                window.__lastAssistantQuestion = msg;
                chatHistoryRef.current.push({ role: 'user', text: transcript });
                chatHistoryRef.current.push({ role: 'assistant', text: msg });
                await speak(msg, true);
                return;
            }
            // Couldn't extract — re-ask
            await speak(`No he entendido bien. ¿Desde qué ciudad sales?`, true);
            return;
        }

        // ── Phase: ASKING_DEST ───────────────────────────────────────────────
        if (conversationPhaseRef.current === 'ASKING_DEST') {
            // Also check for full route phrase in case user says "a Madrid desde Bilbao"
            const fullRouteRx = /(?:de|desde)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,20}?)\s+(?:a|hacia|hasta|para)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,20}?)[.,]?\s*$/i;
            const rm = lower.match(fullRouteRx);
            if (rm) {
                pendingOriginRef.current = rm[1].trim().charAt(0).toUpperCase() + rm[1].trim().slice(1);
                pendingDestRef.current = rm[2].trim().charAt(0).toUpperCase() + rm[2].trim().slice(1);
            } else {
                const city = extractCity(lower);
                if (!city) {
                    await speak(`No he entendido. ¿A qué ciudad vas?`, true);
                    return;
                }
                pendingDestRef.current = city;
            }

            const dest = pendingDestRef.current;
            conversationPhaseRef.current = 'ASKING_WAYPOINTS';
            askedWaypointsForDestRef.current = dest.toLowerCase();
            const msg = `De ${pendingOriginRef.current} a ${dest}. ¿Vamos directos o quieres parar en algún sitio?`;
            window.__lastAssistantQuestion = msg;
            chatHistoryRef.current.push({ role: 'user', text: transcript });
            chatHistoryRef.current.push({ role: 'assistant', text: msg });
            await speak(msg, true);
            return;
        }

        // ── Phase: ASKING_WAYPOINTS ──────────────────────────────────────────
        if (conversationPhaseRef.current === 'ASKING_WAYPOINTS') {
            const isNo = /^(no|nada|directo|directo?s?|sin paradas?|adelante|venga|dale|vamos|sigue|de frente|sin nada|ninguna?)/.test(lower);

            if (isNo) {
                conversationPhaseRef.current = 'ACTIVE';
                onSearchRequest(pendingOriginRef.current, pendingDestRef.current, null);
                setRouteDetails(prev => ({ ...prev, pendingOrigin: null, pendingDest: null }));
                chatHistoryRef.current.push({ role: 'user', text: transcript });
                // Route summary triggers from useEffect
                await speak('', false);
                return;
            }

            // Check if user mentions a city as a stop
            const stopRx = /(?:paro en|parar en|paso por|pasar por|pasando por|parada en|quiero pasar por|quiero parar en|por)\s+([a-záéíóúñ][a-záéíóúñ\s]{1,20})/i;
            const sm = lower.match(stopRx);
            const waypoint = sm
                ? sm[1].trim().charAt(0).toUpperCase() + sm[1].trim().slice(1)
                : (lower.split(/\s+/).length <= 4 ? extractCity(lower) : null);

            if (waypoint) {
                conversationPhaseRef.current = 'ACTIVE';
                onSearchRequest(pendingOriginRef.current, pendingDestRef.current, [waypoint]);
                setRouteDetails(prev => ({ ...prev, pendingOrigin: null, pendingDest: null }));
                chatHistoryRef.current.push({ role: 'user', text: transcript });
                await speak('', false);
                return;
            }

            // Ambiguous: re-ask
            await speak(`¿Vamos directos o hay alguna ciudad por la que quieras pasar?`, true);
            return;
        }

        // ── Phase: ACTIVE — delegate to Gemini ───────────────────────────────
        const appState = {
            pois,
            addedRoutePoints,
            routeDetails,
            activeFilters,
            filteredPois,
            totalRoute,
            baseRoute,
            currentDepartureTime,
        };

        let result;
        try {
            result = await processAgentTurn(transcript, appState, chatHistoryRef.current);
        } catch (e) {
            console.error('Agent error:', e);
            await speak('Lo siento, ha ocurrido un error. Inténtalo de nuevo.', false);
            return;
        }

        // Update conversation history
        chatHistoryRef.current.push({ role: 'user', text: transcript });
        if (result.speak) chatHistoryRef.current.push({ role: 'assistant', text: result.speak });
        if (chatHistoryRef.current.length > 20) chatHistoryRef.current = chatHistoryRef.current.slice(-20);

        // Detect if executeAction will intercept (for calculate_route with new dest without waypoints)
        let suppressSpeak = false;
        if (result.action === 'calculate_route') {
            const destination = result.actionArgs?.destination || pendingDestRef.current || routeDetails?.destinationName;
            const waypoints = result.actionArgs?.waypoints?.length > 0 ? result.actionArgs.waypoints : null;
            const destKey = destination?.toLowerCase().trim() || '';
            const alreadyAsked = askedWaypointsForDestRef.current === destKey;
            const routeAlreadyExists = routeDetails?.destinationName?.toLowerCase().trim() === destKey;
            if (!routeAlreadyExists && !alreadyAsked && !waypoints) {
                suppressSpeak = true;
            }
        }

        if (result.action && result.action !== 'none') {
            executeAction(result.action, result.actionArgs || {});
        }

        if (!suppressSpeak) {
            if (result.speak) window.__lastAssistantQuestion = result.speak;
            await speak(result.speak || null, true);
        }
    };

    // ── Start listening ───────────────────────────────────────────────────────
    const startListening = () => {
        if (!SpeechRecognition || !isOpenRef.current || stateRef.current === 'SPEAKING' || stateRef.current === 'LISTENING') return;
        if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }

        changeState('LISTENING');
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript?.trim();
            if (!transcript || stateRef.current === 'SPEAKING') return;
            await processTranscript(transcript);
        };

        recognition.onerror = (e) => {
            console.warn('[VA] Speech Error:', e.error);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                alert('El micrófono está bloqueado. Otorga permiso en la barra del navegador para usar el asistente.');
                changeState('IDLE');
                return;
            }
            if (e.error === 'aborted') return; // intentional, ignore
            changeState('IDLE');
            // Auto-restart on no-speech during initial setup phases
            if (e.error === 'no-speech' && isOpenRef.current &&
                ['ASKING_ORIGIN', 'ASKING_DEST', 'ASKING_WAYPOINTS'].includes(conversationPhaseRef.current)) {
                setTimeout(() => startListening(), 600);
            }
        };

        recognition.onend = () => {
            if (stateRef.current === 'LISTENING') changeState('IDLE');
        };

        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) { changeState('IDLE'); }
    };

    // ── Open / close ──────────────────────────────────────────────────────────
    const handleToggle = () => {
        if (!SpeechRecognition) { alert('Tu navegador no soporta reconocimiento de voz.'); return; }

        if (!isOpen) {
            isOpenRef.current = true;
            setIsOpen(true);
            setConversation([]);
            chatHistoryRef.current = [];
            pendingOriginRef.current = '';
            pendingDestRef.current = '';
            askedWaypointsForDestRef.current = '';
            conversationPhaseRef.current = 'ASKING_ORIGIN';
            if (isMobile) {
                try { navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => { }); } catch (e) { }
            }
            if (!aiAssistEnabled) {
                // AI disabled — just show Coming Soon panel, no auto-greeting
                return;
            }
            if (!hasGreetedRef.current) {
                // First time opening this session: greet
                hasGreetedRef.current = true;
                speak('¡Hola! ¿Desde qué ciudad sales hoy?', true);
            }
            // If already greeted: just open the panel, user taps mic when ready
        } else {
            isOpenRef.current = false;
            setIsOpen(false);
            changeState('IDLE');
            if (audioRef.current) try { audioRef.current.pause(); } catch (e) { }
            if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }
            window.speechSynthesis?.cancel();
        }
    };

    // ── Reset conversation ────────────────────────────────────────────────────
    const handleNewConversation = () => {
        if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }
        if (audioRef.current) try { audioRef.current.pause(); } catch (e) { }
        window.speechSynthesis?.cancel();
        chatHistoryRef.current = [];
        pendingOriginRef.current = '';
        pendingDestRef.current = '';
        askedWaypointsForDestRef.current = '';
        conversationPhaseRef.current = 'ASKING_ORIGIN';
        hasGreetedRef.current = true; // prevents double-greeting
        setLastStatus('');
        speak('¡Vamos de nuevo! ¿Desde qué ciudad sales?', true);
    };

    const micClickHandler = () => {
        if (assistantState === 'IDLE') startListening();
        else if (assistantState === 'LISTENING') {
            if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }
            changeState('IDLE');
        }
    };

    // ── UI ────────────────────────────────────────────────────────────────────
    return (
        <>
            {!isOpen && (
                <button onClick={handleToggle} className="va-fab" title="Abrir asistente de voz">
                    <Mic size={26} color="white" />
                    <span className="va-fab-pulse" />
                </button>
            )}

            {isOpen && (
                <div className="va-panel">
                    {/* Header */}
                    <div className="va-header">
                        <div className="va-header-left">
                            <div className={`va-dot ${!aiAssistEnabled ? 'va-dot-off' : ''}`} />
                            <span className="va-title">TasteTrip AI</span>
                            <span className="va-badge">{aiAssistEnabled ? 'Powered by Gemini' : 'Coming Soon'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {aiAssistEnabled && (
                                <button onClick={handleNewConversation} className="va-close" title="Nueva conversación">
                                    <RotateCcw size={15} />
                                </button>
                            )}
                            <button onClick={handleToggle} className="va-close"><X size={18} /></button>
                        </div>
                    </div>

                    {/* Body */}
                    {!aiAssistEnabled ? (
                        // ── Coming Soon ──────────────────────────────────────
                        <div className="va-orb-area">
                            <div className="va-orb va-orb-coming">
                                <Sparkles size={32} color="white" />
                            </div>
                            <p className="va-orb-title">Coming Soon</p>
                            <p className="va-orb-subtitle">
                                Muy pronto estaré disponible para acompañarte en cada viaje.
                            </p>
                            <span className="va-badge" style={{ marginTop: '4px' }}>BETA · PRÓXIMAMENTE</span>
                        </div>
                    ) : (
                        // ── Active assistant ─────────────────────────────────
                        <div className="va-orb-area">
                            {/* Central orb — reacts to state */}
                            <div className={`va-orb va-orb-${assistantState.toLowerCase()}`}>
                                {assistantState === 'PROCESSING'
                                    ? <Loader2 size={30} className="va-spin" />
                                    : assistantState === 'LISTENING'
                                        ? <MicOff size={30} />
                                        : <Mic size={30} />}
                                {/* Ripples when speaking */}
                                {assistantState === 'SPEAKING' && <>
                                    <span className="va-ripple va-ripple-1" />
                                    <span className="va-ripple va-ripple-2" />
                                    <span className="va-ripple va-ripple-3" />
                                </>}
                            </div>

                            {/* Wave bars (listening) */}
                            <div className="va-bars">
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className={`va-bar ${assistantState === 'LISTENING' ? 'va-bar-active' : ''} ${assistantState === 'SPEAKING' ? 'va-bar-speaking' : ''}`}
                                        style={{ animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>

                            {/* State label */}
                            <p className="va-state-label">
                                {assistantState === 'LISTENING' ? '🎙 Te escucho...'
                                    : assistantState === 'PROCESSING' ? '✦ Pensando...'
                                        : assistantState === 'SPEAKING' ? '◎ Hablando...'
                                            : '· Pulsa el orbe para hablar'}
                            </p>

                        </div>
                    )}

                    {/* Footer mic button (only in active mode) */}
                    {aiAssistEnabled && (
                        <div className="va-footer-slim">
                            <button
                                onClick={micClickHandler}
                                disabled={assistantState === 'PROCESSING' || assistantState === 'SPEAKING'}
                                className={`va-mic-btn ${assistantState === 'LISTENING' ? 'va-mic-listening' : ''} ${assistantState === 'PROCESSING' || assistantState === 'SPEAKING' ? 'va-mic-busy' : ''}`}
                            >
                                {assistantState === 'PROCESSING' ? <Loader2 size={20} className="va-spin" />
                                    : assistantState === 'LISTENING' ? <MicOff size={20} />
                                        : <Mic size={20} />}
                                <span>
                                    {assistantState === 'LISTENING' ? 'Detener'
                                        : assistantState === 'PROCESSING' ? 'Procesando'
                                            : assistantState === 'SPEAKING' ? 'Hablando...'
                                                : 'Hablar'}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                /* FAB */
                .va-fab {
                    position: fixed; bottom: 28px; right: 28px; width: 64px; height: 64px;
                    border-radius: 50%; background: linear-gradient(135deg, var(--primary), #ff6b2b);
                    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 8px 24px rgba(255,77,0,0.35); z-index: 9999; transition: transform 0.2s;
                }
                .va-fab:hover { transform: scale(1.08); }
                .va-fab-pulse {
                    position: absolute; inset: 0; border-radius: 50%; background: var(--primary);
                    opacity: 0.3; animation: va-pulse-ring 2s infinite;
                }

                /* Panel */
                .va-panel {
                    position: fixed; bottom: 28px; right: 28px;
                    width: calc(100vw - 32px); max-width: 340px;
                    background: var(--bg); border: 1px solid var(--border); border-radius: 28px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.25); z-index: 10000;
                    display: flex; flex-direction: column; overflow: hidden;
                    animation: va-appear 0.35s cubic-bezier(0.175,0.885,0.32,1.275);
                }
                @keyframes va-appear { from{transform:translateY(70px) scale(0.88);opacity:0} to{transform:none;opacity:1} }

                /* Header */
                .va-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 18px; border-bottom: 1px solid var(--border);
                }
                .va-header-left { display: flex; align-items: center; gap: 10px; }
                .va-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: va-pulse-ring 2s infinite; }
                .va-dot-off { background: #9ca3af !important; box-shadow: none !important; animation: none !important; }
                .va-title { font-weight: 800; font-size: 14px; }
                .va-badge {
                    font-size: 10px; padding: 2px 8px; border-radius: 20px;
                    background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; font-weight: 600;
                }
                .va-close {
                    padding: 6px; border-radius: 10px; background: var(--bg-offset);
                    border: none; cursor: pointer; color: var(--text-muted); display:flex; align-items:center;
                }
                .va-close:hover { background: var(--border); }

                /* Orb area */
                .va-orb-area {
                    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 36px 24px 24px; gap: 12px; text-align: center;
                    background: radial-gradient(ellipse at 50% 30%, rgba(255,77,0,0.05) 0%, transparent 70%);
                    min-height: 260px;
                }

                /* Central orb */
                .va-orb {
                    width: 88px; height: 88px; border-radius: 50%; position: relative;
                    display: flex; align-items: center; justify-content: center; color: white;
                    transition: all 0.4s ease;
                }
                .va-orb-idle {
                    background: linear-gradient(135deg, var(--primary), #ff6b2b);
                    box-shadow: 0 8px 32px rgba(255,77,0,0.3);
                    cursor: pointer;
                }
                .va-orb-idle:hover { transform: scale(1.05); }
                .va-orb-listening {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    box-shadow: 0 0 0 8px rgba(239,68,68,0.15), 0 8px 32px rgba(239,68,68,0.4);
                    animation: va-orb-pulse 1.2s ease-in-out infinite;
                    cursor: pointer;
                }
                .va-orb-speaking {
                    background: linear-gradient(135deg, #4f46e5, #7c3aed);
                    box-shadow: 0 8px 32px rgba(79,70,229,0.4);
                }
                .va-orb-processing {
                    background: linear-gradient(135deg, #0ea5e9, #0284c7);
                    box-shadow: 0 8px 32px rgba(14,165,233,0.4);
                    animation: va-orb-pulse 1.5s ease-in-out infinite;
                }
                .va-orb-coming {
                    background: linear-gradient(135deg, #4f46e5, #7c3aed);
                    box-shadow: 0 0 32px rgba(79,70,229,0.3);
                    animation: va-orb-pulse 2.5s ease-in-out infinite;
                }

                /* Ripples (speaking) */
                .va-ripple {
                    position: absolute; inset: 0; border-radius: 50%;
                    border: 2px solid rgba(79,70,229,0.4);
                    animation: va-ripple-out 2s ease-out infinite;
                }
                .va-ripple-2 { animation-delay: 0.5s; }
                .va-ripple-3 { animation-delay: 1s; }
                @keyframes va-ripple-out {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2.2); opacity: 0; }
                }

                /* Wave bars */
                .va-bars { display: flex; align-items: center; gap: 4px; height: 24px; }
                .va-bar {
                    width: 3px; height: 4px; border-radius: 2px;
                    background: var(--border); transition: background 0.3s;
                }
                .va-bar-active {
                    background: #ef4444;
                    animation: va-wave-bar 0.6s ease-in-out infinite alternate;
                }
                .va-bar-speaking {
                    background: #4f46e5;
                    animation: va-wave-bar 0.8s ease-in-out infinite alternate;
                }
                @keyframes va-wave-bar { to { height: 20px; } }

                .va-state-label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin: 0; }
                .va-subtitle {
                    font-size: 12px; color: var(--text-muted); line-height: 1.5; margin: 0;
                    max-height: 60px; overflow: hidden; opacity: 0.8;
                    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
                }
                .va-orb-title { font-weight: 800; font-size: 18px; margin: 0; }
                .va-orb-subtitle { color: var(--text-muted); font-size: 13px; line-height: 1.6; margin: 0; }

                /* Footer mic */
                .va-footer-slim {
                    padding: 14px 20px 18px; display: flex; justify-content: center;
                    border-top: 1px solid var(--border);
                }
                .va-mic-btn {
                    display: flex; align-items: center; gap: 8px; padding: 12px 28px;
                    background: linear-gradient(135deg, var(--primary), #ff6b2b);
                    color: white; border: none; border-radius: 50px; cursor: pointer;
                    font-weight: 700; font-size: 14px;
                    box-shadow: 0 4px 16px rgba(255,77,0,0.3);
                    transition: all 0.2s;
                }
                .va-mic-btn:hover:not(:disabled) { transform: scale(1.04); opacity: 0.93; }
                .va-mic-listening {
                    background: linear-gradient(135deg, #ef4444, #dc2626) !important;
                    box-shadow: 0 0 0 4px rgba(239,68,68,0.2), 0 4px 16px rgba(239,68,68,0.4) !important;
                }
                .va-mic-busy { opacity: 0.5; cursor: not-allowed !important; transform: none !important; }

                /* Animations */
                @keyframes va-orb-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
                @keyframes va-pulse-ring { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.6);opacity:0} }
                .va-spin { animation: va-spin 1s linear infinite; }
                @keyframes va-spin { to { transform: rotate(360deg); } }
            `}</style>
        </>
    );
};

export default VoiceAssistant;


