import { GoogleGenAI } from "@google/genai";
import { processAgentTurn } from './src/utils/ai.js';

// Setup mock global window
global.window = {};
global.import = { meta: { env: { VITE_GEMINI_API_KEY: "AIzaSyAiI7EwdphOunnBBO7RlYBZSe4aydyPmM0" } } };

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
    totalRoute: { distance: 357000, duration: 3*3600 + 59*60 },
    currentDepartureTime: "2026-02-22T10:00"
};

const history = [
    { role: "user", text: "podría ser alguna parada que esté más o menos a mitad de camino" },
    { role: "assistant", text: "A mitad de camino tienes el Restaurante San Huberto en Motilla del Palancar, con un cuatro coma dos de nota, o Casa Juanito en Tarancón que tiene un cuatro coma cinco. ¿Te apetece parar en alguno?" },
    { role: "user", text: "de esos dos me recomiendas" },
    { role: "assistant", text: "Yo te recomendaría Casa Juanito, que tiene un cuatro coma cinco de nota y muy buena cocina manchega. ¿Te lo añado a la ruta?" }
];

async function runTest(input) {
    console.log(`\n--- Test: ${input} ---`);
    process.env.VITE_GEMINI_API_KEY = "AIzaSyAiI7EwdphOunnBBO7RlYBZSe4aydyPmM0";
    const res = await processAgentTurn(input, appState, history);
    console.log("-> Result Action:", res?.action, "POI:", res?.actionArgs?.poiName);
    console.log("-> Speak:", res?.speak);
}

runTest("sí añádelo");
