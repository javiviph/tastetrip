import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, MicOff, Loader2, X, Sparkles, MapPin, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatDatetimeLocal, isPoiOpenAt, addTimeToTime } from '../utils/time';
import { minDistanceToRoute, isPoiForward } from '../utils/geo';
import { processAgentTurn, synthesizeSpeech } from '../utils/ai';

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
    } = useAppContext();

    const stateRef = useRef('IDLE');
    const isOpenRef = useRef(false);   // sync ref so closures see the correct value
    const recognitionRef = useRef(null);
    const audioRef = useRef(null);
    const conversationEndRef = useRef(null);
    const chatHistoryRef = useRef([]); // Full conversation history for Gemini
    const pendingOriginRef = useRef('');
    const pendingDestRef = useRef('');
    const askedForWaypointsRef = useRef(false);

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
    const prevDestRef = useRef(null);
    useEffect(() => {
        if (isOpen && routeDetails?.destinationName && routeDetails.destinationName !== prevDestRef.current && totalRoute && baseRoute) {
            prevDestRef.current = routeDetails.destinationName;
            const km = (totalRoute.distance / 1000).toFixed(0);
            const h = Math.floor(totalRoute.duration / 3600);
            const m = Math.floor((totalRoute.duration % 3600) / 60);
            const count = filteredPois.length;
            const best = [...filteredPois].sort((a, b) => b.rating - a.rating)[0];

            let summary = `Ruta calculada. ${h > 0 ? `${h} hora${h > 1 ? 's' : ''} y ` : ''}${m} minutos, ${km} kilómetros. `;
            summary += count > 0
                ? `Hay ${count} paradas en tu camino${best ? `, y la mejor valorada es ${best.name}` : ''}.`
                : `No encontré paradas con los filtros actuales.`;

            speak(summary, !isMobile);
        }
    }, [totalRoute, baseRoute, routeDetails?.destinationName, isOpen]);

    // ── Core speak function ───────────────────────────────────────────────────
    const speak = async (text, askAndListen = true) => {
        if (!text) { if (askAndListen) setTimeout(() => startListening(), 100); return; }

        if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }
        if (audioRef.current) try { audioRef.current.pause(); } catch (e) { }

        changeState('SPEAKING');
        window.__lastAssistantQuestion = text;
        setConversation(prev => [...prev, { role: 'assistant', text }]);

        const onFinished = () => {
            changeState('IDLE');
            if (isOpenRef.current && askAndListen) setTimeout(() => startListening(), 150);
        };

        try {
            const dataUri = await synthesizeSpeech(text);
            if (dataUri) {
                const audio = new Audio(dataUri);
                audioRef.current = audio;
                audio.onended = () => { audioRef.current = null; onFinished(); };
                audio.onerror = () => { audioRef.current = null; onFinished(); };
                await audio.play();
            } else {
                // Browser SpeechSynthesis fallback
                if (!window.speechSynthesis) { onFinished(); return; }
                window.speechSynthesis.cancel();
                const msg = new SpeechSynthesisUtterance(text);
                msg.lang = 'es-ES';
                const voices = window.speechSynthesis.getVoices();
                const v = voices.find(v => v.lang === 'es-ES' && v.name.includes('Google'))
                    || voices.find(v => v.lang === 'es-ES')
                    || voices.find(v => v.lang.startsWith('es'));
                if (v) msg.voice = v;
                msg.onend = onFinished;
                msg.onerror = onFinished;
                window.speechSynthesis.speak(msg);
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
                    const isNewRoute = (!routeDetails?.originName || (origin.toLowerCase() !== routeDetails.originName.toLowerCase()));
                    if (isNewRoute && !waypoints && !askedForWaypointsRef.current) {
                        // Store pending route so fallback & Gemini know where we're going
                        setRouteDetails(prev => ({ ...prev, pendingOrigin: origin, pendingDest: destination }));
                        const interruptMsg = `¿Vamos directos a ${destination} o quieres añadir alguna parada de paso para tenerla en cuenta cuando revisemos restaurantes en ruta?`;
                        window.__lastAssistantQuestion = interruptMsg;
                        speak(interruptMsg, true);
                        askedForWaypointsRef.current = true;
                        return;
                    }

                    console.log('[VA] Calling onSearchRequest:', origin, '→', destination, 'via', waypoints);
                    const finalWaypoints = waypoints || routeDetails?.waypoints?.map(w => w.name || 'Parada') || [];
                    onSearchRequest(origin, destination, finalWaypoints.length > 0 ? finalWaypoints : null);
                    pendingOriginRef.current = '';
                    pendingDestRef.current = '';
                    askedForWaypointsRef.current = false;
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

    // ── Process user speech ───────────────────────────────────────────────────
    const processTranscript = async (transcript) => {
        setConversation(prev => [...prev, { role: 'user', text: transcript }]);
        changeState('PROCESSING');

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
            speak('Lo siento, ha ocurrido un error. ¿Puedes repetirlo?', !isMobile);
            return;
        }

        // Update conversation history for next turn
        chatHistoryRef.current.push({ role: 'user', text: transcript });
        if (result.speak) chatHistoryRef.current.push({ role: 'assistant', text: result.speak });
        // Keep history manageable (last 10 turns)
        if (chatHistoryRef.current.length > 20) chatHistoryRef.current = chatHistoryRef.current.slice(-20);

        // Detect if executeAction will intercept and speak itself (new route without waypoints)
        // In that case, suppress result.speak to avoid double audio
        let suppressSpeak = false;
        if (result.action === 'calculate_route') {
            const origin = result.actionArgs?.origin || pendingOriginRef.current || routeDetails?.originName;
            const destination = result.actionArgs?.destination || pendingDestRef.current || routeDetails?.destinationName;
            const waypoints = result.actionArgs?.waypoints?.length > 0 ? result.actionArgs.waypoints : null;
            const isNewRoute = !routeDetails?.originName || (origin && origin.toLowerCase() !== routeDetails.originName?.toLowerCase());
            if (isNewRoute && !waypoints && !askedForWaypointsRef.current) {
                suppressSpeak = true;
            }
        }

        // Execute the action (state change, route calc, etc.)
        if (result.action && result.action !== 'none') {
            executeAction(result.action, result.actionArgs || {});
        }

        // Speak the AI's response (unless suppressed because interceptor will speak)
        if (!suppressSpeak) {
            // Track what we say so regex fallback can use context
            if (result.speak) window.__lastAssistantQuestion = result.speak;
            // For set_filter: always re-listen after speaking (never hang up)
            const forceListenAfter = result.action === 'set_filter' || result.action === 'clear_filter';
            await speak(result.speak || null, forceListenAfter ? true : !isMobile);
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

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript?.trim();
            if (!transcript || stateRef.current === 'SPEAKING') return;
            await processTranscript(transcript);
        };

        recognition.onerror = (e) => {
            console.warn('[VA] Speech Error:', e.error, e.message);
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                alert('El micrófono está bloqueado. Otorga permiso o abre esta web en el navegador nativo (Safari/Chrome), no desde una app como Instagram.');
            }
            if (e.error !== 'aborted' && e.error !== 'no-speech') changeState('IDLE');
            else if (e.error === 'no-speech') changeState('IDLE');
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
            askedForWaypointsRef.current = false;
            // Pre-request permissions if mobile to avoid initial block if possible
            if (isMobile) {
                try { navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => { }); } catch (e) { }
            }
            speak('¡Hola! ¿Desde dónde sales y hacia dónde vas?', !isMobile);
        } else {
            isOpenRef.current = false;
            setIsOpen(false);
            changeState('IDLE');
            if (audioRef.current) try { audioRef.current.pause(); } catch (e) { }
            if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) { }
            window.speechSynthesis?.cancel();
        }
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
                            <div className="va-dot" />
                            <span className="va-title">TasteTrip AI</span>
                            <span className="va-badge">Powered by Gemini</span>
                        </div>
                        <button onClick={handleToggle} className="va-close"><X size={18} /></button>
                    </div>

                    {/* Chat */}
                    <div className="va-chat">
                        {conversation.length === 0 && (
                            <div className="va-empty">
                                <Sparkles size={28} className="va-empty-icon" />
                                <p>Iniciando asistente...</p>
                            </div>
                        )}
                        {conversation.map((msg, i) => (
                            <div key={i} className={`va-bubble va-bubble-${msg.role}`}>
                                {msg.text}
                            </div>
                        ))}
                        <div ref={conversationEndRef} />
                    </div>

                    {/* Added route stops pill list */}
                    {addedRoutePoints.length > 0 && (
                        <div className="va-stops">
                            <span className="va-stops-label">Paradas:</span>
                            {addedRoutePoints.map(p => (
                                <span key={p.id} className="va-stop-pill">
                                    <MapPin size={10} />
                                    {p.name}
                                    <button onClick={() => setAddedRoutePoints(prev => prev.filter(x => x.id !== p.id))} className="va-stop-remove">
                                        <Trash2 size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="va-footer">
                        <div className="va-waves">
                            {assistantState === 'LISTENING' && [1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="va-wave" style={{ animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                        <button
                            onClick={micClickHandler}
                            disabled={assistantState === 'PROCESSING' || assistantState === 'SPEAKING'}
                            className={`va-mic ${assistantState === 'LISTENING' ? 'va-mic-active' : ''} ${assistantState === 'PROCESSING' || assistantState === 'SPEAKING' ? 'va-mic-busy' : ''}`}
                        >
                            {assistantState === 'PROCESSING' ? <Loader2 size={22} className="va-spin" />
                                : assistantState === 'LISTENING' ? <MicOff size={22} />
                                    : <Mic size={22} />}
                        </button>
                        <div className="va-status">
                            {assistantState === 'LISTENING' ? 'Te escucho...'
                                : assistantState === 'PROCESSING' ? 'Pensando...'
                                    : assistantState === 'SPEAKING' ? 'Hablando...'
                                        : 'Pulsa para hablar'}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .va-fab {
                    position: fixed; bottom: 28px; right: 28px; width: 64px; height: 64px;
                    border-radius: 50%; background: linear-gradient(135deg, var(--primary), #ff6b2b);
                    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 8px 24px rgba(255,77,0,0.35); z-index: 9999;
                    transition: transform 0.2s; position: fixed;
                }
                .va-fab:hover { transform: scale(1.08); }
                .va-fab-pulse {
                    position: absolute; inset: 0; border-radius: 50%; background: var(--primary);
                    opacity: 0.3; animation: va-pulse 2s infinite;
                }
                @keyframes va-pulse { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.6);opacity:0} }

                .va-panel {
                    position: fixed; bottom: 28px; right: 28px; width: calc(100vw - 32px); max-width: 380px; max-height: 600px;
                    background: var(--bg); border: 1px solid var(--border); border-radius: 28px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2); z-index: 10000;
                    display: flex; flex-direction: column; overflow: hidden;
                    animation: va-appear 0.35s cubic-bezier(0.175,0.885,0.32,1.275);
                }
                @keyframes va-appear { from{transform:translateY(80px) scale(0.85);opacity:0} to{transform:none;opacity:1} }

                .va-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--bg);
                }
                .va-header-left { display: flex; align-items: center; gap: 10px; }
                .va-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; }
                .va-title { font-weight: 800; font-size: 15px; }
                .va-badge {
                    font-size: 10px; padding: 2px 8px; border-radius: 20px;
                    background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; font-weight: 600;
                }
                .va-close {
                    padding: 6px; border-radius: 10px; background: var(--bg-offset);
                    border: none; cursor: pointer; color: var(--text-muted);
                }
                .va-close:hover { background: var(--border); }

                .va-chat {
                    flex: 1; overflow-y: auto; padding: 16px; display: flex;
                    flex-direction: column; gap: 10px; background: var(--bg-offset);
                    min-height: 200px;
                }
                .va-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; color: var(--text-muted); gap: 10px; padding: 40px 0; }
                .va-empty-icon { color: var(--primary); animation: va-pulse 2s infinite; }

                .va-bubble {
                    max-width: 82%; padding: 12px 16px; border-radius: 18px;
                    font-size: 14px; line-height: 1.5;
                }
                .va-bubble-assistant {
                    align-self: flex-start; background: var(--bg); border: 1px solid var(--border);
                    border-radius: 4px 18px 18px 18px;
                }
                .va-bubble-user {
                    align-self: flex-end; background: var(--primary); color: white;
                    border-radius: 18px 18px 4px 18px;
                }

                .va-stops {
                    padding: 8px 16px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
                    border-top: 1px solid var(--border); background: var(--bg);
                }
                .va-stops-label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                .va-stop-pill {
                    display: flex; align-items: center; gap: 4px; padding: 3px 8px 3px 6px;
                    background: var(--bg-offset); border: 1px solid var(--border); border-radius: 20px;
                    font-size: 11px; font-weight: 600; color: var(--text);
                }
                .va-stop-remove {
                    background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0; display: flex;
                    align-items: center;
                }
                .va-stop-remove:hover { color: #ef4444; }

                .va-footer {
                    padding: 14px 20px; background: var(--bg); border-top: 1px solid var(--border);
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                }
                .va-waves { height: 18px; display: flex; align-items: flex-end; gap: 3px; }
                .va-wave {
                    width: 3px; height: 6px; background: #ef4444; border-radius: 2px;
                    animation: va-wave 0.8s ease-in-out infinite alternate;
                }
                @keyframes va-wave { to { height: 18px; } }

                .va-mic {
                    width: 58px; height: 58px; border-radius: 50%; background: var(--primary);
                    color: white; border: none; cursor: pointer; display: flex; align-items: center;
                    justify-content: center; transition: all 0.25s; box-shadow: 0 4px 16px rgba(255,77,0,0.3);
                }
                .va-mic:hover:not(:disabled) { transform: scale(1.07); }
                .va-mic-active { background: #ef4444 !important; box-shadow: 0 0 0 6px rgba(239,68,68,0.2); transform: scale(1.08); }
                .va-mic-busy { background: var(--text-muted) !important; cursor: not-allowed; opacity: 0.7; box-shadow: none; }
                .va-spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                .va-status { font-size: 12px; color: var(--text-muted); font-weight: 500; }
            `}</style>
        </>
    );
};

export default VoiceAssistant;
