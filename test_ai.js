import { GoogleGenAI } from "@google/genai";

const gemini = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

const appState = {
    pois: [
        { name: "Casa Lucio", category: "Tradicional", address: "Madrid", rating: 4.5, services: [] },
        { name: "Casa Juanito", category: "Manchego", address: "Tarancón", rating: 4.5, services: [] },
        { name: "San Huberto", category: "Tradicional", address: "Motilla", rating: 4.2, services: [] }
    ],
    addedRoutePoints: [],
    routeDetails: { originName: "Madrid", destinationName: "Valencia" },
    activeFilters: {},
    filteredPois: [],
    totalRoute: { distance: 357000, duration: 3 * 3600 + 59 * 60 },
    currentDepartureTime: "2026-02-22T10:00"
};

const history = [
    { role: "user", parts: [{ text: "podría ser alguna parada que esté más o menos a mitad de camino" }] },
    { role: "model", parts: [{ text: "A mitad de camino tienes el Restaurante San Huberto en Motilla del Palancar, con un cuatro coma dos de nota, o Casa Juanito en Tarancón que tiene un cuatro coma cinco. ¿Te apetece parar en alguno?" }] },
    { role: "user", parts: [{ text: "de esos dos me recomiendas" }] },
    { role: "model", parts: [{ text: "Yo te recomendaría Casa Juanito, que tiene un cuatro coma cinco de nota y muy buena cocina manchega. ¿Te lo añado a la ruta?" }] }
];

async function runTest(input) {
    console.log(`\n--- Test: ${input} ---`);
    const systemPrompt = "Eres un asistente de viajes. Devuelve solo un JSON válido con campos: speak, action, origin, destination, poiName, filterKey, filterValue, hours, minutes, tomorrow. Acciones: calculate_route, add_poi, remove_poi, set_filter, clear_filter, set_departure_time, none. Para add_poi usa siempre el nombre exacto del POI en poiName.";
    const contents = [...history, { role: "user", parts: [{ text: input }] }];
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
        console.log("-> Raw:", res.text.trim());
    } catch (e) {
        console.log("-> ERROR:", e.message);
    }
}

async function start() {
    await runTest("sí añádelo");
}
start();
